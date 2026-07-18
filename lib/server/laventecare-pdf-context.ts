import { getBackendProxyConfig } from "@/lib/server/backend-config";
import type {
  LaventeCarePdfDossierContext,
  LaventeCarePdfDossierReference,
  LaventeCarePdfResolvableDossierKind,
} from "@/lib/laventecare/pdf/context";

const LIST_LIMIT = 200;
const RESOLVE_TIMEOUT_MS = 10_000;

type BackendRecord = Record<string, unknown>;

export type LaventeCarePdfContextSource = {
  list: (kind: LaventeCarePdfResolvableDossierKind) => Promise<unknown[]>;
};

const ENDPOINTS: Record<LaventeCarePdfResolvableDossierKind, string> = {
  company: "companies",
  lead: "leads",
  project: "projects",
  workstream: "workstreams",
};

function isRecord(value: unknown): value is BackendRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(record: BackendRecord, key: string, maxLength = 500): string | undefined {
  const value = record[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  return normalized.length > maxLength
    ? `${normalized.slice(0, Math.max(1, maxLength - 1))}…`
    : normalized;
}

function number(record: BackendRecord, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function sameOpaqueId(left: string | undefined, right: string) {
  return left?.toLowerCase() === right.toLowerCase();
}

function findOwnedRecord(rows: unknown[], id: string, ownerUserId: string): BackendRecord | null {
  const match = rows.find(
    (row) =>
      isRecord(row) &&
      sameOpaqueId(text(row, "id", 80), id) &&
      text(row, "user_id", 128) === ownerUserId,
  ) as BackendRecord | undefined;
  if (match) return match;

  // The current backend list contract has no detail endpoint or offset. A full
  // page therefore cannot prove absence; fail unavailable instead of false 404.
  if (rows.length >= LIST_LIMIT) {
    throw new Error("LaventeCare context lookup was incomplete.");
  }
  return null;
}

function formatDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value?: number) {
  if (value === undefined) return undefined;
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function createBackendSource(): LaventeCarePdfContextSource {
  const { baseUrl, apiKey } = getBackendProxyConfig();
  const pending = new Map<LaventeCarePdfResolvableDossierKind, Promise<unknown[]>>();

  return {
    list(kind) {
      const existing = pending.get(kind);
      if (existing) return existing;

      const request = (async () => {
        const url = new URL(`${baseUrl}/laventecare/${ENDPOINTS[kind]}`);
        url.searchParams.set("limit", String(LIST_LIMIT));
        if (kind === "workstream") url.searchParams.set("includeClosed", "true");

        const headers = new Headers({ Accept: "application/json" });
        if (apiKey) headers.set("X-API-Key", apiKey);

        const response = await fetch(url, {
          cache: "no-store",
          headers,
          signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error("LaventeCare context lookup failed.");

        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) throw new Error("LaventeCare context lookup returned invalid data.");
        return payload;
      })();

      pending.set(kind, request);
      return request;
    },
  };
}

async function getCompanyName(
  companyId: string | undefined,
  ownerUserId: string,
  source: LaventeCarePdfContextSource,
) {
  if (!companyId) return undefined;
  const company = findOwnedRecord(await source.list("company"), companyId, ownerUserId);
  if (!company) throw new Error("Related LaventeCare company was not available.");
  const companyName = text(company, "naam", 120);
  if (!companyName) throw new Error("Related LaventeCare company was invalid.");
  return companyName;
}

async function mapCompany(
  reference: LaventeCarePdfDossierReference,
  ownerUserId: string,
  source: LaventeCarePdfContextSource,
) {
  const company = findOwnedRecord(await source.list("company"), reference.id, ownerUserId);
  if (!company) return null;

  const title = text(company, "naam", 120);
  if (!title) throw new Error("LaventeCare company context was invalid.");
  const nextAction = text(company, "volgende_actie", 220);
  const nextActionDate = formatDate(nextAction);

  return {
    kind: "company",
    id: reference.id,
    title,
    company: title,
    status: text(company, "status", 48),
    phase: text(company, "relatie_type", 48),
    source: text(company, "website", 160),
    summary: text(company, "notities", 500),
    nextStep: nextAction
      ? `Relatie opvolgen: ${nextActionDate ?? nextAction}`
      : undefined,
    dueDate: nextActionDate && nextActionDate !== nextAction ? nextActionDate : undefined,
  } satisfies LaventeCarePdfDossierContext;
}

async function mapLead(
  reference: LaventeCarePdfDossierReference,
  ownerUserId: string,
  source: LaventeCarePdfContextSource,
) {
  const lead = findOwnedRecord(await source.list("lead"), reference.id, ownerUserId);
  if (!lead) return null;

  const title = text(lead, "titel", 120);
  if (!title) throw new Error("LaventeCare lead context was invalid.");
  const dueDate = formatDate(text(lead, "volgende_actie_datum", 80));

  return {
    kind: "lead",
    id: reference.id,
    title,
    company: await getCompanyName(text(lead, "company_id", 80), ownerUserId, source),
    status: text(lead, "status", 48),
    priority: text(lead, "prioriteit", 48),
    score: number(lead, "fit_score"),
    source: text(lead, "bron", 120),
    painPoint: text(lead, "pijnpunt", 500),
    nextStep: text(lead, "volgende_stap", 400),
    dueDate,
  } satisfies LaventeCarePdfDossierContext;
}

async function mapProject(
  reference: LaventeCarePdfDossierReference,
  ownerUserId: string,
  source: LaventeCarePdfContextSource,
) {
  const project = findOwnedRecord(await source.list("project"), reference.id, ownerUserId);
  if (!project) return null;

  const title = text(project, "naam", 120);
  if (!title) throw new Error("LaventeCare project context was invalid.");
  const dueDate = formatDate(text(project, "deadline", 80));

  return {
    kind: "project",
    id: reference.id,
    title,
    company: await getCompanyName(text(project, "company_id", 80), ownerUserId, source),
    status: text(project, "status", 48),
    phase: text(project, "fase", 48),
    valueLabel: formatMoney(number(project, "waarde_indicatie")),
    summary: text(project, "samenvatting", 500),
    nextStep: dueDate ? `Deadline bewaken: ${dueDate}` : undefined,
    dueDate,
  } satisfies LaventeCarePdfDossierContext;
}

async function mapWorkstream(
  reference: LaventeCarePdfDossierReference,
  ownerUserId: string,
  source: LaventeCarePdfContextSource,
) {
  const workstream = findOwnedRecord(await source.list("workstream"), reference.id, ownerUserId);
  if (!workstream) return null;

  const title = text(workstream, "titel", 120);
  if (!title) throw new Error("LaventeCare workstream context was invalid.");
  const company =
    text(workstream, "klant_naam", 120) ??
    (await getCompanyName(text(workstream, "company_id", 80), ownerUserId, source));

  return {
    kind: "workstream",
    id: reference.id,
    title,
    company,
    status: text(workstream, "status", 48),
    priority: text(workstream, "prioriteit", 48),
    phase: text(workstream, "type", 48),
    valueLabel: formatMoney(number(workstream, "waarde_indicatie")),
    source: text(workstream, "bron", 120),
    summary: text(workstream, "doel", 500) ?? text(workstream, "scope", 500),
    painPoint: text(workstream, "bevindingen", 500),
    nextStep: text(workstream, "volgende_stap", 400),
    dueDate: formatDate(text(workstream, "deadline", 80)),
  } satisfies LaventeCarePdfDossierContext;
}

export type LaventeCarePdfContextResolution =
  | { status: "resolved"; context: LaventeCarePdfDossierContext }
  | { status: "none"; context: null }
  | { status: "not_found"; context: null }
  | { status: "unavailable"; context: null };

export async function resolveLaventeCarePdfDossierContextResult(
  reference: LaventeCarePdfDossierReference | null,
  ownerUserId: string,
  source?: LaventeCarePdfContextSource,
): Promise<LaventeCarePdfContextResolution> {
  if (!reference) return { status: "none", context: null };
  if (!ownerUserId.trim()) return { status: "not_found", context: null };

  try {
    const contextSource = source ?? createBackendSource();
    let context: LaventeCarePdfDossierContext | null;
    switch (reference.kind) {
      case "company":
        context = await mapCompany(reference, ownerUserId, contextSource);
        break;
      case "lead":
        context = await mapLead(reference, ownerUserId, contextSource);
        break;
      case "project":
        context = await mapProject(reference, ownerUserId, contextSource);
        break;
      case "workstream":
        context = await mapWorkstream(reference, ownerUserId, contextSource);
        break;
    }

    return context
      ? { status: "resolved", context }
      : { status: "not_found", context: null };
  } catch {
    return { status: "unavailable", context: null };
  }
}

export async function resolveLaventeCarePdfDossierContext(
  reference: LaventeCarePdfDossierReference | null,
  ownerUserId: string,
  source?: LaventeCarePdfContextSource,
): Promise<LaventeCarePdfDossierContext | null> {
  const result = await resolveLaventeCarePdfDossierContextResult(reference, ownerUserId, source);
  return result.status === "resolved" ? result.context : null;
}
