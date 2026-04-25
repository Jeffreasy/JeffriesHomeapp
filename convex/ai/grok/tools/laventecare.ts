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

function booleanArg(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === "boolean" ? value : undefined;
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

export async function handleLaventeCareActiesOpvragen(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const acties = await ctx.runQuery<Record<string, unknown>[]>(internal.laventecare.listActionsInternal, {
    userId,
    status:          text(args, "status"),
    includeArchived: booleanArg(args, "includeArchived") ?? booleanArg(args, "includeAfgerond"),
    limit:           numberArg(args, "limit") ?? numberArg(args, "aantal"),
  });

  return JSON.stringify({
    ok: true,
    aantal: acties.length,
    acties,
  });
}

export async function handleLaventeCareActieAfronden(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const actionId = text(args, "actionId") ?? text(args, "actieId") ?? text(args, "id");
  if (!actionId) {
    return JSON.stringify({ error: "actionId is verplicht. Vraag eerst laventecareActiesOpvragen als je het ID niet weet." });
  }

  await ctx.runMutation<string>(internal.laventecare.updateActionStatusInternal, {
    userId,
    id:     actionId,
    status: text(args, "status") ?? "afgerond",
  });

  return JSON.stringify({
    ok: true,
    message: "LaventeCare actie afgerond.",
    actionId,
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

export async function handleLaventeCareLeadsOpvragen(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const leads = await ctx.runQuery<Record<string, unknown>[]>(internal.laventecare.listLeadsInternal, {
    userId,
    status:          text(args, "status"),
    includeArchived: booleanArg(args, "includeArchived") ?? booleanArg(args, "includeGesloten"),
    limit:           numberArg(args, "limit") ?? numberArg(args, "aantal"),
  });

  return JSON.stringify({
    ok: true,
    aantal: leads.length,
    leads,
  });
}

export async function handleLaventeCareLeadBijwerken(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const id = text(args, "leadId") ?? text(args, "id");
  if (!id) {
    return JSON.stringify({ error: "leadId is verplicht. Vraag eerst laventecareLeadsOpvragen als je het ID niet weet." });
  }

  await ctx.runMutation<string>(internal.laventecare.updateLeadInternal, {
    userId,
    id,
    status:             text(args, "status"),
    fitScore:           numberArg(args, "fitScore"),
    pijnpunt:           text(args, "pijnpunt"),
    prioriteit:         text(args, "prioriteit"),
    volgendeStap:       text(args, "volgendeStap"),
    volgendeActieDatum: text(args, "volgendeActieDatum"),
  });

  return JSON.stringify({
    ok: true,
    message: "LaventeCare lead bijgewerkt.",
    leadId: id,
  });
}

export async function handleLaventeCareLeadNaarProject(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const leadId = text(args, "leadId") ?? text(args, "id");
  if (!leadId) {
    return JSON.stringify({ error: "leadId is verplicht. Vraag eerst laventecareLeadsOpvragen als je het ID niet weet." });
  }

  const projectId = await ctx.runMutation<string>(internal.laventecare.convertLeadToProjectInternal, {
    userId,
    leadId,
    naam:            text(args, "naam"),
    fase:            text(args, "fase") ?? "intake",
    status:          text(args, "status") ?? "actief",
    waardeIndicatie: numberArg(args, "waardeIndicatie"),
    startDatum:      text(args, "startDatum"),
    deadline:        text(args, "deadline"),
    samenvatting:    text(args, "samenvatting"),
  });

  return JSON.stringify({
    ok: true,
    message: "LaventeCare lead omgezet naar project.",
    leadId,
    projectId,
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

export async function handleLaventeCareBesluitMaken(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const titel = text(args, "titel") ?? text(args, "title");
  const besluit = text(args, "besluit") ?? text(args, "decision");
  const reden = text(args, "reden") ?? text(args, "reason");
  if (!titel || !besluit || !reden) {
    return JSON.stringify({ error: "titel, besluit en reden zijn verplicht." });
  }

  const id = await ctx.runMutation<string>(internal.laventecare.createDecisionInternal, {
    userId,
    projectId: text(args, "projectId"),
    titel,
    besluit,
    reden,
    impact:    text(args, "impact"),
    status:    text(args, "status") ?? "genomen",
    datum:     text(args, "datum") ?? text(args, "date"),
  });

  return JSON.stringify({
    ok: true,
    message: `LaventeCare besluit vastgelegd: ${titel}.`,
    decisionId: id,
  });
}

export async function handleLaventeCareChangeRequestMaken(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const titel = text(args, "titel") ?? text(args, "title");
  const impact = text(args, "impact");
  if (!titel || !impact) {
    return JSON.stringify({ error: "titel en impact zijn verplicht." });
  }

  const id = await ctx.runMutation<string>(internal.laventecare.createChangeRequestInternal, {
    userId,
    projectId:      text(args, "projectId"),
    titel,
    impact,
    planningImpact: text(args, "planningImpact"),
    budgetImpact:   text(args, "budgetImpact"),
    status:         text(args, "status") ?? "nieuw",
  });

  return JSON.stringify({
    ok: true,
    message: `LaventeCare change request vastgelegd: ${titel}.`,
    changeRequestId: id,
  });
}

export async function handleLaventeCareSlaIncidentMaken(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const titel = text(args, "titel") ?? text(args, "title");
  if (!titel) {
    return JSON.stringify({ error: "titel is verplicht." });
  }

  const id = await ctx.runMutation<string>(internal.laventecare.createSlaIncidentInternal, {
    userId,
    projectId:       text(args, "projectId"),
    titel,
    prioriteit:      text(args, "prioriteit") ?? text(args, "priority") ?? "P3",
    status:          text(args, "status") ?? "open",
    kanaal:          text(args, "kanaal") ?? text(args, "channel") ?? "telegram",
    gemeldOp:        text(args, "gemeldOp"),
    reactieDeadline: text(args, "reactieDeadline"),
    samenvatting:    text(args, "samenvatting") ?? text(args, "summary"),
  });

  return JSON.stringify({
    ok: true,
    message: `LaventeCare SLA-incident vastgelegd: ${titel}.`,
    incidentId: id,
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

export async function handleLaventeCareProjectenOpvragen(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const projecten = await ctx.runQuery<Record<string, unknown>[]>(internal.laventecare.listProjectsInternal, {
    userId,
    status:          text(args, "status"),
    fase:            text(args, "fase"),
    includeArchived: booleanArg(args, "includeArchived") ?? booleanArg(args, "includeAfgerond"),
    limit:           numberArg(args, "limit") ?? numberArg(args, "aantal"),
  });

  return JSON.stringify({
    ok: true,
    aantal: projecten.length,
    projecten,
  });
}

export async function handleLaventeCareProjectBijwerken(
  ctx: GrokToolCtx,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const id = text(args, "projectId") ?? text(args, "id");
  if (!id) {
    return JSON.stringify({ error: "projectId is verplicht. Vraag eerst laventecareProjectenOpvragen als je het ID niet weet." });
  }

  await ctx.runMutation<string>(internal.laventecare.updateProjectInternal, {
    userId,
    id,
    fase:            text(args, "fase"),
    status:          text(args, "status"),
    waardeIndicatie: numberArg(args, "waardeIndicatie"),
    startDatum:      text(args, "startDatum"),
    deadline:        text(args, "deadline"),
    samenvatting:    text(args, "samenvatting"),
  });

  return JSON.stringify({
    ok: true,
    message: "LaventeCare project bijgewerkt.",
    projectId: id,
  });
}
