"use client";

import type { Dispatch, SetStateAction } from "react";
import {
  BookOpenText,
  Building2,
  Plus,
  Workflow,
} from "lucide-react";
import { AppPageHeader } from "@/components/layout/AppPageShell";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { ResponsiveActions } from "@/components/ui/ResponsiveActions";
import { LAVENTECARE_PROFILE } from "@/lib/laventecare";
import type { LCCockpit } from "@/lib/api";

interface LaventeCareHeaderProps {
  summary: LCCockpit["summary"];
  seeding: boolean;
  showLeadForm: boolean;
  setShowLeadForm: Dispatch<SetStateAction<boolean>>;
  showCompanyForm: boolean;
  onToggleCompanyForm: () => void;
  showProjectForm: boolean;
  setShowProjectForm: Dispatch<SetStateAction<boolean>>;
  showWorkstreamForm: boolean;
  setShowWorkstreamForm: Dispatch<SetStateAction<boolean>>;
  handleSeedDocuments: () => void;
}

export function LaventeCareHeader({
  summary,
  seeding,
  showLeadForm,
  setShowLeadForm,
  showCompanyForm,
  onToggleCompanyForm,
  showProjectForm,
  setShowProjectForm,
  showWorkstreamForm,
  setShowWorkstreamForm,
  handleSeedDocuments,
}: LaventeCareHeaderProps) {
  return (
    <AppPageHeader
      eyebrow="Bedrijfsbrein"
      title="LaventeCare Portal"
      description={LAVENTECARE_PROFILE.rol}
      leading={<AppIcon name="business" tone="info" size="lg" framed active />}
      actions={
        <ResponsiveActions
          menuLabel="LaventeCare acties"
          primary={
            <Button
              onClick={() => setShowLeadForm(true)}
              aria-expanded={showLeadForm}
              variant="primary"
            >
              <Plus size={16} aria-hidden="true" />
              Nieuwe lead
            </Button>
          }
          secondary={
            <>
              <Button
                onClick={onToggleCompanyForm}
                aria-expanded={showCompanyForm}
                variant="secondary"
                className="w-full justify-start sm:w-auto sm:justify-center"
              >
                <Building2 size={18} aria-hidden="true" />
                Nieuwe klant
              </Button>
              <Button
                onClick={() => setShowWorkstreamForm(true)}
                aria-expanded={showWorkstreamForm}
                variant="secondary"
                className="w-full justify-start sm:w-auto sm:justify-center"
              >
                <Workflow size={18} aria-hidden="true" />
                Nieuwe opdracht
              </Button>
              <Button
                onClick={() => setShowProjectForm(true)}
                aria-expanded={showProjectForm}
                variant="secondary"
                className="w-full justify-start sm:w-auto sm:justify-center"
              >
                <Plus size={18} aria-hidden="true" />
                Nieuw project
              </Button>
              <Button
                onClick={handleSeedDocuments}
                loading={seeding}
                loadingLabel={summary.documentsSeeded ? "Documenten bijwerken…" : "Documenten initialiseren…"}
                variant="secondary"
                className="w-full justify-start sm:w-auto sm:justify-center"
              >
                <BookOpenText size={18} aria-hidden="true" />
                {summary.documentsSeeded ? "Documenten bijwerken" : "Documenten initialiseren"}
              </Button>
            </>
          }
        />
      }
    />
  );
}
