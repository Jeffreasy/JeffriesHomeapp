/**
 * convex/ai/grok/tools/policy.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Server-side policy for Grok tools. Prompt text may guide the model, but this
 * file is the actual enforcement layer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { TOOLS } from "./definitions";

type ToolDefinition = (typeof TOOLS)[number];

type ToolPolicy = {
  agents: string[];
  mutates: boolean;
  requiresConfirmation: boolean;
};

const BRAIN_AGENTS = ["brain"];
const READ_DASHBOARD_AGENTS = ["dashboard", ...BRAIN_AGENTS];
const EMAIL_WRITE_AGENTS = ["email", ...BRAIN_AGENTS];
const SMART_HOME_WRITE_AGENTS = ["lampen", ...BRAIN_AGENTS];
const FINANCE_WRITE_AGENTS = ["finance", ...BRAIN_AGENTS];
const CALENDAR_WRITE_AGENTS = ["agenda", "rooster", ...BRAIN_AGENTS];
const NOTES_WRITE_AGENTS = ["notes", ...BRAIN_AGENTS];
const HABITS_WRITE_AGENTS = ["habits", ...BRAIN_AGENTS];
const LAVENTECARE_WRITE_AGENTS = ["laventecare", ...BRAIN_AGENTS];

const TOOL_POLICIES: Record<string, ToolPolicy> = {
  // Email
  leesEmail:          { agents: ["email", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  zoekEmails:         { agents: ["email", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  markeerGelezen:     { agents: EMAIL_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  verwijderEmail:     { agents: EMAIL_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  markeerSter:        { agents: EMAIL_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  emailVersturen:     { agents: EMAIL_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  emailBeantwoorden:  { agents: EMAIL_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  bulkMarkeerGelezen: { agents: EMAIL_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  bulkVerwijder:      { agents: EMAIL_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  inboxOpruimen:      { agents: EMAIL_WRITE_AGENTS, mutates: true, requiresConfirmation: true },

  // Smart home
  lampBedien: { agents: SMART_HOME_WRITE_AGENTS, mutates: true, requiresConfirmation: false },

  // Schedule and salary reads
  dienstenOpvragen: { agents: ["rooster", "finance", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  salarisOpvragen:  { agents: ["finance", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },

  // Finance
  saldoOpvragen:      { agents: ["finance", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  transactiesZoeken:  { agents: ["finance", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  uitgavenOverzicht:  { agents: ["finance", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  maandVergelijken:   { agents: ["finance", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  vasteLastenAnalyse: { agents: ["finance", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  categorieWijzigen:  { agents: FINANCE_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  bulkCategoriseren:  { agents: FINANCE_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  ongelabeldAnalyse:  { agents: ["finance", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },

  // Calendar
  afspraakMaken:       { agents: CALENDAR_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  afspraakBewerken:    { agents: CALENDAR_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  afspraakVerwijderen: { agents: CALENDAR_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  afsprakenOpvragen:   { agents: ["agenda", "rooster", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },

  // Notes
  notitieMaken:             { agents: NOTES_WRITE_AGENTS, mutates: true, requiresConfirmation: false },
  notitiesZoeken:           { agents: ["notes", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  notitiePinnen:            { agents: NOTES_WRITE_AGENTS, mutates: true, requiresConfirmation: false },
  notitieBewerken:          { agents: NOTES_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  notitieArchiveren:        { agents: NOTES_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  notitiesOverzicht:        { agents: ["notes", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  bulkArchiveerNotities:    { agents: NOTES_WRITE_AGENTS, mutates: true, requiresConfirmation: true },

  // LaventeCare
  laventecareCockpit:      { agents: ["laventecare", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  laventecareKennisZoeken: { agents: ["laventecare", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  laventecareLeadMaken:    { agents: LAVENTECARE_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  laventecareProjectMaken: { agents: LAVENTECARE_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  laventecareActieMaken:   { agents: LAVENTECARE_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  laventecareActiesOpvragen: { agents: ["laventecare", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  laventecareActieAfronden:  { agents: LAVENTECARE_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  laventecareBesluitMaken:   { agents: LAVENTECARE_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  laventecareChangeRequestMaken: { agents: LAVENTECARE_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  laventecareSlaIncidentMaken:   { agents: LAVENTECARE_WRITE_AGENTS, mutates: true, requiresConfirmation: true },

  // Habits
  habitAanmaken:   { agents: HABITS_WRITE_AGENTS, mutates: true, requiresConfirmation: false },
  habitVoltooien:  { agents: HABITS_WRITE_AGENTS, mutates: true, requiresConfirmation: false },
  habitIncident:   { agents: HABITS_WRITE_AGENTS, mutates: true, requiresConfirmation: true },
  habitsOverzicht: { agents: ["habits", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  habitStreaks:    { agents: ["habits", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  habitBadges:     { agents: ["habits", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  habitRapport:    { agents: ["habits", ...READ_DASHBOARD_AGENTS], mutates: false, requiresConfirmation: false },
  habitNotitie:    { agents: HABITS_WRITE_AGENTS, mutates: true, requiresConfirmation: false },
};

export function listToolPolicies() {
  return Object.entries(TOOL_POLICIES).map(([toolName, policy]) => ({
    toolName,
    agents: policy.agents,
    mutates: policy.mutates,
    requiresConfirmation: policy.requiresConfirmation,
  }));
}

function toolPolicy(toolName: string): ToolPolicy | undefined {
  return TOOL_POLICIES[toolName];
}

export function getToolsForAgent(agentId: string): ToolDefinition[] {
  return TOOLS.filter((tool) => isToolAllowed(agentId, tool.function.name));
}

export function isToolAllowed(agentId: string, toolName: string): boolean {
  const policy = toolPolicy(toolName);
  return Boolean(policy && policy.agents.includes(agentId));
}

export function isMutatingTool(toolName: string): boolean {
  return toolPolicy(toolName)?.mutates ?? false;
}

export function requiresConfirmation(toolName: string): boolean {
  return toolPolicy(toolName)?.requiresConfirmation ?? true;
}

function textArg(args: Record<string, unknown>, key: string, fallback = "onbekend"): string {
  const value = args[key];
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function countArg(args: Record<string, unknown>, key: string): number | null {
  const value = args[key];
  return Array.isArray(value) ? value.length : null;
}

export function describePendingAction(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case "emailVersturen":
      return `Email versturen naar ${textArg(args, "aan")} met onderwerp "${textArg(args, "onderwerp")}"`;
    case "emailBeantwoorden":
      return `Email beantwoorden naar ${textArg(args, "aan")} in thread ${textArg(args, "threadId")}`;
    case "verwijderEmail":
      return `Email naar prullenbak verplaatsen (${textArg(args, "gmailId")})`;
    case "markeerGelezen":
      return `Email markeren als ${args.gelezen ? "gelezen" : "ongelezen"} (${textArg(args, "gmailId")})`;
    case "markeerSter":
      return `Email ster ${args.ster ? "toevoegen" : "verwijderen"} (${textArg(args, "gmailId")})`;
    case "bulkMarkeerGelezen":
      return `${countArg(args, "gmailIds") ?? 0} emails markeren als ${args.gelezen ? "gelezen" : "ongelezen"}`;
    case "bulkVerwijder":
      return `${countArg(args, "gmailIds") ?? 0} emails naar prullenbak verplaatsen`;
    case "inboxOpruimen":
      return `Inbox opruimen: ${textArg(args, "filter")} -> ${textArg(args, "actie")}`;
    case "afspraakMaken":
      return `Afspraak aanmaken: "${textArg(args, "titel")}" op ${textArg(args, "startDatum")}`;
    case "afspraakBewerken":
      return `Afspraak bewerken: ${textArg(args, "eventId", textArg(args, "zoekterm"))}`;
    case "afspraakVerwijderen":
      return `Afspraak verwijderen: ${textArg(args, "eventId", textArg(args, "zoekterm"))}`;
    case "categorieWijzigen":
      return `Transactie herindelen naar "${textArg(args, "categorie")}"`;
    case "bulkCategoriseren":
      return `Alle transacties van "${textArg(args, "tegenpartij")}" categoriseren als "${textArg(args, "categorie")}"`;
    case "notitieBewerken":
      return `Notitie bewerken (${textArg(args, "noteId")})`;
    case "notitieArchiveren":
      return `Notitie archiveren (${textArg(args, "noteId")})`;
    case "bulkArchiveerNotities":
      return `${countArg(args, "noteIds") ?? 0} notities archiveren`;
    case "habitIncident":
      return `Incident loggen voor habit "${textArg(args, "habitNaam")}"`;
    case "laventecareLeadMaken":
      return `LaventeCare lead aanmaken: "${textArg(args, "titel")}"${args.companyName ? ` voor ${textArg(args, "companyName")}` : ""}`;
    case "laventecareProjectMaken":
      return `LaventeCare project aanmaken: "${textArg(args, "naam")}"`;
    case "laventecareActieMaken":
      return `LaventeCare actie klaarzetten: "${textArg(args, "title", textArg(args, "titel"))}"`;
    case "laventecareActieAfronden":
      return `LaventeCare actie afronden: ${textArg(args, "actionId", textArg(args, "actieId", textArg(args, "id")))}`;
    case "laventecareBesluitMaken":
      return `LaventeCare besluit vastleggen: "${textArg(args, "titel", textArg(args, "title"))}"`;
    case "laventecareChangeRequestMaken":
      return `LaventeCare change request vastleggen: "${textArg(args, "titel", textArg(args, "title"))}"`;
    case "laventecareSlaIncidentMaken":
      return `LaventeCare SLA-incident vastleggen: "${textArg(args, "titel", textArg(args, "title"))}"`;
    default:
      return `${toolName} uitvoeren`;
  }
}
