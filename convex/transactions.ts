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

type TransactionOrder = { datum: string; volgnr: string };

function compareVolgnr(a: string, b: string): number {
  const na = Number.parseInt(a, 10);
  const nb = Number.parseInt(b, 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true });
}

function compareTransactionOrder(a: TransactionOrder, b: TransactionOrder): number {
  const dateCompare = a.datum.localeCompare(b.datum);
  if (dateCompare !== 0) return dateCompare;
  return compareVolgnr(a.volgnr, b.volgnr);
}

function isLaterTransaction(current: TransactionOrder, previous?: TransactionOrder): boolean {
  return !previous || compareTransactionOrder(current, previous) > 0;
}

function normalizeBankDate(raw: string): string {
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const dutch = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dutch) {
    const [, dd, mm, yyyy] = dutch;
    return `${yyyy}-${mm}-${dd}`;
  }

  return value;
}

function withNormalizedDatum<T extends { datum: string }>(tx: T): T {
  const datum = normalizeBankDate(tx.datum);
  return datum === tx.datum ? tx : { ...tx, datum };
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export const importBatch = mutation({
  args: { transactions: v.array(transactionInput) },
  handler: async (ctx, { transactions }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Niet ingelogd");
    const userId = identity.subject;

    let toegevoegd = 0;
    let overgeslagen = 0;
    let bijgewerkt = 0;
    let internAangepast = 0;

    const bestaandeTxs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const bekendeIbans = new Set<string>([
      ...bestaandeTxs.map((tx) => tx.rekeningIban),
      ...transactions.map((tx) => tx.rekeningIban),
    ].filter(Boolean));

    const isEigenOverboeking = (tx: { rekeningIban: string; tegenrekeningIban?: string }) =>
      !!tx.tegenrekeningIban &&
      tx.rekeningIban !== tx.tegenrekeningIban &&
      bekendeIbans.has(tx.rekeningIban) &&
      bekendeIbans.has(tx.tegenrekeningIban);

    for (const tx of transactions) {
      const normalizedTx = { ...tx, datum: normalizeBankDate(tx.datum) };
      const existing = await ctx.db
        .query("transactions")
        .withIndex("by_user_rekening_volgnr", (q) =>
          q.eq("userId", userId).eq("rekeningIban", normalizedTx.rekeningIban).eq("volgnr", normalizedTx.volgnr)
        )
        .first();

      if (existing) {
        const isIntern = normalizedTx.isInterneOverboeking || isEigenOverboeking(normalizedTx);
        const patch: { datum?: string; isInterneOverboeking?: boolean; categorie?: string } = {};

        if (existing.datum !== normalizedTx.datum) patch.datum = normalizedTx.datum;
        if (isIntern && !existing.isInterneOverboeking) {
          patch.isInterneOverboeking = true;
          patch.categorie = "Interne Overboeking";
        }

        if (Object.keys(patch).length > 0) {
          await ctx.db.patch(existing._id, patch);
          bijgewerkt++;
        } else {
          overgeslagen++;
        }
        continue;
      }

      const isIntern = normalizedTx.isInterneOverboeking || isEigenOverboeking(normalizedTx);
      await ctx.db.insert("transactions", {
        ...normalizedTx,
        userId,
        isInterneOverboeking: isIntern,
        categorie: isIntern ? "Interne Overboeking" : normalizedTx.categorie,
      });
      bekendeIbans.add(normalizedTx.rekeningIban);
      toegevoegd++;
    }

    const alleTxs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const tx of alleTxs) {
      if (!isEigenOverboeking(tx) || tx.isInterneOverboeking) continue;
      await ctx.db.patch(tx._id, {
        isInterneOverboeking: true,
        categorie: "Interne Overboeking",
      });
      internAangepast++;
    }

    return { toegevoegd, overgeslagen, bijgewerkt, internAangepast };
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

/** Eenmalige datakwaliteit-repair voor oudere imports met DD-MM-YYYY datums. */
export const repairStoredDates = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Niet ingelogd");
    const userId = identity.subject;

    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let bijgewerkt = 0;
    let onveranderd = 0;
    let ongeldig = 0;

    for (const tx of txs) {
      const datum = normalizeBankDate(tx.datum);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
        ongeldig++;
        continue;
      }

      if (datum === tx.datum) {
        onveranderd++;
        continue;
      }

      await ctx.db.patch(tx._id, { datum });
      bijgewerkt++;
    }

    return { bijgewerkt, onveranderd, ongeldig, totaal: txs.length };
  },
});

export const updateCategorieInternal = internalMutation({
  args: { userId: v.string(), id: v.id("transactions"), categorie: v.optional(v.string()) },
  handler: async (ctx, { userId, id, categorie }) => {
    const tx = await ctx.db.get(id);
    if (!tx || tx.userId !== userId) throw new Error("Transactie niet gevonden");
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
 * OPLOSSING: filter server-side over de volledige relevante set en retourneer
 * cumulatief pagina 1..N. Zo blijven oudere zoekmatches bereikbaar en hoeft de
 * client geen losse pagina's te stapelen.
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
    categorieFilter:  v.optional(v.string()),
    richting:         v.optional(v.string()), // "in" | "uit"
    minBedrag:        v.optional(v.number()),
    maxBedrag:        v.optional(v.number()),
    datumVan:         v.optional(v.string()), // "YYYY-MM-DD"
    datumTot:         v.optional(v.string()), // "YYYY-MM-DD"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { page: [], isDone: true, continueCursor: null, totalCount: 0 };
    const userId = identity.subject;

    // Gemeenschappelijke post-filter functie
    type FilterableTx = {
      isInterneOverboeking: boolean;
      code: string;
      rekeningIban: string;
      volgnr: string;
      tegenpartijNaam?: string;
      omschrijving: string;
      bedrag: number;
      categorie?: string;
      datum: string;
    };

    const effectiefVan = args.datumVan ?? (args.maandFilter ? args.maandFilter + "-01" : undefined);
    const effectiefTot = args.datumTot ?? (args.maandFilter ? args.maandFilter + "-31" : undefined);
    const zoek = args.zoekterm?.toLowerCase().trim();
    const postFilter = (t: FilterableTx) => {
      if (args.excludeIntern    && t.isInterneOverboeking)             return false;
      if (args.onlyStorneringen && t.code !== "st")                     return false;
      if (args.codeFilter       && t.code !== args.codeFilter)          return false;
      if (args.ibanFilter       && t.rekeningIban !== args.ibanFilter)  return false;
      if (args.categorieFilter  && t.categorie !== args.categorieFilter) return false;
      if (args.richting === "in"  && t.bedrag <= 0)                     return false;
      if (args.richting === "uit" && t.bedrag >= 0)                     return false;
      if (args.minBedrag !== undefined && Math.abs(t.bedrag) < args.minBedrag) return false;
      if (args.maxBedrag !== undefined && Math.abs(t.bedrag) > args.maxBedrag) return false;
      if (effectiefVan && t.datum < effectiefVan)                       return false;
      if (effectiefTot && t.datum > effectiefTot)                       return false;
      if (zoek) {
        const naam   = (t.tegenpartijNaam ?? "").toLowerCase();
        const omschr = t.omschrijving.toLowerCase();
        if (!naam.includes(zoek) && !omschr.includes(zoek))             return false;
      }
      return true;
    };

    const sortDesc = <T extends TransactionOrder>(a: T, b: T) =>
      compareTransactionOrder(b, a);

    const paginateFiltered = <T extends FilterableTx>(txs: T[]) => {
      const offset = args.cursor ? Number.parseInt(args.cursor, 10) : 0;
      const start = Number.isFinite(offset) && offset > 0 ? offset : 0;
      const filtered = [...txs].sort(sortDesc).filter(postFilter);
      const next = Math.min(start + args.numItems, filtered.length);
      const page = filtered.slice(0, next);

      return {
        page,
        isDone: next >= filtered.length,
        continueCursor: next < filtered.length ? String(next) : null,
        totalCount: filtered.length,
      };
    };

    // Lees via by_user en normaliseer in-memory. Dat houdt oude imports met
    // DD-MM-YYYY/omgekeerde ISO-datums ook bereikbaar voor maand- en jaarfilters.
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return paginateFiltered(txs.map(withNormalizedDatum));
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
  args: {
    ibanFilter:  v.optional(v.string()),
    jaarFilter:  v.optional(v.string()), // "2025" | "2026"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const userId = identity.subject;

    // Haal alle transacties 1x op
    const alleTxsRaw = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const alleTxs = alleTxsRaw.map(withNormalizedDatum);
    const jaren = Array.from(new Set(alleTxs.map((t) => t.datum.slice(0, 4)))).sort().reverse();

    // Filter op IBAN als geselecteerd
    let txs = args.ibanFilter
      ? alleTxs.filter((t) => t.rekeningIban === args.ibanFilter)
      : alleTxs;

    // Filter op jaar als geselecteerd
    if (args.jaarFilter) {
      txs = txs.filter((t) => t.datum.startsWith(args.jaarFilter!));
    }

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
      if (isLaterTransaction(t, prev)) {
        ibanSaldoMap.set(t.rekeningIban, { datum: t.datum, volgnr: t.volgnr, saldo: t.saldoNaTrn });
      }
    }

    // Lijst van IBANs voor de tabbar (altijd op basis van alle transacties)
    const ibannen = Array.from(ibanSaldoMap.keys()).sort();

    // Per IBAN huidig saldo (voor de tabbar-tooltip)
    const huidigSaldoPerIban: Record<string, number> = {};
    const saldoPeildatumPerIban: Record<string, string> = {};
    for (const [iban, { datum, saldo }] of ibanSaldoMap.entries()) {
      huidigSaldoPerIban[iban] = Math.round(saldo * 100) / 100;
      saldoPeildatumPerIban[iban] = datum;
    }
    const laatsteSaldoPeildatum = Array.from(ibanSaldoMap.values())
      .map(({ datum }) => datum)
      .sort()
      .pop() ?? null;

    // Huidig totaal saldo: als IBAN-filter actief → 1 rekening, anders som van alle
    const huidigSaldo = args.ibanFilter
      ? Math.round((ibanSaldoMap.get(args.ibanFilter)?.saldo ?? 0) * 100) / 100
      : Math.round(
          Array.from(ibanSaldoMap.values()).reduce((sum, { saldo }) => sum + saldo, 0) * 100
        ) / 100;

    // ─── Saldo per maand (voor lijndiagram) ───────────────────────────────────
    // Bij alle rekeningen is het maand-eindsaldo de som van de laatste bekende
    // balans per IBAN. Rekeningen zonder transactie in die maand dragen hun
    // laatst bekende balans door.
    const maandenVoorSaldo = Array.from(new Set(txs.map((t) => t.datum.slice(0, 7)))).sort();
    const saldoBron = (args.ibanFilter
      ? alleTxs.filter((t) => t.rekeningIban === args.ibanFilter)
      : alleTxs
    ).sort(compareTransactionOrder);

    const laatsteSaldoPerIban = new Map<string, { datum: string; volgnr: string; saldo: number }>();
    let saldoCursor = 0;
    const saldoPerMaand = maandenVoorSaldo.map((maand) => {
      const maandEinde = `${maand}-31`;

      while (saldoCursor < saldoBron.length && saldoBron[saldoCursor].datum <= maandEinde) {
        const t = saldoBron[saldoCursor];
        laatsteSaldoPerIban.set(t.rekeningIban, {
          datum: t.datum,
          volgnr: t.volgnr,
          saldo: t.saldoNaTrn,
        });
        saldoCursor++;
      }

      const saldo = Array.from(laatsteSaldoPerIban.values()).reduce((sum, item) => sum + item.saldo, 0);
      return { maand, saldo: Math.round(saldo * 100) / 100 };
    });

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
      saldoPeildatumPerIban,
      laatsteSaldoPeildatum,

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
      aantalAlleTxs:   alleTxs.length,
      aantalTxs:      txs.length,
      maanden,
      jaren,
      ibannen,
    };
  },
});

/** Interne query: alle transacties voor een user (voor AI actions). */
export const listInternal = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const txs = await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return txs.map(withNormalizedDatum);
  },
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

import { autoCategorie } from "./lib/autoCategorie";

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
