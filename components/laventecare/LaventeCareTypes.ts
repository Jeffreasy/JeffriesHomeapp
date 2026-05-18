import {
  type LCLead,
  type LCProject,
  type LCActionItem,
  type LCDocument,
} from "@/lib/api";

export type Tone = "amber" | "emerald" | "sky" | "rose" | "violet" | "slate";

export type DocumentItem = LCDocument & {
  documentKey?: string;
};

export type LeadItem = LCLead & {
  _id?: string;
  fitScore?: number;
  volgendeStap?: string;
  volgendeActieDatum?: string;
  gewijzigd?: string;
  aangemaakt?: string;
};

export type ProjectItem = LCProject & {
  _id?: string;
  waardeIndicatie?: number;
};

export type BusinessSignal = {
  source: "email" | "agenda" | "notitie";
  id: string;
  title: string;
  subtitle: string;
  date: string;
  matchedTerm: string;
  urgency: "laag" | "normaal" | "hoog";
  actionHint: string;
};

export type FollowUpSignal = {
  source: "lead" | "project";
  id: string;
  title: string;
  date: string;
  status: string;
  priority: "laag" | "normaal" | "hoog";
  actionHint: string;
};

export type ActionItem = LCActionItem & {
  _id: string;
  actionType: string;
  dueDate?: string;
  sourceId?: string;
  linkedLeadId?: string;
  linkedProjectId?: string;
  updatedAt?: string;
};

export type DecisionItem = {
  _id?: string;
  titel: string;
  besluit: string;
  reden: string;
  impact?: string;
  status: string;
  datum: string;
};

export type ChangeRequestItem = {
  _id?: string;
  titel: string;
  impact: string;
  planningImpact?: string;
  budgetImpact?: string;
  status: string;
  gewijzigd?: string;
};

export type SlaIncidentItem = {
  _id?: string;
  titel: string;
  prioriteit: string;
  status: string;
  kanaal: string;
  gemeldOp: string;
  reactieDeadline?: string;
  samenvatting?: string;
};

export type LeadForm = {
  titel: string;
  companyName: string;
  website: string;
  pijnpunt: string;
  volgendeStap: string;
  prioriteit: string;
};

export const emptyLeadForm: LeadForm = {
  titel: "",
  companyName: "",
  website: "",
  pijnpunt: "",
  volgendeStap: "",
  prioriteit: "normaal",
};
