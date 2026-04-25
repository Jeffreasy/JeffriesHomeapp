/**
 * LaventeCare Agent - bedrijfsbrein voor Jeffrey's onderneming.
 *
 * Deze agent bewaakt de bedrijfssystematiek: propositie, intake, discovery,
 * blueprint, realisatie, SLA, documentatie en doorontwikkeling.
 */

import type { AgentDefinition, ContextOptions } from "../registry";
import { internal } from "../../_generated/api";

export const laventecareAgent: AgentDefinition = {
  id:           "laventecare",
  naam:         "LaventeCare Agent",
  emoji:        "🏢",
  beschrijving: "Bedrijfsbrein voor LaventeCare. Combineert bedrijfsdocumentatie, leadkwalificatie, discovery, blueprint, projectdelivery, SLA en doorontwikkeling tot één professionele operationele laag.",
  domein:       [
    "laventecareCompanies",
    "laventecareContacts",
    "laventecareLeads",
    "laventecareProjects",
    "laventecareActionItems",
    "laventecareDocuments",
    "laventecareDecisions",
    "laventecareChangeRequests",
    "laventecareSlaIncidents",
  ],
  capabilities: [
    "LaventeCare-documentatie structureren en doorzoekbaar maken",
    "Leads kwalificeren op fit, urgentie, eigenaar, budget en proceswaarde",
    "Leads door de funnel bewegen en converteren naar projectdelivery",
    "Discovery- en blueprint-trajecten voorbereiden",
    "Projectfases, scope, deliverables, change requests en besluiten bewaken",
    "SLA-incidenten en beheercontext samenvatten",
    "Zakelijke signalen herkennen in email, agenda en notities",
    "Acties en follow-ups vastleggen vanuit signalen of Telegram",
    "Open acties opvragen en afronden met bevestigde Telegram-mutaties",
    "Besluiten, change requests en SLA-incidenten als operationele log bijhouden",
    "Voorstellen, onboarding en juridische documenten in de juiste volgorde plaatsen",
    "Cross-domain signalen koppelen aan agenda, email, notities en finance via Brain",
  ],
  tools: [
    {
      naam: "laventecareCockpit",
      type: "query",
      beschrijving: "Haalt het actuele bedrijfscockpit-overzicht op",
      parameters: [],
    },
    {
      naam: "laventecareKennisZoeken",
      type: "query",
      beschrijving: "Zoekt in de LaventeCare documentbasis",
      parameters: [
        { naam: "term", type: "string", beschrijving: "Zoekterm voor documentatie, processen of juridische stukken", verplicht: true },
      ],
    },
    {
      naam: "laventecareLeadMaken",
      type: "mutation",
      beschrijving: "Maakt een nieuwe LaventeCare lead aan na bevestiging",
      parameters: [
        { naam: "titel", type: "string", beschrijving: "Leadnaam of vraagstuk", verplicht: true },
        { naam: "companyName", type: "string", beschrijving: "Bedrijfsnaam", verplicht: false },
        { naam: "pijnpunt", type: "string", beschrijving: "Belangrijkste procespijn of businesscase", verplicht: false },
        { naam: "volgendeStap", type: "string", beschrijving: "Concrete opvolgstap", verplicht: false },
      ],
    },
    {
      naam: "laventecareLeadsOpvragen",
      type: "query",
      beschrijving: "Haalt leads met IDs en funnelstatus op",
      parameters: [
        { naam: "status", type: "string", beschrijving: "Optionele statusfilter", verplicht: false },
      ],
    },
    {
      naam: "laventecareLeadBijwerken",
      type: "mutation",
      beschrijving: "Wijzigt leadstatus, fit-score of volgende stap na bevestiging",
      parameters: [
        { naam: "leadId", type: "string", beschrijving: "Exact leadId", verplicht: true },
        { naam: "status", type: "string", beschrijving: "nieuw/intake/discovery/voorstel/gewonnen/verloren/no_match", verplicht: false },
      ],
    },
    {
      naam: "laventecareLeadNaarProject",
      type: "mutation",
      beschrijving: "Converteert een lead naar een project na bevestiging",
      parameters: [
        { naam: "leadId", type: "string", beschrijving: "Exact leadId", verplicht: true },
        { naam: "naam", type: "string", beschrijving: "Optionele projectnaam", verplicht: false },
      ],
    },
    {
      naam: "laventecareProjectMaken",
      type: "mutation",
      beschrijving: "Maakt een projectbasis aan vanuit een gewonnen lead of losse opdracht",
      parameters: [
        { naam: "naam", type: "string", beschrijving: "Projectnaam", verplicht: true },
        { naam: "fase", type: "string", beschrijving: "intake/discovery/blueprint/realisatie/sla/evolution", verplicht: false },
        { naam: "samenvatting", type: "string", beschrijving: "Projectcontext", verplicht: false },
      ],
    },
    {
      naam: "laventecareProjectenOpvragen",
      type: "query",
      beschrijving: "Haalt projecten met IDs, fase en status op",
      parameters: [
        { naam: "fase", type: "string", beschrijving: "Optionele fasefilter", verplicht: false },
      ],
    },
    {
      naam: "laventecareProjectBijwerken",
      type: "mutation",
      beschrijving: "Wijzigt projectfase, status, waarde of planning na bevestiging",
      parameters: [
        { naam: "projectId", type: "string", beschrijving: "Exact projectId", verplicht: true },
        { naam: "fase", type: "string", beschrijving: "intake/discovery/blueprint/realisatie/sla/evolution", verplicht: false },
      ],
    },
    {
      naam: "laventecareActieMaken",
      type: "mutation",
      beschrijving: "Legt een LaventeCare actie of follow-up vast na bevestiging",
      parameters: [
        { naam: "title", type: "string", beschrijving: "Korte actietitel", verplicht: true },
        { naam: "summary", type: "string", beschrijving: "Context of gewenste uitkomst", verplicht: false },
        { naam: "dueDate", type: "string", beschrijving: "Opvolgdatum YYYY-MM-DD", verplicht: false },
      ],
    },
    {
      naam: "laventecareActiesOpvragen",
      type: "query",
      beschrijving: "Haalt open LaventeCare acties op",
      parameters: [
        { naam: "status", type: "string", beschrijving: "Optionele statusfilter", verplicht: false },
      ],
    },
    {
      naam: "laventecareActieAfronden",
      type: "mutation",
      beschrijving: "Rondt een LaventeCare actie af na bevestiging",
      parameters: [
        { naam: "actionId", type: "string", beschrijving: "Exact actionId", verplicht: true },
      ],
    },
    {
      naam: "laventecareBesluitMaken",
      type: "mutation",
      beschrijving: "Legt een besluit vast in de decision log",
      parameters: [
        { naam: "titel", type: "string", beschrijving: "Besluittitel", verplicht: true },
        { naam: "besluit", type: "string", beschrijving: "Wat is besloten", verplicht: true },
        { naam: "reden", type: "string", beschrijving: "Waarom", verplicht: true },
      ],
    },
    {
      naam: "laventecareChangeRequestMaken",
      type: "mutation",
      beschrijving: "Legt een scope-, planning- of budgetwijziging vast",
      parameters: [
        { naam: "titel", type: "string", beschrijving: "Change request titel", verplicht: true },
        { naam: "impact", type: "string", beschrijving: "Impact", verplicht: true },
      ],
    },
    {
      naam: "laventecareSlaIncidentMaken",
      type: "mutation",
      beschrijving: "Legt een SLA-incident of beheerissue vast",
      parameters: [
        { naam: "titel", type: "string", beschrijving: "Incidenttitel", verplicht: true },
        { naam: "prioriteit", type: "string", beschrijving: "P1/P2/P3/P4", verplicht: false },
      ],
    },
  ],

  getContext: async (ctx, userId, opts?: ContextOptions) => {
    return ctx.runQuery(internal.laventecare.getAgentContextInternal, {
      userId,
      lite: opts?.lite,
    });
  },
};
