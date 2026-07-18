"use client";

import { useState } from "react";
import { UsersRound, FolderKanban, Workflow, type LucideIcon } from "lucide-react";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
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
      <Tabs
        items={PIPELINE_TABS}
        value={tab}
        onValueChange={setTab}
        idPrefix="laventecare-pipeline"
        ariaLabel="Pipeline onderdelen"
        appearance="contained"
      />

      <TabPanel idPrefix="laventecare-pipeline" value={tab}>
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
      </TabPanel>
    </div>
  );
}
