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
