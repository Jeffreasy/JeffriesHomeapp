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
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
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
  let currentLine: TextLine = { text: sorted[0].text, y: sorted[0].y, x: sorted[0].x };

  for (let idx = 1; idx < sorted.length; idx++) {
    if (Math.abs(sorted[idx].y - currentLine.y) < 3) {
      currentLine.text += " " + sorted[idx].text;
    } else {
      lines.push(currentLine);
      currentLine = { text: sorted[idx].text, y: sorted[idx].y, x: sorted[idx].x };
    }
  }
  lines.push(currentLine);

  return lines;
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

    if (/ORT/.test(o)) {
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
    } else if (/^Loonheffing$/i.test(o.trim())) {
      result.loonheffing = b;
    } else if (/Reisk/i.test(o)) {
      result.reiskosten = b;
    } else if (/Vakantietoeslag/i.test(o)) {
      result.vakantietoeslag = b;
    } else if (/EJU/i.test(o)) {
      result.ejuBedrag = b;
    } else if (/Balansvl/i.test(o)) {
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

  // Fallback: regex from full text
  const match = fullText.match(/(?:Netto|IBAN)[^0-9]*(\d[\d.,]+)/);
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

  // ── Group text items by spatial regions (columns) ──
  // Left column (x < 280): labels  |  Middle (280-480): amounts  |  Right (≥480): meta
  const leftItems = textItems.filter((t: SpatialTextItem) => t.x < 280);
  const midItems = textItems.filter((t: SpatialTextItem) => t.x >= 280 && t.x < 480);
  const rightItems = textItems.filter((t: SpatialTextItem) => t.x >= 480);

  // ── Parse labels + amounts by matching Y positions ──
  const components: LoonComponent[] = [];
  const leftLines = groupByY(leftItems);
  const midLines = groupByY(midItems);

  for (let idx = 0; idx < leftLines.length; idx++) {
    const line = leftLines[idx].text;

    // Parse label: "44,440 % Salaris" or "6,000 Uren ORT 22%" or "Loonheffing"
    const labelMatch = line.match(/^([\d.,]+)\s*(K|%|Uren)?\s*(.+)$/);
    let omschrijving: string;
    let aantal: number | null = null;
    let eenheid = "";

    if (labelMatch) {
      aantal = tryParseNL(labelMatch[1]);
      eenheid = labelMatch[2] || "";
      omschrijving = labelMatch[3].trim();
    } else {
      omschrijving = line.trim();
    }

    // Skip non-component lines
    if (!omschrijving || /^(Perc|Totaal|Netto|Berekening)/.test(omschrijving)) continue;

    // Find matching amount line at similar Y
    const y = leftLines[idx].y;
    const matchedMid = midLines.find((m: TextLine) => Math.abs(m.y - y) < 5);

    let betaling: number | null = null;
    let berekOver: number | null = null;

    if (matchedMid) {
      const nums = matchedMid.text.match(/[\d.,]+/g)?.map(parseNL) || [];
      if (nums.length >= 2) {
        berekOver = nums[0];
        betaling = nums[1];
      } else if (nums.length === 1) {
        betaling = nums[0];
      }
    }

    components.push({ omschrijving, aantal, eenheid, betaling, berekOver });
  }

  // ── Extract meta fields from right column ──
  const rightText = rightItems.map((t: SpatialTextItem) => t.text).join(" ");

  const salaris = tryParseNL(extractField(rightText, /Salaris\s+([\d.,]+)/));
  const schaalnummer = extractField(rightText, /Schaalnummer\s+(\d+)/);
  const trede = extractField(rightText, /Trede\s+(\d+)/);
  const ptFactor = tryParseNL(extractField(rightText, /Parttime\s+factor\s+([\d.,]+)/));
  const uurloon = tryParseNL(extractField(rightText, /Uurln\s+vorige\s+mnd\s+([\d.,]+)/));

  // ── Netto ──
  const netto = extractNetto(components, fullText);

  // ── Categorize components ──
  const cat = categorizeComponents(components);

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
