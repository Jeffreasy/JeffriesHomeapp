"use client";

import { BookOpenText, BriefcaseBusiness, Loader2, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import type { FormEvent, Dispatch, SetStateAction } from "react";
import { LAVENTECARE_PROFILE } from "@/lib/laventecareData";
import type { LeadForm, BusinessSignal } from "./LaventeCareTypes";

export function LaventeCareHeader({
  summary,
  businessSignals,
  seeding,
  showLeadForm,
  setShowLeadForm,
  showProjectForm,
  setShowProjectForm,
  leadForm,
  setLeadForm,
  savingLead,
  handleSeedDocuments,
  handleLeadSubmit,
}: {
  summary: any;
  businessSignals: BusinessSignal[];
  seeding: boolean;
  showLeadForm: boolean;
  setShowLeadForm: Dispatch<SetStateAction<boolean>>;
  showProjectForm: boolean;
  setShowProjectForm: Dispatch<SetStateAction<boolean>>;
  leadForm: LeadForm;
  setLeadForm: Dispatch<SetStateAction<LeadForm>>;
  savingLead: boolean;
  handleSeedDocuments: () => void;
  handleLeadSubmit: (event: FormEvent<HTMLFormElement>) => void;
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

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={handleSeedDocuments}
                disabled={seeding}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {seeding ? <Loader2 size={16} className="animate-spin" /> : <BookOpenText size={16} />}
                <span className="hidden sm:inline">{summary.documentsSeeded ? "Docs updaten" : "Docs initialiseren"}</span>
              </button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowProjectForm((value) => !value)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-500/15 px-4 text-sm font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/25 border border-emerald-500/30"
              >
                {showProjectForm ? <X size={16} /> : <Plus size={16} />}
                <span>Project starten</span>
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={() => setShowLeadForm((value) => !value)}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-sky-500/15 px-4 text-sm font-semibold text-sky-300 transition-colors hover:bg-sky-500/25 border border-sky-500/30"
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
