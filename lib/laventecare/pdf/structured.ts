import type { LaventeCareDocument } from "../types";
import {
  getLaventeCarePdfDossierKindLabel,
  type LaventeCarePdfDossierContext,
} from "./context";
import {
  getLaventeCarePdfTemplateProfile,
  type LaventeCarePdfJourneyStep,
  type LaventeCarePdfMetric,
  type LaventeCarePdfVisualTone,
} from "./templates";

export type LaventeCarePdfListTone = "default" | "subtle";

export type LaventeCarePdfProgressBar = {
  label: string;
  value: number | null;
  max: number;
  displayValue: string;
  detail: string;
  benchmark?: string;
  tone: LaventeCarePdfVisualTone;
};

export type LaventeCarePdfStructuredBlock =
  | {
      type: "detail";
      label: string;
      text: string;
      tone?: LaventeCarePdfVisualTone;
    }
  | {
      type: "list";
      tone: LaventeCarePdfListTone;
      items: string[];
    }
  | {
      type: "metric_grid";
      items: LaventeCarePdfMetric[];
    }
  | {
      type: "progress_bars";
      items: LaventeCarePdfProgressBar[];
    }
  | {
      type: "journey_flow";
      items: LaventeCarePdfJourneyStep[];
    };

export type LaventeCarePdfStructuredSection = {
  marker: string;
  title: string;
  intro?: string;
  blocks: LaventeCarePdfStructuredBlock[];
};

function contextSections(
  context?: LaventeCarePdfDossierContext | null
): LaventeCarePdfStructuredSection[] {
  if (!context) return [];

  const facts = [
    context.company ? `Organisatie: ${context.company}` : undefined,
    context.status ? `Status: ${context.status}` : undefined,
    context.phase ? `Fase: ${context.phase}` : undefined,
    context.priority ? `Prioriteit: ${context.priority}` : undefined,
    typeof context.score === "number" ? `Fit score: ${context.score}/100` : undefined,
    context.valueLabel ? `Waarde: ${context.valueLabel}` : undefined,
    context.source ? `Bron: ${context.source}` : undefined,
    context.dueDate ? `Datum/deadline: ${context.dueDate}` : undefined,
  ].filter(Boolean) as string[];

  return [
    {
      marker: "Dossier 01",
      title: context.title,
      intro: `${getLaventeCarePdfDossierKindLabel(context.kind)}context voor dit document. Deze laag maakt het PDF-document bruikbaar als klantdossier in plaats van alleen als generiek template.`,
      blocks: [
        ...(facts.length
          ? [
              {
                type: "list" as const,
                tone: "default" as const,
                items: facts,
              },
            ]
          : []),
        ...(context.painPoint
          ? [
              {
                type: "detail" as const,
                label: "Pijnpunt",
                text: context.painPoint,
                tone: "warning" as const,
              },
            ]
          : []),
        ...(context.summary
          ? [
              {
                type: "detail" as const,
                label: "Samenvatting",
                text: context.summary,
                tone: "primary" as const,
              },
            ]
          : []),
        ...(context.nextStep
          ? [
              {
                type: "detail" as const,
                label: "Volgende stap",
                text: context.nextStep,
                tone: "success" as const,
              },
            ]
          : []),
      ],
    },
  ];
}

function proposalSections(document: LaventeCareDocument): LaventeCarePdfStructuredSection[] {
  return [
    {
      marker: "Voorstel 01",
      title: "Single source of truth",
      intro:
        "Een voorstel is geen losse prijsopgave. Het is de formele vertaling van discovery, scope, investering en besluitvorming.",
      blocks: [
        {
          type: "detail",
          label: "Blueprint leidend",
          text:
            "Scope, technische keuzes en acceptatiecriteria horen in de blueprint of scopebijlage te staan. Het voorstel verwijst daarnaar en maakt de investering besluitbaar.",
          tone: "primary",
        },
        {
          type: "list",
          tone: "default",
          items: [
            "Probleem, impact en gewenste uitkomst staan bovenaan.",
            "Discovery, realisatie en beheer blijven zichtbaar gescheiden.",
            "Meerwerk wordt pas uitgevoerd na expliciete scope- of change-acceptatie.",
          ],
        },
      ],
    },
    {
      marker: "Voorstel 02",
      title: "Fasen, investering en acceptatie",
      blocks: [
        {
          type: "metric_grid",
          items: [
            { label: "Discovery", value: "Betaald", detail: "Analyse, risico's en blueprint-input", tone: "primary" },
            { label: "Realisatie", value: "Mijlpaal", detail: "Gefaseerd bouwen en accepteren", tone: "success" },
            { label: "Beheer", value: "Optioneel", detail: "SLA, onderhoud en doorontwikkeling", tone: "muted" },
            { label: "Meerwerk", value: "Change", detail: "Alleen na akkoord op impact", tone: "warning" },
          ],
        },
        {
          type: "progress_bars",
          items: [
            {
              label: "Besluitrijpheid",
              value: document.visibility === "internal" ? 70 : 55,
              max: 100,
              displayValue: document.visibility === "internal" ? "70%" : "55%",
              detail: "Sterker zodra lead, eigenaar, budget en scope gekoppeld zijn.",
              benchmark: "Doel: 80% voor verzending",
              tone: "warning",
            },
            {
              label: "Contractuele borging",
              value: document.funnelStage === "proposal" ? 75 : 50,
              max: 100,
              displayValue: document.funnelStage === "proposal" ? "75%" : "50%",
              detail: "Voorwaarden, SLA, DPA en scope moeten in dezelfde dossierlijn zitten.",
              benchmark: "Doel: geen voorstel zonder scopebron",
              tone: "primary",
            },
          ],
        },
      ],
    },
    {
      marker: "Voorstel 03",
      title: "Vervolg en no-fit guardrail",
      blocks: [
        {
          type: "journey_flow",
          items: [
            { label: "Fit-check", detail: "Past de vraag bij LaventeCare als systeempartner?", tone: "primary" },
            { label: "Discovery", detail: "Onderzoek proces, data, risico's en waarde.", tone: "warning" },
            { label: "Blueprint", detail: "Maak scope en technische route besluitbaar.", tone: "success" },
            { label: "Voorstel", detail: "Leg investering, planning en voorwaarden vast.", tone: "success" },
          ],
        },
        {
          type: "detail",
          label: "Professionele grens",
          text:
            "Wanneer de klant alleen een losse website, onduidelijke wens of onrealistisch budget heeft, hoort LaventeCare eerst terug te schakelen naar advies of discovery.",
          tone: "critical",
        },
      ],
    },
  ];
}

function discoverySections(): LaventeCarePdfStructuredSection[] {
  return [
    {
      marker: "Discovery 01",
      title: "Niet zomaar bouwen",
      intro:
        "Discovery voorkomt dat er gebouwd wordt op aannames. Eerst wordt zichtbaar hoe processen, data en beslissingen echt lopen.",
      blocks: [
        {
          type: "list",
          tone: "default",
          items: [
            "Aanvragen, leads, klanten en interne opvolging worden in kaart gebracht.",
            "Handmatig werk, dubbel werk en verlies van overzicht worden benoemd.",
            "Datastromen, systemen en eigenaarschap worden gecontroleerd.",
          ],
        },
        {
          type: "detail",
          label: "Output",
          text:
            "Het resultaat is een analyseverslag met systeemvoorstel, risico's, prioriteiten en een concreet besluitmoment voor de volgende fase.",
          tone: "success",
        },
      ],
    },
    {
      marker: "Discovery 02",
      title: "Onderzoeksgebieden",
      blocks: [
        {
          type: "metric_grid",
          items: [
            { label: "Instroom", value: "Leads", detail: "Hoe komt werk binnen en wie volgt op?", tone: "primary" },
            { label: "Proces", value: "Flow", detail: "Waar ontstaat vertraging of dubbel werk?", tone: "warning" },
            { label: "Data", value: "Bronnen", detail: "Waar staat informatie en wie is eigenaar?", tone: "critical" },
            { label: "Groei", value: "Kansen", detail: "Waar kan automatisering echt waarde leveren?", tone: "success" },
          ],
        },
        {
          type: "progress_bars",
          items: [
            {
              label: "Proceszicht",
              value: 65,
              max: 100,
              displayValue: "65%",
              detail: "Voldoende voor richting, nog niet altijd genoeg voor een vaste bouwscope.",
              benchmark: "Doel: volledige workflowkaart",
              tone: "primary",
            },
            {
              label: "Risicohelderheid",
              value: 45,
              max: 100,
              displayValue: "45%",
              detail: "Security, privacy en afhankelijkheden moeten expliciet worden gemaakt.",
              benchmark: "Doel: risico's per systeemlaag",
              tone: "warning",
            },
          ],
        },
      ],
    },
    {
      marker: "Discovery 03",
      title: "Van analyse naar blueprint",
      blocks: [
        {
          type: "journey_flow",
          items: [
            { label: "Context", detail: "Bedrijf, team, klanten en doelen begrijpen.", tone: "primary" },
            { label: "Observatie", detail: "Huidige workflow en bottlenecks vastleggen.", tone: "warning" },
            { label: "Analyse", detail: "Impact, risico's en verbeterkansen bepalen.", tone: "primary" },
            { label: "Advies", detail: "Blueprint-ready vervolg met duidelijke keuzes.", tone: "success" },
          ],
        },
      ],
    },
  ];
}

function legalSections(document: LaventeCareDocument): LaventeCarePdfStructuredSection[] {
  const isSla = document.key.includes("sla");

  return [
    {
      marker: isSla ? "SLA 01" : "Legal 01",
      title: isSla ? "Service levels en incidenten" : "Documenthierarchie",
      intro: isSla
        ? "Een SLA maakt support, prioriteit, responstijd en verantwoordelijkheden meetbaar."
        : "Governance-documenten beschermen de uitvoering door de volgorde en verantwoordelijkheden expliciet te maken.",
      blocks: [
        {
          type: "detail",
          label: isSla ? "Best effort tenzij hard afgesproken" : "Rangorde",
          text: isSla
            ? "Richtwaarden gelden als inspanningsverplichting, tenzij het pakket of contract expliciet een harde SLA noemt."
            : "Blueprint gaat boven voorstel, daarna DPA, SLA, scope en algemene voorwaarden, tenzij schriftelijk anders overeengekomen.",
          tone: "primary",
        },
        {
          type: "list",
          tone: "default",
          items: isSla
            ? [
                "P1 is volledige uitval of bedrijfskritieke stagnatie.",
                "P2 is zware degradatie met workaround.",
                "P3/P4 zijn beperkte of cosmetische problemen.",
              ]
            : [
                "Afspraken moeten herleidbaar zijn naar versie en dossier.",
                "AVG, beveiliging en dataverwerking worden niet als bijlage achteraf behandeld.",
                "Wijzigingen buiten scope lopen via een change-flow.",
              ],
        },
      ],
    },
    {
      marker: isSla ? "SLA 02" : "Legal 02",
      title: "Security-first uitvoering",
      blocks: [
        {
          type: "metric_grid",
          items: [
            { label: "Toegang", value: "Least privilege", detail: "Alleen toegang waar nodig", tone: "success" },
            { label: "Data", value: "AVG", detail: "Doel, grondslag en bewaartermijn", tone: "warning" },
            { label: "Logging", value: "Audit trail", detail: "Besluiten en incidenten herleidbaar", tone: "primary" },
            { label: "Continuiteit", value: "SLA", detail: "Support en onderhoud expliciet", tone: "critical" },
          ],
        },
        {
          type: "progress_bars",
          items: [
            {
              label: "Contractuele helderheid",
              value: isSla ? 85 : 70,
              max: 100,
              displayValue: isSla ? "85%" : "70%",
              detail: "Wordt sterker wanneer pakket, responstijd en escalatiekanaal zijn ingevuld.",
              benchmark: "Doel: geen impliciete supportafspraken",
              tone: "success",
            },
            {
              label: "Privacy-impact",
              value: 60,
              max: 100,
              displayValue: "60%",
              detail: "DPA, subprocessors en dataclassificatie blijven per klantdossier nodig.",
              benchmark: "Doel: per project vastleggen",
              tone: "warning",
            },
          ],
        },
      ],
    },
    {
      marker: isSla ? "SLA 03" : "Legal 03",
      title: "Wijziging, audit en besluitvorming",
      blocks: [
        {
          type: "journey_flow",
          items: [
            { label: "Signaal", detail: "Vraag, risico of wijziging wordt vastgelegd.", tone: "primary" },
            { label: "Impact", detail: "Scope, planning, security en kosten worden beoordeeld.", tone: "warning" },
            { label: "Akkoord", detail: "Besluit, versie en eigenaar worden opgeslagen.", tone: "success" },
            { label: "Audit", detail: "Wijziging blijft herleidbaar in het dossier.", tone: "muted" },
          ],
        },
      ],
    },
  ];
}

function operationsSections(): LaventeCarePdfStructuredSection[] {
  return [
    {
      marker: "Ops 01",
      title: "Signalen naar acties",
      intro:
        "Operations-documenten verbinden dagelijkse signalen met besluiten, changes, incidenten en roadmapkeuzes.",
      blocks: [
        {
          type: "list",
          tone: "default",
          items: [
            "Signalen kunnen uit mail, notities, agenda, Telegram of klantgesprekken komen.",
            "Elke actie heeft een eigenaar, status, deadline en context.",
            "Besluiten worden apart gelogd zodat de reden niet verdwijnt.",
          ],
        },
        {
          type: "detail",
          label: "Dossierdiscipline",
          text:
            "Het doel is niet meer administratie, maar minder ruis: elke operationele gebeurtenis moet later terug te vinden zijn.",
          tone: "success",
        },
      ],
    },
    {
      marker: "Ops 02",
      title: "Roadmap en incidentritme",
      blocks: [
        {
          type: "metric_grid",
          items: [
            { label: "Incident", value: "Prioriteit", detail: "P1 t/m P4 met impact", tone: "critical" },
            { label: "Change", value: "Scope", detail: "Planning en prijsimpact", tone: "warning" },
            { label: "Besluit", value: "Log", detail: "Waarom deze route?", tone: "primary" },
            { label: "Roadmap", value: "Cyclus", detail: "Verbetering per periode", tone: "success" },
          ],
        },
      ],
    },
    {
      marker: "Ops 03",
      title: "Van losse opvolging naar systeem",
      blocks: [
        {
          type: "journey_flow",
          items: [
            { label: "Capture", detail: "Maak het signaal zichtbaar.", tone: "primary" },
            { label: "Classificeer", detail: "Incident, change, besluit of roadmap-item.", tone: "warning" },
            { label: "Actie", detail: "Wijs eigenaar en deadline toe.", tone: "success" },
            { label: "Review", detail: "Gebruik het patroon voor structurele verbetering.", tone: "success" },
          ],
        },
      ],
    },
  ];
}

function serviceSections(document: LaventeCareDocument): LaventeCarePdfStructuredSection[] {
  const serviceLabel = document.services?.[0] ?? document.tags[0] ?? "systeempartner";

  return [
    {
      marker: "Service 01",
      title: "LaventeCare als systeempartner",
      intro:
        "Service-documenten leggen uit wat LaventeCare doet, maar vooral waarom dit procesmatig en zakelijk waarde heeft.",
      blocks: [
        {
          type: "detail",
          label: "Focus",
          text:
            "Niet een losse tool of pagina, maar een systeemlaag die werk, data, opvolging en groei beter laat samenwerken.",
          tone: "primary",
        },
        {
          type: "list",
          tone: "default",
          items: [
            "Positioneer de dienst op businessimpact, niet op losse techniek.",
            "Maak zichtbaar welke workflow wordt verbeterd.",
            "Gebruik fit/no-fit om te voorkomen dat elk verzoek een project wordt.",
          ],
        },
      ],
    },
    {
      marker: "Service 02",
      title: `Dienstprofiel: ${serviceLabel}`,
      blocks: [
        {
          type: "metric_grid",
          items: [
            { label: "Waarde", value: "Rust", detail: "Minder handmatig en dubbel werk", tone: "success" },
            { label: "Proces", value: "Flow", detail: "Betere opvolging en overzicht", tone: "primary" },
            { label: "Data", value: "Grip", detail: "Duidelijke bron en eigenaar", tone: "warning" },
            { label: "Groei", value: "Schaal", detail: "Meer verwerken zonder chaos", tone: "success" },
          ],
        },
        {
          type: "progress_bars",
          items: [
            {
              label: "Klantfit",
              value: document.funnelStage === "awareness" ? 50 : 68,
              max: 100,
              displayValue: document.funnelStage === "awareness" ? "50%" : "68%",
              detail: "Wordt duidelijker na intake, procesvragen en budgetindicatie.",
              benchmark: "Doel: fit-check voor voorstel",
              tone: "primary",
            },
          ],
        },
      ],
    },
    {
      marker: "Service 03",
      title: "Aanpak in dossier",
      blocks: [
        {
          type: "journey_flow",
          items: [
            { label: "Introductie", detail: "Leg waarde en doelgroep helder uit.", tone: "primary" },
            { label: "Fit", detail: "Kwalificeer vraag, urgentie en budget.", tone: "warning" },
            { label: "Discovery", detail: "Onderzoek wat er echt nodig is.", tone: "success" },
            { label: "Project", detail: "Vertaal naar blueprint, voorstel en delivery.", tone: "success" },
          ],
        },
      ],
    },
  ];
}

export function getLaventeCarePdfStructuredSections(
  document: LaventeCareDocument,
  dossierContext?: LaventeCarePdfDossierContext | null
): LaventeCarePdfStructuredSection[] {
  const template = getLaventeCarePdfTemplateProfile(document);
  const dossierSections = contextSections(dossierContext);
  let templateSections: LaventeCarePdfStructuredSection[];

  switch (template.kind) {
    case "proposal":
      templateSections = proposalSections(document);
      break;
    case "discovery":
      templateSections = discoverySections();
      break;
    case "legal":
      templateSections = legalSections(document);
      break;
    case "operations":
      templateSections = operationsSections();
      break;
    case "service":
    default:
      templateSections = serviceSections(document);
      break;
  }

  return [...dossierSections, ...templateSections];
}
