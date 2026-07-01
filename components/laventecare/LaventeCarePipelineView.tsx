"use client";

import { useState } from "react";
import { UsersRound, FolderKanban, Workflow, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LaventeCareCustomersView } from "./LaventeCareCustomersView";
import { LaventeCareFunnelView } from "./LaventeCareFunnelView";
import { LaventeCareWorkstreamsView } from "./LaventeCareWorkstreamsView";
import type {
  CompanyItem,
  ContactItem,
  DossierDocumentItem,
  LeadItem,
  ProjectItem,
  WorkstreamItem,
} from "./LaventeCareTypes";

type PipelineTab = "customers" | "funnel" | "workstreams";

const PIPELINE_TABS: { id: PipelineTab; label: string; icon: LucideIcon }[] = [
  { id: "customers", label: "Klanten", icon: UsersRound },
  { id: "funnel", label: "Funnel", icon: FolderKanban },
  { id: "workstreams", label: "Opdrachten", icon: Workflow },
];

export function LaventeCarePipelineView({
  companies,
  contacts,
  workstreams,
  activeLeads,
  activeProjects,
  dossierDocuments,
  onShowCompanyForm,
  onEditCompany,
  onAddContact,
  onEditContact,
  onStartWorkstream,
  onOpenDossier,
  processingLead,
  processingProject,
  handleLeadStatus,
  handleLeadToProject,
  handleProjectStatus,
  onShowProjectForm,
  activeWorkstreamCount,
  processingWorkstream,
  onShowWorkstreamForm,
  handleWorkstreamStatus,
  handleWorkstreamToProject,
}: {
  companies: CompanyItem[];
  contacts: ContactItem[];
  workstreams: WorkstreamItem[];
  activeLeads: LeadItem[];
  activeProjects: ProjectItem[];
  dossierDocuments: DossierDocumentItem[];
  onShowCompanyForm: () => void;
  onEditCompany: (company: CompanyItem) => void;
  onAddContact: (company: CompanyItem) => void;
  onEditContact: (contact: ContactItem) => void;
  onStartWorkstream: (company: CompanyItem) => void;
  onOpenDossier: (company: CompanyItem) => void;
  processingLead: string | null;
  processingProject: string | null;
  handleLeadStatus: (lead: LeadItem, status: string) => Promise<void>;
  handleLeadToProject: (lead: LeadItem) => Promise<void>;
  handleProjectStatus: (project: ProjectItem, fields: { fase?: string; status?: string }) => Promise<void>;
  onShowProjectForm?: () => void;
  activeWorkstreamCount: number;
  processingWorkstream: string | null;
  onShowWorkstreamForm: () => void;
  handleWorkstreamStatus: (workstream: WorkstreamItem, fields: { status?: string }) => Promise<void>;
  handleWorkstreamToProject: (workstream: WorkstreamItem) => Promise<void>;
}) {
  const [tab, setTab] = useState<PipelineTab>("customers");

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex gap-1.5 overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-1">
        {PIPELINE_TABS.map(({ id, label: tabLabel, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex h-9 min-w-0 flex-1 shrink-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition sm:flex-none sm:min-w-[132px]",
                active
                  ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                  : "border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-white"
              )}
            >
              <Icon size={15} />
              {tabLabel}
            </button>
          );
        })}
      </div>

      {tab === "customers" ? (
        <LaventeCareCustomersView
          companies={companies}
          contacts={contacts}
          activeLeads={activeLeads}
          activeWorkstreams={workstreams}
          activeProjects={activeProjects}
          dossierDocuments={dossierDocuments}
          onShowCompanyForm={onShowCompanyForm}
          onEditCompany={onEditCompany}
          onAddContact={onAddContact}
          onEditContact={onEditContact}
          onStartWorkstream={onStartWorkstream}
          onOpenDossier={onOpenDossier}
        />
      ) : null}

      {tab === "funnel" ? (
        <LaventeCareFunnelView
          activeLeads={activeLeads}
          activeProjects={activeProjects}
          processingLead={processingLead}
          processingProject={processingProject}
          handleLeadStatus={handleLeadStatus}
          handleLeadToProject={handleLeadToProject}
          handleProjectStatus={handleProjectStatus}
          onShowProjectForm={onShowProjectForm}
        />
      ) : null}

      {tab === "workstreams" ? (
        <LaventeCareWorkstreamsView
          workstreams={workstreams}
          projects={activeProjects}
          activeWorkstreamCount={activeWorkstreamCount}
          processingWorkstream={processingWorkstream}
          onShowWorkstreamForm={onShowWorkstreamForm}
          handleWorkstreamStatus={handleWorkstreamStatus}
          handleWorkstreamToProject={handleWorkstreamToProject}
        />
      ) : null}
    </div>
  );
}
