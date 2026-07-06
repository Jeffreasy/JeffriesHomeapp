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
      intro: `${getLaventeCarePdfDossierKindLabel(context.kind)}gegevens voor dit document. Hierdoor kun je de PDF gebruiken als klantdossier, en niet alleen als standaardsjabloon.`,
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
      title: "Alles op één plek",
      intro:
        "Een voorstel is geen losse prijsopgave. Het zet het onderzoek (Discovery), de afspraak, de investering en de beslissing netjes op papier.",
      blocks: [
        {
          type: "detail",
          label: "Bouwplan is leidend",
          text:
            "De afspraak, de technische keuzes en de voorwaarden voor akkoord horen in het bouwplan (Blueprint) of de bijlage te staan. Het voorstel verwijst daarnaar en maakt de investering klaar om over te beslissen.",
          tone: "primary",
        },
        {
          type: "list",
          tone: "default",
          items: [
            "Het probleem, de gevolgen en het gewenste resultaat staan bovenaan.",
            "Onderzoek, bouwen en beheer blijven duidelijk uit elkaar.",
            "Extra werk doen we pas na een duidelijk akkoord op de afspraak of de wijziging.",
          ],
        },
      ],
    },
    {
      marker: "Voorstel 02",
      title: "Fasen, investering en akkoord",
      blocks: [
        {
          type: "metric_grid",
          items: [
            { label: "Discovery", value: "Betaald", detail: "Onderzoek, risico's en input voor het bouwplan", tone: "primary" },
            { label: "Realisatie", value: "Mijlpaal", detail: "Stap voor stap bouwen en goedkeuren", tone: "success" },
            { label: "Beheer", value: "Optioneel", detail: "SLA, onderhoud en doorontwikkeling", tone: "muted" },
            { label: "Meerwerk", value: "Wijziging", detail: "Alleen na akkoord op de gevolgen", tone: "warning" },
          ],
        },
        {
          type: "progress_bars",
          items: [
            {
              label: "Klaar om te beslissen",
              value: document.visibility === "internal" ? 70 : 55,
              max: 100,
              displayValue: document.visibility === "internal" ? "70%" : "55%",
              detail: "Sterker zodra lead, eigenaar, budget en de afspraak gekoppeld zijn.",
              benchmark: "Doel: 80% voor verzending",
              tone: "warning",
            },
            {
              label: "Vastgelegde afspraken",
              value: document.funnelStage === "proposal" ? 75 : 50,
              max: 100,
              displayValue: document.funnelStage === "proposal" ? "75%" : "50%",
              detail: "Voorwaarden, SLA, DPA (afspraak over gegevens) en de afspraak horen bij hetzelfde dossier.",
              benchmark: "Doel: geen voorstel zonder onderliggende afspraak",
              tone: "primary",
            },
          ],
        },
      ],
    },
    {
      marker: "Voorstel 03",
      title: "Vervolg en grens bij niet passen",
      blocks: [
        {
          type: "journey_flow",
          items: [
            { label: "Past het?", detail: "Past de vraag bij LaventeCare als partner die systemen bouwt?", tone: "primary" },
            { label: "Discovery", detail: "Onderzoek het proces, de gegevens, de risico's en de waarde.", tone: "warning" },
            { label: "Blueprint", detail: "Maak de afspraak en de technische route klaar om over te beslissen.", tone: "success" },
            { label: "Voorstel", detail: "Leg investering, planning en voorwaarden vast.", tone: "success" },
          ],
        },
        {
          type: "detail",
          label: "Waar we de grens trekken",
          text:
            "Wil de klant alleen een losse website, is de wens onduidelijk of is het budget niet realistisch? Dan gaat LaventeCare eerst terug naar advies of onderzoek (Discovery).",
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
        "Discovery (het onderzoek) voorkomt dat je bouwt op aannames. Eerst wordt zichtbaar hoe processen, gegevens en beslissingen echt lopen.",
      blocks: [
        {
          type: "list",
          tone: "default",
          items: [
            "Aanvragen, leads, klanten en de interne opvolging worden in kaart gebracht.",
            "Handmatig werk, dubbel werk en verlies van overzicht worden benoemd.",
            "We controleren hoe gegevens lopen, welke systemen er zijn en wie waarvan eigenaar is.",
          ],
        },
        {
          type: "detail",
          label: "Resultaat",
          text:
            "Je krijgt een verslag met een voorstel voor het systeem, de risico's, de prioriteiten en een duidelijk moment om te beslissen over de volgende fase.",
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
            { label: "Proces", value: "Verloop", detail: "Waar ontstaat vertraging of dubbel werk?", tone: "warning" },
            { label: "Gegevens", value: "Bronnen", detail: "Waar staat informatie en wie is eigenaar?", tone: "critical" },
            { label: "Groei", value: "Kansen", detail: "Waar kan automatisering echt waarde leveren?", tone: "success" },
          ],
        },
        {
          type: "progress_bars",
          items: [
            {
              label: "Zicht op het proces",
              value: 65,
              max: 100,
              displayValue: "65%",
              detail: "Genoeg voor richting, nog niet altijd genoeg om vast te leggen wat er precies gebouwd wordt.",
              benchmark: "Doel: het hele werkproces in kaart",
              tone: "primary",
            },
            {
              label: "Zicht op de risico's",
              value: 45,
              max: 100,
              displayValue: "45%",
              detail: "Beveiliging, privacy en waar dingen van elkaar afhangen moeten duidelijk worden benoemd.",
              benchmark: "Doel: risico's per onderdeel van het systeem",
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
            { label: "Observatie", detail: "Het huidige werkproces en de knelpunten vastleggen.", tone: "warning" },
            { label: "Analyse", detail: "Gevolgen, risico's en verbeterkansen bepalen.", tone: "primary" },
            { label: "Advies", detail: "Vervolg dat klaar is voor het bouwplan, met duidelijke keuzes.", tone: "success" },
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
      title: isSla ? "Serviceafspraken en storingen" : "Volgorde van documenten",
      intro: isSla
        ? "Een SLA (serviceafspraak) maakt support, prioriteit, reactietijd en taken meetbaar."
        : "Documenten over afspraken en beheer beschermen het werk. Ze maken duidelijk welke volgorde geldt en wie waarvoor zorgt.",
      blocks: [
        {
          type: "detail",
          label: isSla ? "We doen ons best, tenzij hard afgesproken" : "Volgorde",
          text: isSla
            ? "Richtwaarden zijn een inspanning: we doen ons uiterste best, maar het is geen harde garantie, tenzij het pakket of contract wel een harde SLA noemt."
            : "Het bouwplan (Blueprint) gaat boven het voorstel. Daarna komen de DPA (afspraak over gegevens), de SLA (serviceafspraak), de afspraak zelf en de algemene voorwaarden. Tenzij je schriftelijk iets anders afspreekt.",
          tone: "primary",
        },
        {
          type: "list",
          tone: "default",
          items: isSla
            ? [
                "P1 is volledige uitval of stilstand die het bedrijf raakt.",
                "P2 is een grote storing waar wel een tijdelijke oplossing voor is.",
                "P3/P4 zijn kleine problemen of alleen iets in de vormgeving.",
              ]
            : [
                "Afspraken moeten terug te vinden zijn per versie en dossier.",
                "AVG (privacywet), beveiliging en het verwerken van gegevens zijn geen bijlage achteraf.",
                "Wijzigingen buiten de afspraak lopen via een vast proces voor wijzigingen.",
              ],
        },
      ],
    },
    {
      marker: isSla ? "SLA 02" : "Legal 02",
      title: "Werken met veiligheid voorop",
      blocks: [
        {
          type: "metric_grid",
          items: [
            { label: "Toegang", value: "Zo min mogelijk", detail: "Alleen toegang waar het nodig is", tone: "success" },
            { label: "Gegevens", value: "AVG", detail: "Doel, reden en hoe lang je bewaart", tone: "warning" },
            { label: "Logboek", value: "Vastgelegd", detail: "Besluiten en storingen terug te vinden", tone: "primary" },
            { label: "Doorlopend", value: "SLA", detail: "Support en onderhoud duidelijk afgesproken", tone: "critical" },
          ],
        },
        {
          type: "progress_bars",
          items: [
            {
              label: "Duidelijke afspraken",
              value: isSla ? 85 : 70,
              max: 100,
              displayValue: isSla ? "85%" : "70%",
              detail: "Wordt sterker als het pakket, de reactietijd en het kanaal om op te schalen zijn ingevuld.",
              benchmark: "Doel: geen onuitgesproken supportafspraken",
              tone: "success",
            },
            {
              label: "Gevolgen voor privacy",
              value: 60,
              max: 100,
              displayValue: "60%",
              detail: "De DPA (afspraak over gegevens), de andere partijen die meewerken en het soort gegevens blijven per klantdossier nodig.",
              benchmark: "Doel: per project vastleggen",
              tone: "warning",
            },
          ],
        },
      ],
    },
    {
      marker: isSla ? "SLA 03" : "Legal 03",
      title: "Wijziging, vastleggen en beslissen",
      blocks: [
        {
          type: "journey_flow",
          items: [
            { label: "Signaal", detail: "Vraag, risico of wijziging wordt vastgelegd.", tone: "primary" },
            { label: "Gevolgen", detail: "De afspraak, planning, beveiliging en kosten worden bekeken.", tone: "warning" },
            { label: "Akkoord", detail: "Besluit, versie en eigenaar worden opgeslagen.", tone: "success" },
            { label: "Vastgelegd", detail: "De wijziging blijft terug te vinden in het dossier.", tone: "muted" },
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
      title: "Van signaal naar actie",
      intro:
        "Deze documenten over de dagelijkse gang van zaken verbinden losse signalen met besluiten, wijzigingen, storingen en keuzes voor de planning op langere termijn.",
      blocks: [
        {
          type: "list",
          tone: "default",
          items: [
            "Signalen kunnen uit mail, notities, agenda, Telegram of klantgesprekken komen.",
            "Elke actie heeft een eigenaar, status, deadline en achtergrond.",
            "Besluiten leg je apart vast, zodat de reden niet verdwijnt.",
          ],
        },
        {
          type: "detail",
          label: "Netjes bijhouden",
          text:
            "Het doel is niet meer administratie, maar minder ruis: elke gebeurtenis in de uitvoering moet je later kunnen terugvinden.",
          tone: "success",
        },
      ],
    },
    {
      marker: "Ops 02",
      title: "Planning en ritme bij storingen",
      blocks: [
        {
          type: "metric_grid",
          items: [
            { label: "Storing", value: "Prioriteit", detail: "P1 t/m P4 met de gevolgen", tone: "critical" },
            { label: "Wijziging", value: "Afspraak", detail: "Gevolgen voor planning en prijs", tone: "warning" },
            { label: "Besluit", value: "Vastgelegd", detail: "Waarom deze keuze?", tone: "primary" },
            { label: "Planning", value: "Rondes", detail: "Verbetering per periode", tone: "success" },
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
            { label: "Vastleggen", detail: "Maak het signaal zichtbaar.", tone: "primary" },
            { label: "Indelen", detail: "Storing, wijziging, besluit of iets voor de planning.", tone: "warning" },
            { label: "Actie", detail: "Wijs een eigenaar en een deadline toe.", tone: "success" },
            { label: "Terugkijken", detail: "Gebruik het patroon om dingen echt beter te maken.", tone: "success" },
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
      title: "LaventeCare als partner voor je systemen",
      intro:
        "Deze documenten leggen uit wat LaventeCare doet. En vooral waarom dat waarde heeft voor je proces en je bedrijf.",
      blocks: [
        {
          type: "detail",
          label: "Focus",
          text:
            "Niet een losse tool of pagina, maar een laag die werk, gegevens, opvolging en groei beter laat samenwerken.",
          tone: "primary",
        },
        {
          type: "list",
          tone: "default",
          items: [
            "Leg de nadruk op wat het je bedrijf oplevert, niet op losse techniek.",
            "Maak zichtbaar welk werkproces beter wordt.",
            "Gebruik de vraag 'past het wel of niet' om te voorkomen dat elk verzoek een project wordt.",
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
            { label: "Proces", value: "Verloop", detail: "Betere opvolging en overzicht", tone: "primary" },
            { label: "Gegevens", value: "Grip", detail: "Duidelijke bron en eigenaar", tone: "warning" },
            { label: "Groei", value: "Meegroeien", detail: "Meer verwerken zonder chaos", tone: "success" },
          ],
        },
        {
          type: "progress_bars",
          items: [
            {
              label: "Past het bij de klant?",
              value: document.funnelStage === "awareness" ? 50 : 68,
              max: 100,
              displayValue: document.funnelStage === "awareness" ? "50%" : "68%",
              detail: "Wordt duidelijker na het kennismakingsgesprek, vragen over het proces en een idee van het budget.",
              benchmark: "Doel: check of het past voor het voorstel",
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
            { label: "Introductie", detail: "Leg de waarde en de doelgroep helder uit.", tone: "primary" },
            { label: "Past het?", detail: "Toets de vraag, hoe urgent het is en het budget.", tone: "warning" },
            { label: "Discovery", detail: "Onderzoek wat er echt nodig is.", tone: "success" },
            { label: "Project", detail: "Zet het om in een bouwplan, een voorstel en de oplevering.", tone: "success" },
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
