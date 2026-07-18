import { LAVENTECARE_PROJECT_PHASES, LAVENTECARE_PROJECT_STATUSES, type Tone } from "./LaventeCareTypes";
import { uiToneClasses } from "@/lib/ui/tones";
import {
  encodeLaventeCarePdfDossierContext,
  getLaventeCarePdfDossierReferenceFromLink,
  parseLaventeCarePdfDossierReference,
  type LaventeCarePdfDossierLink,
} from "@/lib/laventecare/pdf/context";

export const toneClasses = uiToneClasses;

export const optional = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

export function formatDate(value?: string) {
  if (!value) return "Geen datum";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}

export function formatMoney(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Nog geen waarde";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCents(value?: number, currency = "EUR") {
  if (typeof value !== "number" || Number.isNaN(value)) return "€0";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency || "EUR",
  }).format(value / 100);
}

export function formatMinutes(minutes?: number) {
  if (typeof minutes !== "number" || Number.isNaN(minutes)) return "0u";
  const hours = minutes / 60;
  return `${new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }).format(hours)}u`;
}

export function label(value?: string) {
  if (!value) return "Onbekend";
  const text = value.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Project fase/status have a canonical, hand-written label (e.g. fase "sla" reads
// "SLA en beheer", "evolution" reads "Doorontwikkeling") that a mechanical label()
// transform of the raw value can't reproduce — look it up, falling back to label()
// for any value that isn't in the known list.
export function projectFaseLabel(value?: string) {
  if (!value) return "Onbekend";
  return LAVENTECARE_PROJECT_PHASES.find((phase) => phase.value === value)?.label ?? label(value);
}

export function projectStatusLabel(value?: string) {
  if (!value) return "Onbekend";
  return LAVENTECARE_PROJECT_STATUSES.find((status) => status.value === value)?.label ?? label(value);
}

export function fitTone(score?: number): Tone {
  if (typeof score !== "number") return "neutral";
  if (score >= 75) return "success";
  if (score >= 55) return "warning";
  return "danger";
}

// ─── Vervaldatum/overdue-helpers (N9) ────────────────────────────────────────

/** Vandaag als "YYYY-MM-DD" in Europe/Amsterdam — de kalenderdag die op
 *  facturen/offertes van toepassing is, ongeacht de device-timezone. */
export function amsterdamToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Aantal hele dagen dat `date` (ISO-datum of timestamp) vóór vandaag
 *  (Amsterdam) ligt; 0 als niet verstreken of ongeldig. */
export function daysPastDue(date?: string | null): number {
  if (!date) return 0;
  const day = date.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return 0;
  const today = amsterdamToday();
  if (day >= today) return 0;
  const diffMs = Date.parse(`${today}T12:00:00Z`) - Date.parse(`${day}T12:00:00Z`);
  return Math.max(1, Math.round(diffMs / 86_400_000));
}

/** True zodra `date` vóór vandaag (Amsterdam) ligt. */
export function isPastDate(date?: string | null): boolean {
  return daysPastDue(date) > 0;
}

// ─── Dossierdocument-koppeling (M-K) ─────────────────────────────────────────
// Eén gedeelde implementatie voor CustomerDossier en CustomersView: de kopieën
// waren gevorkt en weken al af (de name-match-fallback zonder id-guard kon een
// document van een andere klant in dit dossier trekken).

type DossierDocumentLike = {
  company_id?: string | null;
  context_id?: string | null;
  context_type: string;
  context_title?: string | null;
  lead_id?: string | null;
  project_id?: string | null;
  workstream_id?: string | null;
};

export function isDossierDocumentForCompany(
  doc: DossierDocumentLike,
  companyId: string,
  companyName: string,
  leadIds: Set<string>,
  projectIds: Set<string>,
  workstreamIds: Set<string>,
) {
  if (!companyId) return false;
  if (doc.company_id === companyId) return true;
  if (doc.context_id === companyId && ["company", "klant", "klantdossier", "laventecare_company"].includes(doc.context_type)) return true;
  if (doc.lead_id && leadIds.has(doc.lead_id)) return true;
  if (doc.project_id && projectIds.has(doc.project_id)) return true;
  if (doc.workstream_id && workstreamIds.has(doc.workstream_id)) return true;
  // Name-match fallback only for documents with NO id-based context at all. A
  // document already tied to another entity by id must not also be pulled into
  // this dossier by a coincidental or same-name title (cross-customer misfile).
  const hasIdContext = Boolean(doc.company_id || doc.context_id || doc.lead_id || doc.project_id || doc.workstream_id);
  if (hasIdContext) return false;
  return Boolean(doc.context_title && normalizeDossierText(doc.context_title) === normalizeDossierText(companyName));
}

function normalizeDossierText(value: string) {
  return value.trim().toLowerCase();
}

// ─── Dossierdocument-viewerlink met context (L2) ─────────────────────────────
// Alleen de owner-scoped contextreferentie reist mee. Bestaande opgeslagen URLs
// kunnen nog legacy dossierinhoud bevatten; die velden worden hier nooit gekopieerd.
export function dossierDocumentViewerHref(
  doc: {
    document_key: string;
    theme?: string | null;
    pdf_url?: string | null;
  } & LaventeCarePdfDossierLink,
): string {
  const params = new URLSearchParams({ theme: doc.theme === "print" ? "print" : "screen" });
  let reference = getLaventeCarePdfDossierReferenceFromLink(doc);

  if (!reference && doc.pdf_url) {
    try {
      const stored = new URL(doc.pdf_url, "https://placeholder.local");
      reference = parseLaventeCarePdfDossierReference(stored.searchParams);
    } catch {
      // Ongeldige opgeslagen URL: val terug op de kale viewer-link.
    }
  }

  for (const [key, value] of Object.entries(encodeLaventeCarePdfDossierContext(reference))) {
    params.set(key, value);
  }

  return `/laventecare/documenten/${encodeURIComponent(doc.document_key)}?${params.toString()}`;
}
