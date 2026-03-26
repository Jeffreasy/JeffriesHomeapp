import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Types ──────────────────────────────────────────────────────────────────

const transactionInput = v.object({
  rekeningIban:         v.string(),
  volgnr:               v.string(),
  datum:                v.string(),
  bedrag:               v.number(),
  saldoNaTrn:           v.number(),
  code:                 v.string(),
  tegenrekeningIban:    v.optional(v.string()),
  tegenpartijNaam:      v.optional(v.string()),
  omschrijving:         v.string(),
  referentie:           v.optional(v.string()),
  redenRetour:          v.optional(v.string()),
  oorspBedrag:          v.optional(v.number()),
  oorspMunt:            v.optional(v.string()),
  isInterneOverboeking: v.boolean(),
  categorie:            v.optional(v.string()),
});

// ─── Mutations ──────────────────────────────────────────────────────────────

export const importBatch = mutation({
  args: { transactions: v.array(transactionInput) },
  handler: async (ctx, { transactions }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Niet ingelogd");
    const userId = identity.subject;

    let toegevoegd = 0;
    let overgeslagen = 0;

    for (const tx of transactions) {
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_rekening_volgnr", (q) =>
          q.eq("rekeningIban", tx.rekeningIban).eq("volgnr", tx.volgnr)
        )
        .first();

      if (existing) { overgeslagen++; continue; }

      await ctx.db.insert("transactions", { ...tx, userId });
      toegevoegd++;
    }

    return { toegevoegd, overgeslagen };
  },
});

export const updateCategorie = mutation({
  args: { id: v.id("transactions"), categorie: v.optional(v.string()) },
  handler: async (ctx, { id, categorie }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Niet ingelogd");
    const tx = await ctx.db.get(id);
    if (!tx || tx.userId !== identity.subject) throw new Error("Niet gevonden");
    await ctx.db.patch(id, { categorie });
  },
});

// ─── Queries ────────────────────────────────────────────────────────────────

/**
 * Oplossing voor maandfilter-bug:
 *
 * PROBLEEM: `paginate(50)` haalt 50 willekeurige records op, dan pas filteren
 * → als die 50 geen overeenkomst hebben met de maand = lege pagina.
 *
 * OPLOSSING: Split in twee paden:
 *   A) Maandfilter actief → gebruik `by_user_datum` index met datumbereik,
 *      collect() alle resultaten voor die maand (~50-150 records), filter daarna.
 *   B) Geen maandfilter → paginate() over de volledige set.
 */
export const listPaginated = query({
  args: {
    numItems:         v.number(),
    cursor:           v.union(v.string(), v.null()),
    excludeIntern:    v.optional(v.boolean()),
    onlyStorneringen: v.optional(v.boolean()),
    codeFilter:       v.optional(v.string()),
    ibanFilter:       v.optional(v.string()),
    maandFilter:      v.optional(v.string()), // "YYYY-MM"
    zoekterm:         v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: null };
    const userId = identity.subject;

    // Gemeenschappelijke post-filter functie
    const zoek = args.zoekterm?.toLowerCase().trim();
    const postFilter = (t: {
      isInterneOverboeking: boolean;
      code: string;
      rekeningIban: string;
      tegenpartijNaam?: string;
      omschrijving: string;
    }) => {
      if (args.excludeIntern    && t.isInterneOverboeking)             return false;
      if (args.onlyStorneringen && t.code !== "st")                     return false;
      if (args.codeFilter       && t.code !== args.codeFilter)          return false;
      if (args.ibanFilter       && t.rekeningIban !== args.ibanFilter)  return false;
      if (zoek) {
        const naam   = (t.tegenpartijNaam ?? "").toLowerCase();
        const omschr = t.omschrijving.toLowerCase();
        if (!naam.includes(zoek) && !omschr.includes(zoek))             return false;
      }
      return true;
    };

    // ─── Pad A: maandfilter actief ───────────────────────────────────────────
    // Gebruik datum-index om direct het juiste datumbereik op te halen.
    // Geen paginering nodig; een maand heeft maximaal ~150 transacties.
    if (args.maandFilter) {
      const vanDatum = args.maandFilter + "-01";
      const totDatum = args.maandFilter + "-31"; // ISO-string vergelijking klopt t/m de 31e

      const txs = await ctx.db
        .query("transactions")
        .withIndex("by_user_datum", (q) =>
          q.eq("userId", userId).gte("datum", vanDatum).lte("datum", totDatum)
        )
        .order("desc")
        .collect();

      return {
        page:           txs.filter(postFilter),
        isDone:         true,
        continueCursor: null,
      };
    }

    // ─── Pad B: geen maandfilter → gepagineerd ───────────────────────────────
    // Voor zoekterm en andere filters halen we een grotere batch op zodat de kans
    // op een lege pagina na filtering klein is.
    const batchSize = zoek || args.onlyStorneringen ? 200 : args.numItems;

    const result = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate({ numItems: batchSize, cursor: args.cursor });

    return {
      page:           result.page.filter(postFilter),
      isDone:         result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

/**
 * Geaggregeerde statistieken.
 * Accepteert een optioneel ibanFilter zodat stats per rekening kloppen.
 *
 * BELANGRIJK - huidigSaldo vs nettoStroom:
 *   huidigSaldo = meest recente saldoNaTrn (echte bankbalans)
 *   nettoStroom = totaalIn - totaalUit (kasstromen EXCL. beginbalans)
 *
 * Reden: als iemand op 1 jan €409,90 had staan, telt dat niet mee in
 * kasstromen maar WEL in het bankbalans. Wij moeten saldoNaTrn gebruiken.
 */
export const getStats = query({
  args: { ibanFilter: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    // Haal alle transacties 1x op (geen dubbele scan)
    const alleTxs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Filter op IBAN als geselecteerd
    const txs = args.ibanFilter
      ? alleTxs.filter((t) => t.rekeningIban === args.ibanFilter)
      : alleTxs;

    const extern = txs.filter((t) => !t.isInterneOverboeking);

    const totaalIn   = extern.filter((t) => t.bedrag > 0).reduce((s, t) => s + t.bedrag, 0);
    const totaalUit  = extern.filter((t) => t.bedrag < 0).reduce((s, t) => s + t.bedrag, 0);
    const nettoStroom = totaalIn + totaalUit; // NIET het bankbalans
    const storneringen = txs.filter((t) => t.code === "st").length;

    // ─── Huidig saldo (echte bankbalans) ─────────────────────────────────────
    // Per IBAN: transactie met de HOOGSTE (datum, volgnr) combinatie
    // Rabobank volgnrs zijn monotoon oplopend → hogere volgnr = later geboekt.
    // Datum als string is correct sorteerbaar (YYYY-MM-DD).
    // Beide checks nodig: datum kan gelijk zijn (meerdere boekingen per dag).
    const ibanSaldoMap = new Map<string, { datum: string; volgnr: string; saldo: number }>();
    for (const t of alleTxs) {
      const prev = ibanSaldoMap.get(t.rekeningIban);
      const isLater =
        !prev ||
        t.datum > prev.datum ||
        (t.datum === prev.datum && t.volgnr > prev.volgnr);
      if (isLater) {
        ibanSaldoMap.set(t.rekeningIban, { datum: t.datum, volgnr: t.volgnr, saldo: t.saldoNaTrn });
      }
    }

    // Lijst van IBANs voor de tabbar (altijd op basis van alle transacties)
    const ibannen = Array.from(ibanSaldoMap.keys()).sort();

    // Per IBAN huidig saldo (voor de tabbar-tooltip)
    const huidigSaldoPerIban: Record<string, number> = {};
    for (const [iban, { saldo }] of ibanSaldoMap.entries()) {
      huidigSaldoPerIban[iban] = Math.round(saldo * 100) / 100;
    }

    // Huidig totaal saldo: als IBAN-filter actief → 1 rekening, anders som van alle
    const huidigSaldo = args.ibanFilter
      ? Math.round((ibanSaldoMap.get(args.ibanFilter)?.saldo ?? 0) * 100) / 100
      : Math.round(
          Array.from(ibanSaldoMap.values()).reduce((sum, { saldo }) => sum + saldo, 0) * 100
        ) / 100;

    // ─── Saldo per maand (voor lijndiagram) ───────────────────────────────────
    // Ook hier: hoogste volgnr binnen dezelfde datum wint.
    const maandMap = new Map<string, { datum: string; volgnr: string; saldo: number }>();
    for (const t of txs) {
      const maand = t.datum.slice(0, 7);
      const prev = maandMap.get(maand);
      const isLater =
        !prev ||
        t.datum > prev.datum ||
        (t.datum === prev.datum && t.volgnr > prev.volgnr);
      if (isLater) {
        maandMap.set(maand, { datum: t.datum, volgnr: t.volgnr, saldo: t.saldoNaTrn });
      }
    }
    const saldoPerMaand = Array.from(maandMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([maand, { saldo }]) => ({ maand, saldo }));

    // ─── Uitgaven per categorie (with counts & percentage) ──────────────────────
    const categorieMap = new Map<string, { bedrag: number; count: number }>();
    for (const t of extern) {
      if (t.bedrag >= 0) continue;
      const cat = t.categorie ?? "Overig";
      const prev = categorieMap.get(cat) ?? { bedrag: 0, count: 0 };
      categorieMap.set(cat, { bedrag: prev.bedrag + Math.abs(t.bedrag), count: prev.count + 1 });
    }
    const totalUitAbs = Math.abs(totaalUit);
    const uitPerCategorie = Array.from(categorieMap.entries())
      .sort(([, a], [, b]) => b.bedrag - a.bedrag)
      .map(([categorie, { bedrag, count }]) => ({
        categorie,
        bedrag: Math.round(bedrag * 100) / 100,
        count,
        percentage: totalUitAbs > 0 ? Math.round((bedrag / totalUitAbs) * 1000) / 10 : 0,
      }));

    // ─── Inkomsten per categorie ─────────────────────────────────────────────
    const inkomstMap = new Map<string, { bedrag: number; count: number }>();
    for (const t of extern) {
      if (t.bedrag <= 0) continue;
      const cat = t.categorie ?? "Overig";
      const prev = inkomstMap.get(cat) ?? { bedrag: 0, count: 0 };
      inkomstMap.set(cat, { bedrag: prev.bedrag + t.bedrag, count: prev.count + 1 });
    }
    const inPerCategorie = Array.from(inkomstMap.entries())
      .sort(([, a], [, b]) => b.bedrag - a.bedrag)
      .map(([categorie, { bedrag, count }]) => ({
        categorie,
        bedrag: Math.round(bedrag * 100) / 100,
        count,
      }));

    // ─── In/Uit per maand (for area chart) ───────────────────────────────────
    const maandInUitMap = new Map<string, { inkomsten: number; uitgaven: number }>();
    for (const t of extern) {
      const maand = t.datum.slice(0, 7);
      const prev = maandInUitMap.get(maand) ?? { inkomsten: 0, uitgaven: 0 };
      if (t.bedrag > 0) prev.inkomsten += t.bedrag;
      else prev.uitgaven += Math.abs(t.bedrag);
      maandInUitMap.set(maand, prev);
    }
    const inUitPerMaand = Array.from(maandInUitMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([maand, { inkomsten, uitgaven }]) => ({
        maand,
        inkomsten: Math.round(inkomsten * 100) / 100,
        uitgaven: Math.round(uitgaven * 100) / 100,
        netto: Math.round((inkomsten - uitgaven) * 100) / 100,
      }));

    // ─── Top merchants ───────────────────────────────────────────────────────
    const merchantMap = new Map<string, { bedrag: number; count: number }>();
    for (const t of extern) {
      if (t.bedrag >= 0 || !t.tegenpartijNaam) continue;
      const naam = t.tegenpartijNaam;
      const prev = merchantMap.get(naam) ?? { bedrag: 0, count: 0 };
      merchantMap.set(naam, { bedrag: prev.bedrag + Math.abs(t.bedrag), count: prev.count + 1 });
    }
    const topMerchants = Array.from(merchantMap.entries())
      .sort(([, a], [, b]) => b.bedrag - a.bedrag)
      .slice(0, 10)
      .map(([naam, { bedrag, count }]) => ({
        naam,
        bedrag: Math.round(bedrag * 100) / 100,
        count,
      }));

    // ─── Beschikbare maanden voor dropdown ────────────────────────────────────
    const maanden = Array.from(new Set(txs.map((t) => t.datum.slice(0, 7)))).sort();

    // ─── Gemiddeld per maand ─────────────────────────────────────────────────
    const aantalMaanden = Math.max(maanden.length, 1);
    const gemiddeldUit = Math.round((Math.abs(totaalUit) / aantalMaanden) * 100) / 100;
    const gemiddeldIn = Math.round((totaalIn / aantalMaanden) * 100) / 100;

    return {
      // Kasstromen
      totaalIn:       Math.round(totaalIn  * 100) / 100,
      totaalUit:      Math.round(Math.abs(totaalUit) * 100) / 100,
      nettoStroom:    Math.round(nettoStroom * 100) / 100,
      gemiddeldIn,
      gemiddeldUit,

      // Echte bankbalans
      huidigSaldo,
      huidigSaldoPerIban,

      // Categorieën
      uitPerCategorie,
      inPerCategorie,
      aantalCategorieen: categorieMap.size,

      // Grafieken
      saldoPerMaand,
      inUitPerMaand,
      topMerchants,

      // Overige
      storneringen,
      aantalTxs:      txs.length,
      maanden,
      ibannen,
    };
  },
});

/** Interne query: alle transacties voor een user (voor AI actions). */
export const listInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) =>
    ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect(),
});

/** Interne mutation: bulk categorie update (voor Grok AI). */
export const bulkUpdateCategorieInternal = internalMutation({
  args: {
    userId: v.string(),
    ids: v.array(v.id("transactions")),
    categorie: v.string(),
  },
  handler: async (ctx, { userId, ids, categorie }) => {
    let updated = 0;
    for (const id of ids) {
      const tx = await ctx.db.get(id);
      if (tx && tx.userId === userId) {
        await ctx.db.patch(id, { categorie });
        updated++;
      }
    }
    return { updated };
  },
});

// ─── Relabel: re-apply auto-categorization to uncategorized transactions ─────

const CATEGORIE_REGELS: Array<{ pattern: RegExp; categorie: string }> = [
  { pattern: /kilo\s*code|blizzard|steam|epic\s*games|paymentwall|battle\.?net|xsolla|g2a\.?com|codesdirect|kinguin|kingboost|moonflash|cleverbridge|k4g|driffle|skine\.com|chesscom|vintrica|google\s*play|flashpay|paypal|online\s*payment/i, categorie: "Gaming" },
  { pattern: /videoland|netflix|spotify|apple\.com|disney|prime\s*video/i, categorie: "Streaming" },
  { pattern: /btc\s*direct|bitvavo|coinbase|kraken|skrill/i, categorie: "Crypto" },
  { pattern: /figma|canva|notion|reclaim|todoist|adobe|openai|github|vercel|microsoft|noordcode|go\s*daddy|tazapay/i, categorie: "SaaS" },
  { pattern: /parfumado|bol\.?com|amazon|zalando|coolblue|creative\s*fabrica|bitsandparts|winparts|nyx|klarna|tapijtenloods|gamma|hema|kruidvat|veral|insonder|babassu|xxl\s*nutrition/i, categorie: "Online Winkelen" },
  { pattern: /univ[eé]|asr|nationale.nederlanden|cz\s|vgz|menzis|anwb/i, categorie: "Verzekeringen" },
  { pattern: /zorgverzekering|zorgpremie|eigen\s*risico/i, categorie: "Zorgverzekering" },
  { pattern: /odido|t-mobile|kpn|vodafone|tele2|cm\.com/i, categorie: "Telecom" },
  { pattern: /shell|bp|tango|tamoil|tinq|texaco|total\s*energies|esso/i, categorie: "Brandstof" },
  { pattern: /ns\.nl|connexxion|arriva|ov-chipkaart|ov\s*betalen|parkeer|park\.\s*|qcarwash|tmc\*|q\s*park|h-wijk/i, categorie: "Vervoer" },
  { pattern: /jumbo|albert\s*heijn|ah\s*\w|lidl|aldi|dirk|supershop|deka\s*markt|spar\s|plus\s|coop\s|vomar|welkoop|bruna|visscher\s*vis/i, categorie: "Boodschappen" },
  { pattern: /mcdonald|burger\s*king|kfc|subway|dominos|kwalitaria|takeaway|thuisbezorgd/i, categorie: "Fastfood" },
  { pattern: /basic.?fit|fitness|sportschool/i, categorie: "Sport" },
  { pattern: /s\s*heeren\s*loo|heeren\s*loo|zorggroep/i, categorie: "Salaris" },
  { pattern: /zorgtoeslag|belastingdienst|toeslagen|\bbelasting\b/i, categorie: "Toeslagen" },
  { pattern: /gemeente|waterschap|eneco|vattenfall|greenchoice|rabobank\s*nederland|cjib|bng\*/i, categorie: "Vaste Lasten" },
  { pattern: /geldmaat|geldautomaat|atm/i, categorie: "Geldopname" },
  { pattern: /sh\s*zwolle|kdl\s*bv/i, categorie: "Coffeeshop" },
  { pattern: /lavente|siekmans|terpstra|weissgerber|bone|gebhardt|brandenburg/i, categorie: "Familie" },
  { pattern: /brouwers|somerville|van\s*der\s*klis/i, categorie: "Vrienden" },
  { pattern: /toprak|henke|panhuis/i, categorie: "Zakelijk" },
  { pattern: /cebu|cuna\s*hotel|bdounibank|topsinb|presse\s*du\s*haut|tabac\s*de\s*morillon|sas\s*m\s*j\s*s/i, categorie: "Vakantie" },
  { pattern: /veluwse\s*bron|schaak/i, categorie: "Vrije Tijd" },
];

function autoCategorie(naam?: string, omschrijving?: string, bedrag?: number): string | undefined {
  const haystack = `${naam ?? ""} ${omschrijving ?? ""}`;
  if (/supertank/i.test(haystack)) {
    return (bedrag !== undefined && Math.abs(bedrag) < 25) ? "Fastfood" : "Brandstof";
  }
  for (const r of CATEGORIE_REGELS) {
    if (r.pattern.test(haystack)) return r.categorie;
  }
  return undefined;
}

/** Re-apply auto-categorization rules to all uncategorized transactions. */
export const relabelAll = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const all = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let updated = 0;
    let skipped = 0;
    const changes: Record<string, number> = {};

    for (const tx of all) {
      if (tx.categorie) { skipped++; continue; }

      const cat = autoCategorie(tx.tegenpartijNaam ?? undefined, tx.omschrijving, tx.bedrag);
      if (cat) {
        await ctx.db.patch(tx._id, { categorie: cat });
        changes[cat] = (changes[cat] ?? 0) + 1;
        updated++;
      }
    }

    return { updated, skipped, stillUnlabeled: all.length - skipped - updated, changes };
  },
});
