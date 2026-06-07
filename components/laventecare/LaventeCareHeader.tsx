"use client";

import { BookOpenText, BriefcaseBusiness, Loader2, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import type { Dispatch, SetStateAction } from "react";
import { LAVENTECARE_PROFILE } from "@/lib/laventecare";
import type { LCCockpit } from "@/lib/api";

export function LaventeCareHeader({
  summary,
  seeding,
  showLeadForm,
  setShowLeadForm,
  showProjectForm,
  setShowProjectForm,
  handleSeedDocuments,
}: {
  summary: LCCockpit["summary"];
  seeding: boolean;
  showLeadForm: boolean;
  setShowLeadForm: Dispatch<SetStateAction<boolean>>;
  showProjectForm: boolean;
  setShowProjectForm: Dispatch<SetStateAction<boolean>>;
  handleSeedDocuments: () => void;
}) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-500/25 bg-sky-500/10">
                <BriefcaseBusiness size={20} className="text-sky-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Bedrijfsbrein
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold text-white">LaventeCare Cockpit</h1>
                <p className="mt-1 line-clamp-1 text-sm text-slate-500">
                  {LAVENTECARE_PROFILE.rol}
                </p>
              </div>
            </div>

            <div className="grid w-full shrink-0 grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center">
              <button
                type="button"
                onClick={handleSeedDocuments}
                disabled={seeding}
                aria-label={summary.documentsSeeded ? "LaventeCare documenten updaten" : "LaventeCare documenten initialiseren"}
                className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-1"
              >
                {seeding ? <Loader2 size={16} className="animate-spin" /> : <BookOpenText size={16} />}
                <span>{summary.documentsSeeded ? "Docs updaten" : "Docs initialiseren"}</span>
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowProjectForm((value) => !value)}
                aria-label={showProjectForm ? "Projectformulier sluiten" : "Nieuw project starten"}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 sm:px-4"
              >
                {showProjectForm ? <X size={16} /> : <Plus size={16} />}
                <span>Project starten</span>
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowLeadForm((value) => !value)}
                aria-label={showLeadForm ? "Leadformulier sluiten" : "Nieuwe lead toevoegen"}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/15 px-3 text-sm font-semibold text-sky-300 transition-colors hover:bg-sky-500/25 sm:px-4"
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
