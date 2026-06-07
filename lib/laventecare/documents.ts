import type {
  LaventeCareDocument,
  LaventeCareDocumentCategory,
  LaventeCareDocumentSeed,
} from "./types";

export const LAVENTECARE_DOCUMENT_VERSION = "2026-04";

export const LAVENTECARE_DOCUMENT_CATEGORIES: Array<{
  key: LaventeCareDocumentCategory;
  title: string;
  description: string;
}> = [
  {
    key: "commercieel",
    title: "Commercieel",
    description: "Voor kwalificatie, advies, proof, voorstel en investeringsgesprek.",
  },
  {
    key: "proces",
    title: "Proces & delivery",
    description: "Voor intake, discovery, blueprint, scope, uitvoering en doorontwikkeling.",
  },
  {
    key: "governance",
    title: "Governance & legal",
    description: "Voor afspraken, AVG, security, SLA, wijzigingen en audit trail.",
  },
];

export const LAVENTECARE_DOCUMENTS: LaventeCareDocument[] = [
  {
    key: "introductie",
    title: "LaventeCare Introductie",
    category: "commercieel",
    phase: "awareness",
    sourceFile: "LaventeCare-Introductie-Print.pdf",
    summary:
      "Positionering, kernbelofte en de manier waarop LaventeCare als systeempartner naar mkb-problemen kijkt.",
    tags: ["introductie", "positionering", "systeempartner"],
    visibility: "public",
    funnelStage: "awareness",
    badge: "Publiek",
    sendOrder: 10,
  },
  {
    key: "it-advies-consultancy",
    title: "IT Advies en Consultancy",
    category: "commercieel",
    phase: "strategie",
    sourceFile: "LaventeCare-IT-Advies-Consultancy-2026-Print.pdf",
    summary:
      "Losse adviesvorm voor technische keuzes, procesverbetering, systeemselectie en digitale strategie.",
    tags: ["advies", "consultancy", "strategie"],
    visibility: "public",
    funnelStage: "awareness",
    badge: "Fase 0",
    sendOrder: 8,
    services: ["consultancy"],
  },
  {
    key: "lead-generation-conversie",
    title: "Lead Generation en Conversie",
    category: "commercieel",
    phase: "strategie",
    sourceFile: "LaventeCare-Lead-Generation-Conversie-April-2026-Print.pdf",
    summary: "Aanpak voor digitale groei, klantflows, conversiepunten en opvolging van leads.",
    tags: ["leads", "conversie", "sales"],
    visibility: "public",
    funnelStage: "awareness",
    badge: "Publiek",
    sendOrder: 12,
    services: ["leadgen"],
  },
  {
    key: "ai-automatisering",
    title: "AI en Automatisering",
    category: "commercieel",
    phase: "realisatie",
    sourceFile: "LaventeCare-AI-Automatisering-April-2026-Print.pdf",
    summary:
      "AI en automatisering toepassen als workflow-laag voor triage, samenvatting, opvolging en procesversnelling.",
    tags: ["ai", "automatisering", "workflow"],
    visibility: "public",
    funnelStage: "awareness",
    badge: "Publiek",
    sendOrder: 14,
    services: ["ai"],
  },
  {
    key: "iot-slimme-monitoring",
    title: "IoT en Slimme Monitoring",
    category: "commercieel",
    phase: "realisatie",
    sourceFile: "LaventeCare-IoT-Slimme-Monitoring-April-2026-Print.pdf",
    summary:
      "Monitoringconcepten voor signalering, operationele data en slimme feedback vanuit fysieke processen.",
    tags: ["iot", "monitoring", "sensoren"],
    visibility: "public",
    funnelStage: "awareness",
    badge: "Publiek",
    sendOrder: 16,
    services: ["iot"],
  },
  {
    key: "wanneer-past-laventecare",
    title: "Wanneer Past LaventeCare",
    category: "commercieel",
    phase: "intake",
    sourceFile: "LaventeCare-Wanneer-Past-LaventeCare-2026-Print.pdf",
    summary:
      "Fit/no-fit criteria voor klanten, projecten en situaties waarin LaventeCare echte waarde toevoegt.",
    tags: ["fit", "kwalificatie", "intake"],
    visibility: "public",
    funnelStage: "qualification",
    badge: "Kwalificatie",
    sendOrder: 20,
  },
  {
    key: "fit-check",
    title: "Fit Check",
    category: "commercieel",
    phase: "intake",
    sourceFile: "LaventeCare-Fit-Check-2026-Print.pdf",
    summary: "Compacte beslisstructuur om snel te bepalen of een klantvraag bij LaventeCare past.",
    tags: ["fit", "kwalificatie", "besluit"],
    visibility: "send_only",
    funnelStage: "qualification",
    badge: "Op aanvraag",
    sendOrder: 21,
  },
  {
    key: "case-study-digitale-groei",
    title: "Case Study Digitale Groei",
    category: "commercieel",
    phase: "strategie",
    sourceFile: "LaventeCare-Case-Study-Digitale-Groei-2026-Print.pdf",
    summary:
      "Voorbeeldcase die digitale groei, procesverbetering en praktische businessimpact laat zien.",
    tags: ["case study", "digitale groei", "impact"],
    visibility: "public",
    funnelStage: "awareness",
    badge: "Proof",
    sendOrder: 18,
  },
  {
    key: "prijzen-investering",
    title: "Prijzen en Investering",
    category: "commercieel",
    phase: "strategie",
    sourceFile: "LaventeCare-Prijzen-Investering-April-2026-Print.pdf",
    summary: "Prijsankers voor advies, discovery, implementatie en SLA-vormen.",
    tags: ["prijzen", "investering", "sla"],
    visibility: "public",
    funnelStage: "proposal",
    badge: "Publiek",
    sendOrder: 50,
  },
  {
    key: "voorstel-template",
    title: "Voorstel Template",
    category: "commercieel",
    phase: "blueprint",
    sourceFile: "LaventeCare-Voorstel-Template-Print.pdf",
    summary:
      "Commercieel voorstel met probleem, oplossing, aanpak, investering, planning en voorwaarden.",
    tags: ["voorstel", "sales", "template"],
    visibility: "internal",
    funnelStage: "proposal",
    badge: "Intern",
    sendOrder: 60,
  },
  {
    key: "werkwijze-discovery-blueprint",
    title: "Werkwijze Discovery en Blueprint",
    category: "proces",
    phase: "blueprint",
    sourceFile: "LaventeCare-Werkwijze-Discovery-Blueprint-April-2026-Print.pdf",
    summary:
      "Professionele werkwijze om van eerste vraag naar analyse, blueprint en gecontroleerde realisatie te komen.",
    tags: ["discovery", "blueprint", "werkwijze"],
    visibility: "public",
    funnelStage: "discovery",
    badge: "Publiek",
    sendOrder: 25,
  },
  {
    key: "discovery-intake-werkblad",
    title: "Discovery Intake Werkblad",
    category: "proces",
    phase: "intake",
    sourceFile: "LaventeCare-Discovery-Intake-Werkblad-2026-Print.pdf",
    summary:
      "Werkblad met vragen voor intake, procesbegrip, stakeholders, knelpunten en gewenste uitkomsten.",
    tags: ["intake", "werkblad", "vragen"],
    visibility: "internal",
    funnelStage: "diagnosis",
    badge: "Intern",
    sendOrder: 27,
  },
  {
    key: "discovery-systeemanalyse",
    title: "Discovery Systeemanalyse",
    category: "proces",
    phase: "discovery",
    sourceFile: "LaventeCare-Discovery-Systeemanalyse-April-2026-Print.pdf",
    summary:
      "Analyse van bestaande systemen, processen, knelpunten, afhankelijkheden en verbeterkansen.",
    tags: ["systeemanalyse", "proces", "discovery"],
    visibility: "send_only",
    funnelStage: "diagnosis",
    badge: "Op aanvraag",
    sendOrder: 28,
  },
  {
    key: "fase2-systeemimplementatie",
    title: "Fase 2 Systeemimplementatie",
    category: "proces",
    phase: "realisatie",
    sourceFile: "LaventeCare-Fase2-Systeemimplementatie-April-2026-Print.pdf",
    summary: "Van blueprint naar bouw, testen, acceptatie, overdracht en gecontroleerde livegang.",
    tags: ["implementatie", "delivery", "realisatie"],
    visibility: "send_only",
    funnelStage: "diagnosis",
    badge: "Op aanvraag",
    sendOrder: 29,
    services: ["platforms"],
  },
  {
    key: "huidige-situatie-audit",
    title: "Huidige Situatie Audit",
    category: "proces",
    phase: "discovery",
    sourceFile: "LaventeCare-Huidige-Situatie-Audit-2026-Print.pdf",
    summary:
      "Auditstructuur om huidige tools, processen, data, risico's en verbeterpotentieel vast te leggen.",
    tags: ["audit", "huidige situatie", "risico"],
    visibility: "internal",
    funnelStage: "diagnosis",
    badge: "Intern",
    sendOrder: 32,
  },
  {
    key: "website-audit",
    title: "SEO en Website Audit",
    category: "proces",
    phase: "diagnosis",
    sourceFile: "LaventeCare-SEO-Website-Audit-2026-Print.pdf",
    summary:
      "Dossiergebonden audit voor HTML, robots, sitemap, performance, CrUX, Search Console en AI-review.",
    tags: ["seo", "website", "audit", "search console"],
    visibility: "send_only",
    funnelStage: "diagnosis",
    badge: "Op aanvraag",
    sendOrder: 33,
    services: ["leadgen", "platforms"],
  },
  {
    key: "scope-deliverables",
    title: "Scope en Deliverables",
    category: "proces",
    phase: "blueprint",
    sourceFile: "LaventeCare-Scope-Deliverables-2026-Print.pdf",
    summary:
      "Structuur voor scopebewaking, deliverables, acceptatiecriteria, grenzen en verantwoordelijkheden.",
    tags: ["scope", "deliverables", "acceptatie"],
    visibility: "internal",
    funnelStage: "proposal",
    badge: "Intern",
    sendOrder: 62,
  },
  {
    key: "klant-onboarding",
    title: "Klant Onboarding",
    category: "proces",
    phase: "intake",
    sourceFile: "LaventeCare-Klant-Onboarding-2026-Print.pdf",
    summary:
      "Onboardingproces voor nieuwe klanten, toegang, verwachtingen, communicatie en startdocumentatie.",
    tags: ["onboarding", "klant", "proces"],
    visibility: "send_only",
    funnelStage: "delivery",
    badge: "Op aanvraag",
    sendOrder: 70,
  },
  {
    key: "system-evolution-plan",
    title: "System Evolution Plan",
    category: "proces",
    phase: "evolution",
    sourceFile: "LaventeCare-System-Evolution-Plan-Print.pdf",
    summary:
      "Roadmap voor iteratieve verbetering, optimalisaties, nieuwe modules en periodieke evaluatie.",
    tags: ["doorontwikkeling", "roadmap", "evolution"],
    visibility: "internal",
    funnelStage: "operations",
    badge: "Intern",
    sendOrder: 78,
  },
  {
    key: "decision-log",
    title: "Decision Log",
    category: "governance",
    phase: "blueprint",
    sourceFile: "LaventeCare-Decision-Log-Print.pdf",
    summary: "Besluiten, alternatieven, reden en impact vastleggen zodat projecten navolgbaar blijven.",
    tags: ["besluiten", "decision log", "governance"],
    visibility: "internal",
    funnelStage: "operations",
    badge: "Intern",
    sendOrder: 74,
  },
  {
    key: "change-request",
    title: "Change Request",
    category: "governance",
    phase: "realisatie",
    sourceFile: "LaventeCare-Change-Request-2026-Print.pdf",
    summary: "Vastleggen, beoordelen en verwerken van wijzigingen buiten oorspronkelijke scope.",
    tags: ["change request", "scope", "wijziging"],
    visibility: "internal",
    funnelStage: "operations",
    badge: "Intern",
    sendOrder: 76,
  },
  {
    key: "algemene-voorwaarden",
    title: "Algemene Voorwaarden",
    category: "governance",
    phase: "juridisch",
    sourceFile: "LaventeCare-Algemene-Voorwaarden-April-2026-Print.pdf",
    summary:
      "Contractuele basisafspraken over dienstverlening, aansprakelijkheid, betaling, scope en intellectueel eigendom.",
    tags: ["voorwaarden", "contract", "juridisch"],
    visibility: "contract",
    funnelStage: "legal",
    badge: "Contract",
    sendOrder: 80,
  },
  {
    key: "verwerkersovereenkomst",
    title: "Verwerkersovereenkomst",
    category: "governance",
    phase: "juridisch",
    sourceFile: "LaventeCare-Verwerkersovereenkomst-April-2026-Print.pdf",
    summary:
      "Afspraken voor verwerking van persoonsgegevens, rollen, beveiliging en AVG-verantwoordelijkheden.",
    tags: ["avg", "verwerker", "privacy"],
    visibility: "contract",
    funnelStage: "legal",
    badge: "Contract",
    sendOrder: 85,
    services: ["security"],
  },
  {
    key: "sla-agreement",
    title: "SLA Agreement",
    category: "governance",
    phase: "sla",
    sourceFile: "LaventeCare-SLA-Agreement-April-2026-Print.pdf",
    summary: "Supportniveaus, responstijden, onderhoud, incidentopvolging en beheerafspraken.",
    tags: ["sla", "support", "beheer"],
    visibility: "contract",
    funnelStage: "legal",
    badge: "Contract",
    sendOrder: 90,
  },
  {
    key: "privacyverklaring",
    title: "Privacyverklaring",
    category: "governance",
    phase: "juridisch",
    sourceFile: "LaventeCare-Privacyverklaring-April-2026-Print.pdf",
    summary: "Uitleg over persoonsgegevens, doeleinden, rechten, bewaartermijnen en contactpunten.",
    tags: ["privacy", "avg", "verklaring"],
    visibility: "public",
    funnelStage: "legal",
    badge: "Publiek",
    sendOrder: 95,
  },
  {
    key: "security-one-pager",
    title: "Security One-Pager",
    category: "governance",
    phase: "security",
    sourceFile: "LaventeCare-Security-One-Pager-April-2026-Print.pdf",
    summary:
      "Beknopte securitypositie rond toegang, data, hosting, logging, backups en verantwoordelijkheden.",
    tags: ["security", "hosting", "backups"],
    visibility: "public",
    funnelStage: "legal",
    badge: "Publiek",
    sendOrder: 97,
    services: ["security"],
  },
];

export const LAVENTECARE_LEGAL_STACK = [
  "Voorstel",
  "Blueprint",
  "Scope en deliverables",
  "Verwerkersovereenkomst",
  "SLA Agreement",
  "Algemene voorwaarden",
  "Privacyverklaring",
  "Security one-pager",
] as const;

export const LAVENTECARE_DOCUMENT_TOTAL = LAVENTECARE_DOCUMENTS.length;

export const LAVENTECARE_DOCUMENTS_BY_KEY = Object.fromEntries(
  LAVENTECARE_DOCUMENTS.map((document) => [document.key, document])
) as Record<string, LaventeCareDocument>;

export function getLaventeCareDocumentStats(documents = LAVENTECARE_DOCUMENTS) {
  const byCategory = LAVENTECARE_DOCUMENT_CATEGORIES.map((category) => ({
    ...category,
    count: documents.filter((document) => document.category === category.key).length,
  }));

  return {
    total: documents.length,
    byCategory,
    contractCount: documents.filter((document) => document.visibility === "contract").length,
    internalCount: documents.filter((document) => document.visibility === "internal").length,
    publicCount: documents.filter((document) => document.visibility === "public").length,
  };
}

export function toLaventeCareSeedDocuments(
  documents = LAVENTECARE_DOCUMENTS
): LaventeCareDocumentSeed[] {
  return documents
    .slice()
    .sort((left, right) => left.sendOrder - right.sendOrder)
    .map((document) => ({
      document_key: document.key,
      titel: document.title,
      categorie: document.category,
      fase: document.phase,
      versie: LAVENTECARE_DOCUMENT_VERSION,
      source_path: `document-suite/${document.sourceFile}`,
      samenvatting: document.summary,
      tags: [
        ...document.tags,
        document.visibility,
        document.funnelStage,
        ...(document.services ?? []),
      ],
    }));
}

