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
    detail: "Vraag, eigenaar, gevolgen en urgentie helder krijgen.",
    tone: "primary",
  },
  {
    label: "Discovery",
    detail: "De huidige situatie, systemen en risico's onderzoeken.",
    tone: "primary",
  },
  {
    label: "Blueprint",
    detail: "De afspraak, opbouw, planning en beslispunten vastleggen.",
    tone: "success",
  },
  {
    label: "Realisatie",
    detail: "Stap voor stap bouwen, testen, goedkeuren en overdragen.",
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
        "Zakelijk document met probleem, oplossing, investering, planning en een duidelijke volgende stap.",
      metrics: [
        { label: "Discovery", value: "1-2 weken", detail: "Onderzoek en basis voor het bouwplan", tone: "primary" },
        { label: "Realisatie", value: "Faseplan", detail: "Mijlpalen en goedkeuring", tone: "success" },
        { label: "Investering", value: "Eerst de afspraak", detail: "Prijs pas scherp als de context bekend is", tone: "warning" },
        { label: "Besluit", value: "Wel/niet doen", detail: "Akkoord op de afspraak en voorwaarden", tone: "muted" },
      ],
      journey: [
        { label: "Past het?", detail: "Past de klantvraag bij LaventeCare?", tone: "primary" },
        { label: "Discovery", detail: "Bewijs, risico's en oplossingsrichting verzamelen.", tone: "primary" },
        { label: "Blueprint", detail: "Alles op één plek voor de afspraak en de uitvoering.", tone: "success" },
        { label: "Voorstel", detail: "Investering, planning en voorwaarden vastleggen.", tone: "warning" },
        { label: "Start", detail: "Ruimte in de planning reserveren en de eerste mijlpaal starten.", tone: "success" },
      ],
      tableTitle: "Opbouw van het voorstel",
      tableRows: [
        { label: "Probleem", value: "Wat het oplevert", note: "Waarom moet dit worden opgelost?" },
        { label: "Oplossing", value: "Richting systeem", note: "Welk werkproces of welke opbouw past?" },
        { label: "Scope", value: "Op te leveren", note: "Wat hoort wel en niet bij het bouwen?" },
        { label: "Investering", value: "Richtprijs", note: "Onderzoek, bouwen en beheer apart houden." },
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
        "Onderzoeksdocument voor de huidige situatie, een kaart van het proces, risico's, prioriteiten en input voor het bouwplan.",
      metrics: [
        { label: "Proces", value: "In kaart", detail: "Werkproces, rollen en knelpunten", tone: "primary" },
        { label: "Gegevens", value: "Controle", detail: "Bronnen, eigenaar en kwaliteit", tone: "warning" },
        { label: "Risico", value: "Zichtbaar", detail: "Beveiliging, privacy en uitvoering", tone: "critical" },
        { label: "Blueprint", value: "Input", detail: "Vervolgdocument om over te beslissen", tone: "success" },
      ],
      journey: [
        { label: "Context", detail: "Bedrijf, team, klanten en systemen begrijpen.", tone: "primary" },
        { label: "Observatie", detail: "Het echte werkproces en de knelpunten vastleggen.", tone: "warning" },
        { label: "Analyse", detail: "Gevolgen, waar dingen van elkaar afhangen en verbeterkansen bepalen.", tone: "primary" },
        { label: "Advies", detail: "Prioriteiten en oplossingsrichting presenteren.", tone: "success" },
      ],
      tableTitle: "Wat Discovery oplevert",
      tableRows: [
        { label: "Huidige situatie", value: "Proceskaart", note: "Wat gebeurt er nu echt?" },
        { label: "Knelpunten", value: "Hoe zwaar het weegt", note: "Tijd, fouten, omzet of hoe de klant het ervaart." },
        { label: "Systeemkansen", value: "Verbeterlijst", note: "Waar levert automatisering waarde?" },
        { label: "Besluit", value: "Klaar voor het bouwplan", note: "Wat is nodig voor een verantwoord voorstel?" },
      ],
    };
  }

  if (document.category === "governance" || document.funnelStage === "legal") {
    return {
      kind: "legal",
      label: "Governance template",
      summary:
        "Formeel document voor afspraken, taken, AVG (privacywet), beveiliging, SLA (serviceafspraak) en een logboek dat je later kunt nakijken.",
      metrics: [
        { label: "Scope", value: "Bewaakt", detail: "Grenzen en taken", tone: "primary" },
        { label: "Beveiliging", value: "Vooraf", detail: "Toegang, gegevens en logboeken", tone: "success" },
        { label: "Privacy", value: "AVG", detail: "Doelen, rollen en bewaartermijnen", tone: "warning" },
        { label: "SLA", value: "Meetbaar", detail: "Reactie, opvolging en onderhoud", tone: "critical" },
      ],
      journey: [
        { label: "Afspraak", detail: "Leg vast wat is afgesproken.", tone: "primary" },
        { label: "Controle", detail: "Check de afspraak, privacy, beveiliging en gevolgen voor support.", tone: "warning" },
        { label: "Akkoord", detail: "Zorg dat het besluit en de versie terug te vinden zijn.", tone: "success" },
        { label: "Logboek", detail: "Bewaar wijzigingen, storingen en uitzonderingen.", tone: "muted" },
      ],
      tableTitle: "Controlepunten voor afspraken en beheer",
      tableRows: [
        { label: "Eigenaar", value: "Bekend", note: "Wie beslist, beheert en keurt goed?" },
        { label: "Gegevens", value: "Ingedeeld", note: "Welke gegevens worden verwerkt?" },
        { label: "Wijzigingen", value: "Vast proces", note: "Hoe gaan we om met werk buiten de afspraak?" },
        { label: "Support", value: "SLA", note: "Welke reactietijd en opvolging gelden?" },
      ],
    };
  }

  if (document.funnelStage === "operations") {
    return {
      kind: "operations",
      label: "Operations template",
      summary:
        "Document voor de dagelijkse gang van zaken: besluiten, wijzigingen, storingen, planning en doorontwikkeling.",
      metrics: [
        { label: "Besluiten", value: "Vastgelegd", detail: "Reden, gevolgen en eigenaar", tone: "primary" },
        { label: "Wijzigingen", value: "Onder controle", detail: "Gevolgen voor de afspraak en de planning", tone: "warning" },
        { label: "Storingen", value: "Prioriteit", detail: "P1 t/m P4 opvolging", tone: "critical" },
        { label: "Planning", value: "Stap voor stap", detail: "Verbetering per ronde", tone: "success" },
      ],
      journey: defaultJourney,
      tableTitle: "Dagelijkse gang van zaken vastleggen",
      tableRows: [
        { label: "Signaal", value: "Vastleggen", note: "E-mail, agenda, notitie of Telegram." },
        { label: "Actie", value: "Eigenaar", note: "Wie pakt het op en wanneer?" },
        { label: "Besluit", value: "Vastgelegd", note: "Waarom kiezen we deze route?" },
        { label: "Evaluatie", value: "Planning", note: "Wat wordt echt beter gemaakt?" },
      ],
    };
  }

  return {
    kind: "service",
    label: "Service template",
    summary:
      "Service-document met eigen huisstijl: wie LaventeCare is, wat de dienst inhoudt, het bewijs en de volgende stappen.",
    metrics: [
      { label: "Waarde", value: "Proces", detail: "Niet alleen losse techniek", tone: "primary" },
      { label: "Impact", value: "Groei", detail: "Omzet, rust of minder fouten", tone: "success" },
      { label: "Risico", value: "Beperkt", detail: "Werken met veiligheid voorop", tone: "warning" },
      { label: "Vervolg", value: "Dossier", detail: "Lead, project of actie", tone: "muted" },
    ],
    journey: defaultJourney,
    tableTitle: "Zo zet je de dienst in",
    tableRows: [
      { label: "Doelgroep", value: "Mkb", note: "Teams met werk dat steeds terugkomt." },
      { label: "Aanpak", value: "Eerst onderzoek", note: "Eerst begrijpen, dan bouwen." },
      { label: "Levering", value: "Systeem", note: "Platform, werkproces, AI of bewaking." },
      { label: "Beheer", value: "SLA mogelijk", note: "Onderhoud en doorontwikkeling nadat het live staat." },
    ],
  };
}

