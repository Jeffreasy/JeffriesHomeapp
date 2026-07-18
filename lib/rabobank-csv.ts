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

// ─── Interne overboeking detectie ────────────────────────────────────────────
// Geen rekeningnummers hardcoded in de clientbundle. De client kan alleen
// interne boekingen herkennen als beide IBANs in hetzelfde CSV-bestand staan;
// de server herberekent dit definitief op basis van de bekende rekeningen.

// ─── Auto-categorisatie (centraal gedefinieerd) ──────────────────────────────

import { autoCategorie } from "@/lib/autoCategorie";
import { parseDelimitedObjects } from "@/lib/csv";

// ─── Bedrag parser ("+1.453,80" → 1453.80, "-25,00" → -25) ─────────────────

function parseNlBedrag(raw: string): number {
  if (!raw || raw.trim() === "") return 0;
  // Verwijder + teken, punten (duizendtallen-separator), vervang komma door punt
  const clean = raw.replace(/\+/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : 0;
}

// ─── Datum parser (Rabobank datum → ISO YYYY-MM-DD) ──────────────────────────
// Rabobank exports can be YYYY-MM-DD or DD-MM-YYYY depending on the export flow.
// ISO 8601 is correct sorteerbaar als string.

function parseDatum(raw: string): string {
  if (!raw || raw.trim() === "") return "";
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const dutch = value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dutch) {
    const [, dd, mm, yyyy] = dutch;
    return `${yyyy}-${mm}-${dd}`;
  }

  return value; // onverwacht formaat, bewaar as-is
}

// ─── Native RFC 4180 CSV parser ──────────────────────────────────────────────

// ─── Hoofd-parser ────────────────────────────────────────────────────────────

export async function parseRabobankCsv(file: File): Promise<ParseResult> {
  // Rabobank exporteert UTF-8 (soms met BOM)
  const text = await file.text();
  // Strip BOM als aanwezig
  const clean = text.startsWith("\uFEFF") ? text.slice(1) : text;

  const { rows } = parseDelimitedObjects(clean);
  if (rows.length === 0) throw new Error("Geen transacties gevonden in het CSV-bestand.");

  const ibansInFile = new Set(
    rows
      .map((row) => row["IBAN/BBAN"] ?? "")
      .filter(Boolean)
  );

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

    const isIntern = !!tegenIban && iban !== tegenIban && ibansInFile.has(iban) && ibansInFile.has(tegenIban);

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
      categorie:            isIntern ? "Interne Overboeking" : autoCategorie(naam, omschrijving, parseNlBedrag(row["Bedrag"] ?? "")),
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
