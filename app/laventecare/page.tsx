"use client";

import { FormEvent, useState, useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { LAVENTECARE_DOCUMENTS } from "@/lib/laventecareData";
import { useLaventeCare } from "@/hooks/useLaventeCare";
import { type LeadForm, type ProjectForm, type BusinessSignal, type ActionItem, type LeadItem, type ProjectItem, emptyLeadForm, emptyProjectForm } from "@/components/laventecare/LaventeCareTypes";
import { label, optional } from "@/components/laventecare/LaventeCareUtils";

import { LaventeCareHeader } from "@/components/laventecare/LaventeCareHeader";
import { LaventeCareSignalsView } from "@/components/laventecare/LaventeCareSignalsView";
import { LaventeCareFunnelView } from "@/components/laventecare/LaventeCareFunnelView";
import { LaventeCareOperationsView } from "@/components/laventecare/LaventeCareOperationsView";
import { LaventeCareKnowledgeView } from "@/components/laventecare/LaventeCareKnowledgeView";
import { MetricCard } from "@/components/laventecare/LaventeCareCards";
import { FileText, FolderKanban, Handshake, LifeBuoy, Sparkles, Target, Loader2, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Modal } from "@/components/ui/Modal";
import { LAVENTECARE_PROFILE } from "@/lib/laventecareData";

export default function LaventeCarePage() {
  const {
    cockpitLoading,
    documents,
    activeLeads,
    activeProjects,
    businessSignals,
    actionItems,
    followUps,
    openIncidents,
    openChanges,
    recentDecisions,
    summary,
    createLeadMut,
    updateLeadMut,
    convertLeadMut,
    createProjectMut,
    updateProjectMut,
    createActionMut,
    convertSignalMut,
    updateActionStatusMut,
    seedDocumentsMut,
  } = useLaventeCare();

  const { success, error: toastError } = useToast();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLeadForm);
  const [projectForm, setProjectForm] = useState<ProjectForm>(emptyProjectForm);
  const [savingLead, setSavingLead] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [processingSignal, setProcessingSignal] = useState<string | null>(null);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [processingLead, setProcessingLead] = useState<string | null>(null);
  const [processingProject, setProcessingProject] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
        company_name: optional(leadForm.companyName),
        website: optional(leadForm.website),
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

  const handleSeedDocuments = async () => {
    setSeeding(true);
    try {
      const docs = LAVENTECARE_DOCUMENTS.map((doc) => ({
        document_key: doc.key,
        titel: doc.title,
        categorie: doc.category,
        fase: doc.phase,
        versie: "2026-04",
        source_path: `bedrijfsplan/${doc.sourceFile}`,
        samenvatting: doc.summary,
        tags: doc.tags,
      }));
      const result = await seedDocumentsMut.mutateAsync(docs);
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
        businessSignals={businessSignals}
        seeding={seeding}
        showLeadForm={showLeadForm}
        setShowLeadForm={setShowLeadForm}
        showProjectForm={showProjectForm}
        setShowProjectForm={setShowProjectForm}
        leadForm={leadForm}
        setLeadForm={setLeadForm}
        savingLead={savingLead}
        handleSeedDocuments={handleSeedDocuments}
        handleLeadSubmit={handleLeadSubmit}
      />

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7">
        <section className="glass p-5">
          <div className="grid gap-5 lg:grid-cols-[1.3fr_0.7fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <Sparkles size={14} />
                Geintegreerde businesslaag actief
              </div>
              <h2 className="mt-4 max-w-3xl text-2xl font-bold text-white sm:text-3xl">
                Van bedrijfsdocumentatie naar een werkbaar LaventeCare-systeem.
              </h2>
              <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-400">
                {LAVENTECARE_PROFILE.kernbelofte}
              </p>
            </div>
            <div className="glass p-4 bg-[var(--color-surface)]">
              <p className="text-sm font-semibold text-white">Integratieprincipe</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Leads, projecten, documenten, decisions, change requests en SLA-signalen staan nu als eigen domein klaar voor Brain, Telegram, Agenda, Email, Notities en Finance.
              </p>
            </div>
          </div>
        </section>

        <Modal
          isOpen={showLeadForm}
          onClose={() => setShowLeadForm(false)}
          title="Nieuwe lead kwalificeren"
          icon={<Target size={18} className="text-sky-300" />}
          theme="primary"
          maxWidth="2xl"
        >
          <form onSubmit={handleLeadSubmit} className="grid gap-3 lg:grid-cols-6">
            <label className="block lg:col-span-2">
              <span className="text-xs font-semibold text-slate-400">Titel</span>
              <input
                value={leadForm.titel}
                onChange={(event) => setLeadForm((form) => ({ ...form, titel: event.target.value }))}
                placeholder="Bijv. automatisering klantintake"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-xs font-semibold text-slate-400">Bedrijf</span>
              <input
                value={leadForm.companyName}
                onChange={(event) => setLeadForm((form) => ({ ...form, companyName: event.target.value }))}
                placeholder="Bedrijfsnaam"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-xs font-semibold text-slate-400">Website</span>
              <input
                value={leadForm.website}
                onChange={(event) => setLeadForm((form) => ({ ...form, website: event.target.value }))}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="block lg:col-span-3">
              <span className="text-xs font-semibold text-slate-400">Pijnpunt</span>
              <textarea
                value={leadForm.pijnpunt}
                onChange={(event) => setLeadForm((form) => ({ ...form, pijnpunt: event.target.value }))}
                placeholder="Welke workflow, foutkans of groeirem speelt er?"
                rows={3}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
              ></textarea>
            </label>
            <label className="block lg:col-span-3">
              <span className="text-xs font-semibold text-slate-400">Volgende stap</span>
              <textarea
                value={leadForm.volgendeStap}
                onChange={(event) => setLeadForm((form) => ({ ...form, volgendeStap: event.target.value }))}
                placeholder="Bijv. discovery-call plannen"
                rows={3}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
              ></textarea>
            </label>
            <div className="lg:col-span-6 flex items-end gap-3 justify-end mt-2">
              <label className="block flex-1 max-w-[200px]">
                <span className="text-xs font-semibold text-slate-400">Prioriteit</span>
                <select
                  value={leadForm.prioriteit}
                  onChange={(event) => setLeadForm((form) => ({ ...form, prioriteit: event.target.value as any }))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)]"
                >
                  <option value="laag">Laag</option>
                  <option value="normaal">Normaal</option>
                  <option value="hoog">Hoog</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={savingLead}
                className="btn btn--primary flex-1 max-w-[150px] justify-center"
              >
                {savingLead ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Opslaan
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={showProjectForm}
          onClose={() => setShowProjectForm(false)}
          title="Nieuw project toevoegen"
          icon={<FolderKanban size={18} className="text-emerald-300" />}
          theme="emerald"
          maxWidth="2xl"
        >
          <form onSubmit={handleProjectSubmit} className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Naam</span>
              <input
                value={projectForm.naam}
                onChange={(event) => setProjectForm((form) => ({ ...form, naam: event.target.value }))}
                placeholder="Naam van het project"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Fase</span>
              <select
                value={projectForm.fase}
                onChange={(event) => setProjectForm((form) => ({ ...form, fase: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
              >
                <option value="intake">Intake</option>
                <option value="offerte">Offerte</option>
                <option value="planning">Planning</option>
                <option value="uitvoering">Uitvoering</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Waarde Indicatie (€)</span>
              <input
                type="number"
                value={projectForm.waardeIndicatie}
                onChange={(event) => setProjectForm((form) => ({ ...form, waardeIndicatie: event.target.value ? Number(event.target.value) : "" }))}
                placeholder="Bijv. 1500"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">Deadline</span>
              <input
                type="date"
                value={projectForm.deadline}
                onChange={(event) => setProjectForm((form) => ({ ...form, deadline: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-emerald-500"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-slate-400">Samenvatting / Beschrijving</span>
              <textarea
                value={projectForm.samenvatting}
                onChange={(event) => setProjectForm((form) => ({ ...form, samenvatting: event.target.value }))}
                placeholder="Waar gaat het project over?"
                rows={3}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-emerald-500"
              ></textarea>
            </label>
            <div className="sm:col-span-2 flex justify-end mt-4 pt-4 border-t border-white/5">
              <button
                type="button"
                onClick={() => setShowProjectForm(false)}
                className="mr-3 px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={savingProject}
                className="btn px-6 bg-emerald-500 hover:bg-emerald-600 text-white border-transparent"
              >
                {savingProject ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
                Project toevoegen
              </button>
            </div>
          </form>
        </Modal>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={Handshake} label="Open leads" value={summary.activeLeads} detail={`${summary.leads} totaal in de funnel`} tone="sky" />
          <MetricCard icon={FolderKanban} label="Actieve projecten" value={summary.activeProjects} detail={`${summary.projects} projecten geregistreerd`} tone="emerald" />
          <MetricCard icon={Sparkles} label="Signalen" value={businessSignals.length} detail={`${summary.actionItems ?? 0} acties open`} tone="violet" />
          <MetricCard icon={FileText} label="Documentbasis" value={`${summary.documents}/24`} detail={summary.documentsSeeded ? "Geïndexeerd in PostgreSQL" : "Catalogus klaar om te initialiseren"} tone="amber" />
          <MetricCard icon={LifeBuoy} label="SLA signalen" value={summary.openIncidents} detail={`${summary.openChanges} open change requests`} tone={summary.openIncidents > 0 ? "rose" : "violet"} />
        </section>

        <div className="flex flex-col gap-6 mt-2">
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
            title="Delivery Funnel"
            subtitle={`${activeLeads.length} leads en ${activeProjects.length} actieve projecten`}
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
            subtitle={`${summary.documents}/24 documenten geïndexeerd`}
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
