import { mutation, query } from "./_generated/server";
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

    // ─── Uitgaven per categorie ────────────────────────────────────────────────
    const categorieMap = new Map<string, number>();
    for (const t of extern) {
      if (t.bedrag >= 0) continue;
      const cat = t.categorie ?? "Overig";
      categorieMap.set(cat, (categorieMap.get(cat) ?? 0) + Math.abs(t.bedrag));
    }
    const uitPerCategorie = Array.from(categorieMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([categorie, bedrag]) => ({ categorie, bedrag: Math.round(bedrag * 100) / 100 }));

    // ─── Beschikbare maanden voor dropdown ────────────────────────────────────
    const maanden = Array.from(new Set(txs.map((t) => t.datum.slice(0, 7)))).sort();

    return {
      // Kasstromen (EXCL. beginbalans — informatief)
      totaalIn:       Math.round(totaalIn  * 100) / 100,
      totaalUit:      Math.round(Math.abs(totaalUit) * 100) / 100,
      nettoStroom:    Math.round(nettoStroom * 100) / 100,

      // Echte bankbalans (INCL. beginbalans)
      huidigSaldo,
      huidigSaldoPerIban,

      // Overige
      storneringen,
      aantalTxs:      txs.length,
      saldoPerMaand,
      uitPerCategorie,
      maanden,
      ibannen,
    };
  },
});
