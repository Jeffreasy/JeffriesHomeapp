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
      eyebrow: "Afspraken vastleggen",
      title: "Afspraken, rollen en controle",
      body:
        "Dit document helpt om te noteren wat je van elkaar verwacht, wie waarvoor zorgt en hoe je beslist. Zo leg je dit vast voordat het bouwen of beheer misgaat.",
      bullets: [
        "Maakt afspraken duidelijk en terug te vinden voor klant en LaventeCare.",
        "Past bij een werkwijze waarin veiligheid voorop staat: je gaat bewust om met gegevens, toegang en wijzigingen.",
        "Voorkomt dat de afspraak, support of juridische taken onuitgesproken blijven.",
      ],
    };
  }

  if (document.category === "proces") {
    return {
      eyebrow: "Uitvoering",
      title: "Van vraag naar werkende uitvoering",
      body:
        "Dit document helpt om van een losse wens naar een werkend systeem te gaan. Er is aandacht voor het proces, de afspraak en of het opgeleverd kan worden.",
      bullets: [
        "Legt vast welk resultaat nodig is en welke stappen daar logisch bij horen.",
        "Verbindt de fasen met elkaar: Discovery (onderzoek), Blueprint (bouwplan), bouwen en doorontwikkelen.",
        "Helpt om beslissingen, risico's en op te leveren onderdelen goed te volgen.",
      ],
    };
  }

  return {
    eyebrow: "Commercieel",
    title: "Vraag toetsen, vertrouwen en voorstel maken",
    body:
      "Dit document helpt om duidelijk uit te leggen wat LaventeCare doet. En om de klantvraag om te zetten in waarde, aanpak en een volgende stap.",
    bullets: [
      "Helpt bij het kennismakingsgesprek, adviesgesprekken en het maken van een voorstel.",
      "Maakt zichtbaar dat LaventeCare geen losse websitebouwer is, maar een partner die complete systemen bouwt.",
      "Helpt om helder te krijgen wat het oplevert, hoe urgent het is en hoe je beslist.",
    ],
  };
}

function getDocumentSpecificSection(document: LaventeCareDocument): LaventeCarePdfSection {
  if (document.key.includes("voorstel")) {
    return {
      eyebrow: "Voorstel",
      title: "Van probleem naar investering",
      body:
        "Een goed voorstel zegt niet alleen wat er gebouwd wordt. Het zegt vooral welk probleem je oplost, wat het oplevert en welke afspraken de uitvoering beschermen.",
      bullets: [
        "Het probleem, de gevolgen en het gewenste resultaat staan vooraan.",
        "De afspraak, planning, investering en voorwaarden bekijk je samen.",
        "Het voorstel wordt pas sterk als het onderzoek (Discovery) klaar is en je klaar bent om te beslissen.",
      ],
    };
  }

  if (document.key.includes("sla") || document.key.includes("security") || document.key.includes("privacy")) {
    return {
      eyebrow: "Doorlopende zorg",
      title: "Veiligheid en beheer als basis",
      body:
        "LaventeCare behandelt beheer, beveiliging en privacy niet als een bijlage achteraf. Het is een vast onderdeel van de dienst.",
      bullets: [
        "Toegang, gegevens, logboeken, backups en taken worden duidelijk vastgelegd.",
        "Support en storingen krijgen een duidelijke prioriteit, een vast kanaal en opvolging.",
        "Privacy en beveiliging leggen we uit in gewone taal die zakelijk bruikbaar blijft.",
      ],
    };
  }

  if (document.key.includes("discovery") || document.key.includes("audit")) {
    return {
      eyebrow: "Analyse",
      title: "Eerst begrijpen, dan bouwen",
      body:
        "Discovery (het onderzoek) voorkomt dat je te vroeg bouwt op aannames. Het onderzoek maakt het proces, de systemen, de knelpunten en de kansen zichtbaar.",
      bullets: [
        "Brengt de huidige situatie in kaart, plus waar dingen van elkaar afhangen en welke risico's er zijn.",
        "Zet wat we zien om in concrete prioriteiten en punten waarover je moet beslissen.",
        "Geeft richting aan het bouwplan (Blueprint), de afspraak en het bouwen.",
      ],
    };
  }

  return {
    eyebrow: "Dossier",
    title: "Goed gebruiken tijdens het klanttraject",
    body:
      "Dit document hoort niet los in een map. Het hoort in een dossier met alles rond de lead: de projectfase, de beslissingen en de opvolging.",
    bullets: [
      "Koppel het document aan een lead, project of actiepunt.",
      "Gebruik het als hulp in een gesprek, als document om mee te beslissen of om over te dragen.",
      "Laat Brain en Telegram later een seintje geven wanneer dit document ontbreekt.",
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
        title: "Investering en beslissen",
        body:
          "LaventeCare werkt met duidelijke richtprijzen. Zo lopen advies, onderzoek (Discovery), bouwen en beheer niet door elkaar.",
        bullets: [
          pricing,
          "Een voorstel hoort altijd gekoppeld te zijn aan de afspraak, de planning en de voorwaarden waaronder je akkoord geeft.",
          "Niet passend blijft netjes: niet elke vraag hoeft een LaventeCare-project te worden.",
        ],
      },
    ],
    checklist: [
      "Lead of project gekoppeld",
      "Doel en volgende stap bepaald",
      "De afspraak of het gebruik vastgelegd",
      "Beslisser en eigenaar bekend",
      "Mogelijke juridische of beveiligingsgevolgen gecontroleerd",
      ...(dossierContext ? ["Dossiergegevens gecontroleerd voor verzending"] : []),
    ],
    nextSteps: [
      "Bespreek dit document in de juiste fase van het traject.",
      "Leg het resultaat vast als actie, besluit of projectnotitie.",
      ...(dossierContext?.nextStep ? [`Vervolg in het dossier: ${dossierContext.nextStep}`] : []),
      `Let op deze signalen dat het niet past: ${LAVENTECARE_NO_FIT_SIGNALS.slice(0, 2).join(" - ")}`,
    ],
  };
}
