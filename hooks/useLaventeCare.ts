"use client";

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { laventecareApi } from "@/lib/api";
import type {
  CompanyItem,
  ContactItem,
  DocumentItem,
  LeadItem,
  ProjectItem,
  WorkstreamItem,
  BusinessSignal,
  FollowUpSignal,
  ActionItem,
  DecisionItem,
  ChangeRequestItem,
  SlaIncidentItem,
  DossierDocumentItem,
  DossierAdviceItem,
  ActivityEventItem,
  BillingItem,
  QuoteItem,
  QuoteLineItem,
  TimeEntryItem,
  InvoiceItem,
  InvoiceLineItem,
  MailboxItem,
  MailTemplateItem,
  MailOutboxItem,
} from "@/components/laventecare/LaventeCareTypes";

const closedWorkstreamStatuses = new Set(["afgerond", "done", "gesloten", "gearchiveerd", "omgezet_project"]);

export function useLaventeCare() {
  const queryClient = useQueryClient();

  const { data: cockpit, isLoading: cockpitLoading } = useQuery({
    queryKey: ["laventecare", "cockpit"],
    queryFn: () => laventecareApi.cockpit(),
    staleTime: 15_000,
  });

  const { data: billing, isLoading: billingLoading } = useQuery({
    queryKey: ["laventecare", "billing"],
    queryFn: () => laventecareApi.billing({ limit: 80 }),
    staleTime: 15_000,
  });

  const { data: mailbox, isLoading: mailboxLoading } = useQuery({
    queryKey: ["laventecare", "mailbox"],
    queryFn: () => laventecareApi.mailbox({ limit: 50 }),
    staleTime: 15_000,
  });

  const { data: allWorkstreamsData } = useQuery({
    queryKey: ["laventecare", "workstreams", "all"],
    queryFn: () => laventecareApi.listWorkstreams({ includeClosed: true, limit: 100 }),
    staleTime: 15_000,
  });

  const { data: allDossierDocumentsData } = useQuery({
    queryKey: ["laventecare", "dossier-documents", "all"],
    queryFn: () => laventecareApi.listDossierDocuments({ limit: 250 }),
    staleTime: 15_000,
  });

  const { data: dossierAdvice, isLoading: dossierAdviceLoading } = useQuery({
    queryKey: ["laventecare", "dossier-advice", "global"],
    queryFn: () => laventecareApi.dossierAdvice({ query: "laventecare", limit: 8 }),
    staleTime: 30_000,
  });

  const createLeadMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createLead>[0]) => laventecareApi.createLead(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createCompanyMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createCompany>[0]) => laventecareApi.createCompany(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateCompanyMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof laventecareApi.updateCompany>[1]) =>
      laventecareApi.updateCompany(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createContactMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createContact>[0]) => laventecareApi.createContact(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateContactMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof laventecareApi.updateContact>[1]) =>
      laventecareApi.updateContact(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateLeadMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string; status?: string }) => laventecareApi.updateLead(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const convertLeadMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string; naam: string; fase?: string; status?: string; samenvatting?: string }) =>
      laventecareApi.convertLeadToProject(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createProjectMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createProject>[0]) => laventecareApi.createProject(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateProjectMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof laventecareApi.updateProject>[1]) =>
      laventecareApi.updateProject(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createWorkstreamMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createWorkstream>[0]) => laventecareApi.createWorkstream(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateWorkstreamMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof laventecareApi.updateWorkstream>[1]) =>
      laventecareApi.updateWorkstream(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const convertWorkstreamMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string; project_id?: string; naam?: string; fase?: string; status?: string; samenvatting?: string }) =>
      laventecareApi.convertWorkstreamToProject(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createActionMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createAction>[0]) => laventecareApi.createAction(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const convertSignalMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.convertSignalToLead>[0]) =>
      laventecareApi.convertSignalToLead(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateActionStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => laventecareApi.updateActionStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const seedDocumentsMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.seedDocuments>[0]) => laventecareApi.seedDocuments(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createDossierDocumentMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createDossierDocument>[0]) =>
      laventecareApi.createDossierDocument(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createActivityEventMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createActivityEvent>[0]) =>
      laventecareApi.createActivityEvent(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createDecisionMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createDecision>[0]) =>
      laventecareApi.createDecision(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateDecisionStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      laventecareApi.updateDecisionStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createChangeRequestMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createChangeRequest>[0]) =>
      laventecareApi.createChangeRequest(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateChangeRequestStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      laventecareApi.updateChangeRequestStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createSlaIncidentMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createSlaIncident>[0]) =>
      laventecareApi.createSlaIncident(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateSlaIncidentStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      laventecareApi.updateSlaIncidentStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createQuoteMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createQuote>[0]) => laventecareApi.createQuote(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateQuoteStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => laventecareApi.updateQuoteStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createTimeEntryMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createTimeEntry>[0]) => laventecareApi.createTimeEntry(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createInvoiceMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createInvoice>[0]) => laventecareApi.createInvoice(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createInvoiceFromQuoteMut = useMutation({
    mutationFn: (id: string) => laventecareApi.createInvoiceFromQuote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateInvoiceStatusMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof laventecareApi.updateInvoiceStatus>[1]) =>
      laventecareApi.updateInvoiceStatus(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createInvoicePaymentRequestMut = useMutation({
    mutationFn: (id: string) => laventecareApi.createInvoicePaymentRequest(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const createMailTemplateMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.createMailTemplate>[0]) => laventecareApi.createMailTemplate(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const updateMailTemplateMut = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Parameters<typeof laventecareApi.updateMailTemplate>[1]) =>
      laventecareApi.updateMailTemplate(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const suggestMailContentMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.suggestMailContent>[0]) => laventecareApi.suggestMailContent(data),
  });

  const sendTemplatedMailMut = useMutation({
    mutationFn: (data: Parameters<typeof laventecareApi.sendTemplatedMail>[0]) => laventecareApi.sendTemplatedMail(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laventecare"] }),
  });

  const documents = useMemo(() => (cockpit?.documentCatalog ?? []) as DocumentItem[], [cockpit]);
  const companies = useMemo(
    () =>
      (cockpit?.companies ?? []).map((c) => ({
        ...c,
        _id: c.id,
        laatsteContact: c.laatste_contact ?? undefined,
        volgendeActie: c.volgende_actie ?? undefined,
      })) as CompanyItem[],
    [cockpit]
  );
  const contacts = useMemo(
    () =>
      (cockpit?.contacts ?? []).map((c) => ({
        ...c,
        _id: c.id,
        companyId: c.company_id ?? undefined,
        isPrimary: c.is_primary,
      })) as ContactItem[],
    [cockpit]
  );
  const dossierDocuments = useMemo(
    () => (allDossierDocumentsData ?? cockpit?.dossierDocuments ?? []) as DossierDocumentItem[],
    [allDossierDocumentsData, cockpit]
  );
  const aiDossierAdvice = useMemo(() => dossierAdvice as DossierAdviceItem | undefined, [dossierAdvice]);
  const activityEvents = useMemo(
    () => (cockpit?.activityEvents ?? []) as ActivityEventItem[],
    [cockpit]
  );
  const billingData = useMemo(() => billing as BillingItem | undefined, [billing]);
  const mailboxData = useMemo(() => mailbox as MailboxItem | undefined, [mailbox]);
  const mailTemplates = useMemo(() => (mailbox?.templates ?? []) as MailTemplateItem[], [mailbox]);
  const mailOutbox = useMemo(() => (mailbox?.outbox ?? []) as MailOutboxItem[], [mailbox]);
  const quotes = useMemo(() => (billing?.quotes ?? []) as QuoteItem[], [billing]);
  const quoteLines = useMemo(() => (billing?.quoteLines ?? []) as QuoteLineItem[], [billing]);
  const timeEntries = useMemo(() => (billing?.timeEntries ?? []) as TimeEntryItem[], [billing]);
  const invoices = useMemo(() => (billing?.invoices ?? []) as InvoiceItem[], [billing]);
  const invoiceLines = useMemo(() => (billing?.invoiceLines ?? []) as InvoiceLineItem[], [billing]);
  const activeLeads = useMemo(
    () =>
      (cockpit?.activeLeads ?? []).map((l) => ({
        ...l,
        _id: l.id,
        fitScore: l.fit_score ?? undefined,
        volgendeStap: l.volgende_stap ?? undefined,
        volgendeActieDatum: l.volgende_actie_datum ?? undefined,
      })) as LeadItem[],
    [cockpit]
  );
  const activeProjects = useMemo(
    () =>
      (cockpit?.activeProjects ?? []).map((p) => ({
        ...p,
        _id: p.id,
        waardeIndicatie: p.waarde_indicatie ?? undefined,
      })) as ProjectItem[],
    [cockpit]
  );
  const workstreams = useMemo(
    () =>
      (allWorkstreamsData ?? cockpit?.activeWorkstreams ?? []).map((w) => ({
        ...w,
        _id: w.id,
        klantNaam: w.klant_naam ?? undefined,
        volgendeStap: w.volgende_stap ?? undefined,
        geschatteMinuten: w.geschatte_minuten ?? undefined,
        waardeIndicatie: w.waarde_indicatie ?? undefined,
        stackTags: w.stack_tags ?? [],
      })) as WorkstreamItem[],
    [allWorkstreamsData, cockpit]
  );
  const activeWorkstreams = useMemo(
    () => workstreams.filter((workstream) => !closedWorkstreamStatuses.has(workstream.status)),
    [workstreams]
  );
  const businessSignals = useMemo(
    () =>
      (cockpit?.businessSignals ?? []).map((s) => ({
        ...s,
        matchedTerm: s.matched_term,
        actionHint: s.action_hint,
      })) as BusinessSignal[],
    [cockpit]
  );
  const actionItems = useMemo(
    () =>
      (cockpit?.actionItems ?? []).map((a) => ({
        ...a,
        _id: a.id,
        actionType: a.action_type,
        dueDate: a.due_date ?? undefined,
        sourceId: a.source_id ?? undefined,
        linkedLeadId: a.linked_lead_id ?? undefined,
        linkedProjectId: a.linked_project_id ?? undefined,
        linkedWorkstreamId: a.linked_workstream_id ?? undefined,
        linkedCompanyId: a.linked_company_id ?? undefined,
        updatedAt: a.updated_at,
      })) as ActionItem[],
    [cockpit]
  );
  const followUps = useMemo(
    () =>
      (cockpit?.followUps ?? []).map((f) => ({
        ...f,
        actionHint: f.action_hint,
      })) as FollowUpSignal[],
    [cockpit]
  );
  const openIncidents = useMemo(
    () =>
      (cockpit?.openIncidents ?? []).map((i) => ({
        ...i,
        _id: i.id,
        gemeldOp: i.gemeld_op,
        reactieDeadline: i.reactie_deadline ?? undefined,
      })) as SlaIncidentItem[],
    [cockpit]
  );
  const openChanges = useMemo(
    () =>
      (cockpit?.openChanges ?? []).map((c) => ({
        ...c,
        _id: c.id,
        planningImpact: c.planning_impact ?? undefined,
        budgetImpact: c.budget_impact ?? undefined,
      })) as ChangeRequestItem[],
    [cockpit]
  );
  const recentDecisions = useMemo(
    () => (cockpit?.recentDecisions ?? []).map((d) => ({ ...d, _id: d.id })) as DecisionItem[],
    [cockpit]
  );

  const summary = cockpit?.summary ?? {
    companies: 0,
    contacts: 0,
    leads: 0,
    activeLeads: 0,
    workstreams: 0,
    activeWorkstreams: 0,
    projects: 0,
    activeProjects: 0,
    documents: 0,
    openIncidents: 0,
    openChanges: 0,
    decisions: 0,
    actionItems: 0,
    dossierDocuments: 0,
    activityEvents: 0,
    mailTemplates: 0,
    mailOutbox: 0,
    mailConfigured: false,
    documentsSeeded: false,
    knowledgeDocuments: 0,
    businessSignals: 0,
    followUps: 0,
  };

  return {
    cockpitLoading,
    billingLoading,
    mailboxLoading,
    dossierAdviceLoading,
    companies,
    contacts,
    documents,
    activeLeads,
    workstreams,
    activeWorkstreams,
    activeProjects,
    businessSignals,
    actionItems,
    followUps,
    openIncidents,
    openChanges,
    recentDecisions,
    dossierDocuments,
    aiDossierAdvice,
    activityEvents,
    billing: billingData,
    mailbox: mailboxData,
    mailTemplates,
    mailOutbox,
    quotes,
    quoteLines,
    timeEntries,
    invoices,
    invoiceLines,
    summary,

    createCompanyMut,
    updateCompanyMut,
    createContactMut,
    updateContactMut,
    createLeadMut,
    updateLeadMut,
    convertLeadMut,
    createProjectMut,
    updateProjectMut,
    createWorkstreamMut,
    updateWorkstreamMut,
    convertWorkstreamMut,
    createActionMut,
    convertSignalMut,
    updateActionStatusMut,
    seedDocumentsMut,
    createDossierDocumentMut,
    createActivityEventMut,
    createDecisionMut,
    updateDecisionStatusMut,
    createChangeRequestMut,
    updateChangeRequestStatusMut,
    createSlaIncidentMut,
    updateSlaIncidentStatusMut,
    createQuoteMut,
    updateQuoteStatusMut,
    createTimeEntryMut,
    createInvoiceMut,
    createInvoiceFromQuoteMut,
    updateInvoiceStatusMut,
    createInvoicePaymentRequestMut,
    createMailTemplateMut,
    updateMailTemplateMut,
    suggestMailContentMut,
    sendTemplatedMailMut,
  };
}
