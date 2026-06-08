import {
  type LCCompany,
  type LCContact,
  type LCLead,
  type LCProject,
  type LCWorkstream,
  type LCActionItem,
  type LCDocument,
  type LCDossierDocument,
  type LCActivityEvent,
  type LCBilling,
  type LCQuote,
  type LCQuoteLine,
  type LCTimeEntry,
  type LCInvoice,
  type LCInvoiceLine,
  type LCMailbox,
  type LCMailTemplate,
  type LCMailOutboxItem,
} from "@/lib/api";

export type Tone = "amber" | "emerald" | "sky" | "rose" | "violet" | "slate";

export type DocumentItem = LCDocument & {
  documentKey?: string;
};

export type DossierDocumentItem = LCDossierDocument;
export type ActivityEventItem = LCActivityEvent;
export type BillingItem = LCBilling;
export type QuoteItem = LCQuote;
export type QuoteLineItem = LCQuoteLine;
export type TimeEntryItem = LCTimeEntry;
export type InvoiceItem = LCInvoice;
export type InvoiceLineItem = LCInvoiceLine;
export type MailboxItem = LCMailbox;
export type MailTemplateItem = LCMailTemplate;
export type MailOutboxItem = LCMailOutboxItem;

export type CompanyItem = LCCompany & {
  _id?: string;
  laatsteContact?: string;
  volgendeActie?: string;
};

export type ContactItem = LCContact & {
  _id?: string;
  companyId?: string;
  isPrimary?: boolean;
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

export type WorkstreamItem = LCWorkstream & {
  _id?: string;
  klantNaam?: string;
  volgendeStap?: string;
  geschatteMinuten?: number;
  waardeIndicatie?: number;
  stackTags?: string[];
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
  source: "company" | "lead" | "workstream" | "project";
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
  linkedWorkstreamId?: string;
  linkedCompanyId?: string;
  updatedAt?: string;
};

export type DecisionItem = {
  id?: string;
  _id?: string;
  titel: string;
  besluit: string;
  reden: string;
  impact?: string;
  status: string;
  datum: string;
};

export type ChangeRequestItem = {
  id?: string;
  _id?: string;
  titel: string;
  impact: string;
  planningImpact?: string;
  budgetImpact?: string;
  status: string;
  gewijzigd?: string;
};

export type SlaIncidentItem = {
  id?: string;
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
  companyId: string;
  contactId: string;
  companyName: string;
  website: string;
  pijnpunt: string;
  volgendeStap: string;
  prioriteit: "laag" | "normaal" | "hoog";
};

export const emptyLeadForm: LeadForm = {
  titel: "",
  companyId: "",
  contactId: "",
  companyName: "",
  website: "",
  pijnpunt: "",
  volgendeStap: "",
  prioriteit: "normaal",
};

export type ProjectForm = {
  naam: string;
  companyId: string;
  companyName: string;
  website: string;
  fase: string;
  status: string;
  waardeIndicatie: number | "";
  deadline: string;
  samenvatting: string;
};

export const emptyProjectForm: ProjectForm = {
  naam: "",
  companyId: "",
  companyName: "",
  website: "",
  fase: "intake",
  status: "actief",
  waardeIndicatie: "",
  deadline: "",
  samenvatting: "",
};

export type WorkstreamForm = {
  titel: string;
  companyId: string;
  type: string;
  status: string;
  prioriteit: "laag" | "normaal" | "hoog";
  klantNaam: string;
  doel: string;
  scope: string;
  deliverable: string;
  bevindingen: string;
  volgendeStap: string;
  deadline: string;
  geschatteMinuten: number | "";
  waardeIndicatie: number | "";
  stackTags: string;
  tags: string;
};

export const emptyWorkstreamForm: WorkstreamForm = {
  titel: "",
  companyId: "",
  type: "advies",
  status: "nieuw",
  prioriteit: "normaal",
  klantNaam: "",
  doel: "",
  scope: "",
  deliverable: "",
  bevindingen: "",
  volgendeStap: "",
  deadline: "",
  geschatteMinuten: "",
  waardeIndicatie: "",
  stackTags: "",
  tags: "",
};

export type CompanyForm = {
  naam: string;
  website: string;
  sector: string;
  status: "actief" | "prospect" | "inactief";
  relatieType: "prospect" | "klant" | "partner" | "leverancier" | "intern" | "eigen_project";
  notities: string;
  volgendeActie: string;
};

export const emptyCompanyForm: CompanyForm = {
  naam: "",
  website: "",
  sector: "",
  status: "actief",
  relatieType: "prospect",
  notities: "",
  volgendeActie: "",
};

export type ContactForm = {
  companyId: string;
  naam: string;
  email: string;
  telefoon: string;
  rol: string;
  isPrimary: boolean;
  notities: string;
};

export const emptyContactForm: ContactForm = {
  companyId: "",
  naam: "",
  email: "",
  telefoon: "",
  rol: "",
  isPrimary: false,
  notities: "",
};

export type ActivityForm = {
  companyId: string;
  contactId: string;
  projectId: string;
  workstreamId: string;
  eventType: string;
  channel: string;
  title: string;
  body: string;
  occurredAt: string;
};

export const emptyActivityForm: ActivityForm = {
  companyId: "",
  contactId: "",
  projectId: "",
  workstreamId: "",
  eventType: "contact",
  channel: "manual",
  title: "",
  body: "",
  occurredAt: "",
};

export const LAVENTECARE_ACTIVITY_TYPES = [
  { value: "contact", label: "Contactmoment" },
  { value: "meeting", label: "Meeting" },
  { value: "call", label: "Belmoment" },
  { value: "email", label: "Email" },
  { value: "notitie", label: "Notitie" },
  { value: "besluit", label: "Besluit" },
  { value: "project_update", label: "Project update" },
  { value: "document", label: "Document" },
] as const;

export const LAVENTECARE_WORKSTREAM_TYPES = [
  { value: "website_platform", label: "Website / platform" },
  { value: "integratie", label: "Integratie" },
  { value: "automatisering", label: "Automatisering" },
  { value: "ai_workflow", label: "AI / workflow" },
  { value: "crm_sales", label: "CRM / sales" },
  { value: "data_reporting", label: "Data / reporting" },
  { value: "security_privacy", label: "Security / privacy" },
  { value: "support_beheer", label: "Support / beheer" },
  { value: "discovery_advies", label: "Discovery / advies" },
  { value: "advies", label: "Advies" },
] as const;

export type BillingTimeForm = {
  companyId: string;
  projectId: string;
  workstreamId: string;
  description: string;
  entryDate: string;
  minutes: number | "";
  hourlyRate: number | "";
  billable: boolean;
};

export const emptyBillingTimeForm: BillingTimeForm = {
  companyId: "",
  projectId: "",
  workstreamId: "",
  description: "",
  entryDate: "",
  minutes: 60,
  hourlyRate: 75,
  billable: true,
};

export type BillingQuoteForm = {
  companyId: string;
  projectId: string;
  workstreamId: string;
  titel: string;
  description: string;
  quantity: number | "";
  unitAmount: number | "";
  validUntil: string;
  notes: string;
};

export const emptyBillingQuoteForm: BillingQuoteForm = {
  companyId: "",
  projectId: "",
  workstreamId: "",
  titel: "",
  description: "",
  quantity: 1,
  unitAmount: 250,
  validUntil: "",
  notes: "",
};

export type BillingInvoiceForm = {
  companyId: string;
  projectId: string;
  workstreamId: string;
  description: string;
  minutes: number | "";
  hourlyRate: number | "";
  dueDate: string;
  notes: string;
  selectedTimeEntryIds: string[];
};

export const emptyBillingInvoiceForm: BillingInvoiceForm = {
  companyId: "",
  projectId: "",
  workstreamId: "",
  description: "",
  minutes: 60,
  hourlyRate: 75,
  dueDate: "",
  notes: "",
  selectedTimeEntryIds: [],
};
