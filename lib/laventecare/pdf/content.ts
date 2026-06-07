import { LAVENTECARE_FIT_CRITERIA, LAVENTECARE_NO_FIT_SIGNALS } from "../fit";
import { LAVENTECARE_PRICING } from "../pricing";
import { LAVENTECARE_PROCESS_STAGES } from "../process";
import { LAVENTECARE_PROFILE } from "../profile";
import type { LaventeCareDocument, LaventeCareDocumentCategory, LaventeCareDocumentVisibility } from "../types";
import {
  getLaventeCarePdfDossierKindLabel,
  type LaventeCarePdfDossierContext,
} from "./context";
import { getLaventeCarePdfTemplateProfile, type LaventeCarePdfTemplateProfile } from "./templates";

export type LaventeCarePdfMetaCard = {
  label: string;
  value: string;
  subtext: string;
};

export type LaventeCarePdfSection = {
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
};

export type LaventeCarePdfContent = {
  template: LaventeCarePdfTemplateProfile;
  dossierContext?: LaventeCarePdfDossierContext | null;
  badge: string;
  eyebrow: string;
  title: string;
  accentTitle: string;
  intro: string;
  metaCards: LaventeCarePdfMetaCard[];
  sections: LaventeCarePdfSection[];
  checklist: string[];
  nextSteps: string[];
};

const categoryLabels: Record<LaventeCareDocumentCategory, string> = {
  commercieel: "Commercieel",
  proces: "Proces & delivery",
  governance: "Governance & legal",
};

const visibilityLabels: Record<LaventeCareDocumentVisibility, string> = {
  public: "Publiek inzetbaar",
  send_only: "Gericht delen",
  internal: "Intern stuurdocument",
  contract: "Contractueel document",
};

function getProcessStage(document: LaventeCareDocument) {
  const normalizedPhase = document.phase.toLowerCase();
  return (
    LAVENTECARE_PROCESS_STAGES.find((stage) =>
      normalizedPhase.includes(stage.key.toLowerCase())
    ) ??
    LAVENTECARE_PROCESS_STAGES.find((stage) =>
      document.funnelStage.toLowerCase().includes(stage.key.toLowerCase())
    ) ??
    LAVENTECARE_PROCESS_STAGES[0]
  );
}

function getCategorySection(document: LaventeCareDocument): LaventeCarePdfSection {
  if (document.category === "governance") {
    return {
      eyebrow: "Borging",
      title: "Governance, afspraken en controle",
      body:
        "Dit document helpt om verwachtingen, verantwoordelijkheden en besluitvorming vast te leggen voordat uitvoering of beheer kwetsbaar wordt.",
      bullets: [
        "Maakt afspraken expliciet en herleidbaar voor klant en LaventeCare.",
        "Past bij een security-first werkwijze waarin data, toegang en wijzigingen bewust worden behandeld.",
        "Voorkomt dat scope, support of juridische verantwoordelijkheden impliciet blijven.",
      ],
    };
  }

  if (document.category === "proces") {
    return {
      eyebrow: "Delivery",
      title: "Van vraag naar gecontroleerde uitvoering",
      body:
        "Dit document ondersteunt de overgang van losse wens naar concreet werkbaar systeem, met aandacht voor proces, scope en opleverbaarheid.",
      bullets: [
        "Legt vast welke uitkomst nodig is en welke stappen daarvoor logisch zijn.",
        "Verbindt discovery, blueprint, realisatie en doorontwikkeling met elkaar.",
        "Helpt om beslissingen, risico's en deliverables professioneel te volgen.",
      ],
    };
  }

  return {
    eyebrow: "Commercieel",
    title: "Kwalificatie, vertrouwen en voorstelvorming",
    body:
      "Dit document helpt om LaventeCare helder te positioneren en de klantvraag te vertalen naar waarde, aanpak en vervolgstap.",
    bullets: [
      "Ondersteunt intake, adviesgesprekken en voorsteltrajecten.",
      "Maakt zichtbaar waarom LaventeCare geen losse websitebouwer is, maar een systeempartner.",
      "Helpt om de businesscase, urgentie en besluitvorming scherper te krijgen.",
    ],
  };
}

function getDocumentSpecificSection(document: LaventeCareDocument): LaventeCarePdfSection {
  if (document.key.includes("voorstel")) {
    return {
      eyebrow: "Voorstel",
      title: "Van probleem naar investering",
      body:
        "Een goed voorstel benoemt niet alleen wat er gebouwd wordt, maar vooral welk probleem wordt opgelost, welke waarde ontstaat en welke afspraken de uitvoering beschermen.",
      bullets: [
        "Probleem, impact en gewenste uitkomst staan vooraan.",
        "Scope, planning, investering en voorwaarden worden samen beoordeeld.",
        "Het voorstel wordt pas sterk wanneer discovery en besluitvorming duidelijk zijn.",
      ],
    };
  }

  if (document.key.includes("sla") || document.key.includes("security") || document.key.includes("privacy")) {
    return {
      eyebrow: "Continuiteit",
      title: "Security en beheer als fundament",
      body:
        "LaventeCare behandelt beheer, beveiliging en privacy niet als bijlage achteraf, maar als structureel onderdeel van de dienstverlening.",
      bullets: [
        "Toegang, data, logging, backups en verantwoordelijkheden worden expliciet gemaakt.",
        "Support en incidenten krijgen duidelijke prioriteit, kanaal en opvolging.",
        "Privacy en security worden in taal uitgelegd die zakelijk bruikbaar blijft.",
      ],
    };
  }

  if (document.key.includes("discovery") || document.key.includes("audit")) {
    return {
      eyebrow: "Analyse",
      title: "Eerst begrijpen, dan bouwen",
      body:
        "Discovery voorkomt dat er te vroeg gebouwd wordt op aannames. De analyse maakt proces, systemen, knelpunten en kansen zichtbaar.",
      bullets: [
        "Brengt huidige situatie, afhankelijkheden en risico's in kaart.",
        "Vertaalt observaties naar concrete prioriteiten en beslispunten.",
        "Geeft richting aan blueprint, scope en realisatie.",
      ],
    };
  }

  return {
    eyebrow: "Dossier",
    title: "Professioneel gebruiken in de klantreis",
    body:
      "Dit document hoort niet los in een map, maar in een dossier met leadcontext, projectfase, besluitvorming en opvolging.",
    bullets: [
      "Koppel het document aan een lead, project of actiepunt.",
      "Gebruik het als gespreksondersteuning, beslisdocument of overdrachtsstuk.",
      "Laat Brain en Telegram later signaleren wanneer dit document ontbreekt.",
    ],
  };
}

export function getLaventeCarePdfContent(
  document: LaventeCareDocument,
  dossierContext?: LaventeCarePdfDossierContext | null
): LaventeCarePdfContent {
  const stage = getProcessStage(document);
  const template = getLaventeCarePdfTemplateProfile(document);
  const pricing = LAVENTECARE_PRICING.slice(0, 3)
    .map((item) => `${item.title}: ${item.price}`)
    .join(" | ");
  const metaCards: LaventeCarePdfMetaCard[] = [
    {
      label: "Fase",
      value: stage.title,
      subtext: stage.output,
    },
    {
      label: "Template",
      value: template.label,
      subtext: visibilityLabels[document.visibility],
    },
    {
      label: "Versie",
      value: "2026",
      subtext: "Homeapp PDF engine",
    },
  ];

  if (dossierContext) {
    metaCards.splice(2, 0, {
      label: "Dossier",
      value: dossierContext.title,
      subtext: [
        getLaventeCarePdfDossierKindLabel(dossierContext.kind),
        dossierContext.status,
        dossierContext.phase,
        dossierContext.priority ? `prio ${dossierContext.priority}` : undefined,
      ]
        .filter(Boolean)
        .join(" - "),
    });
  }

  return {
    template,
    dossierContext,
    badge: document.badge,
    eyebrow: categoryLabels[document.category],
    title: document.title,
    accentTitle: "LaventeCare",
    intro: document.summary,
    metaCards,
    sections: [
      {
        eyebrow: "Positionering",
        title: LAVENTECARE_PROFILE.tagline,
        body: LAVENTECARE_PROFILE.summary,
        bullets: [
          LAVENTECARE_PROFILE.positie,
          LAVENTECARE_PROFILE.doelgroep,
          `Bewijs: ${Object.values(LAVENTECARE_PROFILE.proofPoints).join(" - ")}`,
        ],
      },
      {
        eyebrow: "Procesfase",
        title: stage.title,
        body: stage.summary,
        bullets: [stage.output, ...LAVENTECARE_FIT_CRITERIA.slice(0, 3)],
      },
      getCategorySection(document),
      getDocumentSpecificSection(document),
      {
        eyebrow: "Commercieel kader",
        title: "Investering en besluitvorming",
        body:
          "LaventeCare werkt met duidelijke prijsankers, zodat advies, discovery, realisatie en beheer niet door elkaar lopen.",
        bullets: [
          pricing,
          "Een voorstel hoort altijd gekoppeld te zijn aan scope, planning en acceptatiecriteria.",
          "No-fit blijft professioneel: niet elk vraagstuk hoeft een LaventeCare project te worden.",
        ],
      },
    ],
    checklist: [
      "Lead of project gekoppeld",
      "Doel en vervolgstap bepaald",
      "Scope of gebruikscontext vastgelegd",
      "Beslisser en eigenaar bekend",
      "Eventuele juridische of security-impact gecontroleerd",
      ...(dossierContext ? ["Dossiercontext gecontroleerd voor verzending"] : []),
    ],
    nextSteps: [
      "Bespreek dit document in de juiste funnel-fase.",
      "Leg de uitkomst vast als actie, besluit of projectnotitie.",
      ...(dossierContext?.nextStep ? [`Dossiervervolg: ${dossierContext.nextStep}`] : []),
      `No-fit signalen om te bewaken: ${LAVENTECARE_NO_FIT_SIGNALS.slice(0, 2).join(" - ")}`,
    ],
  };
}
