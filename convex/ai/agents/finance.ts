/**
 * 💰 Finance Agent — "De financieel adviseur"
 *
 * Expert in salaris, ORT, transacties, en financiële analyse.
 * Token-safe: beperkt transacties tot huidige maand + top 10.
 */

import type { AgentDefinition, ContextOptions } from "../registry";

export const financeAgent: AgentDefinition = {
  id:           "finance",
  naam:         "Finance Agent",
  emoji:        "💰",
  beschrijving: "Financieel adviseur. Analyseert salaris (incl. ORT/weekendtoeslag), " +
                "bank transacties, uitgavenpatronen, en geeft prognoses.",
  domein:       ["salary", "transactions"],
  capabilities: [
    "Salaris prognose per maand berekenen",
    "ORT-toeslag specificatie tonen",
    "Transactie historie analyseren",
    "Uitgaven per categorie groeperen",
    "Inkomsten vs. uitgaven trend",
    "Grootste uitgaven identificeren",
  ],
  tools: [
    {
      naam: "salary.getByPeriode", type: "query",
      beschrijving: "Salaris ophalen voor specifieke maand",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "periode", type: "string", beschrijving: "Maand in YYYY-MM formaat", verplicht: true },
      ],
    },
    {
      naam: "salary.computeFromSchedule", type: "query",
      beschrijving: "Salaris herberekenen op basis van huidig rooster",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "periode", type: "string", beschrijving: "Maand in YYYY-MM formaat", verplicht: true },
      ],
    },
    {
      naam: "transactions.listPaginated", type: "query",
      beschrijving: "Transacties ophalen met paginering",
      parameters: [
        { naam: "userId", type: "string", beschrijving: "Gebruiker ID", verplicht: true },
        { naam: "categorie", type: "string", beschrijving: "Filter op categorie", verplicht: false },
        { naam: "limiet", type: "number", beschrijving: "Max aantal resultaten (default 50)", verplicht: false },
      ],
    },
    {
      naam: "transactions.updateCategorie", type: "mutation",
      beschrijving: "Categorie van een transactie wijzigen",
      methode: "POST",
      parameters: [
        { naam: "id", type: "string", beschrijving: "Transactie ID", verplicht: true },
        { naam: "categorie", type: "string", beschrijving: "Nieuwe categorie", verplicht: true, enum: ["Boodschappen", "Vaste lasten", "Vrije tijd", "Abonnementen", "Vervoer", "Zorg", "Overig"] },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    const now     = new Date();
    const periode = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const allSalary = await ctx.db.query("salary").withIndex("by_user", (q) => q.eq("userId", userId)).collect();

    // ── Lite mode (voor dashboard) ────────────────────────────────────────
    if (opts?.lite) {
      const huidigeMaand = allSalary.find((s) => s.periode === periode);
      return {
        salaris: huidigeMaand ? { bruto: huidigeMaand.brutoBetaling, netto: huidigeMaand.nettoPrognose, ort: huidigeMaand.ortTotaal } : null,
        periode,
      };
    }

    // Token-safe: alleen transacties van afgelopen 30 dagen
    const dertigDagenGeleden = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
    const allTxs = await ctx.db.query("transactions").withIndex("by_user", (q) => q.eq("userId", userId)).collect();
    const recenteTxs = allTxs.filter((tx) => tx.datum >= dertigDagenGeleden);

    // ── Salaris ───────────────────────────────────────────────────────────
    const huidigeMaand = allSalary.find((s) => s.periode === periode);
    const salaryHistory = allSalary
      .sort((a, b) => b.periode.localeCompare(a.periode))
      .slice(0, 6)
      .map((s) => ({ periode: s.periode, bruto: s.brutoBetaling, netto: s.nettoPrognose, ort: s.ortTotaal, diensten: s.aantalDiensten }));

    // ── Categorie verdeling (30 dagen) ────────────────────────────────────
    const categorieen: Record<string, { aantal: number; totaal: number }> = {};
    for (const tx of recenteTxs) {
      const cat = tx.categorie ?? "Onbekend";
      if (!categorieen[cat]) categorieen[cat] = { aantal: 0, totaal: 0 };
      categorieen[cat].aantal++;
      categorieen[cat].totaal = Math.round((categorieen[cat].totaal + tx.bedrag) * 100) / 100;
    }

    // ── Inkomsten vs uitgaven (huidige maand) ─────────────────────────────
    const maandTxs = recenteTxs.filter((tx) => tx.datum.startsWith(periode));
    const inkomsten = maandTxs.filter((tx) => tx.bedrag > 0).reduce((s, tx) => s + tx.bedrag, 0);
    const uitgaven  = maandTxs.filter((tx) => tx.bedrag < 0).reduce((s, tx) => s + tx.bedrag, 0);

    // ── Top uitgaven (max 10) ─────────────────────────────────────────────
    const topUitgaven = recenteTxs
      .filter((tx) => tx.bedrag < 0)
      .sort((a, b) => a.bedrag - b.bedrag)
      .slice(0, 10)
      .map((tx) => ({
        datum: tx.datum, bedrag: tx.bedrag,
        tegenpartij: tx.tegenpartijNaam ?? "Onbekend",
        omschrijving: tx.omschrijving.slice(0, 50),
        categorie: tx.categorie,
      }));

    const laatsteTx = allTxs.sort((a, b) => b.datum.localeCompare(a.datum))[0];

    return {
      periode,
      salaris: {
        huidigeMaand: huidigeMaand ? {
          bruto: huidigeMaand.brutoBetaling, netto: huidigeMaand.nettoPrognose,
          ort: huidigeMaand.ortTotaal, diensten: huidigeMaand.aantalDiensten, basis: huidigeMaand.basisLoon,
        } : null,
        historie: salaryHistory,
      },
      transacties: {
        totaal: allTxs.length,
        periode: `Afgelopen 30 dagen (${recenteTxs.length} transacties)`,
        huidigSaldo: laatsteTx?.saldoNaTrn ?? null,
        dezeMaand: { inkomsten: Math.round(inkomsten * 100) / 100, uitgaven: Math.round(uitgaven * 100) / 100, netto: Math.round((inkomsten + uitgaven) * 100) / 100 },
        categorieen,
        topUitgaven,
      },
    };
  },
};
