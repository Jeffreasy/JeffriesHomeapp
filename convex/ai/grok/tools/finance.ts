/**
 * convex/ai/grok/tools/finance.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Finance tool handlers — saldo, transactions, expenses, recurring, categories.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { api, internal } from "../../../_generated/api";
import { MAAND_NAMEN, IBAN_LABELS } from "../types";

// ─── Helper ──────────────────────────────────────────────────────────────────

function labelIban(iban: string): string {
  return IBAN_LABELS[iban] ?? iban.slice(-4);
}

// ─── 1. Saldo Opvragen ───────────────────────────────────────────────────────

export async function handleSaldoOpvragen(ctx: any, _args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });

    // Per IBAN: vind de transactie met de meest recente datum+volgnr
    const ibanMap = new Map<string, { datum: string; volgnr: string; saldo: number }>();
    for (const tx of allTxs) {
      const prev = ibanMap.get(tx.rekeningIban);
      const isLater = !prev || tx.datum > prev.datum || (tx.datum === prev.datum && tx.volgnr > prev.volgnr);
      if (isLater) ibanMap.set(tx.rekeningIban, { datum: tx.datum, volgnr: tx.volgnr, saldo: tx.saldoNaTrn });
    }

    const rekeningen = Array.from(ibanMap.entries()).map(([iban, data]) => ({
      rekening: labelIban(iban),
      iban,
      saldo: Math.round(data.saldo * 100) / 100,
      peildatum: data.datum,
    }));

    const totaal = rekeningen.reduce((s, r) => s + r.saldo, 0);

    return JSON.stringify({
      rekeningen,
      totaalSaldo: Math.round(totaal * 100) / 100,
      aantalTransacties: allTxs.length,
    });
  } catch (err) {
    return JSON.stringify({ error: `Saldo ophalen mislukt: ${(err as Error).message}` });
  }
}

// ─── 2. Transacties Zoeken (uitgebreid) ──────────────────────────────────────

export async function handleTransactiesZoeken(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const zoekterm = (args.zoekterm as string).toLowerCase();
    const maxAantal = (args.maxAantal as number) ?? 15;
    const categorie = args.categorie as string | undefined;
    const rekening = args.rekening as string | undefined;

    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
    let matches = allTxs.filter((tx: any) =>
      tx.tegenpartijNaam?.toLowerCase().includes(zoekterm) ||
      tx.omschrijving?.toLowerCase().includes(zoekterm)
    );

    if (categorie) matches = matches.filter((tx: any) => tx.categorie === categorie);
    if (rekening) {
      const iban = Object.entries(IBAN_LABELS).find(([, label]) => label.toLowerCase().includes(rekening.toLowerCase()))?.[0];
      if (iban) matches = matches.filter((tx: any) => tx.rekeningIban === iban);
    }

    const results = matches
      .sort((a: any, b: any) => b.datum.localeCompare(a.datum))
      .slice(0, maxAantal)
      .map((tx: any) => ({
        datum: tx.datum, bedrag: tx.bedrag,
        tegenpartij: tx.tegenpartijNaam ?? "Onbekend",
        omschrijving: tx.omschrijving,
        categorie: tx.categorie,
        saldo: tx.saldoNaTrn,
        rekening: labelIban(tx.rekeningIban),
        code: tx.code,
        interneBoeking: tx.isInterneOverboeking,
        referentie: tx.referentie,
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

// ─── 3. Uitgaven Overzicht (uitgebreid) ──────────────────────────────────────

export async function handleUitgavenOverzicht(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const maand = args.maand as number;
    const jaar = (args.jaar as number) ?? new Date().getFullYear();
    const periode = `${jaar}-${String(maand).padStart(2, "0")}`;
    const categorie = args.categorie as string | undefined;
    const rekening = args.rekening as string | undefined;
    const topN = (args.top as number) ?? 10;

    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
    let maandTxs = allTxs.filter((tx: any) => tx.datum?.startsWith(periode));

    if (rekening) {
      const iban = Object.entries(IBAN_LABELS).find(([, label]) => label.toLowerCase().includes(rekening.toLowerCase()))?.[0];
      if (iban) maandTxs = maandTxs.filter((tx: any) => tx.rekeningIban === iban);
    }
    if (categorie) maandTxs = maandTxs.filter((tx: any) => tx.categorie === categorie);

    // Exclude interne overboekingen uit totalen
    const extern = maandTxs.filter((tx: any) => !tx.isInterneOverboeking);
    const inkomsten = extern.filter((tx: any) => tx.bedrag > 0);
    const uitgaven = extern.filter((tx: any) => tx.bedrag < 0);

    const totaalInkomsten = inkomsten.reduce((s: number, tx: any) => s + tx.bedrag, 0);
    const totaalUitgaven = uitgaven.reduce((s: number, tx: any) => s + tx.bedrag, 0);

    const categorieen: Record<string, { aantal: number; totaal: number }> = {};
    for (const tx of extern) {
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
        omschrijving: tx.omschrijving?.slice(0, 80),
        categorie: tx.categorie,
        rekening: labelIban(tx.rekeningIban),
      }));

    // Eindsaldo van de maand
    const maandEinde = maandTxs
      .sort((a: any, b: any) => b.datum.localeCompare(a.datum) || b.volgnr.localeCompare(a.volgnr));
    const eindSaldo = maandEinde[0]?.saldoNaTrn;

    return JSON.stringify({
      titel: `${MAAND_NAMEN[maand]} ${jaar}`,
      periode,
      samenvatting: {
        totaalTransacties: extern.length,
        interneOverboekingen: maandTxs.length - extern.length,
        inkomsten: Math.round(totaalInkomsten * 100) / 100,
        uitgaven: Math.round(totaalUitgaven * 100) / 100,
        netto: Math.round((totaalInkomsten + totaalUitgaven) * 100) / 100,
        eindSaldo: eindSaldo != null ? Math.round(eindSaldo * 100) / 100 : null,
      },
      categorieen,
      topUitgaven,
    });
  } catch (err) {
    return JSON.stringify({ error: `Uitgaven overzicht mislukt: ${(err as Error).message}` });
  }
}

// ─── 4. Maand Vergelijken ────────────────────────────────────────────────────

export async function handleMaandVergelijken(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const maand1 = args.maand1 as number;
    const maand2 = args.maand2 as number;
    const jaar1 = (args.jaar1 as number) ?? new Date().getFullYear();
    const jaar2 = (args.jaar2 as number) ?? jaar1;
    const p1 = `${jaar1}-${String(maand1).padStart(2, "0")}`;
    const p2 = `${jaar2}-${String(maand2).padStart(2, "0")}`;

    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });

    function calcMonth(periode: string) {
      const txs = allTxs.filter((tx: any) => tx.datum?.startsWith(periode) && !tx.isInterneOverboeking);
      const inkomsten = txs.filter((tx: any) => tx.bedrag > 0).reduce((s: number, tx: any) => s + tx.bedrag, 0);
      const uitgaven = txs.filter((tx: any) => tx.bedrag < 0).reduce((s: number, tx: any) => s + tx.bedrag, 0);
      const cats: Record<string, number> = {};
      for (const tx of txs) {
        if (tx.bedrag >= 0) continue;
        const cat = tx.categorie ?? "Onbekend";
        cats[cat] = Math.round(((cats[cat] ?? 0) + Math.abs(tx.bedrag)) * 100) / 100;
      }
      return {
        transacties: txs.length,
        inkomsten: Math.round(inkomsten * 100) / 100,
        uitgaven: Math.round(uitgaven * 100) / 100,
        netto: Math.round((inkomsten + uitgaven) * 100) / 100,
        perCategorie: cats,
      };
    }

    const m1 = calcMonth(p1);
    const m2 = calcMonth(p2);
    const maandIdx1 = parseInt(p1.slice(5, 7));
    const maandIdx2 = parseInt(p2.slice(5, 7));

    return JSON.stringify({
      vergelijking: `${MAAND_NAMEN[maandIdx1]} ${jaar1} vs. ${MAAND_NAMEN[maandIdx2]} ${jaar2}`,
      [MAAND_NAMEN[maandIdx1]]: m1,
      [MAAND_NAMEN[maandIdx2]]: m2,
      verschil: {
        inkomsten: Math.round((m2.inkomsten - m1.inkomsten) * 100) / 100,
        uitgaven: Math.round((m2.uitgaven - m1.uitgaven) * 100) / 100,
        netto: Math.round((m2.netto - m1.netto) * 100) / 100,
        meerUitgegeven: m2.uitgaven < m1.uitgaven,
      },
    });
  } catch (err) {
    return JSON.stringify({ error: `Maand vergelijken mislukt: ${(err as Error).message}` });
  }
}

// ─── 5. Vaste Lasten Analyse ─────────────────────────────────────────────────

export async function handleVasteLastenAnalyse(ctx: any, _args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
    const extern = allTxs.filter((tx: any) => !tx.isInterneOverboeking && tx.bedrag < 0);

    // Groepeer per tegenpartij
    const partijMap = new Map<string, { bedragen: number[]; maanden: Set<string>; categorie: string | null }>();
    for (const tx of extern) {
      const naam = tx.tegenpartijNaam ?? "Onbekend";
      if (!partijMap.has(naam)) partijMap.set(naam, { bedragen: [], maanden: new Set(), categorie: tx.categorie });
      const entry = partijMap.get(naam)!;
      entry.bedragen.push(tx.bedrag);
      entry.maanden.add(tx.datum.slice(0, 7));
    }

    // Filter: verschijnt in ≥3 verschillende maanden
    const vasteLasten = Array.from(partijMap.entries())
      .filter(([, data]) => data.maanden.size >= 3)
      .map(([naam, data]) => {
        const avg = data.bedragen.reduce((s, b) => s + b, 0) / data.bedragen.length;
        return {
          tegenpartij: naam,
          gemiddeldBedrag: Math.round(avg * 100) / 100,
          aantalBetalingen: data.bedragen.length,
          aantalMaanden: data.maanden.size,
          categorie: data.categorie,
          laatstBetaald: [...data.maanden].sort().pop(),
        };
      })
      .sort((a, b) => a.gemiddeldBedrag - b.gemiddeldBedrag);

    const totaalPerMaand = vasteLasten.reduce((s, v) => s + v.gemiddeldBedrag, 0);

    return JSON.stringify({
      titel: "Vaste Lasten Analyse",
      beschrijving: "Terugkerende uitgaven die in ≥3 maanden voorkomen",
      totaalGemiddeldPerMaand: Math.round(totaalPerMaand * 100) / 100,
      aantalVasteLasten: vasteLasten.length,
      vasteLasten,
    });
  } catch (err) {
    return JSON.stringify({ error: `Vaste lasten analyse mislukt: ${(err as Error).message}` });
  }
}

// ─── 6. Categorie Wijzigen ───────────────────────────────────────────────────

export async function handleCategorieWijzigen(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const zoekterm = (args.zoekterm as string).toLowerCase();
    const nieuweCategorie = args.categorie as string;

    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
    const match = allTxs
      .sort((a: any, b: any) => b.datum.localeCompare(a.datum))
      .find((tx: any) =>
        tx.tegenpartijNaam?.toLowerCase().includes(zoekterm) ||
        tx.omschrijving?.toLowerCase().includes(zoekterm)
      );

    if (!match) {
      return JSON.stringify({ error: `Geen transactie gevonden met "${args.zoekterm}"` });
    }

    await ctx.runMutation(api.transactions.updateCategorie, {
      id: match._id,
      categorie: nieuweCategorie,
    });

    return JSON.stringify({
      ok: true,
      beschrijving: `Categorie gewijzigd naar "${nieuweCategorie}"`,
      transactie: {
        datum: match.datum,
        bedrag: match.bedrag,
        tegenpartij: match.tegenpartijNaam ?? "Onbekend",
        oudeCategorie: match.categorie ?? "Geen",
        nieuweCategorie,
      },
    });
  } catch (err) {
    return JSON.stringify({ error: `Categorie wijzigen mislukt: ${(err as Error).message}` });
  }
}
