"use client";

import { ArrowRight, CheckCircle2, Clock3, Flag, FolderKanban, Handshake, Layers3, Loader2, ShieldCheck } from "lucide-react";
import { LAVENTECARE_FIT_CRITERIA, LAVENTECARE_NO_FIT_SIGNALS, LAVENTECARE_PROCESS_STAGES } from "@/lib/laventecareData";
import { cn } from "@/lib/utils";
import { fitTone, formatDate, formatMoney, label, toneClasses } from "./LaventeCareUtils";
import { EmptyState } from "./LaventeCareCards";
import type { LeadItem, ProjectItem } from "./LaventeCareTypes";

export function LaventeCareFunnelView({
  activeLeads,
  activeProjects,
  processingLead,
  processingProject,
  handleLeadStatus,
  handleLeadToProject,
  handleProjectStatus,
}: {
  activeLeads: LeadItem[];
  activeProjects: ProjectItem[];
  processingLead: string | null;
  processingProject: string | null;
  handleLeadStatus: (lead: LeadItem, status: string) => Promise<void>;
  handleLeadToProject: (lead: LeadItem) => Promise<void>;
  handleProjectStatus: (project: ProjectItem, fields: { fase?: string; status?: string }) => Promise<void>;
}) {
  return (
    <>
      <section className="mt-5 grid gap-5 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Proces</p>
              <h2 className="mt-1 text-lg font-bold text-white">Van intake naar doorontwikkeling</h2>
            </div>
            <Layers3 size={20} className="text-slate-400" />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {LAVENTECARE_PROCESS_STAGES.map((stage, index) => (
              <div key={stage.key} className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-sm font-bold text-slate-200">
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

        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-300" />
            <h2 className="text-lg font-bold text-white">Fit guardrails</h2>
          </div>
          <div className="mt-4 space-y-3">
            {LAVENTECARE_FIT_CRITERIA.slice(0, 5).map((item) => (
              <div key={item} className="flex gap-3 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] p-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-300" />
                <p className="text-sm leading-5 text-slate-300">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg border border-rose-500/15 bg-rose-500/[0.06] p-4">
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
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
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
                  <div key={lead._id ?? lead.titel} className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
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
                      <div className="mt-4 grid gap-2 sm:grid-cols-4">
                        {["intake", "discovery", "voorstel"].map((status) => {
                          const busy = processingLead === `${lead._id}:${status}`;
                          return (
                            <button
                              key={status}
                              type="button"
                              onClick={() => handleLeadStatus(lead, status)}
                              disabled={Boolean(processingLead)}
                              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
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
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Delivery</p>
              <h2 className="mt-1 text-lg font-bold text-white">Actieve projecten</h2>
            </div>
            <FolderKanban size={20} className="text-emerald-300" />
          </div>
          <div className="mt-4 space-y-3">
            {activeProjects.length === 0 ? (
              <EmptyState title="Nog geen projecten" body="Zodra leads doorgaan naar delivery ontstaat hier de projectlaag met fase, status, waarde en deadlines." />
            ) : (
              activeProjects.map((project) => (
                <div key={project._id ?? project.naam} className="rounded-lg border border-white/10 bg-[#0d1119] p-4">
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
                  {project._id && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      {["discovery", "blueprint", "realisatie"].map((fase) => {
                        const busy = processingProject === `${project._id}:fase:${fase}`;
                        return (
                          <button
                            key={fase}
                            type="button"
                            onClick={() => handleProjectStatus(project, { fase })}
                            disabled={Boolean(processingProject)}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-2 text-xs font-bold text-slate-200 transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busy && <Loader2 size={13} className="animate-spin" />}
                            {label(fase)}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => handleProjectStatus(project, { status: project.status === "wacht_op_klant" ? "actief" : "wacht_op_klant" })}
                        disabled={Boolean(processingProject)}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 text-xs font-bold text-amber-100 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processingProject?.startsWith(`${project._id}:status`) ? <Loader2 size={13} className="animate-spin" /> : <Clock3 size={13} />}
                        {project.status === "wacht_op_klant" ? "Actief" : "Wacht"}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </>
  );
}
