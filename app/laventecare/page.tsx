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
import { Building2, FileText, FolderKanban, LifeBuoy, Sparkles, Workflow } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

export default function LaventeCarePage() {
  const {
    cockpitLoading,
    companies,
    contacts,
    documents,
    activeLeads,
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
  const [loggingDocumentKey, setLoggingDocumentKey] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
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

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7">
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
          savingWorkstream={savingWorkstream}
          onSubmit={handleWorkstreamSubmit}
        />

        <LaventeCareCustomerDossier
          isOpen={!!selectedCompany}
          company={selectedCompany}
          contacts={contacts}
          leads={activeLeads}
          workstreams={activeWorkstreams}
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

        <div className="flex flex-col gap-6 mt-2">
          <CollapsibleSection
            title="Klantenbasis"
            subtitle={`${companies.length} klanten, ${contacts.length} contactpersonen`}
            icon={<Building2 size={18} />}
            theme="amber"
            defaultOpen={true}
          >
            <LaventeCareCustomersView
              companies={companies}
              contacts={contacts}
              activeLeads={activeLeads}
              activeWorkstreams={activeWorkstreams}
              activeProjects={activeProjects}
              dossierDocuments={dossierDocuments}
              onShowCompanyForm={openNewCompanyForm}
              onEditCompany={handleEditCompany}
              onAddContact={handleAddContact}
              onEditContact={handleEditContact}
              onStartWorkstream={handleStartWorkstreamForCompany}
              onOpenDossier={(company) => setSelectedCompanyId(company._id ?? company.id)}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Actieve Signalen"
            subtitle={`${businessSignals.length} signalen, ${actionItems?.length || 0} actiepunten open`}
            icon={<Sparkles size={18} />}
            theme="violet"
            defaultOpen={true}
          >
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
          </CollapsibleSection>

          <CollapsibleSection
            title="Opdrachten Werkbank"
            subtitle={`${activeWorkstreams.length} actieve opdrachten tussen actie en project`}
            icon={<Workflow size={18} />}
            theme="violet"
            defaultOpen={true}
          >
            <LaventeCareWorkstreamsView
              activeWorkstreams={activeWorkstreams}
              processingWorkstream={processingWorkstream}
              onShowWorkstreamForm={() => setShowWorkstreamForm(true)}
              handleWorkstreamStatus={handleWorkstreamStatus}
              handleWorkstreamToProject={handleWorkstreamToProject}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Delivery Funnel"
            subtitle={`${activeLeads.length} leads, ${activeWorkstreams.length} opdrachten en ${activeProjects.length} actieve projecten`}
            icon={<FolderKanban size={18} />}
            theme="emerald"
            defaultOpen={true}
          >
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
          </CollapsibleSection>

          <CollapsibleSection
            title="SLA Operations"
            subtitle={`${openIncidents.length} incidenten en ${openChanges.length} open changes`}
            icon={<LifeBuoy size={18} />}
            theme={openIncidents.length > 0 ? "rose" : "primary"}
            defaultOpen={false}
          >
            <LaventeCareOperationsView
              recentDecisions={recentDecisions}
              openChanges={openChanges}
              openIncidents={openIncidents}
            />
          </CollapsibleSection>

          <CollapsibleSection
            title="Kennisbank & Documenten"
            subtitle={`${summary.documents}/${LAVENTECARE_DOCUMENT_TOTAL} documenten geindexeerd`}
            icon={<FileText size={18} />}
            theme="amber"
            defaultOpen={false}
          >
            <LaventeCareKnowledgeView
              search={search}
              setSearch={setSearch}
              documentGroups={documentGroups}
            />
          </CollapsibleSection>
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
  if (value === "prospect" || value === "klant" || value === "partner" || value === "leverancier") return value;
  return "prospect";
}
