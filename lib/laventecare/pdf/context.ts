export type LaventeCarePdfDossierKind = "lead" | "project" | "manual";

export type LaventeCarePdfDossierContext = {
  kind: LaventeCarePdfDossierKind;
  id?: string;
  title: string;
  company?: string;
  status?: string;
  priority?: string;
  phase?: string;
  score?: number;
  valueLabel?: string;
  source?: string;
  summary?: string;
  painPoint?: string;
  nextStep?: string;
  dueDate?: string;
};

const contextParamKeys = [
  "ctx",
  "ctxId",
  "ctxTitle",
  "ctxCompany",
  "ctxStatus",
  "ctxPriority",
  "ctxPhase",
  "ctxScore",
  "ctxValue",
  "ctxSource",
  "ctxSummary",
  "ctxPain",
  "ctxNext",
  "ctxDue",
] as const;

function cleanContextValue(value?: string | null, maxLength = 180) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}...` : trimmed;
}

function readContextParam(params: URLSearchParams, key: string, maxLength?: number) {
  return cleanContextValue(params.get(key), maxLength);
}

function isDossierKind(value: string | undefined): value is LaventeCarePdfDossierKind {
  return value === "lead" || value === "project" || value === "manual";
}

export function getLaventeCarePdfDossierKindLabel(kind: LaventeCarePdfDossierKind) {
  switch (kind) {
    case "lead":
      return "Lead";
    case "project":
      return "Project";
    default:
      return "Dossier";
  }
}

export function getLaventeCarePdfDossierContextLabel(context?: LaventeCarePdfDossierContext | null) {
  if (!context) return "Geen dossiercontext";

  const parts = [
    getLaventeCarePdfDossierKindLabel(context.kind),
    context.status,
    context.phase,
    context.priority ? `prio ${context.priority}` : undefined,
  ].filter(Boolean);

  return `${context.title} (${parts.join(" - ")})`;
}

export function encodeLaventeCarePdfDossierContext(
  context?: LaventeCarePdfDossierContext | null
): Record<string, string> {
  if (!context?.title.trim()) return {};

  return {
    ctx: context.kind,
    ...(context.id ? { ctxId: context.id } : {}),
    ctxTitle: context.title,
    ...(context.company ? { ctxCompany: context.company } : {}),
    ...(context.status ? { ctxStatus: context.status } : {}),
    ...(context.priority ? { ctxPriority: context.priority } : {}),
    ...(context.phase ? { ctxPhase: context.phase } : {}),
    ...(typeof context.score === "number" ? { ctxScore: String(context.score) } : {}),
    ...(context.valueLabel ? { ctxValue: context.valueLabel } : {}),
    ...(context.source ? { ctxSource: context.source } : {}),
    ...(context.summary ? { ctxSummary: context.summary } : {}),
    ...(context.painPoint ? { ctxPain: context.painPoint } : {}),
    ...(context.nextStep ? { ctxNext: context.nextStep } : {}),
    ...(context.dueDate ? { ctxDue: context.dueDate } : {}),
  };
}

export function parseLaventeCarePdfDossierContext(
  params: URLSearchParams
): LaventeCarePdfDossierContext | null {
  const kindParam = readContextParam(params, "ctx", 24);
  const title = readContextParam(params, "ctxTitle", 120);
  if (!isDossierKind(kindParam) || !title) return null;

  const scoreParam = readContextParam(params, "ctxScore", 12);
  const parsedScore = scoreParam === undefined ? undefined : Number(scoreParam);

  return {
    kind: kindParam,
    id: readContextParam(params, "ctxId", 80),
    title,
    company: readContextParam(params, "ctxCompany", 120),
    status: readContextParam(params, "ctxStatus", 48),
    priority: readContextParam(params, "ctxPriority", 48),
    phase: readContextParam(params, "ctxPhase", 48),
    score: Number.isFinite(parsedScore) ? parsedScore : undefined,
    valueLabel: readContextParam(params, "ctxValue", 80),
    source: readContextParam(params, "ctxSource", 80),
    summary: readContextParam(params, "ctxSummary", 260),
    painPoint: readContextParam(params, "ctxPain", 260),
    nextStep: readContextParam(params, "ctxNext", 220),
    dueDate: readContextParam(params, "ctxDue", 80),
  };
}

export function hasLaventeCarePdfDossierContextParams(params: URLSearchParams) {
  return contextParamKeys.some((key) => params.has(key));
}
