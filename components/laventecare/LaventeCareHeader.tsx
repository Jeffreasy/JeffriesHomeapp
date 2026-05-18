"use client";

import { BookOpenText, BriefcaseBusiness, FileText, FolderKanban, Handshake, LifeBuoy, Loader2, Plus, Sparkles, Target, X } from "lucide-react";
import { motion } from "framer-motion";
import type { FormEvent, Dispatch, SetStateAction } from "react";
import { LAVENTECARE_PROFILE } from "@/lib/laventecareData";
import { MetricCard } from "./LaventeCareCards";
import type { LeadForm, BusinessSignal, ActionItem } from "./LaventeCareTypes";

export function LaventeCareHeader({
  summary,
  businessSignals,
  seeding,
  showLeadForm,
  setShowLeadForm,
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
  leadForm: LeadForm;
  setLeadForm: Dispatch<SetStateAction<LeadForm>>;
  savingLead: boolean;
  handleSeedDocuments: () => void;
  handleLeadSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10">
              <BriefcaseBusiness size={21} className="text-sky-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Bedrijfsbrein</p>
              <h1 className="mt-0.5 truncate text-2xl font-bold text-white">LaventeCare Cockpit</h1>
              <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{LAVENTECARE_PROFILE.rol}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleSeedDocuments}
              disabled={seeding}
              className="btn btn--ghost"
            >
              {seeding ? <Loader2 size={16} className="animate-spin" /> : <BookOpenText size={16} />}
              <span>{summary.documentsSeeded ? "Documentbasis bijwerken" : "Documentbasis initialiseren"}</span>
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => setShowLeadForm((value) => !value)}
              className="btn btn--primary"
            >
              {showLeadForm ? <X size={16} /> : <Plus size={16} />}
              <span>Nieuwe lead</span>
            </motion.button>
          </div>
        </div>
      </header>

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

      {showLeadForm && (
        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 glass p-5 border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]"
        >
          <div className="mb-4 flex items-center gap-2">
            <Target size={18} className="text-sky-300" />
            <h2 className="text-lg font-bold text-white">Nieuwe lead kwalificeren</h2>
          </div>
          <form onSubmit={handleLeadSubmit} className="grid gap-3 lg:grid-cols-6">
            <label className="lg:col-span-2">
              <span className="text-xs font-semibold text-slate-400">Titel</span>
              <input
                value={leadForm.titel}
                onChange={(event) => setLeadForm((form) => ({ ...form, titel: event.target.value }))}
                placeholder="Bijv. automatisering klantintake"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="lg:col-span-2">
              <span className="text-xs font-semibold text-slate-400">Bedrijf</span>
              <input
                value={leadForm.companyName}
                onChange={(event) => setLeadForm((form) => ({ ...form, companyName: event.target.value }))}
                placeholder="Bedrijfsnaam"
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="lg:col-span-2">
              <span className="text-xs font-semibold text-slate-400">Website</span>
              <input
                value={leadForm.website}
                onChange={(event) => setLeadForm((form) => ({ ...form, website: event.target.value }))}
                placeholder="https://..."
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="lg:col-span-3">
              <span className="text-xs font-semibold text-slate-400">Pijnpunt</span>
              <textarea
                value={leadForm.pijnpunt}
                onChange={(event) => setLeadForm((form) => ({ ...form, pijnpunt: event.target.value }))}
                placeholder="Welke workflow, foutkans of groeirem speelt er?"
                rows={3}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
              />
            </label>
            <label className="lg:col-span-2">
              <span className="text-xs font-semibold text-slate-400">Volgende stap</span>
              <textarea
                value={leadForm.volgendeStap}
                onChange={(event) => setLeadForm((form) => ({ ...form, volgendeStap: event.target.value }))}
                placeholder="Bijv. discovery-call plannen"
                rows={3}
                className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-[var(--color-primary)]"
              />
            </label>
            <div>
              <label>
                <span className="text-xs font-semibold text-slate-400">Prioriteit</span>
                <select
                  value={leadForm.prioriteit}
                  onChange={(event) => setLeadForm((form) => ({ ...form, prioriteit: event.target.value as any }))}
                  className="mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[var(--color-primary)]"
                >
                  <option value="laag">Laag</option>
                  <option value="normaal">Normaal</option>
                  <option value="hoog">Hoog</option>
                </select>
              </label>
              <button
                type="submit"
                disabled={savingLead}
                className="mt-3 btn btn--primary w-full justify-center"
              >
                {savingLead ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Opslaan
              </button>
            </div>
          </form>
        </motion.section>
      )}

      <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Handshake} label="Open leads" value={summary.activeLeads} detail={`${summary.leads} totaal in de funnel`} tone="sky" />
        <MetricCard icon={FolderKanban} label="Actieve projecten" value={summary.activeProjects} detail={`${summary.projects} projecten geregistreerd`} tone="emerald" />
        <MetricCard icon={Sparkles} label="Signalen" value={businessSignals.length} detail={`${summary.actionItems ?? 0} acties open`} tone="violet" />
        <MetricCard icon={FileText} label="Documentbasis" value={`${summary.documents}/24`} detail={summary.documentsSeeded ? "Geïndexeerd in PostgreSQL" : "Catalogus klaar om te initialiseren"} tone="amber" />
        <MetricCard icon={LifeBuoy} label="SLA signalen" value={summary.openIncidents} detail={`${summary.openChanges} open change requests`} tone={summary.openIncidents > 0 ? "rose" : "violet"} />
      </section>
    </>
  );
}
