"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import {
  BookOpenText,
  BriefcaseBusiness,
  Building2,
  Ellipsis,
  Loader2,
  Plus,
  Workflow,
} from "lucide-react";
import { AppPageHeader } from "@/components/layout/AppPageShell";
import { BottomSheet } from "@/components/ui/BottomSheet";
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

const secondaryActionClass =
  "flex min-h-12 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-left text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60";

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
  const [actionsOpen, setActionsOpen] = useState(false);

  const runAction = (action: () => void) => {
    setActionsOpen(false);
    action();
  };

  return (
    <>
      <AppPageHeader
        eyebrow="Bedrijfsbrein"
        title="LaventeCare Portal"
        description={LAVENTECARE_PROFILE.rol}
        leading={
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10">
            <BriefcaseBusiness size={19} className="text-sky-300" aria-hidden="true" />
          </div>
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => setShowLeadForm(true)}
              aria-expanded={showLeadForm}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 px-4 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/25"
            >
              <Plus size={16} aria-hidden="true" />
              Nieuwe lead
            </button>
            <button
              type="button"
              onClick={() => setActionsOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={actionsOpen}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
            >
              <Ellipsis size={18} aria-hidden="true" />
              <span className="hidden sm:inline">Meer</span>
              <span className="sr-only sm:hidden">Meer acties</span>
            </button>
          </>
        }
      />

      <BottomSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title="LaventeCare acties"
        contentClassName="p-4"
      >
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => runAction(onToggleCompanyForm)}
            aria-expanded={showCompanyForm}
            className={secondaryActionClass}
          >
            <Building2 size={18} className="text-amber-300" aria-hidden="true" />
            Nieuwe klant
          </button>
          <button
            type="button"
            onClick={() => runAction(() => setShowWorkstreamForm(true))}
            aria-expanded={showWorkstreamForm}
            className={secondaryActionClass}
          >
            <Workflow size={18} className="text-violet-300" aria-hidden="true" />
            Nieuwe opdracht
          </button>
          <button
            type="button"
            onClick={() => runAction(() => setShowProjectForm(true))}
            aria-expanded={showProjectForm}
            className={secondaryActionClass}
          >
            <Plus size={18} className="text-emerald-300" aria-hidden="true" />
            Nieuw project
          </button>
          <button
            type="button"
            onClick={() => runAction(handleSeedDocuments)}
            disabled={seeding}
            className={secondaryActionClass}
          >
            {seeding ? (
              <Loader2 size={18} className="animate-spin text-slate-300" aria-hidden="true" />
            ) : (
              <BookOpenText size={18} className="text-slate-300" aria-hidden="true" />
            )}
            {summary.documentsSeeded ? "Documenten bijwerken" : "Documenten initialiseren"}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
