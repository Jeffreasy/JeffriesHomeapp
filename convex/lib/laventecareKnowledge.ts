export type LaventeCarePhase =
  | "strategie"
  | "intake"
  | "discovery"
  | "blueprint"
  | "realisatie"
  | "sla"
  | "evolution"
  | "juridisch"
  | "security";

export type LaventeCareDocument = {
  key: string;
  title: string;
  category: string;
  phase: LaventeCarePhase;
  sourceFile: string;
  summary: string;
  tags: string[];
};

export const LAVENTECARE_PROFILE = {
  naam: "LaventeCare",
  rol: "B2B systeempartner voor mkb-organisaties die digitale groei, automatisering en maatwerksoftware professioneel willen neerzetten.",
  kernbelofte:
    "Van losse tools en handmatig werk naar een schaalbaar digitaal systeem: intake, analyse, blueprint, realisatie, beheer en doorontwikkeling.",
  doelgroep:
    "Mkb, dienstverleners en operationele teams met terugkerende processen, klantcontact, administratie, planning, reporting of digitale groei-vraagstukken.",
  positie:
    "Geen losse websitebouwer of eenmalige freelancer, maar een structurele partner die bedrijfsprocessen vertaalt naar werkende systemen.",
} as const;

export const LAVENTECARE_PILLARS = [
  {
    key: "websites-webapps",
    title: "Websites en webapplicaties",
    summary: "Professionele websites, portalen en webapps die aansluiten op bedrijfsprocessen, klantflows en conversie.",
    tags: ["website", "webapp", "portaal", "conversie"],
  },
  {
    key: "automatisering",
    title: "Procesautomatisering",
    summary: "Handmatige stappen verminderen met slimme workflows, koppelingen, formulieren, notificaties en dashboards.",
    tags: ["workflow", "automatisering", "koppelingen", "dashboard"],
  },
  {
    key: "maatwerk-software",
    title: "Maatwerk software",
    summary: "Bedrijfsspecifieke tooling voor planning, klantbeheer, interne processen en rapportage.",
    tags: ["software", "maatwerk", "planning", "crm"],
  },
  {
    key: "ai-workflows",
    title: "AI en workflow intelligence",
    summary: "AI als assistent in bestaande processen: triage, samenvattingen, opvolging, documentatie en beslisondersteuning.",
    tags: ["ai", "agent", "triage", "beslisondersteuning"],
  },
  {
    key: "iot-monitoring",
    title: "IoT en slimme monitoring",
    summary: "Monitoring, signalering en datastromen voor fysieke of operationele processen.",
    tags: ["iot", "monitoring", "sensoren", "signalering"],
  },
] as const;

export const LAVENTECARE_PROCESS_STAGES = [
  {
    key: "intake",
    title: "Intake",
    summary: "Kwalificeren of er een echte businesscase is: probleem, urgentie, impact, eigenaarschap en budgetrichting.",
    output: "Heldere fit/no-fit, eerste scope en vervolgstap.",
  },
  {
    key: "discovery",
    title: "Discovery",
    summary: "Huidige situatie, systemen, workflows, knelpunten, risico's en kansen in kaart brengen.",
    output: "Systeemanalyse met proceskaart, prioriteiten en requirements.",
  },
  {
    key: "blueprint",
    title: "Blueprint",
    summary: "Oplossingsrichting vertalen naar architectuur, fasering, deliverables, planning en beslispunten.",
    output: "Blueprint als leidend projectdocument.",
  },
  {
    key: "realisatie",
    title: "Realisatie",
    summary: "Bouwen, testen, opleveren en overdraagbaar maken met gecontroleerde scope en changelog.",
    output: "Werkend systeem met documentatie en acceptatie.",
  },
  {
    key: "sla",
    title: "SLA en beheer",
    summary: "Support, monitoring, incidenten, wijzigingsverzoeken en continuiteit professioneel borgen.",
    output: "Afspraken over responstijden, onderhoud en opvolging.",
  },
  {
    key: "evolution",
    title: "Doorontwikkeling",
    summary: "Periodiek verbeteren op basis van data, feedback, nieuwe processen en groeidoelen.",
    output: "Roadmap, optimalisaties en nieuwe iteraties.",
  },
] as const;

export const LAVENTECARE_PRICING = [
  { key: "consultancy", title: "IT advies en consultancy", price: "EUR 95 per uur", note: "Voor losse analyse, advies, sparring en systeemkeuzes." },
  { key: "discovery", title: "Discovery traject", price: "EUR 500 - EUR 1.500", note: "Afhankelijk van complexiteit, aantal systemen en benodigde interviews." },
  { key: "implementation", title: "Implementatie", price: "Maatwerk", note: "Gebaseerd op blueprint, scope, integraties, risico en planning." },
  { key: "sla-essential", title: "SLA Essential", price: "EUR 75 per maand", note: "Basis support en klein onderhoud." },
  { key: "sla-professional", title: "SLA Professional", price: "EUR 150 per maand", note: "Meer proactief beheer, monitoring en snellere opvolging." },
  { key: "sla-enterprise", title: "SLA Enterprise", price: "Vanaf EUR 300 per maand", note: "Maatwerkafspraken voor kritieke systemen en complexe omgevingen." },
] as const;

export const LAVENTECARE_FIT_CRITERIA = [
  "Er is een concreet bedrijfsproces dat tijd, fouten, omzet of klantbeleving raakt.",
  "De klant heeft eigenaarschap: iemand kan beslissen, prioriteren en feedback geven.",
  "Er is bereidheid om discovery en blueprint serieus te doen voordat er gebouwd wordt.",
  "Het vraagstuk vraagt om een systeem of workflow, niet alleen om losse styling of een eenmalige aanpassing.",
  "Er is ruimte voor onderhoud, documentatie en doorontwikkeling na oplevering.",
] as const;

export const LAVENTECARE_NO_FIT_SIGNALS = [
  "Alleen een snelle goedkope website zonder procesvraag.",
  "Geen duidelijke eigenaar, budgetrichting of beslismoment.",
  "De klant wil bouwen zonder analyse terwijl het probleem nog onduidelijk is.",
  "De vraag is structureel support-intensief zonder passende SLA.",
] as const;

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

export const LAVENTECARE_DOCUMENTS: LaventeCareDocument[] = [
  {
    key: "introductie",
    title: "LaventeCare Introductie",
    category: "positionering",
    phase: "strategie",
    sourceFile: "LaventeCare-Introductie-Print.pdf",
    summary: "Positionering, kernbelofte en de manier waarop LaventeCare als systeempartner naar mkb-problemen kijkt.",
    tags: ["introductie", "positionering", "systeempartner"],
  },
  {
    key: "it-advies-consultancy",
    title: "IT Advies en Consultancy",
    category: "propositie",
    phase: "strategie",
    sourceFile: "LaventeCare-IT-Advies-Consultancy-2026-Print.pdf",
    summary: "Losse adviesvorm voor technische keuzes, procesverbetering, systeemselectie en digitale strategie.",
    tags: ["advies", "consultancy", "strategie"],
  },
  {
    key: "lead-generation-conversie",
    title: "Lead Generation en Conversie",
    category: "sales",
    phase: "strategie",
    sourceFile: "LaventeCare-Lead-Generation-Conversie-April-2026-Print.pdf",
    summary: "Aanpak voor digitale groei, klantflows, conversiepunten en opvolging van leads.",
    tags: ["leads", "conversie", "sales"],
  },
  {
    key: "ai-automatisering",
    title: "AI en Automatisering",
    category: "propositie",
    phase: "realisatie",
    sourceFile: "LaventeCare-AI-Automatisering-April-2026-Print.pdf",
    summary: "AI en automatisering toepassen als workflow-laag voor triage, samenvatting, opvolging en procesversnelling.",
    tags: ["ai", "automatisering", "workflow"],
  },
  {
    key: "iot-slimme-monitoring",
    title: "IoT en Slimme Monitoring",
    category: "propositie",
    phase: "realisatie",
    sourceFile: "LaventeCare-IoT-Slimme-Monitoring-April-2026-Print.pdf",
    summary: "Monitoringconcepten voor signalering, operationele data en slimme feedback vanuit fysieke processen.",
    tags: ["iot", "monitoring", "sensoren"],
  },
  {
    key: "wanneer-past-laventecare",
    title: "Wanneer Past LaventeCare",
    category: "kwalificatie",
    phase: "intake",
    sourceFile: "LaventeCare-Wanneer-Past-LaventeCare-2026-Print.pdf",
    summary: "Fit/no-fit criteria voor klanten, projecten en situaties waarin LaventeCare echte waarde toevoegt.",
    tags: ["fit", "kwalificatie", "intake"],
  },
  {
    key: "prijzen-investering",
    title: "Prijzen en Investering",
    category: "pricing",
    phase: "strategie",
    sourceFile: "LaventeCare-Prijzen-Investering-April-2026-Print.pdf",
    summary: "Prijsankers voor advies, discovery, implementatie en SLA-vormen.",
    tags: ["prijzen", "investering", "sla"],
  },
  {
    key: "werkwijze-discovery-blueprint",
    title: "Werkwijze Discovery en Blueprint",
    category: "proces",
    phase: "blueprint",
    sourceFile: "LaventeCare-Werkwijze-Discovery-Blueprint-April-2026-Print.pdf",
    summary: "Professionele werkwijze om van eerste vraag naar analyse, blueprint en gecontroleerde realisatie te komen.",
    tags: ["discovery", "blueprint", "werkwijze"],
  },
  {
    key: "discovery-systeemanalyse",
    title: "Discovery Systeemanalyse",
    category: "proces",
    phase: "discovery",
    sourceFile: "LaventeCare-Discovery-Systeemanalyse-April-2026-Print.pdf",
    summary: "Analyse van bestaande systemen, processen, knelpunten, afhankelijkheden en verbeterkansen.",
    tags: ["systeemanalyse", "proces", "discovery"],
  },
  {
    key: "fase2-systeemimplementatie",
    title: "Fase 2 Systeemimplementatie",
    category: "delivery",
    phase: "realisatie",
    sourceFile: "LaventeCare-Fase2-Systeemimplementatie-April-2026-Print.pdf",
    summary: "Van blueprint naar bouw, testen, acceptatie, overdracht en gecontroleerde livegang.",
    tags: ["implementatie", "delivery", "realisatie"],
  },
  {
    key: "discovery-intake-werkblad",
    title: "Discovery Intake Werkblad",
    category: "templates",
    phase: "intake",
    sourceFile: "LaventeCare-Discovery-Intake-Werkblad-2026-Print.pdf",
    summary: "Werkblad met vragen voor intake, procesbegrip, stakeholders, knelpunten en gewenste uitkomsten.",
    tags: ["intake", "werkblad", "vragen"],
  },
  {
    key: "huidige-situatie-audit",
    title: "Huidige Situatie Audit",
    category: "templates",
    phase: "discovery",
    sourceFile: "LaventeCare-Huidige-Situatie-Audit-2026-Print.pdf",
    summary: "Auditstructuur om huidige tools, processen, data, risico's en verbeterpotentieel vast te leggen.",
    tags: ["audit", "huidige situatie", "risico"],
  },
  {
    key: "scope-deliverables",
    title: "Scope en Deliverables",
    category: "governance",
    phase: "blueprint",
    sourceFile: "LaventeCare-Scope-Deliverables-2026-Print.pdf",
    summary: "Structuur voor scopebewaking, deliverables, acceptatiecriteria, grenzen en verantwoordelijkheden.",
    tags: ["scope", "deliverables", "acceptatie"],
  },
  {
    key: "klant-onboarding",
    title: "Klant Onboarding",
    category: "operations",
    phase: "intake",
    sourceFile: "LaventeCare-Klant-Onboarding-2026-Print.pdf",
    summary: "Onboardingproces voor nieuwe klanten, toegang, verwachtingen, communicatie en startdocumentatie.",
    tags: ["onboarding", "klant", "proces"],
  },
  {
    key: "change-request",
    title: "Change Request",
    category: "governance",
    phase: "realisatie",
    sourceFile: "LaventeCare-Change-Request-2026-Print.pdf",
    summary: "Vastleggen, beoordelen en verwerken van wijzigingen buiten oorspronkelijke scope.",
    tags: ["change request", "scope", "wijziging"],
  },
  {
    key: "decision-log",
    title: "Decision Log",
    category: "governance",
    phase: "blueprint",
    sourceFile: "LaventeCare-Decision-Log-Print.pdf",
    summary: "Besluiten, alternatieven, reden en impact vastleggen zodat projecten navolgbaar blijven.",
    tags: ["besluiten", "decision log", "governance"],
  },
  {
    key: "system-evolution-plan",
    title: "System Evolution Plan",
    category: "operations",
    phase: "evolution",
    sourceFile: "LaventeCare-System-Evolution-Plan-Print.pdf",
    summary: "Roadmap voor iteratieve verbetering, optimalisaties, nieuwe modules en periodieke evaluatie.",
    tags: ["doorontwikkeling", "roadmap", "evolution"],
  },
  {
    key: "voorstel-template",
    title: "Voorstel Template",
    category: "sales",
    phase: "blueprint",
    sourceFile: "LaventeCare-Voorstel-Template-Print.pdf",
    summary: "Commercieel voorstel met probleem, oplossing, aanpak, investering, planning en voorwaarden.",
    tags: ["voorstel", "sales", "template"],
  },
  {
    key: "case-study-digitale-groei",
    title: "Case Study Digitale Groei",
    category: "cases",
    phase: "strategie",
    sourceFile: "LaventeCare-Case-Study-Digitale-Groei-2026-Print.pdf",
    summary: "Voorbeeldcase die digitale groei, procesverbetering en praktische businessimpact laat zien.",
    tags: ["case study", "digitale groei", "impact"],
  },
  {
    key: "algemene-voorwaarden",
    title: "Algemene Voorwaarden",
    category: "juridisch",
    phase: "juridisch",
    sourceFile: "LaventeCare-Algemene-Voorwaarden-April-2026-Print.pdf",
    summary: "Contractuele basisafspraken over dienstverlening, aansprakelijkheid, betaling, scope en intellectueel eigendom.",
    tags: ["voorwaarden", "contract", "juridisch"],
  },
  {
    key: "verwerkersovereenkomst",
    title: "Verwerkersovereenkomst",
    category: "juridisch",
    phase: "juridisch",
    sourceFile: "LaventeCare-Verwerkersovereenkomst-April-2026-Print.pdf",
    summary: "Afspraken voor verwerking van persoonsgegevens, rollen, beveiliging en AVG-verantwoordelijkheden.",
    tags: ["avg", "verwerker", "privacy"],
  },
  {
    key: "sla-agreement",
    title: "SLA Agreement",
    category: "operations",
    phase: "sla",
    sourceFile: "LaventeCare-SLA-Agreement-April-2026-Print.pdf",
    summary: "Supportniveaus, responstijden, onderhoud, incidentopvolging en beheerafspraken.",
    tags: ["sla", "support", "beheer"],
  },
  {
    key: "privacyverklaring",
    title: "Privacyverklaring",
    category: "juridisch",
    phase: "juridisch",
    sourceFile: "LaventeCare-Privacyverklaring-April-2026-Print.pdf",
    summary: "Uitleg over persoonsgegevens, doeleinden, rechten, bewaartermijnen en contactpunten.",
    tags: ["privacy", "avg", "verklaring"],
  },
  {
    key: "security-one-pager",
    title: "Security One-Pager",
    category: "security",
    phase: "security",
    sourceFile: "LaventeCare-Security-One-Pager-April-2026-Print.pdf",
    summary: "Beknopte securitypositie rond toegang, data, hosting, logging, backups en verantwoordelijkheden.",
    tags: ["security", "hosting", "backups"],
  },
];

export function searchLaventeCareKnowledge(term: string) {
  const needle = term.trim().toLowerCase();
  if (!needle) return LAVENTECARE_DOCUMENTS;

  return LAVENTECARE_DOCUMENTS.filter((doc) => {
    const haystack = [
      doc.title,
      doc.category,
      doc.phase,
      doc.summary,
      doc.sourceFile,
      ...doc.tags,
    ].join(" ").toLowerCase();

    return haystack.includes(needle);
  });
}
