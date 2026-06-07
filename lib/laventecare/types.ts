export type LaventeCareServiceId =
  | "consultancy"
  | "ai"
  | "iot"
  | "platforms"
  | "leadgen"
  | "security";

export type LaventeCareDocumentCategory = "commercieel" | "proces" | "governance";

export type LaventeCareDocumentVisibility = "public" | "send_only" | "internal" | "contract";

export type LaventeCareFunnelStage =
  | "awareness"
  | "qualification"
  | "diagnosis"
  | "discovery"
  | "proposal"
  | "delivery"
  | "legal"
  | "operations";

export type LaventeCareDocument = {
  key: string;
  title: string;
  category: LaventeCareDocumentCategory;
  phase: string;
  sourceFile: string;
  summary: string;
  tags: string[];
  visibility: LaventeCareDocumentVisibility;
  funnelStage: LaventeCareFunnelStage;
  badge: string;
  sendOrder: number;
  services?: LaventeCareServiceId[];
};

export type LaventeCareProcessStage = {
  key: string;
  title: string;
  summary: string;
  output: string;
};

export type LaventeCarePricingItem = {
  key: string;
  title: string;
  price: string;
  note: string;
};

export type LaventeCareDocumentRecommendation = LaventeCareDocument & {
  reasonLabel: string;
  emphasis: "primary" | "supporting";
};

export type LaventeCareDocumentSeed = {
  document_key: string;
  titel: string;
  categorie: string;
  fase: string | null;
  versie: string;
  source_path: string | null;
  samenvatting: string;
  tags: string[];
};

