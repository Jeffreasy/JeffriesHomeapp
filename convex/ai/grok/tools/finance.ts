/**
 * convex/ai/grok/tools/finance.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Finance tool handler — bank transaction search.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internal } from "../../../_generated/api";

export async function handleTransactiesZoeken(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const zoekterm = (args.zoekterm as string).toLowerCase();
    const maxAantal = (args.maxAantal as number) ?? 15;
    const categorie = args.categorie as string | undefined;

    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
    let matches = allTxs.filter((tx: any) =>
      tx.tegenpartijNaam?.toLowerCase().includes(zoekterm) ||
      tx.omschrijving?.toLowerCase().includes(zoekterm)
    );

    if (categorie) matches = matches.filter((tx: any) => tx.categorie === categorie);

    const results = matches
      .sort((a: any, b: any) => b.datum.localeCompare(a.datum))
      .slice(0, maxAantal)
      .map((tx: any) => ({
        datum: tx.datum, bedrag: tx.bedrag,
        tegenpartij: tx.tegenpartijNaam ?? "Onbekend",
        omschrijving: tx.omschrijving?.slice(0, 60),
        categorie: tx.categorie, saldo: tx.saldoNaTrn,
      }));

    const totaal = matches.reduce((s: number, tx: any) => s + tx.bedrag, 0);

    return JSON.stringify({
      zoekterm, resultaten: matches.length,
      getoond: results.length, totaalBedrag: Math.round(totaal * 100) / 100,
      transacties: results,
    });
  } catch (err) {
    return JSON.stringify({ error: `Transacties zoeken mislukt: ${(err as Error).message}` });
  }
}

const MAAND_NAMEN = ["", "Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];

export async function handleUitgavenOverzicht(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const maand = args.maand as number;
    const jaar = (args.jaar as number) ?? new Date().getFullYear();
    const periode = `${jaar}-${String(maand).padStart(2, "0")}`;
    const categorie = args.categorie as string | undefined;
    const topN = (args.top as number) ?? 10;

    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
    let maandTxs = allTxs.filter((tx: any) => tx.datum?.startsWith(periode));

    if (categorie) maandTxs = maandTxs.filter((tx: any) => tx.categorie === categorie);

    const inkomsten = maandTxs.filter((tx: any) => tx.bedrag > 0);
    const uitgaven = maandTxs.filter((tx: any) => tx.bedrag < 0);

    const totaalInkomsten = inkomsten.reduce((s: number, tx: any) => s + tx.bedrag, 0);
    const totaalUitgaven = uitgaven.reduce((s: number, tx: any) => s + tx.bedrag, 0);

    const categorieen: Record<string, { aantal: number; totaal: number }> = {};
    for (const tx of maandTxs) {
      const cat = tx.categorie ?? "Onbekend";
      if (!categorieen[cat]) categorieen[cat] = { aantal: 0, totaal: 0 };
      categorieen[cat].aantal++;
      categorieen[cat].totaal = Math.round((categorieen[cat].totaal + tx.bedrag) * 100) / 100;
    }

    const topUitgaven = uitgaven
      .sort((a: any, b: any) => a.bedrag - b.bedrag)
      .slice(0, topN)
      .map((tx: any) => ({
        datum: tx.datum, bedrag: tx.bedrag,
        tegenpartij: tx.tegenpartijNaam ?? "Onbekend",
        omschrijving: tx.omschrijving?.slice(0, 50),
        categorie: tx.categorie,
      }));

    return JSON.stringify({
      titel: `${MAAND_NAMEN[maand]} ${jaar}`,
      periode,
      samenvatting: {
        totaalTransacties: maandTxs.length,
        inkomsten: Math.round(totaalInkomsten * 100) / 100,
        uitgaven: Math.round(totaalUitgaven * 100) / 100,
        netto: Math.round((totaalInkomsten + totaalUitgaven) * 100) / 100,
      },
      categorieen,
      topUitgaven,
    });
  } catch (err) {
    return JSON.stringify({ error: `Uitgaven overzicht mislukt: ${(err as Error).message}` });
  }
}
