/**
 * lib/loonstrook-pdf.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side PDF parser voor 's Heeren Loo loonstroken.
 * Gebruikt pdfjs-dist voor text extractie, regex voor veld-parsing.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as pdfjsLib from "pdfjs-dist";

// Worker setup voor Next.js
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrtItem {
  pct:    string;   // "22%", "38%", "52%", "60%", "bij vakantie"
  uren:   number;
  bedrag: number;
}

export interface LoonComponent {
  omschrijving: string;
  aantal:       number | null;
  eenheid:      string;       // "%", "Uren", "K", ""
  betaling:     number | null;
  berekOver:    number | null;
}

export interface ParsedLoonstrook {
  jaar:             number;
  periode:          number;
  periodeLabel:     string;    // "2026-03"
  type:             "loonstrook" | "jaaropgave";

  // Kernbedragen
  netto:            number;
  brutoBetaling:    number;
  brutoInhouding:   number;
  salarisBasis:     number;

  // ORT
  ortTotaal:        number;
  ortDetail:        OrtItem[];

  // Componenten
  amtZeerintensief: number | null;
  pensioenpremie:   number | null;
  loonheffing:      number | null;
  reiskosten:       number | null;
  vakantietoeslag:  number | null;
  ejuBedrag:        number | null;
  toeslagBalansvlf: number | null;
  extraUrenBedrag:  number | null;

  // Meta
  schaalnummer:     string;
  trede:            string;
  parttimeFactor:   number;
  uurloon:          number | null;

  // Raw
  componenten:      LoonComponent[];
  cumulatieven:     Record<string, string>;
}

export interface ParseResult {
  items:    ParsedLoonstrook[];
  errors:   string[];
  skipped:  string[];    // jaaropgaven etc.
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

// ─── Text Block Parsers ───────────────────────────────────────────────────────

function parseLabelsBlock(text: string): string[] {
  // Find the labels section between "Omschrijving" and the amounts
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const labels: string[] = [];

  for (const line of lines) {
    // Match patterns: "44,440 % Salaris", "6,000 Uren ORT 22%", "Loonheffing", "600,000 K Reisk. woon-werk"
    if (/^\d+[,.]?\d*\s*(K|%|Uren)\s+/.test(line) ||
        /^(Salaris|Loonheffing|Totaal|Netto)/.test(line) ||
        /ORT|Amt|Premie|Reisk|Vakantie|Toeslag|EJU|Sal\.\s*extra/i.test(line)) {
      labels.push(line);
    }
  }

  return labels;
}

function parseAmountsBlock(text: string): string[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const amounts: string[] = [];

  for (const line of lines) {
    // Lines with NL numbers: "3.481,00 1.546,96" or just "1.788,35"
    if (/^\d+[\d.,]*\s+\d+[\d.,]*$/.test(line) || /^\d+[\d.,]+$/.test(line)) {
      amounts.push(line);
    }
  }

  return amounts;
}

function extractField(text: string, pattern: RegExp): string {
  const m = text.match(pattern);
  return m ? m[1].trim() : "";
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

async function parseSinglePDF(file: File): Promise<ParsedLoonstrook | null> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  if (pdf.numPages === 0) return null;

  const page = await pdf.getPage(1);
  const content = await page.getTextContent();
  const textItems = content.items
    .filter((item): item is import("pdfjs-dist/types/src/display/api").TextItem => "str" in item)
    .map(item => ({ text: item.str, x: item.transform[4], y: item.transform[5] }));

  // Sort by Y (top to bottom) then X (left to right)
  textItems.sort((a, b) => b.y - a.y || a.x - b.x);

  // Reconstruct full text
  const fullText = textItems.map(i => i.text).join(" ");

  // ── Periode + Jaar ──
  const periodeMatch = fullText.match(/Periode\s+(\d+)/);
  const jaarMatch = fullText.match(/Jaar\s+(\d{4})/);

  if (!periodeMatch || !jaarMatch) return null;

  const periode = parseInt(periodeMatch[1]);
  const jaar = parseInt(jaarMatch[1]);
  const periodeLabel = `${jaar}-${String(periode).padStart(2, "0")}`;

  // ── Group text items by spatial regions (columns) ──
  // Left column (x < 300): labels  |  Middle (300-500): amounts  |  Right (>500): meta
  const leftItems = textItems.filter(i => i.x < 280);
  const midItems = textItems.filter(i => i.x >= 280 && i.x < 480);
  const rightItems = textItems.filter(i => i.x >= 480);

  // ── Parse labels + amounts by matching Y positions ──
  // Strategy: pair up label lines with amount lines on similar Y
  const components: LoonComponent[] = [];
  const labelLines: string[] = [];
  const amountPairs: { berekOver: number | null; betaling: number | null }[] = [];

  // Group left items into lines by Y proximity
  const leftLines = groupByY(leftItems);
  const midLines = groupByY(midItems);

  // Match recognized label patterns
  for (let i = 0; i < leftLines.length; i++) {
    const line = leftLines[i].text;

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
    const y = leftLines[i].y;
    const matchedMid = midLines.find(m => Math.abs(m.y - y) < 5);

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
    labelLines.push(omschrijving);
  }

  // ── Extract meta fields from right column ──
  const rightText = rightItems.map(i => i.text).join(" ");

  const salaris = tryParseNL(extractField(rightText, /Salaris\s+([\d.,]+)/));
  const schaalnummer = extractField(rightText, /Schaalnummer\s+(\d+)/);
  const trede = extractField(rightText, /Trede\s+(\d+)/);
  const ptFactor = tryParseNL(extractField(rightText, /Parttime\s+factor\s+([\d.,]+)/));
  const uurloon = tryParseNL(extractField(rightText, /Uurln\s+vorige\s+mnd\s+([\d.,]+)/));

  // ── Netto from full text ──
  // The netto amount is in "Uitbetaling: ... IBAN ... [amount]" section
  const nettoMatch = fullText.match(/Uitbetaling[\s\S]*?(\d[\d.,]+)\s/);
  let netto = 0;

  // Look for the netto at the bottom of components
  for (const c of components) {
    if (c.omschrijving === "Netto" || c.omschrijving.includes("Netto")) {
      netto = c.betaling || 0;
      break;
    }
  }

  // Fallback: find in specific text area
  if (netto === 0) {
    const nettoTextMatch = fullText.match(/(?:Netto|IBAN)[^0-9]*(\d[\d.,]+)/);
    if (nettoTextMatch) netto = parseNL(nettoTextMatch[1]);
  }

  // ── Categorize components ──
  const ortItems: OrtItem[] = [];
  let amtZeerintensief: number | null = null;
  let pensioenpremie: number | null = null;
  let loonheffing: number | null = null;
  let reiskosten: number | null = null;
  let vakantietoeslag: number | null = null;
  let ejuBedrag: number | null = null;
  let toeslagBalansvlf: number | null = null;
  let extraUrenBedrag: number | null = null;
  let brutoBetaling = 0;
  let brutoInhouding = 0;

  for (const c of components) {
    const o = c.omschrijving;
    const b = c.betaling || 0;

    if (/ORT/.test(o)) {
      const pctMatch = o.match(/(\d+%|bij vakantie)/);
      ortItems.push({
        pct: pctMatch ? pctMatch[1] : o,
        uren: c.aantal || 0,
        bedrag: b,
      });
    } else if (/Amt\s*zeerintensief/i.test(o)) {
      amtZeerintensief = b;
    } else if (/Premie\s*pensioen/i.test(o)) {
      pensioenpremie = b;
    } else if (/^Loonheffing$/i.test(o) || /^Loonheffing$/i.test(o.trim())) {
      loonheffing = b;
    } else if (/Reisk/i.test(o)) {
      reiskosten = b;
    } else if (/Vakantietoeslag/i.test(o)) {
      vakantietoeslag = b;
    } else if (/EJU/i.test(o)) {
      ejuBedrag = b;
    } else if (/Balansvl/i.test(o)) {
      toeslagBalansvlf = b;
    } else if (/extra\s*uren/i.test(o)) {
      extraUrenBedrag = b;
    }
  }

  // totals
  const totaalComp = components.find(c => c.omschrijving === "Totaal");
  if (totaalComp) {
    brutoBetaling = totaalComp.betaling || 0;
    brutoInhouding = totaalComp.berekOver || 0;
  }

  const ortTotaal = ortItems.reduce((s, o) => s + o.bedrag, 0);

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
    brutoBetaling,
    brutoInhouding,
    salarisBasis: salaris || 0,
    ortTotaal,
    ortDetail: ortItems,
    amtZeerintensief,
    pensioenpremie,
    loonheffing,
    reiskosten,
    vakantietoeslag,
    ejuBedrag,
    toeslagBalansvlf,
    extraUrenBedrag,
    schaalnummer: schaalnummer || "?",
    trede: trede || "?",
    parttimeFactor: ptFactor || 0,
    uurloon,
    componenten: components.filter(c => c.omschrijving !== "Totaal" && c.omschrijving !== "Netto"),
    cumulatieven,
  };
}

// ── Helper: group text items into lines by Y proximity ──
interface TextLine { text: string; y: number; x: number }

function groupByY(items: { text: string; x: number; y: number }[]): TextLine[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextLine[] = [];
  let currentLine = { text: sorted[0].text, y: sorted[0].y, x: sorted[0].x };

  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i].y - currentLine.y) < 3) {
      currentLine.text += " " + sorted[i].text;
    } else {
      lines.push(currentLine);
      currentLine = { text: sorted[i].text, y: sorted[i].y, x: sorted[i].x };
    }
  }
  lines.push(currentLine);

  return lines;
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
    } catch (err) {
      errors.push(`${file.name}: ${err instanceof Error ? err.message : "Onbekende fout"}`);
    }
  }

  // Sort by periode
  items.sort((a, b) => a.jaar - b.jaar || a.periode - b.periode);

  return { items, errors, skipped };
}
