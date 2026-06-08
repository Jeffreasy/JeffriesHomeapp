"use client";

import { BookOpenText, BriefcaseBusiness, Building2, Loader2, Plus, Workflow, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { LAVENTECARE_PROFILE } from "@/lib/laventecare";
import type { LCCockpit } from "@/lib/api";

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
}: {
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
}) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-500/25 bg-sky-500/10">
                <BriefcaseBusiness size={18} className="text-sky-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-normal text-slate-500">
                  Bedrijfsbrein
                </p>
                <h1 className="mt-0.5 truncate text-xl font-bold text-white sm:text-2xl">LaventeCare Portal</h1>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 sm:text-sm">
                  {LAVENTECARE_PROFILE.rol}
                </p>
              </div>
            </div>

            <div className="flex w-full shrink-0 gap-2 overflow-x-auto pb-1 lg:w-auto lg:items-center lg:pb-0">
              <button
                type="button"
                onClick={handleSeedDocuments}
                disabled={seeding}
                aria-label={summary.documentsSeeded ? "LaventeCare documenten updaten" : "LaventeCare documenten initialiseren"}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                {seeding ? <Loader2 size={16} className="animate-spin" /> : <BookOpenText size={16} />}
                <span>{summary.documentsSeeded ? "Docs updaten" : "Docs initialiseren"}</span>
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={onToggleCompanyForm}
                aria-label={showCompanyForm ? "Klantformulier sluiten" : "Nieuwe klant toevoegen"}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-xs font-semibold text-amber-300 transition-colors hover:bg-amber-500/25 sm:text-sm"
              >
                {showCompanyForm ? <X size={16} /> : <Building2 size={16} />}
                <span>Klant</span>
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowWorkstreamForm((value) => !value)}
                aria-label={showWorkstreamForm ? "Opdrachtformulier sluiten" : "Nieuwe opdracht toevoegen"}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/15 px-3 text-xs font-semibold text-violet-300 transition-colors hover:bg-violet-500/25 sm:text-sm"
              >
                {showWorkstreamForm ? <X size={16} /> : <Workflow size={16} />}
                <span>Opdracht</span>
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowProjectForm((value) => !value)}
                aria-label={showProjectForm ? "Projectformulier sluiten" : "Nieuw project starten"}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 sm:text-sm"
              >
                {showProjectForm ? <X size={16} /> : <Plus size={16} />}
                <span>Project starten</span>
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowLeadForm((value) => !value)}
                aria-label={showLeadForm ? "Leadformulier sluiten" : "Nieuwe lead toevoegen"}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/15 px-3 text-xs font-semibold text-sky-300 transition-colors hover:bg-sky-500/25 sm:text-sm"
              >
                {showLeadForm ? <X size={16} /> : <Plus size={16} />}
                <span>Nieuwe lead</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
