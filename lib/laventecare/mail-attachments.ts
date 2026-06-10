import * as pdfjsLib from "pdfjs-dist";
import type { TextItem } from "pdfjs-dist/types/src/display/api";

if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
}

const MAX_ATTACHMENT_TEXT_CHARS = 9000;
const MAX_ATTACHMENT_PAGES = 20;

export type LaventeCareMailAttachmentContext = {
  name: string;
  content_type: string;
  size: number;
  pages: number;
  extracted_text: string;
  summary: string;
  extraction_status: "ok" | "partial" | "failed";
};

export async function extractLaventeCareMailAttachmentContext(file: File): Promise<LaventeCareMailAttachmentContext> {
  if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
    throw new Error(`${file.name} is geen PDF.`);
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pagesToRead = Math.min(pdf.numPages, MAX_ATTACHMENT_PAGES);
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = (content.items as TextItem[])
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) {
      pageTexts.push(`Pagina ${pageNumber}: ${text}`);
    }
  }

  const extractedText = truncateText(pageTexts.join("\n\n"), MAX_ATTACHMENT_TEXT_CHARS);
  const status = extractedText
    ? pdf.numPages > MAX_ATTACHMENT_PAGES || pageTexts.join("\n\n").length > MAX_ATTACHMENT_TEXT_CHARS
      ? "partial"
      : "ok"
    : "failed";

  return {
    name: file.name,
    content_type: file.type || "application/pdf",
    size: file.size,
    pages: pdf.numPages,
    extracted_text: extractedText,
    summary: summarizeAttachment(file.name, extractedText, pdf.numPages, status),
    extraction_status: status,
  };
}

function summarizeAttachment(name: string, text: string, pages: number, status: LaventeCareMailAttachmentContext["extraction_status"]) {
  if (!text.trim()) {
    return `${name}: tekst kon niet betrouwbaar worden uitgelezen (${pages} pagina's).`;
  }
  const normalized = text.replace(/\s+/g, " ").trim();
  const firstSentence = normalized.split(/(?<=[.!?])\s+/).find((part) => part.length > 40) ?? normalized;
  const suffix = status === "partial" ? " Uittreksel is ingekort voor AI-context." : "";
  return `${name} (${pages} pagina's): ${truncateText(firstSentence, 320)}${suffix}`;
}

function truncateText(value: string, max: number) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}
