"use client";

import { ArrowRight, CheckCircle2, Flag, FolderKanban, Handshake, Layers3, Loader2, ShieldCheck, Plus } from "lucide-react";
import { LAVENTECARE_FIT_CRITERIA, LAVENTECARE_NO_FIT_SIGNALS, LAVENTECARE_PROCESS_STAGES } from "@/lib/laventecare";
import { cn } from "@/lib/utils";
import { fitTone, formatDate, formatMoney, label, toneClasses } from "./LaventeCareUtils";
import { EmptyState } from "./LaventeCareCards";
import type { LeadItem, ProjectItem } from "./LaventeCareTypes";
import { LAVENTECARE_PROJECT_PHASES, LAVENTECARE_PROJECT_STATUSES } from "./LaventeCareTypes";

export function LaventeCareFunnelView({
  activeLeads,
  activeProjects,
  processingLead,
  processingProject,
  handleLeadStatus,
  handleLeadToProject,
  handleProjectStatus,
  onShowProjectForm,
}: {
  activeLeads: LeadItem[];
  activeProjects: ProjectItem[];
  processingLead: string | null;
  processingProject: string | null;
  handleLeadStatus: (lead: LeadItem, status: string) => Promise<void>;
  handleLeadToProject: (lead: LeadItem) => Promise<void>;
  handleProjectStatus: (project: ProjectItem, fields: { fase?: string; status?: string }) => Promise<void>;
  onShowProjectForm?: () => void;
}) {
  return (
    <>
      <details className="glass min-w-0 overflow-hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
              <Layers3 size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">Proces en fit guardrails</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">
                Intake, discovery, realisatie en no-fit signalering
              </span>
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-bold text-slate-400">
            {LAVENTECARE_PROCESS_STAGES.length} fases
          </span>
        </summary>

        <div className="grid grid-cols-1 gap-4 border-t border-white/10 p-4 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Proces</p>
                <h2 className="mt-1 text-lg font-bold text-white">Van intake naar doorontwikkeling</h2>
              </div>
              <Layers3 size={20} className="text-slate-400" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {LAVENTECARE_PROCESS_STAGES.map((stage, index) => (
                <div key={stage.key} className="min-w-0 rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-bold text-slate-200">
                      {index + 1}
                    </span>
                    <h3 className="font-semibold text-white">{stage.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{stage.summary}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-500">{stage.output}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-300" />
              <h2 className="text-lg font-bold text-white">Fit guardrails</h2>
            </div>
            <div className="mt-4 space-y-3">
              {LAVENTECARE_FIT_CRITERIA.slice(0, 5).map((item) => (
                <div key={item} className="flex min-w-0 gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] p-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                  <p className="text-sm leading-5 text-slate-300">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 min-w-0 rounded-lg border border-rose-500/15 bg-rose-500/[0.06] p-4">
              <p className="text-sm font-semibold text-rose-100">No-fit signalen</p>
              <ul className="mt-3 space-y-2">
                {LAVENTECARE_NO_FIT_SIGNALS.slice(0, 3).map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-5 text-slate-400">
                    <Flag size={14} className="mt-0.5 shrink-0 text-rose-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </details>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="glass min-w-0 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Funnel</p>
              <h2 className="mt-1 text-lg font-bold text-white">Actieve leads</h2>
            </div>
            <Handshake size={20} className="text-sky-300" />
          </div>
          <div className="mt-4 space-y-3">
            {activeLeads.length === 0 ? (
              <EmptyState title="Nog geen leads" body="Voeg je eerste lead toe om intake, fit-score en opvolging centraal te krijgen." />
            ) : (
              activeLeads.map((lead) => {
                const tone = toneClasses[fitTone(lead.fitScore)];
                return (
                  <div key={lead._id ?? lead.titel} className="glass min-w-0 p-4 bg-[var(--color-surface)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white">{lead.titel}</h3>
                        <p className="mt-1 text-xs text-slate-500">{label(lead.status)} - {lead.bron}</p>
                      </div>
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", tone.border, tone.surface, tone.text)}>
                        {lead.fitScore ?? 0}% fit
                      </span>
                    </div>
                    {lead.pijnpunt && <p className="mt-3 text-sm leading-6 text-slate-400">{lead.pijnpunt}</p>}
                    {lead.volgendeStap && (
                      <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sky-200">
                        <ArrowRight size={15} />
                        {lead.volgendeStap}
                      </p>
                    )}
                    {lead._id && (
                      <>
                        <div className="mt-4 grid gap-2 sm:grid-cols-4">
                          {["intake", "discovery", "voorstel"].map((status) => {
                            const busy = processingLead === `${lead._id}:${status}`;
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={() => handleLeadStatus(lead, status)}
                                disabled={Boolean(processingLead)}
                                className="btn btn--ghost btn--sm justify-center px-2 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {busy && <Loader2 size={13} className="animate-spin" />}
                                {label(status)}
                              </button>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => handleLeadToProject(lead)}
                            disabled={Boolean(processingLead)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 text-xs font-bold text-emerald-100 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {processingLead === `${lead._id}:project` ? <Loader2 size={13} className="animate-spin" /> : <FolderKanban size={13} />}
                            Project
                          </button>
                        </div>
                        {/* Close a lead out of the funnel: lost or not-a-fit. The
                            backend marks these terminal so the lead leaves the
                            active funnel automatically. */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-600">Sluiten:</span>
                          <button
                            type="button"
                            onClick={() => handleLeadStatus(lead, "verloren")}
                            disabled={Boolean(processingLead)}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.06] px-2.5 text-[11px] font-semibold text-rose-200 transition-colors hover:bg-rose-500/[0.12] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {processingLead === `${lead._id}:verloren` ? <Loader2 size={12} className="animate-spin" /> : <Flag size={12} />}
                            Verloren
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLeadStatus(lead, "gediskwalificeerd")}
                            disabled={Boolean(processingLead)}
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {processingLead === `${lead._id}:gediskwalificeerd` ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                            Niet-fit
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="glass min-w-0 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Delivery</p>
              <h2 className="mt-1 text-lg font-bold text-white">Actieve projecten</h2>
            </div>
            <div className="flex items-center gap-3">
              {onShowProjectForm && (
                <button
                  type="button"
                  onClick={onShowProjectForm}
                  aria-label="Nieuw LaventeCare project starten"
                  title="Nieuw project starten"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/20"
                >
                  <Plus size={16} />
                </button>
              )}
              <FolderKanban size={20} className="text-emerald-300" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {activeProjects.length === 0 ? (
              <EmptyState title="Nog geen projecten" body="Zodra leads doorgaan naar delivery ontstaat hier de projectlaag met fase, status, waarde en deadlines." />
            ) : (
              activeProjects.map((project) => {
                const projectId = project._id ?? project.id;
                return (
                  <div key={projectId ?? project.naam} className="glass min-w-0 p-4 bg-[var(--color-surface)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white">{project.naam}</h3>
                        <p className="mt-1 text-xs text-slate-500">{label(project.fase)} - {label(project.status)}</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-200">
                        {formatMoney(project.waardeIndicatie)}
                      </span>
                    </div>
                    {project.samenvatting && <p className="mt-3 text-sm leading-6 text-slate-400">{project.samenvatting}</p>}
                    {project.deadline && <p className="mt-3 text-xs font-semibold text-slate-500">Deadline: {formatDate(project.deadline)}</p>}
                    {projectId && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <label className="block">
                          <span className="sr-only">Projectfase</span>
                          <select
                            value={project.fase}
                            onChange={(event) => handleProjectStatus(project, { fase: event.target.value })}
                            disabled={Boolean(processingProject)}
                            className="min-h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 text-xs font-bold text-slate-200 outline-none transition focus:border-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {LAVENTECARE_PROJECT_PHASES.map((phase) => (
                              <option key={phase.value} value={phase.value}>
                                Fase: {phase.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="sr-only">Projectstatus</span>
                          <select
                            value={project.status}
                            onChange={(event) => handleProjectStatus(project, { status: event.target.value })}
                            disabled={Boolean(processingProject)}
                            className="min-h-9 w-full rounded-lg border border-white/10 bg-white/[0.03] px-2 text-xs font-bold text-slate-200 outline-none transition focus:border-amber-400/50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {LAVENTECARE_PROJECT_STATUSES.map((status) => (
                              <option key={status.value} value={status.value}>
                                Status: {status.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {processingProject?.startsWith(`${projectId}:`) ? (
                          <p className="sm:col-span-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <Loader2 size={13} className="animate-spin" />
                            Project wordt bijgewerkt
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>
    </>
  );
}
