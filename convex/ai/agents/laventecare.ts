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
    "laventecareDocuments",
    "laventecareDecisions",
    "laventecareChangeRequests",
    "laventecareSlaIncidents",
  ],
  capabilities: [
    "LaventeCare-documentatie structureren en doorzoekbaar maken",
    "Leads kwalificeren op fit, urgentie, eigenaar, budget en proceswaarde",
    "Discovery- en blueprint-trajecten voorbereiden",
    "Projectfases, scope, deliverables, change requests en besluiten bewaken",
    "SLA-incidenten en beheercontext samenvatten",
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
      naam: "laventecareProjectMaken",
      type: "mutation",
      beschrijving: "Maakt een projectbasis aan vanuit een gewonnen lead of losse opdracht",
      parameters: [
        { naam: "naam", type: "string", beschrijving: "Projectnaam", verplicht: true },
        { naam: "fase", type: "string", beschrijving: "intake/discovery/blueprint/realisatie/sla/evolution", verplicht: false },
        { naam: "samenvatting", type: "string", beschrijving: "Projectcontext", verplicht: false },
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
