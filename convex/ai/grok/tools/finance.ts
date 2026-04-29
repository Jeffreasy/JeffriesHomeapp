/**
 * convex/ai/grok/tools/finance.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Finance tool handlers — saldo, transactions, expenses, recurring, categories.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { internal } from "../../../_generated/api";
import { MAAND_NAMEN } from "../types";

// ─── Helper ──────────────────────────────────────────────────────────────────

function labelIban(iban: string): string {
  return iban ? `Rekening ${iban.slice(-4)}` : "Onbekende rekening";
}

function rekeningMatches(iban: string, query: string): boolean {
  const normalized = query.toLowerCase().trim();
  return (
    iban.toLowerCase().includes(normalized) ||
    iban.slice(-4).includes(normalized) ||
    labelIban(iban).toLowerCase().includes(normalized)
  );
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
    const zoekterm = (args.zoekterm as string | undefined)?.toLowerCase();
    const maxAantal = (args.maxAantal as number) ?? 50;
    const categorie = args.categorie as string | undefined;
    const rekening = args.rekening as string | undefined;

    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
    let matches = allTxs;

    // Filter by search term if provided
    if (zoekterm) {
      matches = matches.filter((tx: any) =>
        tx.tegenpartijNaam?.toLowerCase().includes(zoekterm) ||
        tx.omschrijving?.toLowerCase().includes(zoekterm)
      );
    }

    if (categorie) matches = matches.filter((tx: any) => tx.categorie === categorie);
    if (rekening) {
      matches = matches.filter((tx: any) => rekeningMatches(tx.rekeningIban, rekening));
    }

    const results = matches
      .sort((a: any, b: any) => b.datum.localeCompare(a.datum))
      .slice(0, maxAantal)
      .map((tx: any) => ({
        id: tx._id,
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
      maandTxs = maandTxs.filter((tx: any) => rekeningMatches(tx.rekeningIban, rekening));
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

    // Eindsaldo van de maand: som van laatste bekende balans per IBAN.
    const laatstePerIban = new Map<string, { datum: string; volgnr: string; saldo: number }>();
    const saldoBron = allTxs
      .filter((tx: any) => tx.datum <= `${periode}-31`)
      .filter((tx: any) => !rekening || rekeningMatches(tx.rekeningIban, rekening))
      .sort((a: any, b: any) => a.datum.localeCompare(b.datum) || a.volgnr.localeCompare(b.volgnr));
    for (const tx of saldoBron) {
      laatstePerIban.set(tx.rekeningIban, { datum: tx.datum, volgnr: tx.volgnr, saldo: tx.saldoNaTrn });
    }
    const eindSaldo = laatstePerIban.size > 0
      ? Array.from(laatstePerIban.values()).reduce((sum, tx) => sum + tx.saldo, 0)
      : null;

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
    const transactieId = args.transactieId as string | undefined;
    const zoekterm = (args.zoekterm as string | undefined)?.toLowerCase();
    const nieuweCategorie = args.categorie as string;

    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
    if (!transactieId) {
      if (!zoekterm) {
        return JSON.stringify({ error: "transactieId is verplicht. Gebruik eerst transactiesZoeken om de exacte transactie te kiezen." });
      }
      const opties = allTxs
        .sort((a: any, b: any) => b.datum.localeCompare(a.datum))
        .filter((tx: any) =>
          tx.tegenpartijNaam?.toLowerCase().includes(zoekterm) ||
          tx.omschrijving?.toLowerCase().includes(zoekterm)
        )
        .slice(0, 10)
        .map((tx: any) => ({
          id: tx._id,
          datum: tx.datum,
          bedrag: tx.bedrag,
          tegenpartij: tx.tegenpartijNaam ?? "Onbekend",
          omschrijving: tx.omschrijving,
          categorie: tx.categorie ?? "Geen",
        }));
      return JSON.stringify({
        error: "Exacte transactieId vereist voordat ik een categorie wijzig.",
        opties,
        hint: "Vraag de gebruiker welke transactie bedoeld wordt en roep daarna categorieWijzigen aan met transactieId.",
      });
    }

    const match = allTxs
      .sort((a: any, b: any) => b.datum.localeCompare(a.datum))
      .find((tx: any) => String(tx._id) === transactieId);

    if (!match) {
      return JSON.stringify({ error: `Geen transactie gevonden met id "${transactieId}"` });
    }

    await ctx.runMutation(internal.transactions.updateCategorieInternal, {
      userId,
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

// ─── 7. Bulk Categoriseren ───────────────────────────────────────────────────

export async function handleBulkCategoriseren(ctx: any, args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const tegenpartij = (args.tegenpartij as string).toLowerCase();
    const categorie = args.categorie as string;

    if (tegenpartij.length < 3) {
      return JSON.stringify({ error: "Tegenpartij is te kort voor bulk categoriseren (minimaal 3 tekens)." });
    }

    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
    const matches = allTxs.filter((tx: any) =>
      tx.tegenpartijNaam?.toLowerCase().includes(tegenpartij)
    );

    if (matches.length === 0) {
      return JSON.stringify({ error: `Geen transacties gevonden voor "${args.tegenpartij}"` });
    }

    const ids = matches.map((tx: any) => tx._id);
    const result = await ctx.runMutation(internal.transactions.bulkUpdateCategorieInternal, {
      userId, ids, categorie,
    });

    return JSON.stringify({
      ok: true,
      beschrijving: `${result.updated} transacties van "${args.tegenpartij}" gecategoriseerd als "${categorie}"`,
      bijgewerkt: result.updated,
      totaalGevonden: matches.length,
    });
  } catch (err) {
    return JSON.stringify({ error: `Bulk categoriseren mislukt: ${(err as Error).message}` });
  }
}

// ─── 8. Ongelabeld Analyse ───────────────────────────────────────────────────

export async function handleOngelabeldAnalyse(ctx: any, _args: Record<string, unknown>, userId: string): Promise<string> {
  try {
    const allTxs = await ctx.runQuery(internal.transactions.listInternal, { userId });
    const ongelabeld = allTxs.filter((tx: any) => !tx.categorie);

    if (ongelabeld.length === 0) {
      return JSON.stringify({ bericht: "Alle transacties hebben een categorie! 🎉", ongelabeld: 0, totaal: allTxs.length });
    }

    // Groepeer op tegenpartij
    const partijMap = new Map<string, { count: number; totaal: number; voorbeeld: string }>();
    for (const tx of ongelabeld) {
      const naam = tx.tegenpartijNaam ?? "Onbekend";
      const prev = partijMap.get(naam);
      if (!prev) {
        partijMap.set(naam, { count: 1, totaal: tx.bedrag, voorbeeld: tx.omschrijving?.slice(0, 60) ?? "" });
      } else {
        prev.count++;
        prev.totaal = Math.round((prev.totaal + tx.bedrag) * 100) / 100;
      }
    }

    const patronen = Array.from(partijMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 20)
      .map(([naam, data]) => ({
        tegenpartij: naam,
        aantalTransacties: data.count,
        totaalBedrag: data.totaal,
        voorbeeldOmschrijving: data.voorbeeld,
        suggestie: suggereerCategorie(naam, data.voorbeeld),
      }));

    return JSON.stringify({
      totaalOngelabeld: ongelabeld.length,
      totaalTransacties: allTxs.length,
      percentage: Math.round((ongelabeld.length / allTxs.length) * 100),
      patronen,
      tip: "Gebruik 'label alle [tegenpartij] als [categorie]' om in bulk te categoriseren.",
      instructie: "TOON ALLEEN DEZE DATA. VERZIN GEEN EXTRA TRANSACTIES OF AANTALLEN. Als er 0 ongelabeld zijn, zeg dat dan.",
    });
  } catch (err) {
    return JSON.stringify({ error: `Ongelabeld analyse mislukt: ${(err as Error).message}` });
  }
}

// Suggestie-engine — synced met CATEGORIE_REGELS in rabobank-csv.ts
function suggereerCategorie(naam: string, omschrijving: string): string | null {
  const haystack = `${naam} ${omschrijving}`.toLowerCase();
  const hints: Array<{ pattern: RegExp; categorie: string }> = [
    { pattern: /kilo\s*code|blizzard|steam|epic\s*games|paymentwall|battle\.?net|xsolla|g2a|codesdirect|kinguin|kingboost|moonflash|cleverbridge|k4g|driffle|skine|chesscom|vintrica|google\s*play|flashpay/i, categorie: "Gaming" },
    { pattern: /videoland|netflix|spotify|apple\.com|disney|prime\s*video/i, categorie: "Streaming" },
    { pattern: /btc\s*direct|bitvavo|coinbase|kraken|skrill/i, categorie: "Crypto" },
    { pattern: /figma|canva|notion|reclaim|todoist|adobe|openai|github|vercel|microsoft|noordcode|go\s*daddy|tazapay/i, categorie: "SaaS" },
    { pattern: /parfumado|bol\.?com|amazon|zalando|coolblue|creative\s*fabrica|bitsandparts|winparts|nyx|klarna|tapijtenloods|gamma|hema|kruidvat|veral|insonder|babassu|xxl\s*nutrition/i, categorie: "Online Winkelen" },
    { pattern: /univ[eé]|asr|nationale.nederlanden|cz\s|vgz|menzis|anwb/i, categorie: "Verzekeringen" },
    { pattern: /odido|t-mobile|kpn|vodafone|tele2|cm\.com/i, categorie: "Telecom" },
    { pattern: /texaco|shell|bp|tango|tamoil|tinq|esso|supertank|total\s*energies/i, categorie: "Brandstof" },
    { pattern: /ns\.nl|connexxion|arriva|ov|parkeer|qcarwash|tmc|q\s*park/i, categorie: "Vervoer" },
    { pattern: /jumbo|albert|ah\s|lidl|aldi|dirk|supershop|deka|spar\s|plus\s|coop\s|vomar|welkoop|bruna|visscher/i, categorie: "Boodschappen" },
    { pattern: /mcdonald|burger\s*king|kfc|subway|dominos|kwalitaria|takeaway|thuisbezorgd/i, categorie: "Fastfood" },
    { pattern: /basic.?fit|fitness|sportschool/i, categorie: "Sport" },
    { pattern: /s\s*heeren\s*loo|heeren\s*loo|zorggroep/i, categorie: "Salaris" },
    { pattern: /zorgtoeslag|belastingdienst|toeslagen|belasting/i, categorie: "Toeslagen" },
    { pattern: /gemeente|waterschap|eneco|vattenfall|greenchoice|rabobank\s*nederland|cjib|bng/i, categorie: "Vaste Lasten" },
    { pattern: /geldmaat|geldautomaat|atm/i, categorie: "Geldopname" },
    { pattern: /sh\s*zwolle|kdl\s*bv/i, categorie: "Coffeeshop" },
    { pattern: /lavente|siekmans|terpstra|weissgerber|bone|gebhardt|brandenburg/i, categorie: "Familie" },
    { pattern: /brouwers|somerville|van\s*der\s*klis/i, categorie: "Vrienden" },
    { pattern: /toprak|henke|panhuis/i, categorie: "Zakelijk" },
    { pattern: /cebu|cuna\s*hotel|bdounibank|topsins|presse\s*du\s*haut|tabac\s*de\s*morillon/i, categorie: "Vakantie" },
    { pattern: /veluwse\s*bron|schaak/i, categorie: "Vrije Tijd" },
    { pattern: /tikkie|betaalverzoek/i, categorie: "Persoonlijk" },
  ];
  for (const h of hints) {
    if (h.pattern.test(haystack)) return h.categorie;
  }
  return null;
}
