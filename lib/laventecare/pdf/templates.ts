import type { LaventeCareDocument } from "../types";

export type LaventeCarePdfTemplateKind =
  | "proposal"
  | "discovery"
  | "legal"
  | "service"
  | "operations";

export type LaventeCarePdfVisualTone = "primary" | "success" | "warning" | "critical" | "muted";

export type LaventeCarePdfMetric = {
  label: string;
  value: string;
  detail: string;
  tone: LaventeCarePdfVisualTone;
};

export type LaventeCarePdfJourneyStep = {
  label: string;
  detail: string;
  tone: LaventeCarePdfVisualTone;
};

export type LaventeCarePdfTableRow = {
  label: string;
  value: string;
  note: string;
};

export type LaventeCarePdfTemplateProfile = {
  kind: LaventeCarePdfTemplateKind;
  label: string;
  summary: string;
  metrics: LaventeCarePdfMetric[];
  journey: LaventeCarePdfJourneyStep[];
  tableTitle: string;
  tableRows: LaventeCarePdfTableRow[];
};

const defaultJourney: LaventeCarePdfJourneyStep[] = [
  {
    label: "Intake",
    detail: "Vraag, eigenaar, impact en urgentie scherp krijgen.",
    tone: "primary",
  },
  {
    label: "Discovery",
    detail: "Huidige situatie, systemen en risico's onderzoeken.",
    tone: "primary",
  },
  {
    label: "Blueprint",
    detail: "Scope, architectuur, planning en beslispunten vastleggen.",
    tone: "success",
  },
  {
    label: "Realisatie",
    detail: "Gefaseerd bouwen, testen, accepteren en overdragen.",
    tone: "success",
  },
];

export function getLaventeCarePdfTemplateProfile(
  document: LaventeCareDocument
): LaventeCarePdfTemplateProfile {
  if (document.key.includes("voorstel") || document.funnelStage === "proposal") {
    return {
      kind: "proposal",
      label: "Voorsteltemplate",
      summary:
        "Commercieel document met probleem, oplossing, investering, planning en formele vervolgstap.",
      metrics: [
        { label: "Discovery", value: "1-2 weken", detail: "Analyse en blueprintbasis", tone: "primary" },
        { label: "Realisatie", value: "Faseplan", detail: "Milestones en acceptatie", tone: "success" },
        { label: "Investering", value: "Scope-first", detail: "Prijs pas scherp na context", tone: "warning" },
        { label: "Besluit", value: "Go/No-go", detail: "Akkoord op scope en voorwaarden", tone: "muted" },
      ],
      journey: [
        { label: "Fit-check", detail: "Past de klantvraag bij LaventeCare?", tone: "primary" },
        { label: "Discovery", detail: "Bewijs, risico's en oplossingsrichting verzamelen.", tone: "primary" },
        { label: "Blueprint", detail: "Single source of truth voor scope en uitvoering.", tone: "success" },
        { label: "Voorstel", detail: "Investering, planning en voorwaarden formaliseren.", tone: "warning" },
        { label: "Start", detail: "Projectcapaciteit reserveren en milestone starten.", tone: "success" },
      ],
      tableTitle: "Voorstelstructuur",
      tableRows: [
        { label: "Probleem", value: "Businesscase", note: "Waarom moet dit worden opgelost?" },
        { label: "Oplossing", value: "Systeemrichting", note: "Welke workflow of architectuur past?" },
        { label: "Scope", value: "Deliverables", note: "Wat valt wel en niet onder realisatie?" },
        { label: "Investering", value: "Prijsanker", note: "Discovery, bouw en beheer apart houden." },
      ],
    };
  }

  if (
    document.key.includes("discovery") ||
    document.key.includes("audit") ||
    document.phase === "diagnosis"
  ) {
    return {
      kind: "discovery",
      label: "Discovery template",
      summary:
        "Analysegericht document voor huidige situatie, proceskaart, risico's, prioriteiten en blueprint-input.",
      metrics: [
        { label: "Proces", value: "In kaart", detail: "Werkflow, rollen en bottlenecks", tone: "primary" },
        { label: "Data", value: "Controle", detail: "Bronnen, eigenaarschap en kwaliteit", tone: "warning" },
        { label: "Risico", value: "Zichtbaar", detail: "Security, privacy en operatie", tone: "critical" },
        { label: "Blueprint", value: "Input", detail: "Beslisbaar vervolgdocument", tone: "success" },
      ],
      journey: [
        { label: "Context", detail: "Bedrijf, team, klanten en systemen begrijpen.", tone: "primary" },
        { label: "Observatie", detail: "Werkelijke workflow en knelpunten vastleggen.", tone: "warning" },
        { label: "Analyse", detail: "Impact, afhankelijkheden en verbeterkansen bepalen.", tone: "primary" },
        { label: "Advies", detail: "Prioriteiten en oplossingsrichting presenteren.", tone: "success" },
      ],
      tableTitle: "Discovery output",
      tableRows: [
        { label: "Huidige situatie", value: "Proceskaart", note: "Wat gebeurt er nu echt?" },
        { label: "Knelpunten", value: "Impactscore", note: "Tijd, fouten, omzet of klantbeleving." },
        { label: "Systeemkansen", value: "Verbeterlijst", note: "Waar levert automatisering waarde?" },
        { label: "Besluit", value: "Blueprint-ready", note: "Wat is nodig voor een verantwoord voorstel?" },
      ],
    };
  }

  if (document.category === "governance" || document.funnelStage === "legal") {
    return {
      kind: "legal",
      label: "Governance template",
      summary:
        "Formeel document voor afspraken, verantwoordelijkheden, AVG, security, SLA en audit trail.",
      metrics: [
        { label: "Scope", value: "Bewaakt", detail: "Grenzen en verantwoordelijkheden", tone: "primary" },
        { label: "Security", value: "Vooraf", detail: "Toegang, data en logging", tone: "success" },
        { label: "Privacy", value: "AVG", detail: "Doelen, rollen en bewaartermijnen", tone: "warning" },
        { label: "SLA", value: "Meetbaar", detail: "Reactie, opvolging en onderhoud", tone: "critical" },
      ],
      journey: [
        { label: "Afspraak", detail: "Documenteer wat is overeengekomen.", tone: "primary" },
        { label: "Controle", detail: "Check scope, privacy, security en supportimpact.", tone: "warning" },
        { label: "Akkoord", detail: "Laat besluit en versie herleidbaar zijn.", tone: "success" },
        { label: "Audit trail", detail: "Bewaar wijzigingen, incidenten en uitzonderingen.", tone: "muted" },
      ],
      tableTitle: "Governance controlepunten",
      tableRows: [
        { label: "Eigenaar", value: "Bekend", note: "Wie beslist, beheert en keurt goed?" },
        { label: "Data", value: "Geclassificeerd", note: "Welke data wordt verwerkt?" },
        { label: "Wijzigingen", value: "Change flow", note: "Hoe gaan we buiten scope om?" },
        { label: "Support", value: "SLA", note: "Welke responstijd en opvolging gelden?" },
      ],
    };
  }

  if (document.funnelStage === "operations") {
    return {
      kind: "operations",
      label: "Operations template",
      summary:
        "Operationeel document voor besluiten, changes, incidenten, roadmap en doorontwikkeling.",
      metrics: [
        { label: "Besluiten", value: "Log", detail: "Reden, impact en eigenaar", tone: "primary" },
        { label: "Changes", value: "Beheerst", detail: "Scope en planningimpact", tone: "warning" },
        { label: "Incidenten", value: "Prioriteit", detail: "P1 t/m P4 opvolging", tone: "critical" },
        { label: "Roadmap", value: "Iteratief", detail: "Verbetering per cyclus", tone: "success" },
      ],
      journey: defaultJourney,
      tableTitle: "Operationele borging",
      tableRows: [
        { label: "Signaal", value: "Capture", note: "Email, agenda, notitie of Telegram." },
        { label: "Actie", value: "Owner", note: "Wie pakt het op en wanneer?" },
        { label: "Besluit", value: "Log", note: "Waarom kiezen we deze route?" },
        { label: "Evaluatie", value: "Roadmap", note: "Wat wordt structureel verbeterd?" },
      ],
    };
  }

  return {
    kind: "service",
    label: "Service template",
    summary:
      "Branded service-document voor positionering, dienstverlening, bewijs en vervolgstappen.",
    metrics: [
      { label: "Waarde", value: "Proces", detail: "Niet alleen losse techniek", tone: "primary" },
      { label: "Impact", value: "Groei", detail: "Omzet, rust of foutreductie", tone: "success" },
      { label: "Risico", value: "Beperkt", detail: "Security-first uitvoering", tone: "warning" },
      { label: "Vervolg", value: "Dossier", detail: "Lead, project of actie", tone: "muted" },
    ],
    journey: defaultJourney,
    tableTitle: "Service inzet",
    tableRows: [
      { label: "Doelgroep", value: "Mkb", note: "Teams met terugkerende processen." },
      { label: "Aanpak", value: "Discovery-first", note: "Eerst begrijpen, dan bouwen." },
      { label: "Levering", value: "Systeem", note: "Platform, workflow, AI of monitoring." },
      { label: "Beheer", value: "SLA mogelijk", note: "Onderhoud en doorontwikkeling na livegang." },
    ],
  };
}

