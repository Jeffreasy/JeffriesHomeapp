/**
 * Grok tool handlers for LaventeCare business operations.
 */

import { internal } from "../../../_generated/api";

type GrokToolCtx = {
  runQuery: <TResult>(queryRef: unknown, args: Record<string, unknown>) => Promise<TResult>;
  runMutation: <TResult>(mutationRef: unknown, args: Record<string, unknown>) => Promise<TResult>;
};

type LaventeCareDocumentResult = {
  documentKey?: string;
  titel: string;
  categorie: string;
  fase?: string;
  versie?: string;
  sourcePath?: string;
  samenvatting: string;
  tags: string[];
};

function text(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberArg(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function handleLaventeCareCockpit(
  ctx: GrokToolCtx,
  _args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const context = await ctx.runQuery<Record<string, unknown>>(internal.laventecare.getAgentContextInternal, {
    userId,
    lite: false,
  });

  return JSON.stringify({
    ok: true,
    context,
  });
}

export async function handleLaventeCareKennisZoeken(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const term = text(args, "term");
  if (!term) {
    return JSON.stringify({ error: "Zoekterm mag niet leeg zijn." });
  }

  const results = await ctx.runQuery<LaventeCareDocumentResult[]>(internal.laventecare.searchKnowledgeInternal, {
    userId,
    term,
  });

  return JSON.stringify({
    gevonden: results.length,
    term,
    documenten: results,
  });
}

export async function handleLaventeCareLeadMaken(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const titel = text(args, "titel");
  if (!titel) {
    return JSON.stringify({ error: "Titel is verplicht." });
  }

  const id = await ctx.runMutation<string>(internal.laventecare.createLeadInternal, {
    userId,
    titel,
    companyName:        text(args, "companyName"),
    website:            text(args, "website"),
    bron:               text(args, "bron") ?? "telegram",
    pijnpunt:           text(args, "pijnpunt"),
    prioriteit:         text(args, "prioriteit") ?? "normaal",
    fitScore:           numberArg(args, "fitScore"),
    volgendeStap:       text(args, "volgendeStap"),
    volgendeActieDatum: text(args, "volgendeActieDatum"),
  });

  return JSON.stringify({
    ok: true,
    message: `LaventeCare lead aangemaakt: ${titel}.`,
    leadId: id,
  });
}

export async function handleLaventeCareActieMaken(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const title = text(args, "title") ?? text(args, "titel");
  if (!title) {
    return JSON.stringify({ error: "Actietitel is verplicht." });
  }

  const id = await ctx.runMutation<string>(internal.laventecare.createActionInternal, {
    userId,
    source:          text(args, "source") ?? "telegram",
    sourceId:        text(args, "sourceId"),
    title,
    summary:         text(args, "summary") ?? text(args, "samenvatting"),
    actionType:      text(args, "actionType") ?? "opvolgen",
    status:          text(args, "status") ?? "open",
    priority:        text(args, "priority") ?? text(args, "prioriteit") ?? "normaal",
    dueDate:         text(args, "dueDate") ?? text(args, "datum"),
    linkedLeadId:    text(args, "linkedLeadId"),
    linkedProjectId: text(args, "linkedProjectId"),
  });

  return JSON.stringify({
    ok: true,
    message: `LaventeCare actie klaargezet: ${title}.`,
    actionId: id,
  });
}

export async function handleLaventeCareProjectMaken(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const naam = text(args, "naam");
  if (!naam) {
    return JSON.stringify({ error: "Projectnaam is verplicht." });
  }

  const id = await ctx.runMutation<string>(internal.laventecare.createProjectInternal, {
    userId,
    naam,
    companyId:       text(args, "companyId"),
    leadId:          text(args, "leadId"),
    fase:            text(args, "fase") ?? "intake",
    status:          text(args, "status") ?? "actief",
    waardeIndicatie: numberArg(args, "waardeIndicatie"),
    startDatum:      text(args, "startDatum"),
    deadline:        text(args, "deadline"),
    samenvatting:    text(args, "samenvatting"),
  });

  return JSON.stringify({
    ok: true,
    message: `LaventeCare project aangemaakt: ${naam}.`,
    projectId: id,
  });
}
