"use client";

import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/dashboard/DashboardPrimitives";
import { ApiError } from "@/lib/api";
import {
  LAVENTECARE_DOCUMENT_TOTAL,
  toLaventeCareSeedDocuments,
} from "@/lib/laventecare";
import { useLaventeCare } from "@/hooks/useLaventeCare";
import {
  type CompanyForm,
  type ContactForm,
  type LeadForm,
  type ProjectForm,
  type WorkstreamForm,
  type BusinessSignal,
  type ActionItem,
  type CompanyItem,
  type ContactItem,
  type LeadItem,
  type ProjectItem,
  type WorkstreamItem,
  emptyCompanyForm,
  emptyContactForm,
  emptyLeadForm,
  emptyProjectForm,
  emptyWorkstreamForm,
} from "@/components/laventecare/LaventeCareTypes";
import { label, optional } from "@/components/laventecare/LaventeCareUtils";

import { LaventeCareHeader } from "@/components/laventecare/LaventeCareHeader";
import {
  LaventeCareBusinessCommandCenter,
  type LaventeCareDossierDocumentLogPayload,
} from "@/components/laventecare/LaventeCareBusinessCommandCenter";
import { LaventeCareCompanyModal } from "@/components/laventecare/LaventeCareCompanyModal";
import { LaventeCareContactModal } from "@/components/laventecare/LaventeCareContactModal";
import { LaventeCareLeadModal } from "@/components/laventecare/LaventeCareLeadModal";
import { LaventeCareProjectModal } from "@/components/laventecare/LaventeCareProjectModal";
import { LaventeCareWorkstreamModal } from "@/components/laventecare/LaventeCareWorkstreamModal";
import { LaventeCareCustomerDossier } from "@/components/laventecare/LaventeCareCustomerDossier";
import { LaventeCareSignalsView } from "@/components/laventecare/LaventeCareSignalsView";
import { LaventeCarePipelineView } from "@/components/laventecare/LaventeCarePipelineView";
import { LaventeCareOperationsView } from "@/components/laventecare/LaventeCareOperationsView";
import { LaventeCareKnowledgeView } from "@/components/laventecare/LaventeCareKnowledgeView";
import { LaventeCareBillingView } from "@/components/laventecare/LaventeCareBillingView";
import { LaventeCareMailboxView } from "@/components/laventecare/LaventeCareMailboxView";
import {
  CapabilityMatrix,
  LaventeCarePortalHero,
  PortalInsightRail,
  PortalNavigation,
  PortalRoadmapPanel,
  portalIcons,
  type CapabilityRow,
  type PortalSection,
  type PortalView,
} from "@/components/laventecare/LaventeCarePortal";

export default function LaventeCarePage() {
  const {
    cockpit,
    cockpitLoading,
    cockpitError,
    refetchCockpit,
    billingLoading,
    billingError,
    refetchBilling,
    mailboxLoading,
    mailboxError,
    refetchMailbox,
    dossierAdviceLoading,
    dossierAdviceError,
    refetchDossierAdvice,
    companies,
    contacts,
    accessCredentials,
    documents,
    leads,
    activeLeads,
    workstreams,
    activeWorkstreams,
    projects,
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
    billing,
    mailbox,
    mailTemplates,
    mailOutbox,
    mailInbox,
    syncInbox,
    syncingInbox,
    markInboxRead,
    quotes,
    timeEntries,
    invoices,
    summary,
    createCompanyMut,
    updateCompanyMut,
    createContactMut,
    updateContactMut,
    createAccessCredentialMut,
    updateAccessCredentialMut,
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
    updateTimeEntryMut,
    deleteTimeEntryMut,
    createInvoiceMut,
    createInvoiceFromQuoteMut,
    updateInvoiceStatusMut,
    createInvoicePaymentRequestMut,
    generateInvoiceDocumentMut,
    refreshInvoicePaymentMut,
    suggestMailContentMut,
    sendTemplatedMailMut,
  } = useLaventeCare();

  const { success, error: toastError } = useToast();
  const { openConfirm } = useConfirm();
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showWorkstreamForm, setShowWorkstreamForm] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContactForm);
  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLeadForm);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [workstreamForm, setWorkstreamForm] =
    useState<WorkstreamForm>(emptyWorkstreamForm);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  // Baselines for the dirty-guard (M3): snapshot of the form as it was when the
  // modal opened (empty, prefilled or populated-for-edit). A modal is "dirty"
  // when its current form no longer equals its baseline.
  const [companyFormBaseline, setCompanyFormBaseline] = useState<string>(
    JSON.stringify(emptyCompanyForm),
  );
  const [contactFormBaseline, setContactFormBaseline] = useState<string>(
    JSON.stringify(emptyContactForm),
  );
  const [workstreamFormBaseline, setWorkstreamFormBaseline] = useState<string>(
    JSON.stringify(emptyWorkstreamForm),
  );
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingAccessCredential, setSavingAccessCredential] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [savingWorkstream, setSavingWorkstream] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [processingSignal, setProcessingSignal] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [processingLead, setProcessingLead] = useState<string | null>(null);
  const [processingProject, setProcessingProject] = useState<string | null>(
    null,
  );
  const [processingWorkstream, setProcessingWorkstream] = useState<
    string | null
  >(null);
  const [processingOperation, setProcessingOperation] = useState<string | null>(
    null,
  );
  const [loggingDocumentKey, setLoggingDocumentKey] = useState<string | null>(
    null,
  );
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);
  const [creatingInvoiceFromQuoteId, setCreatingInvoiceFromQuoteId] = useState<
    string | null
  >(null);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(
    null,
  );
  const [requestingPaymentInvoiceId, setRequestingPaymentInvoiceId] = useState<
    string | null
  >(null);
  const [generatingInvoiceDocumentId, setGeneratingInvoiceDocumentId] =
    useState<string | null>(null);
  // Separate busy flag so the "UBL" button no longer spins while "Document"
  // is generating (they used to share generatingInvoiceDocumentId).
  const [downloadingInvoiceUBLId, setDownloadingInvoiceUBLId] = useState<
    string | null
  >(null);
  const [updatingAccessCredentialId, setUpdatingAccessCredentialId] = useState<
    string | null
  >(null);
  const [refreshingPaymentInvoiceId, setRefreshingPaymentInvoiceId] = useState<
    string | null
  >(null);
  // Set once an inbox-sync reports that the Graph app lacks Mail.Read; the
  // mailbox view then shows a persistent notice instead of only a toast (M15).
  const [inboundBlocked, setInboundBlocked] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null,
  );
  const [activeView, setActiveView] = useState<PortalView>("overview");
  const [mailboxInvoiceId, setMailboxInvoiceId] = useState("");
  // R3-maandafsluiting: signaleer de mailbox dat een herinnering bedoeld is,
  // zodat die de herinneringstemplate voorselecteert.
  const [mailboxIntent, setMailboxIntent] = useState<"reminder" | null>(null);
  // R3-H6: per-factuur pending betaalverzoek dat op bevestiging wacht; leeft op
  // de pagina zodat de instructie persistent en actionabel op de factuurrij staat.
  const [pendingPaymentActions, setPendingPaymentActions] = useState<
    Record<string, { message: string; code?: string; pendingActionId?: string }>
  >({});
  // R3-maandafsluiting: klant voorgeselecteerd bij het openen van Commercie
  // vanuit het dossier.
  const [commercePrefillCompanyId, setCommercePrefillCompanyId] = useState("");
  const [search, setSearch] = useState("");
  // N10: per-regel busy-vlag voor urenregel-acties.
  const [processingTimeEntryId, setProcessingTimeEntryId] = useState<
    string | null
  >(null);
  // Diff L-7: het "Verzonden"-signaal leeft hier zodat het de key-remount van
  // de mailbox-view (na het legen van de invoice-prefill) overleeft.
  const [mailJustSent, setMailJustSent] = useState(false);
  const mailJustSentTimer = useRef<number | null>(null);
  // M-D: dirty-status van de commerce/mailbox-formulieren, gelift via
  // callbacks zodat een tabwissel eerst om bevestiging kan vragen.
  const commerceDirtyRef = useRef(false);
  const mailboxDirtyRef = useRef(false);
  const handleCommerceDirtyChange = useCallback((dirty: boolean) => {
    commerceDirtyRef.current = dirty;
  }, []);
  const handleMailboxDirtyChange = useCallback((dirty: boolean) => {
    mailboxDirtyRef.current = dirty;
  }, []);

  const selectedCompany = useMemo(
    () =>
      companies.find(
        (company) => (company._id ?? company.id) === selectedCompanyId,
      ) ?? null,
    [companies, selectedCompanyId],
  );

  // Dirty flags (M3): lead/project forms always open empty (they reset on
  // close), company/contact/workstream forms compare against the snapshot
  // taken when they were opened (empty, prefilled or loaded-for-edit).
  const leadFormDirty =
    JSON.stringify(leadForm) !== JSON.stringify(emptyLeadForm);
  const projectFormDirty =
    JSON.stringify(projectForm) !== JSON.stringify(emptyProjectForm);
  const workstreamFormDirty =
    JSON.stringify(workstreamForm) !== workstreamFormBaseline;
  const companyFormDirty =
    JSON.stringify(companyForm) !== companyFormBaseline;
  const contactFormDirty =
    JSON.stringify(contactForm) !== contactFormBaseline;

  const filteredDocuments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((doc) =>
      [
        doc.titel,
        doc.categorie,
        doc.fase,
        doc.samenvatting,
        ...(doc.tags ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [documents, search]);

  const documentGroups = useMemo(() => {
    const groups = new Map<string, typeof documents>();
    for (const doc of filteredDocuments) {
      const key = doc.categorie || "overig";
      groups.set(key, [...(groups.get(key) ?? []), doc]);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredDocuments]);

  const totalWorkstreams = Math.max(
    summary.workstreams ?? 0,
    workstreams.length,
    activeWorkstreams.length,
  );

  const capabilityRows = useMemo<CapabilityRow[]>(() => {
    const quoteCount = billing?.summary.quotes ?? quotes.length;
    const timeEntryCount = billing?.summary.timeEntries ?? timeEntries.length;
    const invoiceCount = billing?.summary.invoices ?? invoices.length;
    const hasCommercialData =
      quoteCount > 0 || timeEntryCount > 0 || invoiceCount > 0;
    const rows: CapabilityRow[] = [
      {
        label: "Klantenbasis",
        detail: `${companies.length} klanten, ${contacts.length} contactpersonen`,
        status:
          companies.length > 0 && contacts.length > 0
            ? "ready"
            : companies.length > 0
              ? "attention"
              : "missing",
        owner: "CRM",
        view: "pipeline",
        score:
          companies.length > 0 && contacts.length > 0
            ? 100
            : companies.length > 0
              ? 70
              : 25,
        priority:
          contacts.length >= companies.length && companies.length > 0
            ? "laag"
            : "middel",
        nextStep:
          companies.length > 0 && contacts.length > 0
            ? "Basis staat. Houd per klant minimaal een primair contact, website en status bij."
            : "Maak klantrecords en primaire contactpersonen aan voordat offertes en dossiers groeien.",
        actionLabel: "Open klanten",
      },
      {
        label: "Sales intake",
        detail: `${activeLeads.length} actieve leads, ${businessSignals.length} signalen`,
        status:
          activeLeads.length > 0 || businessSignals.length > 0
            ? "ready"
            : "attention",
        owner: "Funnel",
        view: "signals",
        score: 100,
        priority:
          activeLeads.length > 0 || businessSignals.length > 0
            ? "laag"
            : "middel",
        nextStep:
          activeLeads.length > 0 || businessSignals.length > 0
            ? "Triageer signalen en zet kansrijke items om naar lead of actie."
            : "Zet de eerstvolgende prospect of inbound vraag vast, zodat sales niet alleen ad hoc blijft.",
        actionLabel: "Open signalen",
      },
      {
        label: "Flex opdrachten",
        detail: `${totalWorkstreams} opdrachten, ${activeWorkstreams.length} actief`,
        status: totalWorkstreams > 0 ? "ready" : "attention",
        owner: "Werkbank",
        view: "pipeline",
        score: 100,
        priority: totalWorkstreams > 0 ? "laag" : "middel",
        nextStep:
          totalWorkstreams > 0
            ? activeWorkstreams.length > 0
              ? "Koppel opdrachten aan klant, uren en eventueel offerte/factuur."
              : "Eerste opdracht is vastgelegd en omgezet; maak nieuwe losse opdrachten aan zodra er tussenwerk naast projecten loopt."
            : "Leg kleine advies- en implementatieklussen als opdracht vast, los van grote projecten.",
        actionLabel: "Open opdrachten",
      },
      {
        label: "Delivery projecten",
        detail: `${activeProjects.length} actieve projecten`,
        status: activeProjects.length > 0 ? "ready" : "attention",
        owner: "Delivery",
        view: "pipeline",
        score: 100,
        priority: activeProjects.length > 0 ? "laag" : "middel",
        nextStep:
          activeProjects.length > 0
            ? "Gebruik projectfase, deadline en waarde om delivery strak te volgen."
            : "Maak actieve klanttrajecten zichtbaar als project zodra ze langer lopen dan een losse opdracht.",
        actionLabel: "Open delivery",
      },
      {
        label: "Offerte, uren, factuur",
        detail: `${quoteCount} offertes, ${timeEntryCount} uren, ${invoiceCount} facturen`,
        status: hasCommercialData ? "ready" : "attention",
        owner: "Commercie",
        view: "commerce",
        score: 100,
        priority: hasCommercialData ? "laag" : "middel",
        nextStep: hasCommercialData
          ? "Controleer open uren, conceptoffertes en verstuurde facturen periodiek."
          : "Maak de eerste urenregel of offerte voor een bestaande klant en test daarna factuur plus betaalverzoek.",
        actionLabel: "Open commercie",
      },
      {
        label: "Mailbox en templates",
        detail: `${mailTemplates.length} templates, ${mailOutbox.length} outbox items`,
        status:
          mailbox?.summary.configured && mailTemplates.length > 0
            ? "ready"
            : mailTemplates.length > 0
              ? "attention"
              : "missing",
        owner: "Communicatie",
        view: "mailbox",
        score: mailbox?.summary.configured
          ? 100
          : mailTemplates.length > 0
            ? 70
            : 20,
        priority: mailbox?.summary.configured ? "laag" : "hoog",
        nextStep:
          mailbox?.summary.nextStep ??
          "Richt Microsoft Graph in en gebruik templates voor klantmails.",
        actionLabel: "Open mailbox",
      },
      {
        label: "Bunq betalingen",
        detail: billing?.summary.bunqReady
          ? "API en rekening staan klaar"
          : "Betaalprovider-configuratie op de server ontbreekt nog",
        status: billing?.summary.bunqReady ? "ready" : "missing",
        owner: "Finance",
        view: "commerce",
        score: billing?.summary.bunqReady ? 100 : 20,
        priority: billing?.summary.bunqReady ? "laag" : "hoog",
        nextStep: billing?.summary.bunqReady
          ? "Koppel het eerste betaalverzoek aan een factuur zodra de commerciële flow gevuld is."
          : "De betaalprovider-configuratie op de server ontbreekt nog; die moet compleet zijn voordat betaalverzoeken live kunnen.",
        actionLabel: "Open betalingen",
      },
      {
        label: "Klantdossier",
        detail: `${dossierDocuments.length} dossierstukken, ${activityEvents.length} klantmomenten`,
        status:
          dossierDocuments.length > 0 || activityEvents.length > 0
            ? "ready"
            : "attention",
        owner: "Dossier",
        view: "pipeline",
        score: 100,
        priority:
          dossierDocuments.length > 0 || activityEvents.length > 0
            ? "laag"
            : "middel",
        nextStep:
          dossierDocuments.length > 0 || activityEvents.length > 0
            ? "Blijf klantmomenten en dossierstukken aan de juiste klant koppelen."
            : "Log per bestaande klant minimaal een klantmoment of dossierstuk als start van de audit trail.",
        actionLabel: "Open klantdossiers",
      },
      {
        label: "Governance",
        detail: `${recentDecisions.length} besluiten, ${openChanges.length} changes, ${openIncidents.length} incidenten`,
        status:
          recentDecisions.length > 0 ||
          openChanges.length > 0 ||
          openIncidents.length > 0
            ? "ready"
            : "attention",
        owner: "Operations",
        view: "operations",
        score: 100,
        priority:
          recentDecisions.length > 0 ||
          openChanges.length > 0 ||
          openIncidents.length > 0
            ? "laag"
            : "middel",
        nextStep:
          recentDecisions.length > 0 ||
          openChanges.length > 0 ||
          openIncidents.length > 0
            ? "Gebruik besluiten, changes en incidenten als vaste operationele historie."
            : "Leg de eerste beslissing, change of supportafspraak vast zodat beheer niet in losse notities blijft hangen.",
        actionLabel: "Open operations",
      },
      {
        label: "Documentbasis",
        detail: `${summary.documents}/${LAVENTECARE_DOCUMENT_TOTAL} templates geïndexeerd`,
        status:
          summary.documents >= LAVENTECARE_DOCUMENT_TOTAL
            ? "ready"
            : summary.documents > 0
              ? "attention"
              : "missing",
        owner: "Kennisbank",
        view: "knowledge",
        score:
          summary.documents >= LAVENTECARE_DOCUMENT_TOTAL
            ? 100
            : summary.documents > 0
              ? 70
              : 20,
        priority:
          summary.documents >= LAVENTECARE_DOCUMENT_TOTAL ? "laag" : "middel",
        nextStep:
          summary.documents >= LAVENTECARE_DOCUMENT_TOTAL
            ? "Documentbasis staat. Gebruik templates nu per klant, offerte en projectfase."
            : "Werk de documentbasis bij zodat alle templates beschikbaar zijn voor dossiers en PDF output.",
        actionLabel: "Open kennisbank",
      },
    ];
    // R3-11: koppel de volwassenheidsscore aan de status. Meerdere rijen hadden
    // hardcoded score 100 terwijl hun status "attention" ("Inrichten") kon zijn
    // — dat gaf "~84% volwassen" naast zeven "Inrichten"-badges. Een nog niet
    // ingerichte flow telt niet als 100% volwassen.
    return rows.map((row) => {
      if (row.status === "ready") return row;
      if (row.status === "attention" && row.score > 70) return { ...row, score: 65 };
      if (row.status === "missing" && row.score > 40) return { ...row, score: 20 };
      return row;
    });
  }, [
    activeLeads.length,
    activeProjects.length,
    activeWorkstreams.length,
    activityEvents.length,
    billing?.summary.bunqReady,
    billing?.summary.invoices,
    billing?.summary.quotes,
    billing?.summary.timeEntries,
    businessSignals.length,
    companies.length,
    contacts.length,
    dossierDocuments.length,
    invoices.length,
    mailOutbox.length,
    mailTemplates.length,
    mailbox?.summary.configured,
    mailbox?.summary.nextStep,
    openChanges.length,
    openIncidents.length,
    quotes.length,
    recentDecisions.length,
    summary.documents,
    timeEntries.length,
    totalWorkstreams,
  ]);

  const portalSections = useMemo<PortalSection[]>(
    () => [
      {
        id: "overview",
        label: "Overzicht",
        eyebrow: "Business cockpit",
        description: "Klantdossiers, operating model en snelle context.",
        count: `${companies.length + activeLeads.length + totalWorkstreams + activeProjects.length}`,
        icon: portalIcons.overview,
        tone: "sky",
      },
      {
        id: "pipeline",
        label: "Klanten & Delivery",
        eyebrow: "Pipeline",
        description: "Klantdossiers, leads, projecten en opdrachten in een werkstroom.",
        count: `${companies.length + activeLeads.length + totalWorkstreams + activeProjects.length}`,
        icon: portalIcons.pipeline,
        tone: "amber",
      },
      {
        id: "signals",
        label: "Signalen",
        eyebrow: "AI triage",
        description: "Nieuwe matches, open acties en follow-ups.",
        count: `${businessSignals.length + actionItems.length + followUps.length}`,
        icon: portalIcons.signals,
        tone: "violet",
      },
      {
        id: "commerce",
        label: "Commercie",
        eyebrow: "Offerte tot betaling",
        description: "Uren, offertes, facturen en Bunq betaalverzoeken.",
        count: `${quotes.length + timeEntries.length + invoices.length}`,
        icon: portalIcons.commerce,
        tone: "amber",
      },
      {
        id: "mailbox",
        label: "Mailbox",
        eyebrow: "Templates en outbox",
        description: "Zakelijke klantmails renderen, versturen en auditten.",
        count: `${mailTemplates.length + mailOutbox.length}`,
        icon: portalIcons.mailbox,
        tone: mailbox?.summary.configured ? "emerald" : "amber",
      },
      {
        id: "operations",
        label: "Operations",
        eyebrow: "Governance",
        description: "Besluiten, changes, SLA en supportsignalering.",
        count: `${recentDecisions.length + openChanges.length + openIncidents.length}`,
        icon: portalIcons.operations,
        tone: openIncidents.length > 0 ? "rose" : "slate",
      },
      {
        id: "knowledge",
        label: "Kennisbank",
        eyebrow: "Dossier & PDF",
        description: "Documenttemplates, zoeklaag en PDF dossierhistorie.",
        count: `${summary.documents}`,
        icon: portalIcons.knowledge,
        tone: "sky",
      },
    ],
    [
      actionItems.length,
      activeLeads.length,
      activeProjects.length,
      businessSignals.length,
      companies.length,
      followUps.length,
      invoices.length,
      mailOutbox.length,
      mailTemplates.length,
      mailbox?.summary.configured,
      openChanges.length,
      openIncidents.length,
      quotes.length,
      recentDecisions.length,
      summary.documents,
      timeEntries.length,
      totalWorkstreams,
    ],
  );

  const closeCompanyForm = () => {
    setShowCompanyForm(false);
    setEditingCompanyId(null);
    setCompanyForm(emptyCompanyForm);
  };

  const openNewCompanyForm = () => {
    setEditingCompanyId(null);
    setCompanyForm(emptyCompanyForm);
    setCompanyFormBaseline(JSON.stringify(emptyCompanyForm));
    setShowCompanyForm(true);
  };

  const handleToggleCompanyForm = () => {
    if (showCompanyForm) {
      closeCompanyForm();
      return;
    }
    openNewCompanyForm();
  };

  const handleEditCompany = (company: CompanyItem) => {
    setEditingCompanyId(company._id ?? company.id);
    const populated: CompanyForm = {
      naam: company.naam ?? "",
      website: company.website ?? "",
      sector: company.sector ?? "",
      status: normalizeCompanyStatus(company.status),
      relatieType: normalizeCompanyRelation(company.relatie_type),
      notities: company.notities ?? "",
      volgendeActie: company.volgende_actie ?? company.volgendeActie ?? "",
      kvkNumber: company.kvk_number ?? "",
      vatNumber: company.vat_number ?? "",
      billingEmail: company.billing_email ?? "",
      billingAddress: company.billing_address ?? "",
      billingReference: company.billing_reference ?? "",
      paymentTermsDays: company.payment_terms_days ?? 14,
      contractStatus: company.contract_status ?? "geen_contract",
      serviceLevel: company.service_level ?? "basis",
      preferredChannel: company.preferred_channel ?? "",
      portalUrl: company.portal_url ?? "",
      defaultLoginUrl: company.default_login_url ?? "",
      onboardingStatus: company.onboarding_status ?? "niet_gestart",
      dataProcessingStatus: company.data_processing_status ?? "niet_nodig",
    };
    setCompanyForm(populated);
    setCompanyFormBaseline(JSON.stringify(populated));
    setShowCompanyForm(true);
  };

  const handleCompanySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!companyForm.naam.trim()) {
      toastError("Geef de klant een naam");
      return;
    }

    setSavingCompany(true);
    try {
      const payload = {
        naam: companyForm.naam.trim(),
        website: optional(companyForm.website),
        sector: optional(companyForm.sector),
        status: companyForm.status,
        relatie_type: companyForm.relatieType,
        notities: optional(companyForm.notities),
        volgende_actie: optional(companyForm.volgendeActie),
        kvk_number: optional(companyForm.kvkNumber),
        vat_number: optional(companyForm.vatNumber),
        billing_email: optional(companyForm.billingEmail),
        billing_address: optional(companyForm.billingAddress),
        billing_reference: optional(companyForm.billingReference),
        payment_terms_days:
          typeof companyForm.paymentTermsDays === "number"
            ? companyForm.paymentTermsDays
            : undefined,
        contract_status: companyForm.contractStatus,
        service_level: companyForm.serviceLevel,
        preferred_channel: optional(companyForm.preferredChannel),
        portal_url: optional(companyForm.portalUrl),
        default_login_url: optional(companyForm.defaultLoginUrl),
        onboarding_status: companyForm.onboardingStatus,
        data_processing_status: companyForm.dataProcessingStatus,
      };
      if (editingCompanyId) {
        await updateCompanyMut.mutateAsync({
          id: editingCompanyId,
          ...payload,
        });
        success("LaventeCare klant bijgewerkt");
      } else {
        await createCompanyMut.mutateAsync(payload);
        success("LaventeCare klant aangemaakt");
      }
      closeCompanyForm();
    } catch {
      toastError(
        editingCompanyId
          ? "Klant bijwerken is mislukt"
          : "Klant aanmaken is mislukt",
      );
    } finally {
      setSavingCompany(false);
    }
  };

  const closeContactForm = () => {
    setShowContactForm(false);
    setEditingContactId(null);
    setContactForm(emptyContactForm);
  };

  const handleAddContact = (company: CompanyItem) => {
    const id = company._id ?? company.id;
    const companyContacts = contacts.filter(
      (contact) => contact.company_id === id,
    );
    setEditingContactId(null);
    const prefilled = {
      ...emptyContactForm,
      companyId: id,
      isPrimary: companyContacts.length === 0,
    };
    setContactForm(prefilled);
    setContactFormBaseline(JSON.stringify(prefilled));
    setShowContactForm(true);
  };

  const handleEditContact = (contact: ContactItem) => {
    setEditingContactId(contact._id ?? contact.id);
    const populated: ContactForm = {
      companyId: contact.company_id ?? contact.companyId ?? "",
      naam: contact.naam ?? "",
      email: contact.email ?? "",
      telefoon: contact.telefoon ?? "",
      rol: contact.rol ?? "",
      isPrimary: contact.is_primary ?? contact.isPrimary ?? false,
      notities: contact.notities ?? "",
      preferredChannel: contact.preferred_channel ?? "",
      decisionRole: contact.decision_role ?? "",
    };
    setContactForm(populated);
    setContactFormBaseline(JSON.stringify(populated));
    setShowContactForm(true);
  };

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contactForm.companyId) {
      toastError("Koppel de contactpersoon aan een klant");
      return;
    }
    if (!contactForm.naam.trim()) {
      toastError("Geef de contactpersoon een naam");
      return;
    }

    setSavingContact(true);
    try {
      const payload = {
        company_id: contactForm.companyId,
        naam: contactForm.naam.trim(),
        email: optional(contactForm.email),
        telefoon: optional(contactForm.telefoon),
        rol: optional(contactForm.rol),
        is_primary: contactForm.isPrimary,
        notities: optional(contactForm.notities),
        preferred_channel: optional(contactForm.preferredChannel),
        decision_role: optional(contactForm.decisionRole),
      };
      if (editingContactId) {
        await updateContactMut.mutateAsync({
          id: editingContactId,
          ...payload,
        });
        success("Contactpersoon bijgewerkt");
      } else {
        await createContactMut.mutateAsync(payload);
        success("Contactpersoon toegevoegd");
      }
      closeContactForm();
    } catch {
      toastError(
        editingContactId
          ? "Contactpersoon bijwerken is mislukt"
          : "Contactpersoon toevoegen is mislukt",
      );
    } finally {
      setSavingContact(false);
    }
  };

  const handleCreateAccessCredential = async (payload: {
    company_id: string;
    contact_id?: string;
    project_id?: string;
    workstream_id?: string;
    title: string;
    login_url?: string;
    username?: string;
    role?: string;
    environment?: string;
    status?: string;
    owner_contact?: string;
    secret_label?: string;
    secret_value?: string;
    secret_hint?: string;
    sharing_policy?: string;
    last_checked_at?: string;
    expires_at?: string;
    notes?: string;
  }) => {
    setSavingAccessCredential(true);
    try {
      await createAccessCredentialMut.mutateAsync(payload);
      success("Toegang vastgelegd in klantdossier");
    } catch {
      toastError("Toegang vastleggen is mislukt. Controleer of de secret key op de backend staat als je een wachtwoord invult.");
      // M-C: rethrow zodat het formulier zichzelf NIET reset en de invoer
      // behouden blijft.
      throw new Error("Toegang vastleggen is mislukt");
    } finally {
      setSavingAccessCredential(false);
    }
  };

  const handleUpdateAccessCredential = async (
    id: string,
    data: { status?: string; secret_label?: string; secret_hint?: string; notes?: string },
  ) => {
    setUpdatingAccessCredentialId(id);
    try {
      await updateAccessCredentialMut.mutateAsync({ id, ...data });
      success("Toegang bijgewerkt");
    } catch {
      toastError("Toegang bijwerken is mislukt");
    } finally {
      setUpdatingAccessCredentialId(null);
    }
  };

  const handleLeadSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!leadForm.titel.trim()) {
      toastError("Geef de lead een titel");
      return;
    }

    setSavingLead(true);
    try {
      await createLeadMut.mutateAsync({
        titel: leadForm.titel.trim(),
        company_id: optional(leadForm.companyId),
        contact_id: optional(leadForm.contactId),
        company_name: leadForm.companyId
          ? undefined
          : optional(leadForm.companyName),
        website: leadForm.companyId ? undefined : optional(leadForm.website),
        pijnpunt: optional(leadForm.pijnpunt),
        volgende_stap: optional(leadForm.volgendeStap),
        prioriteit: leadForm.prioriteit,
        bron: "cockpit",
      });
      setLeadForm(emptyLeadForm);
      setShowLeadForm(false);
      success("LaventeCare lead aangemaakt");
    } catch {
      toastError("Lead aanmaken is mislukt");
    } finally {
      setSavingLead(false);
    }
  };

  const handleProjectSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectForm.naam.trim()) {
      toastError("Geef het project een naam");
      return;
    }

    setSavingProject(true);
    try {
      await createProjectMut.mutateAsync({
        naam: projectForm.naam.trim(),
        company_id: optional(projectForm.companyId),
        company_name: projectForm.companyId
          ? undefined
          : optional(projectForm.companyName),
        website: projectForm.companyId
          ? undefined
          : optional(projectForm.website),
        fase: projectForm.fase,
        status: projectForm.status,
        waarde_indicatie:
          projectForm.waardeIndicatie === ""
            ? undefined
            : Number(projectForm.waardeIndicatie),
        start_datum: undefined, // Misschien later toevoegen
        deadline: optional(projectForm.deadline),
        samenvatting: optional(projectForm.samenvatting),
      });
      setProjectForm(emptyProjectForm);
      setShowProjectForm(false);
      success("LaventeCare project direct toegevoegd");
    } catch {
      toastError("Project aanmaken is mislukt");
    } finally {
      setSavingProject(false);
    }
  };

  const handleWorkstreamSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workstreamForm.titel.trim()) {
      toastError("Geef de opdracht een titel");
      return;
    }

    setSavingWorkstream(true);
    try {
      await createWorkstreamMut.mutateAsync({
        titel: workstreamForm.titel.trim(),
        company_id: optional(workstreamForm.companyId),
        project_id: optional(workstreamForm.projectId),
        type: workstreamForm.type,
        status: workstreamForm.status,
        prioriteit: workstreamForm.prioriteit,
        klant_naam: optional(workstreamForm.klantNaam),
        doel: optional(workstreamForm.doel),
        scope: optional(workstreamForm.scope),
        deliverable: optional(workstreamForm.deliverable),
        bevindingen: optional(workstreamForm.bevindingen),
        volgende_stap: optional(workstreamForm.volgendeStap),
        deadline: optional(workstreamForm.deadline),
        geschatte_minuten:
          workstreamForm.geschatteMinuten === ""
            ? undefined
            : Number(workstreamForm.geschatteMinuten),
        waarde_indicatie:
          workstreamForm.waardeIndicatie === ""
            ? undefined
            : Number(workstreamForm.waardeIndicatie),
        stack_tags: parseTagInput(workstreamForm.stackTags),
        tags: parseTagInput(workstreamForm.tags),
        bron: "cockpit",
      });
      setWorkstreamForm(emptyWorkstreamForm);
      setWorkstreamFormBaseline(JSON.stringify(emptyWorkstreamForm));
      setShowWorkstreamForm(false);
      success("LaventeCare opdracht toegevoegd");
    } catch {
      toastError("Opdracht aanmaken is mislukt");
    } finally {
      setSavingWorkstream(false);
    }
  };

  const handleSeedDocuments = async () => {
    setSeeding(true);
    try {
      const result = await seedDocumentsMut.mutateAsync(
        toLaventeCareSeedDocuments(),
      );
      success(`Documentbasis bijgewerkt: ${result.total} documenten`);
    } catch {
      toastError("Documentbasis initialiseren is mislukt");
    } finally {
      setSeeding(false);
    }
  };

  const signalKey = (kind: "action" | "lead", signal: BusinessSignal) =>
    `${kind}:${signal.source}:${signal.id}`;

  const handleCreateActionFromSignal = async (signal: BusinessSignal) => {
    setProcessingSignal(signalKey("action", signal));
    try {
      await createActionMut.mutateAsync({
        source: signal.source,
        source_id: signal.id,
        title: signal.title,
        summary: [
          signal.subtitle,
          signal.actionHint,
          `Match: ${signal.matchedTerm}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
        action_type: "opvolgen",
        priority: signal.urgency === "hoog" ? "hoog" : "normaal",
        due_date: signal.date,
      });
      success("LaventeCare actie klaargezet");
    } catch {
      toastError("Actie aanmaken is mislukt");
    } finally {
      setProcessingSignal(null);
    }
  };

  const handleConvertSignalToLead = async (signal: BusinessSignal) => {
    setProcessingSignal(signalKey("lead", signal));
    try {
      const result = await convertSignalMut.mutateAsync({
        source: signal.source,
        source_id: signal.id,
        title: signal.title,
        subtitle: signal.subtitle,
        date: signal.date,
        matched_term: signal.matchedTerm,
        urgency: signal.urgency,
        action_hint: signal.actionHint,
      });
      success(
        result.reused
          ? "Bestaande lead opnieuw gekoppeld"
          : "Signaal omgezet naar lead",
      );
    } catch {
      toastError("Lead maken vanuit signaal is mislukt");
    } finally {
      setProcessingSignal(null);
    }
  };

  const handleCompleteAction = async (action: ActionItem) => {
    setProcessingAction(action._id);
    try {
      await updateActionStatusMut.mutateAsync({
        id: action._id,
        status: "afgerond",
      });
      success("LaventeCare actie afgerond");
    } catch {
      toastError("Actie afronden is mislukt");
    } finally {
      setProcessingAction(null);
    }
  };

  const leadClosingStatuses: Record<string, string> = {
    verloren: "Lead sluiten als verloren? Dit verwijdert de lead uit de actieve funnel en kan nergens in de UI meer teruggedraaid worden.",
    gediskwalificeerd: "Lead sluiten als niet-fit? Dit verwijdert de lead uit de actieve funnel en kan nergens in de UI meer teruggedraaid worden.",
  };

  const handleLeadStatus = async (lead: LeadItem, status: string) => {
    if (!lead._id) return;
    const confirmMessage = leadClosingStatuses[status];
    if (confirmMessage) {
      const confirmed = await openConfirm({
        title: "Lead sluiten",
        message: confirmMessage,
        confirmLabel: "Sluiten",
        variant: "danger",
      });
      if (!confirmed) return;
    }
    setProcessingLead(`${lead._id}:${status}`);
    try {
      await updateLeadMut.mutateAsync({ id: lead._id, status });
      success(`Lead naar ${label(status)} gezet`);
    } catch {
      toastError("Lead bijwerken is mislukt");
    } finally {
      setProcessingLead(null);
    }
  };

  const handleLeadToProject = async (lead: LeadItem) => {
    if (!lead._id) return;
    setProcessingLead(`${lead._id}:project`);
    try {
      await convertLeadMut.mutateAsync({
        id: lead._id,
        naam: lead.titel,
        fase: "intake",
        status: "actief",
        samenvatting: lead.pijnpunt ?? undefined,
      });
      success("Lead omgezet naar project");
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : "Lead converteren is mislukt");
    } finally {
      setProcessingLead(null);
    }
  };

  const handleProjectStatus = async (
    project: ProjectItem,
    fields: { fase?: string; status?: string },
  ) => {
    if (!project._id) return;
    const key = fields.fase ? `fase:${fields.fase}` : `status:${fields.status}`;
    setProcessingProject(`${project._id}:${key}`);
    try {
      await updateProjectMut.mutateAsync({ id: project._id, ...fields });
      success("Project bijgewerkt");
    } catch {
      toastError("Project bijwerken is mislukt");
    } finally {
      setProcessingProject(null);
    }
  };

  const handleWorkstreamStatus = async (
    workstream: WorkstreamItem,
    fields: { status?: string },
  ) => {
    const id = workstream._id ?? workstream.id;
    if (!id) return;
    const key = `status:${fields.status}`;
    setProcessingWorkstream(`${id}:${key}`);
    try {
      await updateWorkstreamMut.mutateAsync({ id, ...fields });
      success("Opdracht bijgewerkt");
    } catch {
      toastError("Opdracht bijwerken is mislukt");
    } finally {
      setProcessingWorkstream(null);
    }
  };

  const handleWorkstreamToProject = async (workstream: WorkstreamItem) => {
    const id = workstream._id ?? workstream.id;
    if (!id) return;
    setProcessingWorkstream(`${id}:project`);
    try {
      await convertWorkstreamMut.mutateAsync({
        id,
        project_id: workstream.project_id ?? undefined,
        naam: workstream.titel,
        fase: "intake",
        status: "actief",
        samenvatting:
          [workstream.doel, workstream.scope, workstream.bevindingen]
            .filter(Boolean)
            .join("\n\n") || undefined,
      });
      success("Opdracht omgezet naar project");
    } catch {
      toastError("Opdracht converteren is mislukt");
    } finally {
      setProcessingWorkstream(null);
    }
  };

  const handleStartWorkstreamForCompany = (company: CompanyItem) => {
    const id = company._id ?? company.id;
    const prefilled = {
      ...emptyWorkstreamForm,
      companyId: id,
      projectId: "",
      klantNaam: company.naam,
      titel: `${company.naam}: opdracht`,
    };
    setWorkstreamForm(prefilled);
    // The prefill itself is not "dirty": closing without extra typing may
    // discard it silently.
    setWorkstreamFormBaseline(JSON.stringify(prefilled));
    setShowWorkstreamForm(true);
  };

  // Unified close-reset semantics (M3): closing a create-modal always drops
  // the draft, so a later open never resurfaces stale input. The dirty-guard
  // in Modal asks for confirmation first when there is typed input.
  const closeLeadForm = () => {
    setShowLeadForm(false);
    setLeadForm(emptyLeadForm);
  };

  const closeProjectForm = () => {
    setShowProjectForm(false);
    setProjectForm(emptyProjectForm);
  };

  const closeWorkstreamForm = () => {
    setShowWorkstreamForm(false);
    setWorkstreamForm(emptyWorkstreamForm);
    setWorkstreamFormBaseline(JSON.stringify(emptyWorkstreamForm));
  };

  const handleLogDossierDocument = async (
    payload: LaventeCareDossierDocumentLogPayload,
  ) => {
    setLoggingDocumentKey(payload.documentKey);
    try {
      await createDossierDocumentMut.mutateAsync({
        document_key: payload.documentKey,
        titel: payload.title,
        template_label: payload.templateLabel,
        context_type: payload.context.kind,
        context_id: payload.context.id,
        context_title: payload.context.title,
        lead_id:
          payload.context.kind === "lead" ? payload.context.id : undefined,
        workstream_id:
          payload.context.kind === "workstream"
            ? payload.context.id
            : undefined,
        project_id:
          payload.context.kind === "project" ? payload.context.id : undefined,
        company_id:
          payload.context.kind === "company" ? payload.context.id : undefined,
        pdf_url: payload.pdfUrl,
        theme: payload.theme,
        delivery: payload.delivery,
        notes: payload.context.nextStep
          ? `Volgende stap: ${payload.context.nextStep}`
          : undefined,
      });
      success("PDF vastgelegd in LaventeCare dossier");
    } catch {
      toastError("PDF vastleggen is mislukt");
    } finally {
      setLoggingDocumentKey(null);
    }
  };

  const handleCreateActivityEvent = async (
    payload: Parameters<typeof createActivityEventMut.mutateAsync>[0] & {
      follow_up?: {
        title: string;
        due_date?: string;
        due_time?: string;
        priority: string;
      };
    },
  ) => {
    const { follow_up: followUp, ...activityPayload } = payload;
    try {
      let actionItemId: string | undefined;
      if (followUp && followUp.title.trim()) {
        const action = await createActionMut.mutateAsync({
          source: "handmatig",
          title: followUp.title.trim(),
          action_type: "opvolgen",
          priority: followUp.priority || "normaal",
          due_date: followUp.due_date || undefined,
          due_time: followUp.due_time || undefined,
          linked_company_id: activityPayload.company_id,
          linked_project_id: activityPayload.project_id,
          linked_workstream_id: activityPayload.workstream_id,
        });
        actionItemId = action.id;
      }
      await createActivityEventMut.mutateAsync({
        ...activityPayload,
        action_item_id: actionItemId ?? activityPayload.action_item_id,
      });
      success(followUp ? "Klantmoment + vervolgactie vastgelegd" : "Klantmoment vastgelegd");
    } catch {
      toastError("Klantmoment vastleggen is mislukt");
      throw new Error("Klantmoment vastleggen is mislukt");
    }
  };

  // M-C: deze drie handlers rethrowen bij een fout, zodat de formulieren in
  // OperationsView alleen na een geslaagde save resetten en mislukte invoer
  // behouden blijft.
  const handleCreateDecision = async (
    payload: Parameters<typeof createDecisionMut.mutateAsync>[0],
  ) => {
    try {
      await createDecisionMut.mutateAsync(payload);
      success("Besluit vastgelegd in LaventeCare");
    } catch {
      toastError("Besluit vastleggen is mislukt");
      throw new Error("Besluit vastleggen is mislukt");
    }
  };

  const handleCreateChangeRequest = async (
    payload: Parameters<typeof createChangeRequestMut.mutateAsync>[0],
  ) => {
    try {
      await createChangeRequestMut.mutateAsync(payload);
      success("Change request aangemaakt");
    } catch {
      toastError("Change request aanmaken is mislukt");
      throw new Error("Change request aanmaken is mislukt");
    }
  };

  const handleCreateSlaIncident = async (
    payload: Parameters<typeof createSlaIncidentMut.mutateAsync>[0],
  ) => {
    try {
      await createSlaIncidentMut.mutateAsync(payload);
      success("SLA-incident geregistreerd");
    } catch {
      toastError("SLA-incident registreren is mislukt");
      throw new Error("SLA-incident registreren is mislukt");
    }
  };

  const handleUpdateDecisionStatus = async (id: string, status: string) => {
    const key = `decision:${id}:${status}`;
    setProcessingOperation(key);
    try {
      await updateDecisionStatusMut.mutateAsync({ id, status });
      success("Besluitstatus bijgewerkt");
    } catch {
      toastError("Besluitstatus bijwerken is mislukt");
    } finally {
      setProcessingOperation(null);
    }
  };

  const handleUpdateChangeStatus = async (id: string, status: string) => {
    const key = `change:${id}:${status}`;
    setProcessingOperation(key);
    try {
      await updateChangeRequestStatusMut.mutateAsync({ id, status });
      success("Change bijgewerkt");
    } catch {
      toastError("Change bijwerken is mislukt");
    } finally {
      setProcessingOperation(null);
    }
  };

  const handleUpdateIncidentStatus = async (id: string, status: string) => {
    const key = `incident:${id}:${status}`;
    setProcessingOperation(key);
    try {
      await updateSlaIncidentStatusMut.mutateAsync({ id, status });
      success("Incident bijgewerkt");
    } catch {
      toastError("Incident bijwerken is mislukt");
    } finally {
      setProcessingOperation(null);
    }
  };

  const handleCreateQuote = async (
    payload: Parameters<typeof createQuoteMut.mutateAsync>[0],
  ) => {
    try {
      await createQuoteMut.mutateAsync(payload);
    } catch {
      toastError("Offerte aanmaken is mislukt");
      throw new Error("Offerte aanmaken is mislukt");
    }
  };

  const handleCreateTimeEntry = async (
    payload: Parameters<typeof createTimeEntryMut.mutateAsync>[0],
  ) => {
    try {
      await createTimeEntryMut.mutateAsync(payload);
    } catch {
      toastError("Urenregel opslaan is mislukt");
      throw new Error("Urenregel opslaan is mislukt");
    }
  };

  // ── N10: urenregels bewerken, afschrijven, heropenen en verwijderen ──────
  const timeEntryConflictMessage =
    "Deze urenregel staat al op een factuur en kan niet meer worden aangepast of verwijderd.";

  const handleUpdateTimeEntry = async (
    id: string,
    data: { omschrijving?: string; minuten?: number; status?: "open" | "afgeschreven" },
    successMessage = "Urenregel bijgewerkt",
  ) => {
    setProcessingTimeEntryId(id);
    try {
      await updateTimeEntryMut.mutateAsync({ id, ...data });
      success(successMessage);
    } catch (err) {
      toastError(
        err instanceof ApiError && err.status === 409
          ? timeEntryConflictMessage
          : "Urenregel bijwerken is mislukt",
      );
      throw err;
    } finally {
      setProcessingTimeEntryId(null);
    }
  };

  const handleEditTimeEntry = (
    id: string,
    data: { omschrijving?: string; minuten?: number },
  ) => handleUpdateTimeEntry(id, data);

  const handleWriteOffTimeEntry = async (entry: {
    id: string;
    description: string;
    minutes: number;
  }) => {
    const confirmed = await openConfirm({
      title: "Uren afschrijven",
      message: `"${entry.description}" (${entry.minutes} min) afschrijven? De regel telt dan niet meer mee als niet-gefactureerd en verdwijnt uit de factuurselectie.`,
      confirmLabel: "Afschrijven",
    });
    if (!confirmed) return;
    try {
      await handleUpdateTimeEntry(entry.id, { status: "afgeschreven" }, "Urenregel afgeschreven");
    } catch {
      // Toast is al getoond.
    }
  };

  const handleReopenTimeEntry = async (entry: { id: string }) => {
    try {
      await handleUpdateTimeEntry(entry.id, { status: "open" }, "Urenregel heropend");
    } catch {
      // Toast is al getoond.
    }
  };

  const handleDeleteTimeEntry = async (entry: {
    id: string;
    description: string;
    minutes: number;
  }) => {
    const confirmed = await openConfirm({
      title: "Urenregel verwijderen",
      message: `"${entry.description}" (${entry.minutes} min) definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`,
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!confirmed) return;
    setProcessingTimeEntryId(entry.id);
    try {
      await deleteTimeEntryMut.mutateAsync(entry.id);
      success("Urenregel verwijderd");
    } catch (err) {
      toastError(
        err instanceof ApiError && err.status === 409
          ? timeEntryConflictMessage
          : "Urenregel verwijderen is mislukt",
      );
    } finally {
      setProcessingTimeEntryId(null);
    }
  };

  const handleCreateInvoice = async (
    payload: Parameters<typeof createInvoiceMut.mutateAsync>[0],
  ) => {
    try {
      await createInvoiceMut.mutateAsync(payload);
    } catch {
      toastError("Factuur aanmaken is mislukt");
      throw new Error("Factuur aanmaken is mislukt");
    }
  };

  const handleCreateInvoiceFromQuote = async (id: string) => {
    setCreatingInvoiceFromQuoteId(id);
    try {
      await createInvoiceFromQuoteMut.mutateAsync(id);
      success("Factuurconcept vanuit offerte aangemaakt");
    } catch {
      toastError("Offerte factureren is mislukt");
    } finally {
      setCreatingInvoiceFromQuoteId(null);
    }
  };

  const handleUpdateQuoteStatus = async (id: string, status: string) => {
    // Money-status safety (M20): accepting a quote is a commercial commitment
    // and unlocks invoicing — confirm before flipping.
    if (status === "geaccepteerd") {
      const quote = quotes.find((item) => item.id === id);
      const confirmed = await openConfirm({
        title: "Offerte op akkoord zetten",
        message: `Offerte ${quote?.quote_number ?? ""} als geaccepteerd markeren? Daarna kan er een factuur uit worden gemaakt.`,
        confirmLabel: "Akkoord",
      });
      if (!confirmed) return;
    }
    setUpdatingQuoteId(id);
    try {
      await updateQuoteStatusMut.mutateAsync({ id, status });
      success("Offertestatus bijgewerkt");
    } catch {
      toastError("Offertestatus bijwerken is mislukt");
    } finally {
      setUpdatingQuoteId(null);
    }
  };

  const handleUpdateInvoiceStatus = async (id: string, status: string) => {
    // Money-status safety (M20): "betaald" is effectively irreversible in de
    // UI — confirm before flipping.
    if (status === "betaald") {
      const invoice = invoices.find((item) => item.id === id);
      const confirmed = await openConfirm({
        title: "Factuur als betaald markeren",
        message: `Factuur ${invoice?.invoice_number ?? ""} als betaald markeren? Dit sluit de factuur af en kan in de UI niet worden teruggedraaid.`,
        confirmLabel: "Betaald",
        variant: "danger",
      });
      if (!confirmed) return;
    }
    setUpdatingInvoiceId(id);
    try {
      await updateInvoiceStatusMut.mutateAsync({ id, status });
      success("Factuurstatus bijgewerkt");
    } catch {
      toastError("Factuurstatus bijwerken is mislukt");
    } finally {
      setUpdatingInvoiceId(null);
    }
  };

  const handleCreateInvoicePaymentRequest = async (id: string) => {
    setRequestingPaymentInvoiceId(id);
    try {
      const result = await createInvoicePaymentRequestMut.mutateAsync(id);
      if (result.confirmationRequired) {
        // R3-H6: de backend geeft een expliciete vervolgstap mee ("Bevestig via
        // Settings of Telegram met /approve X"). Bewaar die persistent op de
        // factuurrij i.p.v. hem in een wegtikkende toast te laten verdwijnen.
        setPendingPaymentActions((current) => ({
          ...current,
          [id]: {
            message:
              result.message ||
              (result.code
                ? `Betaalverzoek staat klaar. Bevestig met code ${result.code} via Settings of Telegram (/approve ${result.code}).`
                : "Betaalverzoek staat klaar voor bevestiging via Settings of Telegram."),
            code: result.code,
            pendingActionId: result.pendingActionId,
          },
        }));
        success(result.message || "Betaalverzoek staat klaar voor bevestiging");
      } else if (result.alreadyCreated) {
        success("Deze factuur heeft al een gekoppeld betaalverzoek");
      } else {
        // Verwerkt zonder bevestiging: een eventuele oude melding kan weg.
        setPendingPaymentActions((current) => {
          if (!current[id]) return current;
          const next = { ...current };
          delete next[id];
          return next;
        });
        success(result.message || "Betaalverzoek verwerkt");
      }
    } catch {
      toastError("Betaalverzoek klaarzetten is mislukt");
    } finally {
      setRequestingPaymentInvoiceId(null);
    }
  };

  const dismissPendingPaymentAction = useCallback((id: string) => {
    setPendingPaymentActions((current) => {
      if (!current[id]) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  // R3-maandafsluiting: dossier→Commercie met de klant voorgeselecteerd.
  const handleOpenCommerceForCompany = async (company: CompanyItem) => {
    const switched = await handleChangeView("commerce");
    if (!switched) return;
    setCommercePrefillCompanyId(company._id ?? company.id);
    setSelectedCompanyId(null);
  };

  // R3-maandafsluiting: prefill een herinneringsmail voor een te-late factuur.
  const handleSendInvoiceReminder = async (id: string) => {
    const switched = await handleChangeView("mailbox");
    if (!switched) return;
    setMailboxInvoiceId(id);
    setMailboxIntent("reminder");
    success("Factuur klaargezet in Mailbox — kies de herinneringstemplate");
  };

  const handleOpenInvoiceDocument = async (id: string) => {
    // M19: open the tab SYNCHRONOUSLY in the click handler (popup blockers
    // only allow window.open during a user gesture), show a placeholder, and
    // navigate/fill it once the document is generated.
    const preview = window.open("", "_blank");
    if (!preview) {
      toastError("Factuurpreview kon niet worden geopend. Sta pop-ups toe voor deze site.");
      return;
    }
    preview.document.open();
    preview.document.write(
      "<!doctype html><html lang=\"nl\"><head><meta charset=\"utf-8\"><title>Factuurdocument</title></head>" +
        "<body style=\"margin:0;display:grid;place-items:center;min-height:100vh;background:#0f172a;color:#e2e8f0;font-family:system-ui,sans-serif\">" +
        "<p>Factuurdocument genereren…</p></body></html>",
    );
    preview.document.close();
    setGeneratingInvoiceDocumentId(id);
    try {
      const result = await generateInvoiceDocumentMut.mutateAsync(id);
      if (preview.closed) {
        toastError("Factuurpreview is gesloten voordat het document klaar was");
        return;
      }
      preview.document.open();
      preview.document.write(result.html);
      preview.document.close();
      success("Factuurdocument geopend");
    } catch {
      if (!preview.closed) preview.close();
      toastError("Factuurdocument genereren is mislukt");
    } finally {
      setGeneratingInvoiceDocumentId(null);
    }
  };

  const handleDownloadInvoiceUBL = async (id: string) => {
    setDownloadingInvoiceUBLId(id);
    try {
      const result = await generateInvoiceDocumentMut.mutateAsync(id);
      const filename = result.download_name.replace(/\.html$/i, ".xml");
      const blob = new Blob([result.ubl_xml], {
        type: "application/xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      success("UBL export gedownload");
    } catch {
      toastError("UBL export maken is mislukt");
    } finally {
      setDownloadingInvoiceUBLId(null);
    }
  };

  const handleRefreshInvoicePayment = async (id: string) => {
    setRefreshingPaymentInvoiceId(id);
    try {
      const result = await refreshInvoicePaymentMut.mutateAsync(id);
      success(result.message || "Betaalstatus bijgewerkt");
    } catch {
      toastError("Betaalstatus controleren is mislukt");
    } finally {
      setRefreshingPaymentInvoiceId(null);
    }
  };

  const handleOpenMailboxForInvoice = async (id: string) => {
    // M-D: dezelfde dirty-guard als een gewone tabwissel.
    const switched = await handleChangeView("mailbox");
    if (!switched) return;
    setMailboxInvoiceId(id);
    setMailboxIntent(null);
    success("Factuur klaargezet in Mailbox");
  };

  // Throws on failure so the mailbox composer only resets itself after a
  // genuinely successful send (M7).
  const handleSendTemplatedMail = async (
    payload: Parameters<typeof sendTemplatedMailMut.mutateAsync>[0],
  ) => {
    try {
      const result = await sendTemplatedMailMut.mutateAsync(payload);
      if (result.status === "sent") {
        success("LaventeCare mail verzonden en vastgelegd");
        // Don't keep the invoice prefilled for the next composer visit.
        setMailboxInvoiceId("");
        // Diff L-7: het "Verzonden"-signaal leeft op de pagina zodat het de
        // key-remount van de mailbox-view overleeft.
        setMailJustSent(true);
        if (mailJustSentTimer.current !== null) {
          window.clearTimeout(mailJustSentTimer.current);
        }
        mailJustSentTimer.current = window.setTimeout(
          () => setMailJustSent(false),
          5000,
        );
      } else if (result.status === "failed") {
        toastError(result.error_message || "Mail versturen is mislukt");
        throw new Error("Mail versturen is mislukt");
      } else {
        success("Mailconcept aangemaakt in de outbox");
      }
    } catch (err) {
      if (!(err instanceof Error && err.message === "Mail versturen is mislukt")) {
        toastError(
          payload.send
            ? "Mail versturen is mislukt"
            : "Mailconcept aanmaken is mislukt",
        );
      }
      throw err;
    }
  };

  const handleSyncInbox = async () => {
    try {
      const result = await syncInbox();
      if (result.ok) {
        setInboundBlocked(false);
        success(result.synced > 0 ? `${result.synced} inkomende mail(s) opgehaald` : "Inbox is up-to-date");
      } else {
        setInboundBlocked(true);
        toastError(result.reason ?? "Inbox-sync is niet beschikbaar");
      }
    } catch {
      toastError("Inbox synchroniseren is mislukt");
    }
  };

  // Leaving the Mailbox tab drops the invoice prefill so a later visit
  // doesn't silently re-couple an old invoice to a new mail (M7).
  // M-D: een tabwissel weg van een half ingevuld commerce-/mailformulier
  // vraagt eerst om bevestiging — de views unmounten bij het wisselen en de
  // invoer zou anders stil verdwijnen. Retourneert of de wissel doorging.
  const handleChangeView = async (view: PortalView): Promise<boolean> => {
    if (view === activeView) return true;
    const leavingDirty =
      (activeView === "commerce" && commerceDirtyRef.current) ||
      (activeView === "mailbox" && mailboxDirtyRef.current);
    if (leavingDirty) {
      const confirmed = await openConfirm({
        title: "Wijzigingen verwerpen?",
        message:
          activeView === "commerce"
            ? "Het commercie-formulier bevat niet-opgeslagen invoer die bij het wisselen verloren gaat."
            : "De mail-opsteller bevat niet-verzonden invoer die bij het wisselen verloren gaat.",
        confirmLabel: "Verwerpen",
        variant: "danger",
      });
      if (!confirmed) return false;
    }
    if (activeView === "mailbox" && view !== "mailbox") {
      setMailboxInvoiceId("");
      setMailboxIntent(null);
    }
    commerceDirtyRef.current = false;
    mailboxDirtyRef.current = false;
    setActiveView(view);
    return true;
  };

  const handleSuggestMailContent = async (
    payload: Parameters<typeof suggestMailContentMut.mutateAsync>[0],
  ) => {
    try {
      const suggestion = await suggestMailContentMut.mutateAsync(payload);
      success("AI-context in de template gezet");
      return suggestion;
    } catch {
      toastError("AI-context ophalen is mislukt");
      throw new Error("AI-context ophalen is mislukt");
    }
  };

  // FH5: a failed cockpit fetch must never look like an empty CRM. Show a
  // prominent error with retry instead of "Nog geen klantenbasis" + 0-tellers.
  // R7: alleen als er ook geen (gecachte) data is — een mislukte background-
  // refetch mag een werkende CRM niet vervangen door een foutscherm; dan
  // volstaat de amber banner hieronder.
  if (cockpitError && !cockpitLoading && !cockpit) {
    return (
      <div className="text-slate-100">
        <main className="mx-auto max-w-[1600px] px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-xl">
            <ErrorState
              title="LaventeCare kon niet laden"
              text="De cockpitgegevens zijn niet opgehaald. Je klanten, leads en projecten bestaan nog steeds — dit is een verbindings- of serverprobleem, geen lege klantenbasis."
              onRetry={() => {
                void refetchCockpit();
              }}
            />
          </div>
        </main>
      </div>
    );
  }

  if (cockpitLoading && !cockpit) {
    // Skeleton mirrors the real layout (full-width hero + max-w-[1600px] main +
    // a tall workspace) so the page doesn't jump when cockpit data resolves.
    return (
      <div className="text-slate-100" aria-busy="true">
        <div className="h-44 w-full animate-pulse border-b border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] sm:h-48" />
        <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7">
          <div className="h-11 w-full max-w-md animate-pulse rounded-xl glass" />
          <div className="grid gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse rounded-2xl glass" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="min-h-[50vh] animate-pulse rounded-2xl glass" />
            <div className="hidden min-h-[50vh] animate-pulse rounded-2xl glass lg:block" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="text-slate-100">
      <LaventeCareHeader
        summary={summary}
        seeding={seeding}
        showCompanyForm={showCompanyForm}
        onToggleCompanyForm={handleToggleCompanyForm}
        showLeadForm={showLeadForm}
        setShowLeadForm={setShowLeadForm}
        showProjectForm={showProjectForm}
        setShowProjectForm={setShowProjectForm}
        showWorkstreamForm={showWorkstreamForm}
        setShowWorkstreamForm={setShowWorkstreamForm}
        handleSeedDocuments={handleSeedDocuments}
      />

      <main className="mx-auto max-w-[1600px] space-y-5 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7">
        {/* R7: er is gecachte cockpit-data, maar de laatste refresh faalde —
            toon de data mét een persistente waarschuwing i.p.v. een
            foutscherm dat de werkende CRM vervangt. */}
        {cockpitError && cockpit ? (
          <RefreshFailedBanner
            text="Vernieuwen is mislukt — je ziet mogelijk verouderde cockpitgegevens."
            onRetry={() => {
              void refetchCockpit();
            }}
          />
        ) : null}
        <LaventeCareCompanyModal
          isOpen={showCompanyForm}
          onClose={closeCompanyForm}
          dirty={companyFormDirty}
          companyForm={companyForm}
          setCompanyForm={setCompanyForm}
          savingCompany={savingCompany}
          editingCompany={!!editingCompanyId}
          onSubmit={handleCompanySubmit}
        />

        <LaventeCareContactModal
          isOpen={showContactForm}
          onClose={closeContactForm}
          dirty={contactFormDirty}
          contactForm={contactForm}
          setContactForm={setContactForm}
          companies={companies}
          savingContact={savingContact}
          editingContact={!!editingContactId}
          onSubmit={handleContactSubmit}
        />

        <LaventeCareLeadModal
          isOpen={showLeadForm}
          onClose={closeLeadForm}
          dirty={leadFormDirty}
          leadForm={leadForm}
          setLeadForm={setLeadForm}
          companies={companies}
          contacts={contacts}
          savingLead={savingLead}
          onSubmit={handleLeadSubmit}
        />

        <LaventeCareProjectModal
          isOpen={showProjectForm}
          onClose={closeProjectForm}
          dirty={projectFormDirty}
          projectForm={projectForm}
          setProjectForm={setProjectForm}
          companies={companies}
          savingProject={savingProject}
          onSubmit={handleProjectSubmit}
        />

        <LaventeCareWorkstreamModal
          isOpen={showWorkstreamForm}
          onClose={closeWorkstreamForm}
          dirty={workstreamFormDirty}
          workstreamForm={workstreamForm}
          setWorkstreamForm={setWorkstreamForm}
          companies={companies}
          projects={activeProjects}
          savingWorkstream={savingWorkstream}
          onSubmit={handleWorkstreamSubmit}
        />

        <LaventeCareCustomerDossier
          isOpen={!!selectedCompany}
          company={selectedCompany}
          contacts={contacts}
          accessCredentials={accessCredentials}
          // M-J: het dossier krijgt de VOLLEDIGE lijsten (incl. gesloten/
          // gewonnen/verloren) — klantgeschiedenis is geen actieve funnel.
          leads={leads}
          workstreams={workstreams}
          projects={projects}
          actions={actionItems}
          dossierDocuments={dossierDocuments}
          activityEvents={activityEvents}
          timeEntries={timeEntries}
          invoices={invoices}
          savingActivity={createActivityEventMut.isPending}
          savingAccessCredential={savingAccessCredential}
          onClose={() => setSelectedCompanyId(null)}
          onEditCompany={(company) => {
            setSelectedCompanyId(null);
            handleEditCompany(company);
          }}
          onAddContact={(company) => {
            setSelectedCompanyId(null);
            handleAddContact(company);
          }}
          onStartWorkstream={(company) => {
            setSelectedCompanyId(null);
            handleStartWorkstreamForCompany(company);
          }}
          onOpenCommerce={(company) => {
            void handleOpenCommerceForCompany(company);
          }}
          onCreateActivity={handleCreateActivityEvent}
          onCreateAccessCredential={handleCreateAccessCredential}
          updatingAccessCredentialId={updatingAccessCredentialId}
          onUpdateAccessCredential={handleUpdateAccessCredential}
        />

        <LaventeCarePortalHero
          capabilityRows={capabilityRows}
          companies={companies.length}
          contacts={contacts.length}
          leads={activeLeads.length}
          workstreams={totalWorkstreams}
          projects={activeProjects.length}
          invoices={invoices.length}
          documents={summary.documents}
          onOpenCapabilities={() => {
            void handleChangeView("overview");
          }}
        />

        <PortalNavigation
          sections={portalSections}
          activeView={activeView}
          onChange={handleChangeView}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="hidden xl:order-2 xl:block">
            <PortalInsightRail
              capabilityRows={capabilityRows}
              sections={portalSections}
              activeView={activeView}
              onChange={handleChangeView}
              signals={businessSignals.length}
              actions={actionItems.length}
              openInvoices={billing?.summary.openInvoices ?? 0}
              openIncidents={openIncidents.length}
            />
          </div>

          <section className="order-1 min-w-0 space-y-4">
            {activeView === "overview" ? (
              <div className="space-y-5">
                <LaventeCareBusinessCommandCenter
                  summary={summary}
                  companies={companies}
                  activeLeads={activeLeads}
                  activeWorkstreams={activeWorkstreams}
                  activeProjects={activeProjects}
                  dossierDocuments={dossierDocuments}
                  loggingDocumentKey={loggingDocumentKey}
                  onLogDossierDocument={handleLogDossierDocument}
                />
                <CapabilityMatrix
                  capabilityRows={capabilityRows}
                  onOpenView={(view) => {
                    void handleChangeView(view);
                  }}
                />
                <details className="glass min-w-0 overflow-hidden">
                  <summary className="cursor-pointer list-none p-4 text-sm font-bold text-white marker:hidden">
                    Volledige capability matrix
                    {capabilityRows.filter((row) => row.status !== "ready").length > 0
                      ? ` (${capabilityRows.filter((row) => row.status !== "ready").length} focus)`
                      : ""}
                  </summary>
                  <div className="space-y-5 border-t border-white/10 p-4">
                    <CapabilityMatrix
                      capabilityRows={capabilityRows}
                      expanded
                      onOpenView={(view) => {
                        void handleChangeView(view);
                      }}
                    />
                    <PortalRoadmapPanel
                      onOpenCommerce={() => {
                        void handleChangeView("commerce");
                      }}
                      onOpenOperations={() => {
                        void handleChangeView("operations");
                      }}
                      onOpenKnowledge={() => {
                        void handleChangeView("knowledge");
                      }}
                    />
                  </div>
                </details>
              </div>
            ) : null}

            {activeView === "pipeline" ? (
              <LaventeCarePipelineView
                companies={companies}
                contacts={contacts}
                workstreams={workstreams}
                activeLeads={activeLeads}
                activeProjects={activeProjects}
                dossierDocuments={dossierDocuments}
                onShowCompanyForm={openNewCompanyForm}
                onEditCompany={handleEditCompany}
                onAddContact={handleAddContact}
                onEditContact={handleEditContact}
                onStartWorkstream={handleStartWorkstreamForCompany}
                onOpenDossier={(company) =>
                  setSelectedCompanyId(company._id ?? company.id)
                }
                processingLead={processingLead}
                processingProject={processingProject}
                handleLeadStatus={handleLeadStatus}
                handleLeadToProject={handleLeadToProject}
                handleProjectStatus={handleProjectStatus}
                onShowProjectForm={() => setShowProjectForm(true)}
                activeWorkstreamCount={activeWorkstreams.length}
                processingWorkstream={processingWorkstream}
                onShowWorkstreamForm={() => setShowWorkstreamForm(true)}
                handleWorkstreamStatus={handleWorkstreamStatus}
                handleWorkstreamToProject={handleWorkstreamToProject}
              />
            ) : null}

            {activeView === "signals" ? (
              <LaventeCareSignalsView
                businessSignals={businessSignals}
                actionItems={actionItems}
                followUps={followUps}
                processingSignal={processingSignal}
                processingAction={processingAction}
                handleCreateActionFromSignal={handleCreateActionFromSignal}
                handleConvertSignalToLead={handleConvertSignalToLead}
                handleCompleteAction={handleCompleteAction}
              />
            ) : null}

            {/* R7: foutscherm alleen zonder (gecachte) data; mét data een
                persistente amber banner boven de gewone view. */}
            {activeView === "commerce" && billingError && !billing ? (
              <ErrorState
                title="Facturatie kon niet laden"
                text="Offertes, uren en facturen zijn niet opgehaald. Dit is een verbindings- of serverprobleem — er is niets verwijderd."
                onRetry={() => {
                  void refetchBilling();
                }}
              />
            ) : null}

            {activeView === "commerce" && billingError && billing ? (
              <RefreshFailedBanner
                text="Vernieuwen is mislukt — je ziet mogelijk verouderde facturatiegegevens."
                onRetry={() => {
                  void refetchBilling();
                }}
              />
            ) : null}

            {activeView === "commerce" && (!billingError || billing) ? (
              <LaventeCareBillingView
                billing={billing}
                billingLoading={billingLoading}
                companies={companies}
                activeProjects={activeProjects}
                activeWorkstreams={activeWorkstreams}
                quotes={quotes}
                timeEntries={timeEntries}
                invoices={invoices}
                creatingQuote={createQuoteMut.isPending}
                creatingTimeEntry={createTimeEntryMut.isPending}
                creatingInvoice={createInvoiceMut.isPending}
                updatingQuoteId={updatingQuoteId}
                creatingInvoiceFromQuoteId={creatingInvoiceFromQuoteId}
                updatingInvoiceId={updatingInvoiceId}
                requestingPaymentInvoiceId={requestingPaymentInvoiceId}
                generatingInvoiceDocumentId={generatingInvoiceDocumentId}
                downloadingInvoiceUBLId={downloadingInvoiceUBLId}
                refreshingPaymentInvoiceId={refreshingPaymentInvoiceId}
                onCreateQuote={handleCreateQuote}
                onCreateTimeEntry={handleCreateTimeEntry}
                onCreateInvoice={handleCreateInvoice}
                onCreateInvoiceFromQuote={handleCreateInvoiceFromQuote}
                onUpdateQuoteStatus={handleUpdateQuoteStatus}
                onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
                onCreatePaymentRequest={handleCreateInvoicePaymentRequest}
                onOpenInvoiceDocument={handleOpenInvoiceDocument}
                onDownloadInvoiceUBL={handleDownloadInvoiceUBL}
                onRefreshInvoicePayment={handleRefreshInvoicePayment}
                onOpenMailboxForInvoice={(id) => {
                  void handleOpenMailboxForInvoice(id);
                }}
                onSendInvoiceReminder={(id) => {
                  void handleSendInvoiceReminder(id);
                }}
                pendingPaymentActions={pendingPaymentActions}
                onDismissPendingPaymentAction={dismissPendingPaymentAction}
                settingsHref="/settings"
                prefillCompanyId={commercePrefillCompanyId}
                updatingTimeEntryId={processingTimeEntryId}
                onUpdateTimeEntry={handleEditTimeEntry}
                onWriteOffTimeEntry={handleWriteOffTimeEntry}
                onReopenTimeEntry={handleReopenTimeEntry}
                onDeleteTimeEntry={handleDeleteTimeEntry}
                onDirtyChange={handleCommerceDirtyChange}
              />
            ) : null}

            {activeView === "mailbox" && mailboxError && !mailbox ? (
              <ErrorState
                title="Mailbox kon niet laden"
                text="Templates, outbox en inbox zijn niet opgehaald. Dit is een verbindings- of serverprobleem."
                onRetry={() => {
                  void refetchMailbox();
                }}
              />
            ) : null}

            {activeView === "mailbox" && mailboxError && mailbox ? (
              <RefreshFailedBanner
                text="Vernieuwen is mislukt — je ziet mogelijk een verouderde mailbox."
                onRetry={() => {
                  void refetchMailbox();
                }}
              />
            ) : null}

            {activeView === "mailbox" && (!mailboxError || mailbox) ? (
              <LaventeCareMailboxView
                key={mailboxInvoiceId || "mailbox"}
                mailbox={mailbox}
                mailboxLoading={mailboxLoading}
                companies={companies}
                contacts={contacts}
                activeProjects={activeProjects}
                activeWorkstreams={activeWorkstreams}
                invoices={invoices}
                prefillInvoiceId={mailboxInvoiceId}
                prefillIntent={mailboxIntent}
                templates={mailTemplates}
                outbox={mailOutbox}
                inbox={mailInbox}
                sending={sendTemplatedMailMut.isPending}
                aiSuggesting={suggestMailContentMut.isPending}
                syncingInbox={syncingInbox}
                inboundBlocked={inboundBlocked}
                inboxError={mailbox?.inboxError}
                justSent={mailJustSent}
                onSuggestMailContent={handleSuggestMailContent}
                onSendTemplatedMail={handleSendTemplatedMail}
                onSyncInbox={handleSyncInbox}
                onMarkInboxRead={markInboxRead}
                onDirtyChange={handleMailboxDirtyChange}
              />
            ) : null}

            {activeView === "operations" ? (
              <LaventeCareOperationsView
                recentDecisions={recentDecisions}
                openChanges={openChanges}
                openIncidents={openIncidents}
                activeProjects={activeProjects}
                creatingDecision={createDecisionMut.isPending}
                creatingChange={createChangeRequestMut.isPending}
                creatingIncident={createSlaIncidentMut.isPending}
                processingOperation={processingOperation}
                onCreateDecision={handleCreateDecision}
                onCreateChangeRequest={handleCreateChangeRequest}
                onCreateSlaIncident={handleCreateSlaIncident}
                onUpdateDecisionStatus={handleUpdateDecisionStatus}
                onUpdateChangeStatus={handleUpdateChangeStatus}
                onUpdateIncidentStatus={handleUpdateIncidentStatus}
              />
            ) : null}

            {activeView === "knowledge" ? (
              <LaventeCareKnowledgeView
                search={search}
                setSearch={setSearch}
                documents={documents}
                documentGroups={documentGroups}
                dossierDocuments={dossierDocuments}
                dossierAdvice={aiDossierAdvice}
                dossierAdviceLoading={dossierAdviceLoading}
                dossierAdviceError={dossierAdviceError}
                onRetryDossierAdvice={() => { void refetchDossierAdvice(); }}
              />
            ) : null}
          </section>
        </div>
      </main>
    </div>
  );
}

// R7: kleine persistente banner voor "data staat er, maar de laatste refresh
// faalde" — in plaats van de werkende view te vervangen door een foutscherm.
function RefreshFailedBanner({
  text,
  onRetry,
}: {
  text: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/[0.08] px-4 py-3"
    >
      <TriangleAlert size={16} className="shrink-0 text-amber-300" />
      <p className="min-w-0 flex-1 text-sm leading-5 text-amber-100">{text}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 text-xs font-bold text-amber-100 transition hover:bg-amber-400/20"
      >
        <RotateCcw size={13} />
        Opnieuw laden
      </button>
    </div>
  );
}

function parseTagInput(value: string) {
  return value
    .split(/[,\n]/)
    .map((tag) => tag.trim().replace(/^#/, "").toLowerCase())
    .filter((tag, index, all) => tag && all.indexOf(tag) === index);
}

function normalizeCompanyStatus(value?: string | null): CompanyForm["status"] {
  if (value === "actief" || value === "prospect" || value === "inactief")
    return value;
  return "actief";
}

function normalizeCompanyRelation(
  value?: string | null,
): CompanyForm["relatieType"] {
  if (
    value === "prospect" ||
    value === "klant" ||
    value === "partner" ||
    value === "leverancier" ||
    value === "intern" ||
    value === "eigen_project"
  )
    return value;
  return "prospect";
}
