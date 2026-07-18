export const laventeCareQueryKeys = {
  root: ["laventecare"] as const,
  cockpit: ["laventecare", "cockpit"] as const,
  billing: ["laventecare", "billing"] as const,
  mailbox: ["laventecare", "mailbox"] as const,
  companies: {
    root: ["laventecare", "companies"] as const,
    all: ["laventecare", "companies", "all"] as const,
    picker: (query: string) => ["laventecare", "companies", "picker", query] as const,
  },
  contacts: {
    root: ["laventecare", "contacts"] as const,
    all: ["laventecare", "contacts", "all"] as const,
  },
  leads: {
    root: ["laventecare", "leads"] as const,
    all: ["laventecare", "leads", "all"] as const,
  },
  projects: {
    root: ["laventecare", "projects"] as const,
    all: ["laventecare", "projects", "all"] as const,
  },
  workstreams: {
    root: ["laventecare", "workstreams"] as const,
    all: ["laventecare", "workstreams", "all"] as const,
  },
  dossierDocuments: {
    root: ["laventecare", "dossier-documents"] as const,
    all: ["laventecare", "dossier-documents", "all"] as const,
  },
  dossierAdvice: {
    root: ["laventecare", "dossier-advice"] as const,
    global: ["laventecare", "dossier-advice", "global"] as const,
  },
  companyActivity: {
    root: ["laventecare", "activity", "company"] as const,
    detail: (companyId: string) => ["laventecare", "activity", "company", companyId] as const,
  },
  companyAccessCredentials: {
    root: ["laventecare", "access-credentials", "company"] as const,
    detail: (companyId: string) => ["laventecare", "access-credentials", "company", companyId] as const,
  },
} as const;

export type LaventeCareMutation = keyof typeof laventeCareMutationInvalidations;

export type LaventeCareInvalidation = {
  queryKey: readonly string[];
  exact: boolean;
};

const exact = (queryKey: readonly string[]): LaventeCareInvalidation => ({ queryKey, exact: true });
const prefix = (queryKey: readonly string[]): LaventeCareInvalidation => ({ queryKey, exact: false });

const cockpit = exact(laventeCareQueryKeys.cockpit);
const billing = exact(laventeCareQueryKeys.billing);
const mailbox = exact(laventeCareQueryKeys.mailbox);
const companies = prefix(laventeCareQueryKeys.companies.root);
const contacts = prefix(laventeCareQueryKeys.contacts.root);
const leads = prefix(laventeCareQueryKeys.leads.root);
const projects = prefix(laventeCareQueryKeys.projects.root);
const workstreams = prefix(laventeCareQueryKeys.workstreams.root);
const dossierDocuments = prefix(laventeCareQueryKeys.dossierDocuments.root);
const dossierAdvice = prefix(laventeCareQueryKeys.dossierAdvice.root);
const companyActivity = prefix(laventeCareQueryKeys.companyActivity.root);
const companyAccessCredentials = prefix(laventeCareQueryKeys.companyAccessCredentials.root);

/**
 * Every mutation declares the smallest cache surface it can change. Keeping
 * this mapping pure makes refetch behaviour reviewable without mounting React.
 */
export const laventeCareMutationInvalidations = {
  createCompany: [cockpit, companies],
  updateCompany: [cockpit, companies],
  createContact: [cockpit, contacts, companies],
  updateContact: [cockpit, contacts, companies],
  createAccessCredential: [cockpit, companyAccessCredentials],
  updateAccessCredential: [cockpit, companyAccessCredentials],
  createLead: [cockpit, leads, companies],
  updateLead: [cockpit, leads, companies],
  convertLead: [cockpit, leads, projects, companies],
  createProject: [cockpit, projects, companies],
  updateProject: [cockpit, projects, companies],
  createWorkstream: [cockpit, workstreams, companies],
  updateWorkstream: [cockpit, workstreams, companies],
  convertWorkstream: [cockpit, workstreams, projects, companies],
  createAction: [cockpit, companies],
  convertSignal: [cockpit, leads, companies],
  updateActionStatus: [cockpit],
  seedDocuments: [cockpit],
  createDossierDocument: [cockpit, dossierDocuments, dossierAdvice, companies],
  createActivityEvent: [cockpit, companyActivity, companies],
  createDecision: [cockpit],
  updateDecisionStatus: [cockpit],
  createChangeRequest: [cockpit],
  updateChangeRequestStatus: [cockpit],
  createSlaIncident: [cockpit],
  updateSlaIncidentStatus: [cockpit],
  createQuote: [billing],
  updateQuoteStatus: [billing],
  createTimeEntry: [billing],
  updateTimeEntry: [billing],
  deleteTimeEntry: [billing],
  createInvoice: [billing],
  createInvoiceFromQuote: [billing],
  updateInvoiceStatus: [billing],
  createInvoicePaymentRequest: [billing],
  generateInvoiceDocument: [billing],
  refreshInvoicePayment: [billing],
  createMailTemplate: [cockpit, mailbox],
  updateMailTemplate: [cockpit, mailbox],
  sendTemplatedMail: [cockpit, mailbox, companies],
  syncInbox: [mailbox],
  markInboxRead: [mailbox],
} as const satisfies Record<string, readonly LaventeCareInvalidation[]>;

export function getLaventeCareMutationInvalidations(
  mutation: LaventeCareMutation,
): readonly LaventeCareInvalidation[] {
  return laventeCareMutationInvalidations[mutation];
}
