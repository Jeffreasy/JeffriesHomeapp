"use client";

import { FormEvent, useState, useMemo } from "react";
import { useToast } from "@/components/ui/Toast";
import { LAVENTECARE_DOCUMENTS } from "@/lib/laventecareData";
import { useLaventeCare } from "@/hooks/useLaventeCare";
import { type LeadForm, type BusinessSignal, type ActionItem, type LeadItem, type ProjectItem, emptyLeadForm } from "@/components/laventecare/LaventeCareTypes";
import { label, optional } from "@/components/laventecare/LaventeCareUtils";

import { LaventeCareHeader } from "@/components/laventecare/LaventeCareHeader";
import { LaventeCareSignalsView } from "@/components/laventecare/LaventeCareSignalsView";
import { LaventeCareFunnelView } from "@/components/laventecare/LaventeCareFunnelView";
import { LaventeCareOperationsView } from "@/components/laventecare/LaventeCareOperationsView";
import { LaventeCareKnowledgeView } from "@/components/laventecare/LaventeCareKnowledgeView";

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
    updateProjectMut,
    createActionMut,
    convertSignalMut,
    updateActionStatusMut,
    seedDocumentsMut,
  } = useLaventeCare();

  const { success, error: toastError } = useToast();
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadForm, setLeadForm] = useState<LeadForm>(emptyLeadForm);
  const [savingLead, setSavingLead] = useState(false);
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
      <div className="min-h-screen px-4 py-10 sm:px-6">
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
    <div className="min-h-screen">
      <LaventeCareHeader
        summary={summary}
        businessSignals={businessSignals}
        seeding={seeding}
        showLeadForm={showLeadForm}
        setShowLeadForm={setShowLeadForm}
        leadForm={leadForm}
        setLeadForm={setLeadForm}
        savingLead={savingLead}
        handleSeedDocuments={handleSeedDocuments}
        handleLeadSubmit={handleLeadSubmit}
      />

      <main className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-6">
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

        <LaventeCareFunnelView
          activeLeads={activeLeads}
          activeProjects={activeProjects}
          processingLead={processingLead}
          processingProject={processingProject}
          handleLeadStatus={handleLeadStatus}
          handleLeadToProject={handleLeadToProject}
          handleProjectStatus={handleProjectStatus}
        />

        <LaventeCareOperationsView
          recentDecisions={recentDecisions}
          openChanges={openChanges}
          openIncidents={openIncidents}
        />

        <LaventeCareKnowledgeView
          search={search}
          setSearch={setSearch}
          documentGroups={documentGroups}
        />
      </main>
    </div>
  );
}
