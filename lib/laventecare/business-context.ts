import { businessContextLabel, normalizeBusinessContext, type BusinessContextValue } from "@/lib/workspace-context";

type CompanyLike = {
  id?: string;
  _id?: string;
  naam?: string;
  website?: string | null;
  relatie_type?: string;
  status?: string;
};

type LeadLike = {
  id?: string;
  _id?: string;
  titel?: string;
  status?: string;
  prioriteit?: string | null;
  company_id?: string | null;
};

type ProjectLike = {
  id?: string;
  _id?: string;
  naam?: string;
  fase?: string;
  status?: string;
  company_id?: string | null;
};

type WorkstreamLike = {
  id?: string;
  _id?: string;
  titel?: string;
  type?: string;
  status?: string;
  klantNaam?: string | null;
  klant_naam?: string | null;
  company_id?: string | null;
};

export type LaventeCareContextOption = {
  key: string;
  label: string;
  meta: string;
  value: BusinessContextValue | null;
  aliases: string[];
  rank: number;
};

type BuildContextOptionsInput = {
  companies?: CompanyLike[];
  activeLeads?: LeadLike[];
  activeProjects?: ProjectLike[];
  activeWorkstreams?: WorkstreamLike[];
};

export function buildLaventeCareContextOptions({
  companies = [],
  activeLeads = [],
  activeProjects = [],
  activeWorkstreams = [],
}: BuildContextOptionsInput): LaventeCareContextOption[] {
  const companyNameById = new Map<string, string>();
  for (const company of companies) {
    const id = itemId(company);
    if (id && company.naam) companyNameById.set(id, company.naam);
  }

  return [
    { key: "none", label: "Geen zakelijke context", meta: "Persoonlijk of algemeen", value: null, aliases: [], rank: 0 },
    {
      key: "laventecare",
      label: "LaventeCare algemeen",
      meta: "Strategie, operatie of interne opvolging",
      value: { type: "laventecare", title: "LaventeCare" },
      aliases: ["laventecare", "lavente care"],
      rank: 5,
    },
    ...companies
      .filter((company) => itemId(company) && company.naam)
      .slice(0, 24)
      .map((company) => {
        const id = itemId(company);
        return {
          key: `company:${id}`,
          label: company.naam ?? "Klantdossier",
          meta: `Klantdossier - ${company.relatie_type ?? "klant"} - ${company.status ?? "actief"}`,
          value: { type: "laventecare_company", id, title: company.naam },
          aliases: companyAliases(company),
          rank: 90,
        } satisfies LaventeCareContextOption;
      }),
    ...activeLeads
      .filter((lead) => itemId(lead) && lead.titel)
      .slice(0, 16)
      .map((lead) => {
        const id = itemId(lead);
        const companyName = lead.company_id ? companyNameById.get(lead.company_id) : "";
        return {
          key: `lead:${id}`,
          label: lead.titel ?? "Lead",
          meta: `Lead - ${lead.prioriteit ?? "normaal"} - ${lead.status ?? "open"}`,
          value: { type: "laventecare_lead", id, title: lead.titel },
          aliases: compactAliases([lead.titel, companyName]),
          rank: 60,
        } satisfies LaventeCareContextOption;
      }),
    ...activeProjects
      .filter((project) => itemId(project) && project.naam)
      .slice(0, 16)
      .map((project) => {
        const id = itemId(project);
        const companyName = project.company_id ? companyNameById.get(project.company_id) : "";
        return {
          key: `project:${id}`,
          label: project.naam ?? "Project",
          meta: `Project - ${project.fase ?? "fase"} - ${project.status ?? "actief"}`,
          value: { type: "laventecare_project", id, title: project.naam },
          aliases: compactAliases([project.naam, companyName]),
          rank: 70,
        } satisfies LaventeCareContextOption;
      }),
    ...activeWorkstreams
      .filter((workstream) => itemId(workstream) && workstream.titel)
      .slice(0, 16)
      .map((workstream) => {
        const id = itemId(workstream);
        const companyName = workstream.company_id ? companyNameById.get(workstream.company_id) : "";
        return {
          key: `workstream:${id}`,
          label: workstream.titel ?? "Opdracht",
          meta: `Opdracht - ${workstream.type ?? "werk"} - ${workstream.status ?? "actief"}`,
          value: { type: "laventecare_workstream", id, title: workstream.titel },
          aliases: compactAliases([workstream.titel, workstream.klantNaam, workstream.klant_naam, companyName]),
          rank: 65,
        } satisfies LaventeCareContextOption;
      }),
  ];
}

export function getBusinessContextOptionKey(value?: BusinessContextValue | null) {
  const context = normalizeBusinessContext(value);
  if (!context?.type) return "none";
  if (context.type === "laventecare_company" && context.id) return `company:${context.id}`;
  if (context.type === "laventecare_lead" && context.id) return `lead:${context.id}`;
  if (context.type === "laventecare_workstream" && context.id) return `workstream:${context.id}`;
  if (context.type === "laventecare_project" && context.id) return `project:${context.id}`;
  if (context.type === "laventecare") return "laventecare";
  if (context.type === "contact" && context.id) return `contact:${context.id}`;
  return "custom";
}

export function fallbackBusinessContextOption(value?: BusinessContextValue | null): LaventeCareContextOption | null {
  const context = normalizeBusinessContext(value);
  if (!context) return null;
  return {
    key: "custom",
    label: businessContextLabel(context),
    meta: context.type ?? "",
    value: context,
    aliases: compactAliases([context.title]),
    rank: 1,
  };
}

export function resolveLaventeCareBusinessContextFromText(
  text: string,
  options: LaventeCareContextOption[],
  current?: BusinessContextValue | null,
): BusinessContextValue | null {
  const normalizedCurrent = normalizeBusinessContext(current);
  if (isSpecificLaventeCareBusinessContext(normalizedCurrent)) return normalizedCurrent;

  const normalizedText = normalizeMatchText(text);
  if (!normalizedText) return null;
  const compactText = compactMatchText(normalizedText);

  let best: { option: LaventeCareContextOption; score: number } | null = null;
  for (const option of options) {
    const context = normalizeBusinessContext(option.value);
    if (!isSpecificLaventeCareBusinessContext(context)) continue;

    const labelScore = matchScore(normalizedText, compactText, option.label, option.rank + 50);
    const aliasScore = Math.max(0, ...option.aliases.map((alias) => matchScore(normalizedText, compactText, alias, option.rank)));
    const score = Math.max(labelScore, aliasScore);
    if (score > 0 && (!best || score > best.score)) best = { option, score };
  }

  return best && best.score >= 75 ? normalizeBusinessContext(best.option.value) : null;
}

export function isGenericLaventeCareBusinessContext(value?: BusinessContextValue | null) {
  const context = normalizeBusinessContext(value);
  return context?.type === "laventecare";
}

export function isSpecificLaventeCareBusinessContext(value?: BusinessContextValue | null) {
  const context = normalizeBusinessContext(value);
  return Boolean(context?.type?.startsWith("laventecare_") && context.id);
}

function itemId(item: { id?: string; _id?: string }) {
  return item._id ?? item.id ?? "";
}

function companyAliases(company: CompanyLike) {
  const websiteAliases = websiteParts(company.website);
  return compactAliases([company.naam, company.website, ...websiteAliases]);
}

function websiteParts(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return [];
  const withoutProtocol = raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split(/[/?#]/)[0] ?? "";
  const base = withoutProtocol.replace(/^www\./i, "");
  const name = base.split(".")[0] ?? "";
  return [withoutProtocol, base, name];
}

function compactAliases(values: Array<string | null | undefined>) {
  const aliases: string[] = [];
  for (const value of values) {
    const normalized = normalizeMatchText(value ?? "");
    if (!normalized || isGenericAlias(normalized)) continue;
    if (!aliases.includes(normalized)) aliases.push(normalized);
  }
  return aliases;
}

function matchScore(text: string, compactText: string, rawAlias: string, baseScore: number) {
  const alias = normalizeMatchText(rawAlias);
  if (!alias || isGenericAlias(alias)) return 0;
  if (containsTerm(text, alias)) return baseScore + Math.min(alias.length, 40);

  const compactAlias = compactMatchText(alias);
  if (compactAlias.length >= 5 && compactText.includes(compactAlias)) {
    return baseScore + Math.min(compactAlias.length, 40) - 8;
  }
  return 0;
}

function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function compactMatchText(value: string) {
  return normalizeMatchText(value).replace(/\s+/g, "");
}

function containsTerm(text: string, term: string) {
  if (!term) return false;
  return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isGenericAlias(value: string) {
  return ["project", "opdracht", "pilot", "website", "klant", "klantdossier", "laventecare"].includes(value);
}
