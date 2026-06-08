import type { AppIconName } from "@/lib/symbols";

export type WorkspaceContextId = "laventecare";
export type BusinessContextType = "laventecare" | "laventecare_company" | "laventecare_lead" | "laventecare_workstream" | "laventecare_project";

export type BusinessContextValue = {
  type?: BusinessContextType | string | null;
  id?: string | null;
  title?: string | null;
};

export type WorkspaceContext = {
  id: WorkspaceContextId;
  label: string;
  tag: string;
  aliases: string[];
  noteSymbol: AppIconName;
  eventSymbol: AppIconName;
  eventCategory: string;
};

export const WORKSPACE_CONTEXTS = [
  {
    id: "laventecare",
    label: "LaventeCare",
    tag: "laventecare",
    aliases: [
      "laventecare",
      "lavente care",
      "lc",
      "crm",
      "klant",
      "klanten",
      "klantcontext",
      "lead",
      "leads",
      "contactpersoon",
      "contactpersonen",
      "opdracht",
      "opdrachten",
      "werkstream",
      "werkstreams",
      "quickscan",
      "integratie",
      "automatisering",
      "offerte",
      "offertes",
      "klantdossier",
      "dossierdocument",
      "dossierdocumenten",
      "rapportage",
      "rapportages",
      "eigen project",
      "intern project",
    ],
    noteSymbol: "business",
    eventSymbol: "business",
    eventCategory: "werk",
  },
] as const satisfies ReadonlyArray<WorkspaceContext>;

const TAG_PATTERN = /#([a-zA-Z\u00C0-\u024F0-9_-]+)/g;
const EVENT_METADATA_PATTERN = /\s*\[(categorie|symbol|context|tags|businessContextType|business_context_type|businessContextId|business_context_id|businessContextTitle|business_context_title):([^\]]+)\]/gi;

export type ParsedHashTags = {
  cleanText: string;
  extractedTags: string[];
};

export type EventMetadata = {
  category?: string;
  symbol?: string;
  contextIds: WorkspaceContextId[];
  businessContext?: BusinessContextValue | null;
  tags: string[];
  cleanDescription: string;
};

export function normalizeTag(value: string) {
  return value
    .trim()
    .replace(/^#/, "")
    .toLowerCase()
    .replace(/[^a-z0-9_\-\u00C0-\u024F]/gi, "");
}

export function normalizeTags(values: Array<string | null | undefined>) {
  const tags: string[] = [];
  for (const value of values) {
    const tag = normalizeTag(value ?? "");
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export function mergeTags(...groups: Array<Array<string | null | undefined> | null | undefined>) {
  return normalizeTags(groups.flatMap((group) => group ?? []));
}

export function extractHashTags(value: string) {
  const tags: string[] = [];
  for (const match of value.matchAll(TAG_PATTERN)) {
    const tag = normalizeTag(match[1] ?? "");
    if (tag && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export function parseHashTags(value: string): ParsedHashTags {
  const extractedTags: string[] = [];
  const cleanText = value
    .trim()
    .replace(TAG_PATTERN, (_match, rawTag: string) => {
      const tag = normalizeTag(rawTag);
      if (tag && !extractedTags.includes(tag)) extractedTags.push(tag);
      return "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();

  return { cleanText, extractedTags };
}

export function detectWorkspaceContexts(text = "", tags: string[] = []) {
  const normalizedTags = normalizeTags([...tags, ...extractHashTags(text)]);
  const normalizedText = normalizeText(text);

  return WORKSPACE_CONTEXTS.filter((context) => {
    if (normalizedTags.includes(context.tag)) return true;
    return context.aliases.some((alias) => containsTerm(normalizedText, normalizeText(alias)));
  });
}

export function getPrimaryWorkspaceContext(text = "", tags: string[] = []) {
  return detectWorkspaceContexts(text, tags)[0] ?? null;
}

export function enrichNoteDraft(input: {
  title?: string;
  content?: string;
  tags?: string[];
  symbol?: AppIconName | null;
  businessContext?: BusinessContextValue | null;
}) {
  const sourceText = `${input.title ?? ""} ${input.content ?? ""}`;
  const explicitTags = mergeTags(input.tags, extractHashTags(sourceText));
  const businessContext = normalizeBusinessContext(input.businessContext);
  const businessTags = businessContextTags(businessContext);
  const context = getPrimaryWorkspaceContext(sourceText, mergeTags(explicitTags, businessTags));
  const normalizedBusinessContext = businessContext ?? businessContextFromWorkspaceContext(context);
  const tags = context ? mergeTags(explicitTags, businessTags, [context.tag]) : mergeTags(explicitTags, businessTags);
  const symbol = context && shouldAutoApplyContextSymbol(input.symbol, ["note", "pageNote", "calendar", "work"])
    ? context.noteSymbol
    : input.symbol ?? "note";

  return { context, tags, symbol, businessContext: normalizedBusinessContext };
}

export function enrichEventDraft(input: {
  title?: string;
  description?: string;
  location?: string;
  tags?: string[];
  category?: string;
  symbol?: AppIconName | null;
  businessContext?: BusinessContextValue | null;
}) {
  const sourceText = `${input.title ?? ""} ${input.description ?? ""} ${input.location ?? ""}`;
  const explicitTags = mergeTags(input.tags, extractHashTags(sourceText));
  const businessContext = normalizeBusinessContext(input.businessContext);
  const businessTags = businessContextTags(businessContext);
  const context = getPrimaryWorkspaceContext(sourceText, mergeTags(explicitTags, businessTags));
  const normalizedBusinessContext = businessContext ?? businessContextFromWorkspaceContext(context);
  const tags = context ? mergeTags(explicitTags, businessTags, [context.tag]) : mergeTags(explicitTags, businessTags);
  const category = context && (!input.category || input.category === "overig") ? context.eventCategory : input.category ?? "overig";
  const symbol = context && shouldAutoApplyContextSymbol(input.symbol, ["agenda", "calendar", "categoryOther", "categoryWork"])
    ? context.eventSymbol
    : input.symbol ?? "agenda";

  return { context, tags, category, symbol, businessContext: normalizedBusinessContext };
}

export function parseEventMetadata(description?: string | null): EventMetadata {
  const contextIds: WorkspaceContextId[] = [];
  const tags: string[] = [];
  let category: string | undefined;
  let symbol: string | undefined;
  let businessContextType: string | undefined;
  let businessContextId: string | undefined;
  let businessContextTitle: string | undefined;

  const cleanDescription = (description ?? "")
    .replace(EVENT_METADATA_PATTERN, (_match, key: string, rawValue: string) => {
      const value = rawValue.trim();
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === "categorie") category = value;
      if (normalizedKey === "symbol") symbol = value;
      if (normalizedKey === "context") {
        const context = WORKSPACE_CONTEXTS.find((item) => item.id === value || item.tag === normalizeTag(value));
        if (context && !contextIds.includes(context.id)) contextIds.push(context.id);
      }
      if (normalizedKey === "tags") {
        tags.push(...value.split(",").map((tag) => normalizeTag(tag)));
      }
      if (normalizedKey === "businesscontexttype" || normalizedKey === "business_context_type") businessContextType = value;
      if (normalizedKey === "businesscontextid" || normalizedKey === "business_context_id") businessContextId = value;
      if (normalizedKey === "businesscontexttitle" || normalizedKey === "business_context_title") businessContextTitle = value;
      return "";
    })
    .replace(/\s{2,}/g, " ")
    .trim();

  const metadataContext = contextIds.includes("laventecare") ? businessContextFromWorkspaceContext(WORKSPACE_CONTEXTS[0]) : null;
  const businessContext = normalizeBusinessContext({
    type: businessContextType ?? metadataContext?.type,
    id: businessContextId,
    title: businessContextTitle ?? metadataContext?.title,
  });

  return { category, symbol, contextIds, businessContext, tags: normalizeTags(tags), cleanDescription };
}

export function stripEventMetadata(description?: string | null) {
  return parseEventMetadata(description).cleanDescription;
}

export function buildEventDescription(input: {
  description?: string;
  category: string;
  symbol: AppIconName;
  context?: WorkspaceContext | null;
  businessContext?: BusinessContextValue | null;
  tags?: string[];
}) {
  const businessContext = normalizeBusinessContext(input.businessContext) ?? businessContextFromWorkspaceContext(input.context ?? null);
  const contextId = input.context?.id ?? (businessContext?.type?.startsWith("laventecare") ? "laventecare" : null);
  const tokens = [
    `categorie:${input.category}`,
    `symbol:${input.symbol}`,
    contextId ? `context:${contextId}` : null,
    businessContext?.type ? `businessContextType:${metadataValue(businessContext.type)}` : null,
    businessContext?.id ? `businessContextId:${metadataValue(businessContext.id)}` : null,
    businessContext?.title ? `businessContextTitle:${metadataValue(businessContext.title)}` : null,
    input.tags && input.tags.length > 0 ? `tags:${normalizeTags(input.tags).join(",")}` : null,
  ].filter(Boolean);

  return `${(input.description ?? "").trim()} ${tokens.map((token) => `[${token}]`).join(" ")}`.trim();
}

export function contextTagsFromEvent(event?: {
  titel?: string;
  beschrijving?: string | null;
  locatie?: string | null;
  symbol?: string | null;
  businessContextType?: string | null;
  business_context_type?: string | null;
  businessContextId?: string | null;
  business_context_id?: string | null;
  businessContextTitle?: string | null;
  business_context_title?: string | null;
}) {
  if (!event) return [];
  const metadata = parseEventMetadata(event.beschrijving);
  const businessContext = businessContextFromEvent(event);
  const metadataContextTags = metadata.contextIds.reduce<string[]>((tags, id) => {
    const tag = WORKSPACE_CONTEXTS.find((context) => context.id === id)?.tag;
    if (tag) tags.push(tag);
    return tags;
  }, []);
  const context = getPrimaryWorkspaceContext(`${event.titel ?? ""} ${metadata.cleanDescription} ${event.locatie ?? ""}`, [
    ...metadata.tags,
    ...metadataContextTags,
    ...businessContextTags(businessContext),
  ]);
  return context
    ? mergeTags(metadata.tags, metadataContextTags, businessContextTags(businessContext), [context.tag])
    : mergeTags(metadata.tags, metadataContextTags, businessContextTags(businessContext));
}

export function normalizeBusinessContext(value?: BusinessContextValue | null): BusinessContextValue | null {
  const type = (value?.type ?? "").trim();
  const id = (value?.id ?? "").trim();
  const title = (value?.title ?? "").trim();
  if (!type) return null;
  return {
    type,
    id: id || null,
    title: title || (type === "laventecare" ? "LaventeCare" : null),
  };
}

export function businessContextFromWorkspaceContext(context?: WorkspaceContext | null): BusinessContextValue | null {
  if (!context) return null;
  if (context.id === "laventecare") return { type: "laventecare", id: null, title: context.label };
  return null;
}

export function businessContextFromEvent(event?: {
  beschrijving?: string | null;
  businessContextType?: string | null;
  business_context_type?: string | null;
  businessContextId?: string | null;
  business_context_id?: string | null;
  businessContextTitle?: string | null;
  business_context_title?: string | null;
} | null): BusinessContextValue | null {
  if (!event) return null;
  const metadata = parseEventMetadata(event.beschrijving);
  return normalizeBusinessContext({
    type: event.businessContextType ?? event.business_context_type ?? metadata.businessContext?.type,
    id: event.businessContextId ?? event.business_context_id ?? metadata.businessContext?.id,
    title: event.businessContextTitle ?? event.business_context_title ?? metadata.businessContext?.title,
  });
}

export function businessContextTags(value?: BusinessContextValue | null) {
  const context = normalizeBusinessContext(value);
  if (!context?.type) return [];
  if (context.type.startsWith("laventecare")) return ["laventecare"];
  return [];
}

export function businessContextLabel(value?: BusinessContextValue | null) {
  const context = normalizeBusinessContext(value);
  if (!context?.type) return "Geen zakelijke context";
  return context.title || context.type;
}

export function shouldAutoApplyContextSymbol(value: AppIconName | string | null | undefined, autoSymbols: string[]) {
  return !value || autoSymbols.includes(value);
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function containsTerm(text: string, term: string) {
  if (!term) return false;
  if (term.length <= 3) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(term);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function metadataValue(value: string) {
  return value.trim().replace(/[\[\]]/g, "");
}
