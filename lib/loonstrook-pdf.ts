/**
 * lib/loonstrook-pdf.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side PDF parser voor 's Heeren Loo loonstroken.
 * Gebruikt pdfjs-dist voor text extractie, regex voor veld-parsing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as pdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

// Worker setup voor Next.js
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrtItem {
  pct: string;   // "22%", "38%", "52%", "60%", "bij vakantie"
  uren: number;
  bedrag: number;
}

export interface LoonComponent {
  omschrijving: string;
  aantal: number | null;
  eenheid: string;       // "%", "Uren", "K", ""
  betaling: number | null;
  berekOver: number | null;
}

export interface ParsedLoonstrook {
  jaar: number;
  periode: number;
  periodeLabel: string;    // "2026-03"
  type: "loonstrook" | "jaaropgave";

  // Kernbedragen
  netto: number;
  brutoBetaling: number;
  brutoInhouding: number;
  salarisBasis: number;

  // ORT
  ortTotaal: number;
  ortDetail: OrtItem[];

  // Componenten
  amtZeerintensief: number | null;
  pensioenpremie: number | null;
  loonheffing: number | null;
  reiskosten: number | null;
  vakantietoeslag: number | null;
  ejuBedrag: number | null;
  toeslagBalansvlf: number | null;
  extraUrenBedrag: number | null;

  // Meta
  schaalnummer: string;
  trede: string;
  parttimeFactor: number;
  uurloon: number | null;

  // Raw
  componenten: LoonComponent[];
  cumulatieven: Record<string, string>;
}

export interface ParseResult {
  items: ParsedLoonstrook[];
  errors: string[];
  skipped: string[];    // jaaropgaven etc.
}

// Spatial text item extracted from PDF
interface SpatialTextItem {
  text: string;
  x: number;
  y: number;
}

// Line reconstructed from grouped spatial items
interface TextLine {
  text: string;
  y: number;
  x: number;
  items: SpatialTextItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNL(s: string): number {
  const clean = s.replace(/\./g, "").replace(",", ".").replace("--", "00").replace(/[^\d.\-]/g, "");
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : n;
}

function tryParseNL(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseNL(s);
  return n === 0 && !s.includes("0") ? null : n;
}

function extractField(text: string, pattern: RegExp): string {
  const m = text.match(pattern);
  return m ? m[1].trim() : "";
}

// ── Helper: group text items into lines by Y proximity ──

function groupByY(items: SpatialTextItem[]): TextLine[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a: SpatialTextItem, b: SpatialTextItem) => b.y - a.y || a.x - b.x);
  const lines: TextLine[] = [];
  let currentLine: TextLine = { text: sorted[0].text, y: sorted[0].y, x: sorted[0].x, items: [sorted[0]] };

  for (let idx = 1; idx < sorted.length; idx++) {
    if (Math.abs(sorted[idx].y - currentLine.y) < 3) {
      currentLine.items.push(sorted[idx]);
      currentLine.items.sort((a, b) => a.x - b.x);
      currentLine.text = currentLine.items.map((item) => item.text).join(" ");
    } else {
      lines.push(currentLine);
      currentLine = { text: sorted[idx].text, y: sorted[idx].y, x: sorted[idx].x, items: [sorted[idx]] };
    }
  }
  lines.push(currentLine);

  return lines;
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function looksLikeMoneyToken(text: string): boolean {
  return /^-?[\d.]+,\d{2,3}$/.test(text.trim());
}

function numericItems(line: TextLine, minX = -Infinity, maxX = Infinity) {
  return line.items
    .filter((item) => item.x >= minX && item.x <= maxX && looksLikeMoneyToken(item.text))
    .map((item) => ({ ...item, value: parseNL(item.text) }))
    .sort((a, b) => a.x - b.x);
}

function amountNear(line: TextLine, targetX: number, maxDistance = 24): number | null {
  const candidates = numericItems(line);
  let best: { value: number; distance: number } | null = null;

  for (const item of candidates) {
    const distance = Math.abs(item.x - targetX);
    if (distance <= maxDistance && (!best || distance < best.distance)) {
      best = { value: item.value, distance };
    }
  }

  return best?.value ?? null;
}

function firstAmountFrom(line: TextLine, minX: number, maxX = Infinity): number | null {
  return numericItems(line, minX, maxX)[0]?.value ?? null;
}

function labelTextForLine(line: TextLine): string {
  return normalizeText(
    line.items
      .filter((item) => item.x < 220)
      .map((item) => item.text)
      .join(" ")
  );
}

function isLoonComponentLine(line: TextLine): boolean {
  // De looncomponententabel staat in deze loonstroken ruim boven de totalen/meta.
  // De y-band voorkomt dat lagere meta-regels zoals "Uurln ORT vrg mnd" als ORT
  // component worden geteld.
  if (line.y < 300 || line.y > 540) return false;

  const label = labelTextForLine(line);
  if (!label) return false;
  if (/^(Perc\.?|Eenh\.?|Omschrijving|Medewerker|Werkgever|Loonstrook|Berekening)$/i.test(label)) {
    return false;
  }

  const hasAmount = numericItems(line, 220).length > 0;
  return hasAmount && (
    /^-?[\d.,]+\s*(K|%|Uren)?\s+\S+/i.test(label) ||
    /^(Totaal|Netto|Loonheffing)\b/i.test(label)
  );
}

function parseComponentLine(line: TextLine): LoonComponent | null {
  const label = labelTextForLine(line);
  if (!label) return null;

  const labelMatch = label.match(/^(-?[\d.,]+)\s*(K|%|Uren)?\s+(.+)$/i);
  let omschrijving = label;
  let aantal: number | null = null;
  let eenheid = "";

  if (labelMatch) {
    aantal = tryParseNL(labelMatch[1]);
    eenheid = labelMatch[2] || "";
    omschrijving = labelMatch[3].trim();
  }

  let betaling: number | null = null;
  let berekOver: number | null = null;

  if (/^Totaal$/i.test(omschrijving)) {
    betaling = amountNear(line, 282) ?? firstAmountFrom(line, 270);
    berekOver = amountNear(line, 355) ?? firstAmountFrom(line, 330, 390);
  } else if (/^Netto$/i.test(omschrijving)) {
    betaling = amountNear(line, 282) ?? firstAmountFrom(line, 270);
    berekOver = amountNear(line, 535) ?? firstAmountFrom(line, 500);
  } else if (/^Loonheffing\b/i.test(omschrijving)) {
    berekOver = amountNear(line, 228) ?? firstAmountFrom(line, 220, 270);
    betaling = amountNear(line, 355) ?? firstAmountFrom(line, 320, 390);
  } else {
    berekOver = amountNear(line, 228) ?? firstAmountFrom(line, 220, 270);
    betaling = amountNear(line, 282) ?? firstAmountFrom(line, 270);
  }

  return { omschrijving, aantal, eenheid, betaling, berekOver };
}

// ─── Component Categorizer ────────────────────────────────────────────────────

interface CategorizedComponents {
  ortItems: OrtItem[];
  amtZeerintensief: number | null;
  pensioenpremie: number | null;
  loonheffing: number | null;
  reiskosten: number | null;
  vakantietoeslag: number | null;
  ejuBedrag: number | null;
  toeslagBalansvlf: number | null;
  extraUrenBedrag: number | null;
  brutoBetaling: number;
  brutoInhouding: number;
}

function categorizeComponents(components: LoonComponent[]): CategorizedComponents {
  const result: CategorizedComponents = {
    ortItems: [],
    amtZeerintensief: null,
    pensioenpremie: null,
    loonheffing: null,
    reiskosten: null,
    vakantietoeslag: null,
    ejuBedrag: null,
    toeslagBalansvlf: null,
    extraUrenBedrag: null,
    brutoBetaling: 0,
    brutoInhouding: 0,
  };

  for (const c of components) {
    const o = c.omschrijving;
    const b = c.betaling || 0;

    if (/ORT/i.test(o)) {
      const pctMatch = o.match(/(\d+%|bij vakantie)/);
      result.ortItems.push({
        pct: pctMatch ? pctMatch[1] : o,
        uren: c.aantal || 0,
        bedrag: b,
      });
    } else if (/Amt\s*zeerintensief/i.test(o)) {
      result.amtZeerintensief = b;
    } else if (/Premie\s*pensioen/i.test(o)) {
      result.pensioenpremie = b;
    } else if (/^Loonheffing\b/i.test(o.trim())) {
      result.loonheffing = b;
    } else if (/Reisk/i.test(o)) {
      result.reiskosten = b;
    } else if (/Vakantietoeslag/i.test(o)) {
      result.vakantietoeslag = b;
    } else if (/EJU/i.test(o)) {
      result.ejuBedrag = b;
    } else if (/Balansv/i.test(o)) {
      result.toeslagBalansvlf = b;
    } else if (/extra\s*uren/i.test(o)) {
      result.extraUrenBedrag = b;
    } else if (o === "Totaal") {
      result.brutoBetaling = c.betaling || 0;
      result.brutoInhouding = c.berekOver || 0;
    }
  }

  return result;
}

// ─── Netto Extraction ─────────────────────────────────────────────────────────

function extractNetto(components: LoonComponent[], fullText: string): number {
  // Primary: find "Netto" in components
  for (const c of components) {
    if (c.omschrijving === "Netto" || c.omschrijving.includes("Netto")) {
      return c.betaling || 0;
    }
  }

  // Fallback: only trust a real Netto line. Never scan after "IBAN", because
  // IBAN prefixes such as NL41 can look like amounts to a loose regex.
  const match = fullText.match(/\bNetto\s+(-?[\d.]+,\d{2})\b/);
  return match ? parseNL(match[1]) : 0;
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

async function parseSinglePDF(file: File): Promise<ParsedLoonstrook | null> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  if (pdf.numPages === 0) return null;

  const page = await pdf.getPage(1);
  const content = await page.getTextContent();

  // Extract text items with spatial positions
  const textItems: SpatialTextItem[] = (content.items as TextItem[])
    .filter((item: TextItem) => "str" in item && "transform" in item)
    .map((item: TextItem): SpatialTextItem => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
    }));

  // Sort by Y (top to bottom) then X (left to right)
  textItems.sort((a: SpatialTextItem, b: SpatialTextItem) => b.y - a.y || a.x - b.x);

  const fullText = textItems.map((t: SpatialTextItem) => t.text).join(" ");

  // ── Periode + Jaar ──
  const periodeMatch = fullText.match(/Periode\s+(\d+)/);
  const jaarMatch = fullText.match(/Jaar\s+(\d{4})/);

  if (!periodeMatch || !jaarMatch) return null;

  const periode = parseInt(periodeMatch[1]);
  const jaar = parseInt(jaarMatch[1]);
  const periodeLabel = `${jaar}-${String(periode).padStart(2, "0")}`;

  // ── Parse looncomponententabel uit volledige PDF-regels ──
  const lines = groupByY(textItems);
  const components = lines
    .filter(isLoonComponentLine)
    .map(parseComponentLine)
    .filter((component): component is LoonComponent => component !== null);

  // ── Extract meta fields uit full text ──
  const salaris = components.find((c) => /^Salaris$/i.test(c.omschrijving.trim()))?.betaling ?? null;
  const schaalnummer = extractField(fullText, /Schaalnummer\s+(\d+)/);
  const trede = extractField(fullText, /Trede\s+(\d+)/);
  const ptFactor = tryParseNL(extractField(fullText, /Parttime\s+factor\s+([\d.,]+)/));
  const uurloon = tryParseNL(extractField(fullText, /Uurln\s+vorige\s+mnd\s+([\d.,]+)/));

  // ── Netto ──
  const netto = extractNetto(components, fullText);

  // ── Categorize components ──
  const cat = categorizeComponents(components);

  if (netto <= 0 || cat.brutoBetaling <= 0 || cat.brutoInhouding < 0) {
    throw new Error("Loonstrook kon netto/bruto kernbedragen niet betrouwbaar lezen.");
  }

  // ── Cumulatieven ──
  const cumulatieven: Record<string, string> = {};
  const cumMatch = fullText.match(/Totalen t\/m deze berekening([\s\S]*?)$/);
  if (cumMatch) {
    const pairs = cumMatch[1].match(/([\w.\s]+?)\s+([\d.,]+)/g);
    if (pairs) {
      for (const p of pairs) {
        const m = p.match(/^(.+?)\s+([\d.,]+)$/);
        if (m) cumulatieven[m[1].trim()] = m[2].trim();
      }
    }
  }

  return {
    jaar,
    periode,
    periodeLabel,
    type: "loonstrook",
    netto,
    brutoBetaling: cat.brutoBetaling,
    brutoInhouding: cat.brutoInhouding,
    salarisBasis: salaris || 0,
    ortTotaal: cat.ortItems.reduce((s: number, o: OrtItem) => s + o.bedrag, 0),
    ortDetail: cat.ortItems,
    amtZeerintensief: cat.amtZeerintensief,
    pensioenpremie: cat.pensioenpremie,
    loonheffing: cat.loonheffing,
    reiskosten: cat.reiskosten,
    vakantietoeslag: cat.vakantietoeslag,
    ejuBedrag: cat.ejuBedrag,
    toeslagBalansvlf: cat.toeslagBalansvlf,
    extraUrenBedrag: cat.extraUrenBedrag,
    schaalnummer: schaalnummer || "?",
    trede: trede || "?",
    parttimeFactor: ptFactor || 0,
    uurloon,
    componenten: components.filter((c: LoonComponent) => c.omschrijving !== "Totaal" && c.omschrijving !== "Netto"),
    cumulatieven,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function parseLoonstrookPDFs(files: File[]): Promise<ParseResult> {
  const items: ParsedLoonstrook[] = [];
  const errors: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    try {
      const result = await parseSinglePDF(file);
      if (result) {
        items.push(result);
      } else {
        skipped.push(file.name);
      }
    } catch (err: unknown) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : "Onbekende fout"}`);
    }
  }

  // Sort by periode
  items.sort((a: ParsedLoonstrook, b: ParsedLoonstrook) => a.jaar - b.jaar || a.periode - b.periode);

  return { items, errors, skipped };
}
