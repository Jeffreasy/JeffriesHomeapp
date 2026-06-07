import { LAVENTECARE_DOCUMENTS_BY_KEY } from "./documents";
import type {
  LaventeCareDocumentRecommendation,
  LaventeCareServiceId,
} from "./types";

export type LaventeCareDossierStatus =
  | "new"
  | "qualified"
  | "proposal"
  | "blueprint"
  | "delivery"
  | "sla"
  | "closed";

const dossierStatusOrder: Record<LaventeCareDossierStatus, number> = {
  new: 0,
  qualified: 1,
  proposal: 2,
  blueprint: 3,
  delivery: 4,
  sla: 5,
  closed: 6,
};

function addRecommendedDocument(
  documents: Map<string, LaventeCareDocumentRecommendation>,
  key: string,
  reasonLabel: string,
  emphasis: "primary" | "supporting"
) {
  const definition = LAVENTECARE_DOCUMENTS_BY_KEY[key];
  if (!definition) return;

  const current = documents.get(key);
  if (!current || (current.emphasis === "supporting" && emphasis === "primary")) {
    documents.set(key, {
      ...definition,
      reasonLabel,
      emphasis,
    });
  }
}

export function getRecommendedLaventeCareDocuments(input: {
  services?: LaventeCareServiceId[];
  status?: LaventeCareDossierStatus;
  hasWebsite?: boolean;
}) {
  const status = input.status ?? "new";
  const statusRank = dossierStatusOrder[status];
  const services = new Set(input.services ?? []);
  const documents = new Map<string, LaventeCareDocumentRecommendation>();

  addRecommendedDocument(documents, "wanneer-past-laventecare", "Fit/no-fit", "primary");
  addRecommendedDocument(documents, "voorstel-template", "Voorsteltraject", "primary");
  addRecommendedDocument(documents, "werkwijze-discovery-blueprint", "Discovery & blueprint", "primary");

  if (statusRank >= dossierStatusOrder.qualified) {
    addRecommendedDocument(documents, "prijzen-investering", "Investering", "supporting");
    addRecommendedDocument(documents, "discovery-systeemanalyse", "Diagnose", "primary");
  }

  if (input.hasWebsite || services.has("leadgen")) {
    addRecommendedDocument(documents, "website-audit", "Website audit", "primary");
    addRecommendedDocument(documents, "lead-generation-conversie", "Leadgen context", "supporting");
  }

  if (services.has("ai")) {
    addRecommendedDocument(documents, "ai-automatisering", "AI-dienst", "primary");
  }

  if (services.has("iot")) {
    addRecommendedDocument(documents, "iot-slimme-monitoring", "IoT-dienst", "primary");
  }

  if (services.has("platforms") || statusRank >= dossierStatusOrder.blueprint) {
    addRecommendedDocument(documents, "scope-deliverables", "Scopebewaking", "primary");
    addRecommendedDocument(documents, "fase2-systeemimplementatie", "Implementatie", "supporting");
  }

  if (services.has("security")) {
    addRecommendedDocument(documents, "security-one-pager", "Security-vraagstuk", "primary");
    addRecommendedDocument(documents, "verwerkersovereenkomst", "AVG verwerking", "supporting");
  }

  if (statusRank >= dossierStatusOrder.proposal) {
    addRecommendedDocument(documents, "algemene-voorwaarden", "Contractbasis", "supporting");
    addRecommendedDocument(documents, "privacyverklaring", "AVG vertrouwen", "supporting");
  }

  if (statusRank >= dossierStatusOrder.delivery) {
    addRecommendedDocument(documents, "klant-onboarding", "Start uitvoering", "supporting");
    addRecommendedDocument(documents, "decision-log", "Besluitvorming", "supporting");
    addRecommendedDocument(documents, "change-request", "Scopewijzigingen", "supporting");
  }

  if (statusRank >= dossierStatusOrder.sla) {
    addRecommendedDocument(documents, "sla-agreement", "Beheer & support", "primary");
    addRecommendedDocument(documents, "system-evolution-plan", "Doorontwikkeling", "supporting");
  }

  return [...documents.values()].sort((left, right) => {
    if (left.emphasis !== right.emphasis) {
      return left.emphasis === "primary" ? -1 : 1;
    }
    return left.sendOrder - right.sendOrder;
  });
}

export const LAVENTECARE_TRAJECT_DOCUMENT_SETS = [
  {
    key: "lead",
    title: "Nieuwe lead",
    description: "Snel kwalificeren, bewijs tonen en de eerste vervolgstap bepalen.",
    documents: getRecommendedLaventeCareDocuments({ status: "new" }).slice(0, 5),
  },
  {
    key: "website",
    title: "Website of leadgen",
    description: "Audit, conversiecontext en voorstel voor zichtbare digitale groei.",
    documents: getRecommendedLaventeCareDocuments({
      status: "qualified",
      services: ["leadgen"],
      hasWebsite: true,
    }).slice(0, 6),
  },
  {
    key: "delivery",
    title: "Delivery project",
    description: "Scope, implementatie, besluitvorming, onboarding en wijzigingsbeheer.",
    documents: getRecommendedLaventeCareDocuments({
      status: "delivery",
      services: ["platforms"],
    }).slice(0, 6),
  },
  {
    key: "security",
    title: "Security of AVG",
    description: "Securitypositie, verwerking, voorwaarden en privacy duidelijk borgen.",
    documents: getRecommendedLaventeCareDocuments({
      status: "proposal",
      services: ["security"],
    }).slice(0, 6),
  },
];

