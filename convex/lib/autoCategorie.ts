/**
 * Auto-categorisatie regels — Single Source of Truth.
 *
 * Gebruikt door:
 *   - `lib/rabobank-csv.ts` (CSV import op de client)
 *   - `convex/transactions.ts` (relabelAll op de server)
 *
 * NOOIT dupliceren — altijd vanuit dit bestand importeren.
 */

// ─── Regels ─────────────────────────────────────────────────────────────────

export const CATEGORIE_REGELS: Array<{ pattern: RegExp; categorie: string }> = [
  // Gaming
  { pattern: /kilo\s*code|blizzard|steam|epic\s*games|paymentwall|battle\.?net|xsolla|g2a\.?com|codesdirect|kinguin|kingboost|moonflash|cleverbridge|k4g|driffle|skine\.com|chesscom|vintrica|google\s*play|flashpay|paypal|online\s*payment/i, categorie: "Gaming" },
  // Streaming
  { pattern: /videoland|netflix|spotify|apple\.com|disney|prime\s*video/i, categorie: "Streaming" },
  // Crypto
  { pattern: /btc\s*direct|bitvavo|coinbase|kraken|skrill/i, categorie: "Crypto" },
  // SaaS
  { pattern: /figma|canva|notion|reclaim|todoist|adobe|openai|github|vercel|microsoft|noordcode|go\s*daddy|tazapay/i, categorie: "SaaS" },
  // Online Winkelen
  { pattern: /parfumado|bol\.?com|amazon|zalando|coolblue|creative\s*fabrica|bitsandparts|winparts|nyx|klarna|tapijtenloods|gamma|hema|kruidvat|veral|insonder|babassu|xxl\s*nutrition/i, categorie: "Online Winkelen" },
  // Verzekeringen (+ ANWB)
  { pattern: /univ[eé]|asr|nationale.nederlanden|cz\s|vgz|menzis|anwb/i, categorie: "Verzekeringen" },
  { pattern: /zorgverzekering|zorgpremie|eigen\s*risico/i, categorie: "Zorgverzekering" },
  // Telecom
  { pattern: /odido|t-mobile|kpn|vodafone|tele2|cm\.com/i, categorie: "Telecom" },
  // Brandstof (Supertank handled separately in autoCategorie())
  { pattern: /shell|bp|tango|tamoil|tinq|texaco|total\s*energies|esso/i, categorie: "Brandstof" },
  // Vervoer
  { pattern: /ns\.nl|connexxion|arriva|ov-chipkaart|ov\s*betalen|parkeer|park\.\s*|qcarwash|tmc\*|q\s*park|h-wijk/i, categorie: "Vervoer" },
  // Boodschappen
  { pattern: /jumbo|albert\s*heijn|ah\s*\w|lidl|aldi|dirk|supershop|deka\s*markt|spar\s|plus\s|coop\s|vomar|welkoop|bruna|visscher\s*vis/i, categorie: "Boodschappen" },
  // Fastfood
  { pattern: /mcdonald|burger\s*king|kfc|subway|dominos|kwalitaria|takeaway|thuisbezorgd/i, categorie: "Fastfood" },
  // Sport
  { pattern: /basic.?fit|fitness|sportschool/i, categorie: "Sport" },
  // Salaris
  { pattern: /s\s*heeren\s*loo|heeren\s*loo|zorggroep/i, categorie: "Salaris" },
  // Toeslagen
  { pattern: /zorgtoeslag|belastingdienst|toeslagen|\bbelasting\b/i, categorie: "Toeslagen" },
  // Vaste Lasten
  { pattern: /gemeente|waterschap|eneco|vattenfall|greenchoice|rabobank\s*nederland|cjib|bng\*/i, categorie: "Vaste Lasten" },
  // Geldopname
  { pattern: /geldmaat|geldautomaat|atm/i, categorie: "Geldopname" },
  // Coffeeshop
  { pattern: /sh\s*zwolle|kdl\s*bv/i, categorie: "Coffeeshop" },
  // Familie
  { pattern: /lavente|siekmans|terpstra|weissgerber|bone|gebhardt|brandenburg/i, categorie: "Familie" },
  // Vrienden
  { pattern: /brouwers|somerville|van\s*der\s*klis/i, categorie: "Vrienden" },
  // Zakelijk
  { pattern: /toprak|henke|panhuis/i, categorie: "Zakelijk" },
  // Vakantie
  { pattern: /cebu|cuna\s*hotel|bdounibank|topsinb|presse\s*du\s*haut|tabac\s*de\s*morillon|sas\s*m\s*j\s*s/i, categorie: "Vakantie" },
  // Vrije Tijd
  { pattern: /veluwse\s*bron|schaak/i, categorie: "Vrije Tijd" },
];

// ─── Auto-categorisatie functie ──────────────────────────────────────────────

export function autoCategorie(naam?: string, omschrijving?: string, bedrag?: number): string | undefined {
  const haystack = `${naam ?? ""} ${omschrijving ?? ""}`;

  // Edge case: Supertank — under €25 is shop/fastfood, above is fuel
  if (/supertank/i.test(haystack)) {
    return (bedrag !== undefined && Math.abs(bedrag) < 25) ? "Fastfood" : "Brandstof";
  }

  for (const r of CATEGORIE_REGELS) {
    if (r.pattern.test(haystack)) return r.categorie;
  }
  return undefined;
}
