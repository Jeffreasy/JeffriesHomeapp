"use client";

import { FormEvent, useState, useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { LAVENTECARE_DOCUMENT_TOTAL, toLaventeCareSeedDocuments } from "@/lib/laventecare";
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
import { LaventeCareCustomersView } from "@/components/laventecare/LaventeCareCustomersView";
import { LaventeCareFunnelView } from "@/components/laventecare/LaventeCareFunnelView";
import { LaventeCareWorkstreamsView } from "@/components/laventecare/LaventeCareWorkstreamsView";
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
  PortalWorkspaceHeader,
  portalIcons,
  type CapabilityRow,
  type PortalSection,
  type PortalView,
} from "@/components/laventecare/LaventeCarePortal";

export default function LaventeCarePage() {
  const {
    cockpitLoading,
    billingLoading,
    mailboxLoading,
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
    activityEvents,
    billing,
    mailbox,
    mailTemplates,
    mailOutbox,
    quotes,
    timeEntries,
    invoices,
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
    suggestMailContentMut,
    sendTemplatedMailMut,
  } = useLaventeCare();

  const { success, error: toastError } = useToast();
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showWorkstreamForm, setShowWorkstreamForm] = useState(false);
  const [companyForm, setCompanyForm] = useState<CompanyForm>(emptyCompanyForm);
  const [contactForm, setContactForm] = useState<ContactForm>(emptyContactForm);
  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLeadForm);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [workstreamForm, setWorkstreamForm] = useState<WorkstreamForm>(emptyWorkstreamForm);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [savingWorkstream, setSavingWorkstream] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [processingSignal, setProcessingSignal] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [processingLead, setProcessingLead] = useState<string | null>(null);
  const [processingProject, setProcessingProject] = useState<string | null>(null);
  const [processingWorkstream, setProcessingWorkstream] = useState<string | null>(null);
  const [processingOperation, setProcessingOperation] = useState<string | null>(null);
  const [loggingDocumentKey, setLoggingDocumentKey] = useState<string | null>(null);
  const [updatingQuoteId, setUpdatingQuoteId] = useState<string | null>(null);
  const [creatingInvoiceFromQuoteId, setCreatingInvoiceFromQuoteId] = useState<string | null>(null);
  const [updatingInvoiceId, setUpdatingInvoiceId] = useState<string | null>(null);
  const [requestingPaymentInvoiceId, setRequestingPaymentInvoiceId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<PortalView>("overview");
  const [search, setSearch] = useState("");

  const selectedCompany = useMemo(
    () => companies.find((company) => (company._id ?? company.id) === selectedCompanyId) ?? null,
    [companies, selectedCompanyId]
  );

  const filteredDocuments = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter((doc) =>
      [doc.titel, doc.categorie, doc.fase, doc.samenvatting, ...(doc.tags ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(needle)
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

  const totalWorkstreams = Math.max(summary.workstreams ?? 0, workstreams.length, activeWorkstreams.length);

  const capabilityRows = useMemo<CapabilityRow[]>(() => {
    const hasCommercialData = quotes.length > 0 || timeEntries.length > 0 || invoices.length > 0;
    return [
      {
        label: "Klantenbasis",
        detail: `${companies.length} klanten, ${contacts.length} contactpersonen`,
        status: companies.length > 0 && contacts.length > 0 ? "ready" : companies.length > 0 ? "attention" : "missing",
        owner: "CRM",
        view: "customers",
        score: companies.length > 0 && contacts.length > 0 ? 100 : companies.length > 0 ? 70 : 25,
        priority: contacts.length >= companies.length && companies.length > 0 ? "laag" : "middel",
        nextStep:
          companies.length > 0 && contacts.length > 0
            ? "Basis staat. Houd per klant minimaal een primair contact, website en status bij."
            : "Maak klantrecords en primaire contactpersonen aan voordat offertes en dossiers groeien.",
        actionLabel: "Open klanten",
      },
      {
        label: "Sales intake",
        detail: `${activeLeads.length} actieve leads, ${businessSignals.length} signalen`,
        status: activeLeads.length > 0 || businessSignals.length > 0 ? "ready" : "attention",
        owner: "Funnel",
        view: "signals",
        score: 100,
        priority: activeLeads.length > 0 || businessSignals.length > 0 ? "laag" : "middel",
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
        view: "workstreams",
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
        view: "delivery",
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
        detail: `${quotes.length} offertes, ${timeEntries.length} uren, ${invoices.length} facturen`,
        status: hasCommercialData ? "ready" : "attention",
        owner: "Commercie",
        view: "commerce",
        score: 100,
        priority: hasCommercialData ? "laag" : "middel",
        nextStep:
          hasCommercialData
            ? "Controleer open uren, conceptoffertes en verstuurde facturen periodiek."
            : "Maak de eerste urenregel of offerte voor een bestaande klant en test daarna factuur plus betaalverzoek.",
        actionLabel: "Open commercie",
      },
      {
        label: "Mailbox en templates",
        detail: `${mailTemplates.length} templates, ${mailOutbox.length} outbox items`,
        status: mailbox?.summary.configured && mailTemplates.length > 0 ? "ready" : mailTemplates.length > 0 ? "attention" : "missing",
        owner: "Communicatie",
        view: "mailbox",
        score: mailbox?.summary.configured ? 100 : mailTemplates.length > 0 ? 70 : 20,
        priority: mailbox?.summary.configured ? "laag" : "hoog",
        nextStep: mailbox?.summary.nextStep ?? "Richt Microsoft Graph in en gebruik templates voor klantmails.",
        actionLabel: "Open mailbox",
      },
      {
        label: "Bunq betalingen",
        detail: billing?.summary.bunqReady ? "API en rekening staan klaar" : "Render env mist nog providerdata",
        status: billing?.summary.bunqReady ? "ready" : "missing",
        owner: "Finance",
        view: "commerce",
        score: billing?.summary.bunqReady ? 100 : 20,
        priority: billing?.summary.bunqReady ? "laag" : "hoog",
        nextStep: billing?.summary.bunqReady
          ? "Koppel het eerste betaalverzoek aan een factuur zodra de commerciele flow gevuld is."
          : "Vul Render env voor Bunq volledig aan voordat betaalverzoeken live kunnen.",
        actionLabel: "Open betalingen",
      },
      {
        label: "Klantdossier",
        detail: `${dossierDocuments.length} dossierstukken, ${activityEvents.length} klantmomenten`,
        status: dossierDocuments.length > 0 || activityEvents.length > 0 ? "ready" : "attention",
        owner: "Dossier",
        view: "customers",
        score: 100,
        priority: dossierDocuments.length > 0 || activityEvents.length > 0 ? "laag" : "middel",
        nextStep:
          dossierDocuments.length > 0 || activityEvents.length > 0
            ? "Blijf klantmomenten en dossierstukken aan de juiste klant koppelen."
            : "Log per bestaande klant minimaal een klantmoment of dossierstuk als start van de audit trail.",
        actionLabel: "Open klantdossiers",
      },
      {
        label: "Governance",
        detail: `${recentDecisions.length} besluiten, ${openChanges.length} changes, ${openIncidents.length} incidenten`,
        status: recentDecisions.length > 0 || openChanges.length > 0 || openIncidents.length > 0 ? "ready" : "attention",
        owner: "Operations",
        view: "operations",
        score: 100,
        priority: recentDecisions.length > 0 || openChanges.length > 0 || openIncidents.length > 0 ? "laag" : "middel",
        nextStep:
          recentDecisions.length > 0 || openChanges.length > 0 || openIncidents.length > 0
            ? "Gebruik besluiten, changes en incidenten als vaste operationele historie."
            : "Leg de eerste beslissing, change of supportafspraak vast zodat beheer niet in losse notities blijft hangen.",
        actionLabel: "Open operations",
      },
      {
        label: "Documentbasis",
        detail: `${summary.documents}/${LAVENTECARE_DOCUMENT_TOTAL} templates geindexeerd`,
        status: summary.documents >= LAVENTECARE_DOCUMENT_TOTAL ? "ready" : summary.documents > 0 ? "attention" : "missing",
        owner: "Kennisbank",
        view: "knowledge",
        score: summary.documents >= LAVENTECARE_DOCUMENT_TOTAL ? 100 : summary.documents > 0 ? 70 : 20,
        priority: summary.documents >= LAVENTECARE_DOCUMENT_TOTAL ? "laag" : "middel",
        nextStep:
          summary.documents >= LAVENTECARE_DOCUMENT_TOTAL
            ? "Documentbasis staat. Gebruik templates nu per klant, offerte en projectfase."
            : "Werk de documentbasis bij zodat alle templates beschikbaar zijn voor dossiers en PDF output.",
        actionLabel: "Open kennisbank",
      },
    ];
  }, [
    activeLeads.length,
    activeProjects.length,
    activeWorkstreams.length,
    activityEvents.length,
    billing?.summary.bunqReady,
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
        id: "customers",
        label: "Klanten",
        eyebrow: "CRM basis",
        description: "Klantdossiers, contactpersonen en relatiecontext.",
        count: `${companies.length}`,
        icon: portalIcons.customers,
        tone: "amber",
      },
      {
        id: "signals",
        label: "Signalen",
        eyebrow: "AI triage",
        description: "Agenda, mail en notities naar acties en leads.",
        count: `${businessSignals.length + actionItems.length + followUps.length}`,
        icon: portalIcons.signals,
        tone: "violet",
      },
      {
        id: "workstreams",
        label: "Opdrachten",
        eyebrow: "Werkbank",
        description: "Kleine klussen, adviestrajecten en tussenwerk.",
        count: `${totalWorkstreams}`,
        icon: portalIcons.workstreams,
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
        id: "delivery",
        label: "Delivery",
        eyebrow: "Projecten",
        description: "Leads naar projecten, fasering en waarde.",
        count: `${activeLeads.length + activeProjects.length}`,
        icon: portalIcons.delivery,
        tone: "emerald",
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
      {
        id: "gaps",
        label: "Gatenlijst",
        eyebrow: "Klantdekking",
        description: "Welke bedrijfsfuncties staan live, half live of missen nog.",
        count: `${capabilityRows.filter((row) => row.status !== "ready").length}`,
        icon: portalIcons.gaps,
        tone: "rose",
      },
    ],
    [
      actionItems.length,
      activeLeads.length,
      activeProjects.length,
      businessSignals.length,
      capabilityRows,
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
    ]
  );

  const activePortalSection = portalSections.find((section) => section.id === activeView) ?? portalSections[0];

  const closeCompanyForm = () => {
    setShowCompanyForm(false);
    setEditingCompanyId(null);
    setCompanyForm(emptyCompanyForm);
  };

  const openNewCompanyForm = () => {
    setEditingCompanyId(null);
    setCompanyForm(emptyCompanyForm);
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
    setCompanyForm({
      naam: company.naam ?? "",
      website: company.website ?? "",
      sector: company.sector ?? "",
      status: normalizeCompanyStatus(company.status),
      relatieType: normalizeCompanyRelation(company.relatie_type),
      notities: company.notities ?? "",
      volgendeActie: company.volgende_actie ?? company.volgendeActie ?? "",
    });
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
      };
      if (editingCompanyId) {
        await updateCompanyMut.mutateAsync({ id: editingCompanyId, ...payload });
        success("LaventeCare klant bijgewerkt");
      } else {
        await createCompanyMut.mutateAsync(payload);
        success("LaventeCare klant aangemaakt");
      }
      closeCompanyForm();
    } catch {
      toastError(editingCompanyId ? "Klant bijwerken is mislukt" : "Klant aanmaken is mislukt");
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
    const companyContacts = contacts.filter((contact) => contact.company_id === id);
    setEditingContactId(null);
    setContactForm({
      ...emptyContactForm,
      companyId: id,
      isPrimary: companyContacts.length === 0,
    });
    setShowContactForm(true);
  };

  const handleEditContact = (contact: ContactItem) => {
    setEditingContactId(contact._id ?? contact.id);
    setContactForm({
      companyId: contact.company_id ?? contact.companyId ?? "",
      naam: contact.naam ?? "",
      email: contact.email ?? "",
      telefoon: contact.telefoon ?? "",
      rol: contact.rol ?? "",
      isPrimary: contact.is_primary ?? contact.isPrimary ?? false,
      notities: contact.notities ?? "",
    });
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
      };
      if (editingContactId) {
        await updateContactMut.mutateAsync({ id: editingContactId, ...payload });
        success("Contactpersoon bijgewerkt");
      } else {
        await createContactMut.mutateAsync(payload);
        success("Contactpersoon toegevoegd");
      }
      closeContactForm();
    } catch {
      toastError(editingContactId ? "Contactpersoon bijwerken is mislukt" : "Contactpersoon toevoegen is mislukt");
    } finally {
      setSavingContact(false);
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
        company_name: leadForm.companyId ? undefined : optional(leadForm.companyName),
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
        company_name: projectForm.companyId ? undefined : optional(projectForm.companyName),
        website: projectForm.companyId ? undefined : optional(projectForm.website),
        fase: projectForm.fase,
        status: projectForm.status,
        waarde_indicatie: projectForm.waardeIndicatie === "" ? undefined : Number(projectForm.waardeIndicatie),
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
        geschatte_minuten: workstreamForm.geschatteMinuten === "" ? undefined : Number(workstreamForm.geschatteMinuten),
        waarde_indicatie: workstreamForm.waardeIndicatie === "" ? undefined : Number(workstreamForm.waardeIndicatie),
        stack_tags: parseTagInput(workstreamForm.stackTags),
        tags: parseTagInput(workstreamForm.tags),
        bron: "cockpit",
      });
      setWorkstreamForm(emptyWorkstreamForm);
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
      const result = await seedDocumentsMut.mutateAsync(toLaventeCareSeedDocuments());
      success(`Documentbasis bijgewerkt: ${result.total} documenten`);
    } catch {
      toastError("Documentbasis initialiseren is mislukt");
    } finally {
      setSeeding(false);
    }
  };

  const signalKey = (kind: "action" | "lead", signal: BusinessSignal) => `${kind}:${signal.source}:${signal.id}`;

  const handleCreateActionFromSignal = async (signal: BusinessSignal) => {
    setProcessingSignal(signalKey("action", signal));
    try {
      await createActionMut.mutateAsync({
        source:     signal.source,
        source_id:  signal.id,
        title:      signal.title,
        summary:    [signal.subtitle, signal.actionHint, `Match: ${signal.matchedTerm}`].filter(Boolean).join("\n\n"),
        action_type: "opvolgen",
        priority:   signal.urgency === "hoog" ? "hoog" : "normaal",
        due_date:   signal.date,
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
        source:      signal.source,
        source_id:   signal.id,
        title:       signal.title,
        subtitle:    signal.subtitle,
        date:        signal.date,
        matched_term: signal.matchedTerm,
        urgency:     signal.urgency,
        action_hint: signal.actionHint,
      });
      success(result.reused ? "Bestaande lead opnieuw gekoppeld" : "Signaal omgezet naar lead");
    } catch {
      toastError("Lead maken vanuit signaal is mislukt");
    } finally {
      setProcessingSignal(null);
    }
  };

  const handleCompleteAction = async (action: ActionItem) => {
    setProcessingAction(action._id);
    try {
      await updateActionStatusMut.mutateAsync({ id: action._id, status: "afgerond" });
      success("LaventeCare actie afgerond");
    } catch {
      toastError("Actie afronden is mislukt");
    } finally {
      setProcessingAction(null);
    }
  };

  const handleLeadStatus = async (lead: LeadItem, status: string) => {
    if (!lead._id) return;
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
        id:          lead._id,
        naam:        lead.titel,
        fase:        "intake",
        status:      "actief",
        samenvatting: lead.pijnpunt ?? undefined,
      });
      success("Lead omgezet naar project");
    } catch {
      toastError("Lead converteren is mislukt");
    } finally {
      setProcessingLead(null);
    }
  };

  const handleProjectStatus = async (project: ProjectItem, fields: { fase?: string; status?: string }) => {
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

  const handleWorkstreamStatus = async (workstream: WorkstreamItem, fields: { status?: string }) => {
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
        samenvatting: [workstream.doel, workstream.scope, workstream.bevindingen].filter(Boolean).join("\n\n") || undefined,
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
    setWorkstreamForm({
      ...emptyWorkstreamForm,
      companyId: id,
      projectId: "",
      klantNaam: company.naam,
      titel: `${company.naam}: opdracht`,
    });
    setShowWorkstreamForm(true);
  };

  const handleLogDossierDocument = async (payload: LaventeCareDossierDocumentLogPayload) => {
    setLoggingDocumentKey(payload.documentKey);
    try {
      await createDossierDocumentMut.mutateAsync({
        document_key: payload.documentKey,
        titel: payload.title,
        template_label: payload.templateLabel,
        context_type: payload.context.kind,
        context_id: payload.context.id,
        context_title: payload.context.title,
        lead_id: payload.context.kind === "lead" ? payload.context.id : undefined,
        workstream_id: payload.context.kind === "workstream" ? payload.context.id : undefined,
        project_id: payload.context.kind === "project" ? payload.context.id : undefined,
        company_id: payload.context.kind === "company" ? payload.context.id : undefined,
        pdf_url: payload.pdfUrl,
        theme: payload.theme,
        delivery: payload.delivery,
        notes: payload.context.nextStep ? `Volgende stap: ${payload.context.nextStep}` : undefined,
      });
      success("PDF vastgelegd in LaventeCare dossier");
    } catch {
      toastError("PDF vastleggen is mislukt");
    } finally {
      setLoggingDocumentKey(null);
    }
  };

  const handleCreateActivityEvent = async (payload: Parameters<typeof createActivityEventMut.mutateAsync>[0]) => {
    try {
      await createActivityEventMut.mutateAsync(payload);
      success("Klantmoment vastgelegd");
    } catch {
      toastError("Klantmoment vastleggen is mislukt");
      throw new Error("Klantmoment vastleggen is mislukt");
    }
  };

  const handleCreateDecision = async (payload: Parameters<typeof createDecisionMut.mutateAsync>[0]) => {
    try {
      await createDecisionMut.mutateAsync(payload);
      success("Besluit vastgelegd in LaventeCare");
    } catch {
      toastError("Besluit vastleggen is mislukt");
    }
  };

  const handleCreateChangeRequest = async (payload: Parameters<typeof createChangeRequestMut.mutateAsync>[0]) => {
    try {
      await createChangeRequestMut.mutateAsync(payload);
      success("Change request aangemaakt");
    } catch {
      toastError("Change request aanmaken is mislukt");
    }
  };

  const handleCreateSlaIncident = async (payload: Parameters<typeof createSlaIncidentMut.mutateAsync>[0]) => {
    try {
      await createSlaIncidentMut.mutateAsync(payload);
      success("SLA-incident geregistreerd");
    } catch {
      toastError("SLA-incident registreren is mislukt");
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

  const handleCreateQuote = async (payload: Parameters<typeof createQuoteMut.mutateAsync>[0]) => {
    try {
      await createQuoteMut.mutateAsync(payload);
    } catch {
      toastError("Offerte aanmaken is mislukt");
      throw new Error("Offerte aanmaken is mislukt");
    }
  };

  const handleCreateTimeEntry = async (payload: Parameters<typeof createTimeEntryMut.mutateAsync>[0]) => {
    try {
      await createTimeEntryMut.mutateAsync(payload);
    } catch {
      toastError("Urenregel opslaan is mislukt");
      throw new Error("Urenregel opslaan is mislukt");
    }
  };

  const handleCreateInvoice = async (payload: Parameters<typeof createInvoiceMut.mutateAsync>[0]) => {
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
        success(result.code ? `Betaalverzoek klaar. Bevestig met code ${result.code}` : "Betaalverzoek staat klaar voor bevestiging");
      } else if (result.alreadyCreated) {
        success("Deze factuur heeft al een gekoppeld betaalverzoek");
      } else {
        success(result.message || "Betaalverzoek verwerkt");
      }
    } catch {
      toastError("Betaalverzoek klaarzetten is mislukt");
    } finally {
      setRequestingPaymentInvoiceId(null);
    }
  };

  const handleSendTemplatedMail = async (payload: Parameters<typeof sendTemplatedMailMut.mutateAsync>[0]) => {
    try {
      const result = await sendTemplatedMailMut.mutateAsync(payload);
      if (result.status === "sent") {
        success("LaventeCare mail verzonden en vastgelegd");
      } else if (result.status === "failed") {
        toastError(result.error_message || "Mail versturen is mislukt");
      } else {
        success("Mailconcept aangemaakt in de outbox");
      }
    } catch {
      toastError(payload.send ? "Mail versturen is mislukt" : "Mailconcept aanmaken is mislukt");
    }
  };

  const handleSuggestMailContent = async (payload: Parameters<typeof suggestMailContentMut.mutateAsync>[0]) => {
    try {
      const suggestion = await suggestMailContentMut.mutateAsync(payload);
      success("AI-context in de template gezet");
      return suggestion;
    } catch {
      toastError("AI-context ophalen is mislukt");
      throw new Error("AI-context ophalen is mislukt");
    }
  };

  if (cockpitLoading) {
    return (
      <div className="px-4 py-10 sm:px-6 text-slate-100">
        <div className="mx-auto max-w-7xl">
          <div className="h-40 animate-pulse glass" />
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-28 animate-pulse glass" />
            ))}
          </div>
        </div>
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
        <LaventeCareCompanyModal
          isOpen={showCompanyForm}
          onClose={closeCompanyForm}
          companyForm={companyForm}
          setCompanyForm={setCompanyForm}
          savingCompany={savingCompany}
          editingCompany={!!editingCompanyId}
          onSubmit={handleCompanySubmit}
        />

        <LaventeCareContactModal
          isOpen={showContactForm}
          onClose={closeContactForm}
          contactForm={contactForm}
          setContactForm={setContactForm}
          companies={companies}
          savingContact={savingContact}
          editingContact={!!editingContactId}
          onSubmit={handleContactSubmit}
        />

        <LaventeCareLeadModal
          isOpen={showLeadForm}
          onClose={() => setShowLeadForm(false)}
          leadForm={leadForm}
          setLeadForm={setLeadForm}
          companies={companies}
          contacts={contacts}
          savingLead={savingLead}
          onSubmit={handleLeadSubmit}
        />

        <LaventeCareProjectModal
          isOpen={showProjectForm}
          onClose={() => setShowProjectForm(false)}
          projectForm={projectForm}
          setProjectForm={setProjectForm}
          companies={companies}
          savingProject={savingProject}
          onSubmit={handleProjectSubmit}
        />

        <LaventeCareWorkstreamModal
          isOpen={showWorkstreamForm}
          onClose={() => setShowWorkstreamForm(false)}
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
          leads={activeLeads}
          workstreams={workstreams}
          projects={activeProjects}
          actions={actionItems}
          dossierDocuments={dossierDocuments}
          activityEvents={activityEvents}
          savingActivity={createActivityEventMut.isPending}
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
          onCreateActivity={handleCreateActivityEvent}
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
          onOpenCompany={openNewCompanyForm}
          onOpenWorkstream={() => setShowWorkstreamForm(true)}
          onOpenCommerce={() => setActiveView("commerce")}
          onOpenGaps={() => setActiveView("gaps")}
        />

        <PortalNavigation sections={portalSections} activeView={activeView} onChange={setActiveView} />

        <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
          <div className="order-2 xl:order-1">
            <PortalInsightRail
              capabilityRows={capabilityRows}
              sections={portalSections}
              activeView={activeView}
              onChange={setActiveView}
              signals={businessSignals.length}
              actions={actionItems.length}
              openInvoices={billing?.summary.openInvoices ?? 0}
              openIncidents={openIncidents.length}
            />
          </div>

          <section className="order-1 min-w-0 space-y-5 xl:order-2">
            <PortalWorkspaceHeader section={activePortalSection} />

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
                <CapabilityMatrix capabilityRows={capabilityRows} onOpenView={setActiveView} />
              </div>
            ) : null}

            {activeView === "customers" ? (
              <LaventeCareCustomersView
                companies={companies}
                contacts={contacts}
                activeLeads={activeLeads}
                activeWorkstreams={workstreams}
                activeProjects={activeProjects}
                dossierDocuments={dossierDocuments}
                onShowCompanyForm={openNewCompanyForm}
                onEditCompany={handleEditCompany}
                onAddContact={handleAddContact}
                onEditContact={handleEditContact}
                onStartWorkstream={handleStartWorkstreamForCompany}
                onOpenDossier={(company) => setSelectedCompanyId(company._id ?? company.id)}
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

            {activeView === "workstreams" ? (
              <LaventeCareWorkstreamsView
                workstreams={workstreams}
                projects={activeProjects}
                activeWorkstreamCount={activeWorkstreams.length}
                processingWorkstream={processingWorkstream}
                onShowWorkstreamForm={() => setShowWorkstreamForm(true)}
                handleWorkstreamStatus={handleWorkstreamStatus}
                handleWorkstreamToProject={handleWorkstreamToProject}
              />
            ) : null}

            {activeView === "commerce" ? (
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
                onCreateQuote={handleCreateQuote}
                onCreateTimeEntry={handleCreateTimeEntry}
                onCreateInvoice={handleCreateInvoice}
                onCreateInvoiceFromQuote={handleCreateInvoiceFromQuote}
                onUpdateQuoteStatus={handleUpdateQuoteStatus}
                onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
                onCreatePaymentRequest={handleCreateInvoicePaymentRequest}
              />
            ) : null}

            {activeView === "mailbox" ? (
              <LaventeCareMailboxView
                mailbox={mailbox}
                mailboxLoading={mailboxLoading}
                companies={companies}
                contacts={contacts}
                activeProjects={activeProjects}
                activeWorkstreams={activeWorkstreams}
                templates={mailTemplates}
                outbox={mailOutbox}
                sending={sendTemplatedMailMut.isPending}
                aiSuggesting={suggestMailContentMut.isPending}
                onSuggestMailContent={handleSuggestMailContent}
                onSendTemplatedMail={handleSendTemplatedMail}
              />
            ) : null}

            {activeView === "delivery" ? (
              <LaventeCareFunnelView
                activeLeads={activeLeads}
                activeProjects={activeProjects}
                processingLead={processingLead}
                processingProject={processingProject}
                handleLeadStatus={handleLeadStatus}
                handleLeadToProject={handleLeadToProject}
                handleProjectStatus={handleProjectStatus}
                onShowProjectForm={() => setShowProjectForm(true)}
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
                documentGroups={documentGroups}
              />
            ) : null}

            {activeView === "gaps" ? (
              <div className="space-y-5">
                <CapabilityMatrix capabilityRows={capabilityRows} expanded onOpenView={setActiveView} />
                <PortalRoadmapPanel
                  onOpenCommerce={() => setActiveView("commerce")}
                  onOpenOperations={() => setActiveView("operations")}
                  onOpenKnowledge={() => setActiveView("knowledge")}
                />
              </div>
            ) : null}
          </section>
        </div>
      </main>
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
  if (value === "actief" || value === "prospect" || value === "inactief") return value;
  return "actief";
}

function normalizeCompanyRelation(value?: string | null): CompanyForm["relatieType"] {
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
