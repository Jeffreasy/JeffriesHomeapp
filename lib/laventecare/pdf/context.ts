export type LaventeCarePdfDossierKind = "company" | "lead" | "workstream" | "project" | "manual";

export type LaventeCarePdfResolvableDossierKind = Exclude<LaventeCarePdfDossierKind, "manual">;

export type LaventeCarePdfDossierReference = {
  kind: LaventeCarePdfResolvableDossierKind;
  id: string;
};

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

export type LaventeCarePdfDossierLink = {
  context_type?: string | null;
  context_id?: string | null;
  company_id?: string | null;
  lead_id?: string | null;
  project_id?: string | null;
  workstream_id?: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const KIND_ALIASES: Record<string, LaventeCarePdfResolvableDossierKind> = {
  company: "company",
  klant: "company",
  klantdossier: "company",
  laventecare_company: "company",
  lead: "lead",
  laventecare_lead: "lead",
  project: "project",
  laventecare_project: "project",
  workstream: "workstream",
  opdracht: "workstream",
  laventecare_workstream: "workstream",
};

function normalizeDossierKind(value?: string | null): LaventeCarePdfResolvableDossierKind | null {
  const normalized = value?.trim().toLowerCase();
  return normalized ? (KIND_ALIASES[normalized] ?? null) : null;
}

function normalizeOpaqueDossierId(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized && UUID_PATTERN.test(normalized) ? normalized.toLowerCase() : null;
}

export function createLaventeCarePdfDossierReference(
  kind?: string | null,
  id?: string | null,
): LaventeCarePdfDossierReference | null {
  const normalizedKind = normalizeDossierKind(kind);
  const normalizedId = normalizeOpaqueDossierId(id);
  return normalizedKind && normalizedId ? { kind: normalizedKind, id: normalizedId } : null;
}

export function getLaventeCarePdfDossierReferenceFromLink(
  link: LaventeCarePdfDossierLink,
): LaventeCarePdfDossierReference | null {
  const directReference = createLaventeCarePdfDossierReference(
    link.context_type,
    link.context_id,
  );
  if (directReference) return directReference;

  return (
    createLaventeCarePdfDossierReference("lead", link.lead_id) ??
    createLaventeCarePdfDossierReference("project", link.project_id) ??
    createLaventeCarePdfDossierReference("workstream", link.workstream_id) ??
    createLaventeCarePdfDossierReference("company", link.company_id)
  );
}

export function getLaventeCarePdfDossierKindLabel(kind: LaventeCarePdfDossierKind) {
  switch (kind) {
    case "company":
      return "Klant";
    case "lead":
      return "Lead";
    case "workstream":
      return "Opdracht";
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

/**
 * URLs carry an owner-scoped reference, never customer or dossier content.
 * The authenticated server resolves this reference to presentation context.
 */
export function encodeLaventeCarePdfDossierContext(
  context?: Pick<LaventeCarePdfDossierContext, "kind" | "id"> | LaventeCarePdfDossierReference | null,
): Record<string, string> {
  const reference = createLaventeCarePdfDossierReference(context?.kind, context?.id);
  return reference ? { ctx: reference.kind, ctxId: reference.id } : {};
}

export function parseLaventeCarePdfDossierReference(
  params: URLSearchParams,
): LaventeCarePdfDossierReference | null {
  return createLaventeCarePdfDossierReference(params.get("ctx"), params.get("ctxId"));
}

export function hasLaventeCarePdfDossierContextParams(params: URLSearchParams) {
  return parseLaventeCarePdfDossierReference(params) !== null;
}
