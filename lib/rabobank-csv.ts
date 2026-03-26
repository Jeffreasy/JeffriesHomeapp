/**
 * Native Rabobank CSV parser — geen externe library.
 * Rabobank exporteert standaard RFC 4180 CSV (UTF-8, komma-delimiter, dubbele quotes als escape).
 * Vervangt de zware `xlsx` import (~300KB bundle).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParsedTransaction {
  rekeningIban:         string;
  volgnr:               string;
  datum:                string;
  bedrag:               number;
  saldoNaTrn:           number;
  code:                 string;
  tegenrekeningIban?:   string;
  tegenpartijNaam?:     string;
  omschrijving:         string;
  referentie?:          string;
  redenRetour?:         string;
  oorspBedrag?:         number;
  oorspMunt?:           string;
  isInterneOverboeking: boolean;
  categorie?:           string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  vanDatum:     string;
  totDatum:     string;
  aantalIntern: number;
  aantalRijen:  number;
}

// ─── Eigen rekeningen (intern overboeking detectie) ──────────────────────────

const EIGEN_REKENINGEN = new Set([
  "NL41RABO0348147740",
  "NL20RABO0198574215",
]);

// ─── Auto-categorisatie ──────────────────────────────────────────────────────

const CATEGORIE_REGELS: Array<{ pattern: RegExp; categorie: string }> = [
  // Gaming
  { pattern: /kilo\s*code|blizzard|steam|epic\s*games|paymentwall|battle\.?net|xsolla|g2a\.?com|codesdirect|kinguin|kingboost|moonflash|cleverbridge|k4g/i, categorie: "Gaming" },
  // Streaming
  { pattern: /videoland|netflix|spotify|apple\.com|disney|prime\s*video/i, categorie: "Streaming" },
  // Crypto
  { pattern: /btc\s*direct|bitvavo|coinbase|kraken|skrill/i, categorie: "Crypto" },
  // SaaS
  { pattern: /figma|canva|notion|reclaim|todoist|adobe|openai|github|vercel|microsoft|noordcode/i, categorie: "SaaS" },
  // Online Winkelen
  { pattern: /parfumado|bol\.?com|amazon|zalando|coolblue|creative\s*fabrica|bitsandparts|winparts|nyx/i, categorie: "Online Winkelen" },
  // Verzekeringen (+ Unive zonder accent)
  { pattern: /univ[eé]|asr|nationale.nederlanden|cz\s|vgz|menzis/i, categorie: "Verzekeringen" },
  { pattern: /zorgverzekering|zorgpremie|eigen\s*risico/i, categorie: "Zorgverzekering" },
  // Telecom
  { pattern: /odido|t-mobile|kpn|vodafone|tele2|cm\.com/i, categorie: "Telecom" },
  // Brandstof (+ Texaco, Esso; Supertank handled separately — amount-dependent)
  { pattern: /shell|bp|tango|tamoil|tinq|texaco|total\s*energies|esso/i, categorie: "Brandstof" },
  // OV / Vervoer
  { pattern: /ns\.nl|connexxion|arriva|ov-chipkaart|ov\s*betalen|parkeer|park\.\s*|qcarwash/i, categorie: "Vervoer" },
  // Boodschappen (+ Supershop, Deka, Spar, Plus, Coop, Vomar, Welkoop, Bruna)
  { pattern: /jumbo|albert\s*heijn|ah\s*\w|lidl|aldi|dirk|supershop|deka\s*markt|spar\s|plus\s|coop\s|vomar|welkoop|bruna/i, categorie: "Boodschappen" },
  // Fastfood (+ Kwalitaria, Takeaway)
  { pattern: /mcdonald|burger\s*king|kfc|subway|dominos|kwalitaria|takeaway|thuisbezorgd/i, categorie: "Fastfood" },
  // Sport
  { pattern: /basic.?fit|fitness|sportschool/i, categorie: "Sport" },
  // Salaris
  { pattern: /s\s*heeren\s*loo|heeren\s*loo|zorggroep/i, categorie: "Salaris" },
  // Toeslagen
  { pattern: /zorgtoeslag|belastingdienst|toeslagen/i, categorie: "Toeslagen" },
  // Vaste Lasten
  { pattern: /gemeente|waterschap|eneco|vattenfall|greenchoice/i, categorie: "Vaste Lasten" },
  // Geldopname
  { pattern: /geldmaat|geldautomaat|atm/i, categorie: "Geldopname" },
  // Coffeeshop
  { pattern: /sh\s*zwolle|kdl\s*bv/i, categorie: "Coffeeshop" },
  // Familie
  { pattern: /lavente|siekmans|terpstra/i, categorie: "Familie" },
];

function autoCategoriseer(naam?: string, omschrijving?: string, bedrag?: number): string | undefined {
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

// ─── Bedrag parser ("+1.453,80" → 1453.80, "-25,00" → -25) ─────────────────

function parseNlBedrag(raw: string): number {
  if (!raw || raw.trim() === "") return 0;
  // Verwijder + teken, punten (duizendtallen-separator), vervang komma door punt
  const clean = raw.replace(/\+/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

// ─── Datum parser (Rabobank DD-MM-YYYY → ISO YYYY-MM-DD) ─────────────────────
// Rabobank exporteert altijd DD-MM-YYYY. Als we dat raw opslaan dan geeft
// string-vergelijking verkeerde resultaten bij cross-maand (bijv. "01-03-2025"
// lijkt lexicografisch kleiner dan "16-02-2025" terwijl het later is).
// ISO 8601 (YYYY-MM-DD) is correct sorteerbaar als string.

function parseDatum(raw: string): string {
  if (!raw || raw.trim() === "") return "";
  // Formaat: DD-MM-YYYY
  const parts = raw.trim().split("-");
  if (parts.length !== 3) return raw; // onverwacht formaat, bewaar as-is
  const [dd, mm, yyyy] = parts;
  return `${yyyy}-${mm}-${dd}`; // → YYYY-MM-DD
}

// ─── Native RFC 4180 CSV parser ──────────────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Escaped quote: "" → "
        if (line[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(field);
        field = "";
      } else {
        field += ch;
      }
    }
    i++;
  }

  fields.push(field); // laatste veld
  return fields;
}

function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  // Rabobank CSV kan Windows-regeleindes hebben (\r\n)
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCsvLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (vals[idx] ?? "").trim(); });
    rows.push(row);
  }

  return { headers, rows };
}

// ─── Hoofd-parser ────────────────────────────────────────────────────────────

export async function parseRabobankCsv(file: File): Promise<ParseResult> {
  // Rabobank exporteert UTF-8 (soms met BOM)
  const text = await file.text();
  // Strip BOM als aanwezig
  const clean = text.startsWith("\uFEFF") ? text.slice(1) : text;

  const { rows } = parseCsv(clean);
  if (rows.length === 0) throw new Error("Geen transacties gevonden in het CSV-bestand.");

  const transactions: ParsedTransaction[] = rows.map((row) => {
    const iban      = row["IBAN/BBAN"] ?? "";
    const tegenIban = (row["Tegenrekening IBAN/BBAN"] ?? "") || undefined;
    const naam      = (row["Naam tegenpartij"] || row["Naam uiteindelijke partij"] || "") || undefined;

    const omschrijving = [row["Omschrijving-1"], row["Omschrijving-2"], row["Omschrijving-3"]]
      .map((s) => (s ?? "").trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ");

    const referentie  = (row["Transactiereferentie"] || row["Betalingskenmerk"] || "") || undefined;
    const redenRetour = row["Reden retour"]?.trim() || undefined;

    const isIntern = EIGEN_REKENINGEN.has(iban) && !!tegenIban && EIGEN_REKENINGEN.has(tegenIban);

    const oorspRaw = parseNlBedrag(row["Oorspr bedrag"] ?? "");

    return {
      rekeningIban:         iban,
      volgnr:               row["Volgnr"] ?? "",
      datum:                parseDatum(row["Datum"] ?? ""),
      bedrag:               parseNlBedrag(row["Bedrag"] ?? ""),
      saldoNaTrn:           parseNlBedrag(row["Saldo na trn"] ?? ""),
      code:                 row["Code"]?.trim() ?? "",
      tegenrekeningIban:    tegenIban,
      tegenpartijNaam:      naam,
      omschrijving,
      referentie,
      redenRetour,
      oorspBedrag:          oorspRaw !== 0 ? oorspRaw : undefined,
      oorspMunt:            row["Oorspr munt"]?.trim() || undefined,
      isInterneOverboeking: isIntern,
      categorie:            isIntern ? "Interne Overboeking" : autoCategoriseer(naam, omschrijving, parseNlBedrag(row["Bedrag"] ?? "")),
    };
  });

  const datums = transactions.map((t) => t.datum).filter(Boolean).sort();
  const aantalIntern = transactions.filter((t) => t.isInterneOverboeking).length;

  return {
    transactions,
    vanDatum:    datums[0] ?? "",
    totDatum:    datums[datums.length - 1] ?? "",
    aantalIntern,
    aantalRijen: rows.length,
  };
}
