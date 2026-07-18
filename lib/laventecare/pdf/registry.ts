import { LAVENTECARE_DOCUMENTS, LAVENTECARE_DOCUMENTS_BY_KEY, LAVENTECARE_DOCUMENT_VERSION } from "../documents";
import type { LaventeCareDocument } from "../types";
import {
  encodeLaventeCarePdfDossierContext,
  type LaventeCarePdfDossierContext,
  type LaventeCarePdfDossierReference,
} from "./context";
import type { LaventeCarePdfTheme } from "./theme";

export type LaventeCarePdfDelivery = "inline" | "download";

export type LaventeCarePdfRegistryItem = LaventeCareDocument & {
  route: string;
  screenFilename: string;
  printFilename: string;
};

function slugifyFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function buildPdfRegistryItem(document: LaventeCareDocument): LaventeCarePdfRegistryItem {
  const baseName = `LaventeCare-${slugifyFilename(document.title)}-${LAVENTECARE_DOCUMENT_VERSION}`;

  return {
    ...document,
    route: `/api/laventecare/pdf/${document.key}`,
    screenFilename: `${baseName}.pdf`,
    printFilename: `${baseName}-Print.pdf`,
  };
}

export const LAVENTECARE_PDF_REGISTRY = LAVENTECARE_DOCUMENTS.map(buildPdfRegistryItem);

export const LAVENTECARE_PDF_REGISTRY_BY_KEY = Object.fromEntries(
  LAVENTECARE_PDF_REGISTRY.map((document) => [document.key, document])
) as Record<string, LaventeCarePdfRegistryItem>;

export function getLaventeCarePdfDocument(documentKey: string): LaventeCarePdfRegistryItem | null {
  const document = LAVENTECARE_PDF_REGISTRY_BY_KEY[documentKey];
  if (document) return document;

  const fallbackDocument = LAVENTECARE_DOCUMENTS_BY_KEY[documentKey];
  return fallbackDocument ? buildPdfRegistryItem(fallbackDocument) : null;
}

export function getLaventeCarePdfFilename(
  document: LaventeCarePdfRegistryItem,
  theme: LaventeCarePdfTheme
) {
  return theme === "print" ? document.printFilename : document.screenFilename;
}

export function getLaventeCarePdfUrl({
  documentKey,
  theme = "screen",
  delivery = "inline",
  context,
}: {
  documentKey: string;
  theme?: LaventeCarePdfTheme;
  delivery?: LaventeCarePdfDelivery;
  context?: LaventeCarePdfDossierContext | LaventeCarePdfDossierReference | null;
}) {
  const params = new URLSearchParams({
    theme,
    delivery,
  });
  const contextParams = encodeLaventeCarePdfDossierContext(context);

  for (const [key, value] of Object.entries(contextParams)) {
    params.set(key, value);
  }

  return `/api/laventecare/pdf/${encodeURIComponent(documentKey)}?${params.toString()}`;
}

export function getLaventeCarePdfViewerUrl({
  documentKey,
  theme = "screen",
  context,
}: {
  documentKey: string;
  theme?: LaventeCarePdfTheme;
  context?: LaventeCarePdfDossierContext | LaventeCarePdfDossierReference | null;
}) {
  const params = new URLSearchParams({ theme });
  const contextParams = encodeLaventeCarePdfDossierContext(context);

  for (const [key, value] of Object.entries(contextParams)) {
    params.set(key, value);
  }

  return `/laventecare/documenten/${encodeURIComponent(documentKey)}?${params.toString()}`;
}
