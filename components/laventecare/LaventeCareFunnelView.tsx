"use client";

import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";

import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { surfaceVariants } from "@/components/ui/Surface";
import { ArrowRight, CheckCircle2, Flag, FolderKanban, Handshake, Layers3, Loader2, ShieldCheck, Plus } from "lucide-react";
import { LAVENTECARE_FIT_CRITERIA, LAVENTECARE_NO_FIT_SIGNALS, LAVENTECARE_PROCESS_STAGES } from "@/lib/laventecare";
import { cn } from "@/lib/utils";
import { fitTone, formatDate, formatMoney, label, projectFaseLabel, projectStatusLabel, toneClasses } from "./LaventeCareUtils";
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
      <details className={cn(surfaceVariants({ padding: "none" }), "min-w-0 overflow-hidden")}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 marker:hidden">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)]">
              <Layers3 size={17} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-[var(--color-text)]">Proces en fit guardrails</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
                Intake, discovery, realisatie en no-fit signalering
              </span>
            </span>
          </span>
          <span className="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-micro font-bold text-[var(--color-text-muted)]">
            {LAVENTECARE_PROCESS_STAGES.length} fases
          </span>
        </summary>

        <div className="grid grid-cols-1 gap-4 border-t border-[var(--color-border)] p-4 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Proces</p>
                <h2 className="mt-1 text-lg font-bold text-[var(--color-text)]">Van intake naar doorontwikkeling</h2>
              </div>
              <Layers3 size={20} className="text-[var(--color-text-muted)]" />
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {LAVENTECARE_PROCESS_STAGES.map((stage, index) => (
                <div key={stage.key} className="min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-bold text-[var(--color-text)]">
                      {index + 1}
                    </span>
                    <h3 className="font-semibold text-[var(--color-text)]">{stage.title}</h3>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{stage.summary}</p>
                  <p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">{stage.output}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-[var(--color-success)]" />
              <h2 className="text-lg font-bold text-[var(--color-text)]">Fit guardrails</h2>
            </div>
            <div className="mt-4 space-y-3">
              {LAVENTECARE_FIT_CRITERIA.slice(0, 5).map((item) => (
                <div key={item} className="flex min-w-0 gap-3 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] p-3">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
                  <p className="text-sm leading-5 text-[var(--color-text-muted)]">{item}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 min-w-0 rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)] p-4">
              <p className="text-sm font-semibold text-[var(--color-danger)]">No-fit signalen</p>
              <ul className="mt-3 space-y-2">
                {LAVENTECARE_NO_FIT_SIGNALS.slice(0, 3).map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-5 text-[var(--color-text-muted)]">
                    <Flag size={14} className="mt-0.5 shrink-0 text-[var(--color-danger)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </details>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Funnel</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--color-text)]">Actieve leads</h2>
            </div>
            <Handshake size={20} className="text-[var(--color-info)]" />
          </div>
          <div className="mt-4 space-y-3">
            {activeLeads.length === 0 ? (
              <EmptyState title="Nog geen leads" body="Voeg je eerste lead toe om intake, fit-score en opvolging centraal te krijgen." />
            ) : (
              activeLeads.map((lead) => {
                const tone = toneClasses[fitTone(lead.fitScore)];
                const leadBusy = Boolean(lead._id && processingLead?.startsWith(`${lead._id}:`));
                return (
                  <div key={lead._id ?? lead.titel} className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-4")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[var(--color-text)]">{lead.titel}</h3>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{label(lead.status)} - {lead.bron}</p>
                      </div>
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-bold", tone.border, tone.surface, tone.text)}>
                        {typeof lead.fitScore === "number"
                          ? `${lead.fitScore}% fit`
                          : "Nog geen fit-score"}
                      </span>
                    </div>
                    {lead.pijnpunt && <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{lead.pijnpunt}</p>}
                    {lead.volgendeStap && (
                      <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-info)]">
                        <ArrowRight size={15} />
                        {lead.volgendeStap}
                      </p>
                    )}
                    {lead._id && (
                      <>
                        <div className="mt-4 grid gap-2 sm:grid-cols-4">
                          {["intake", "discovery", "voorstel"].map((status) => {
                            const busy = processingLead === `${lead._id}:${status}`;
                            const isCurrent = lead.status === status;
                            return (
                              <Button
                                key={status}
                                type="button"
                                onClick={() => handleLeadStatus(lead, status)}
                                disabled={leadBusy}
                                aria-pressed={isCurrent}
                                title={isCurrent ? "Huidige status" : undefined}
                                variant="ghost"
                                size="sm"
                                className={cn(
                                  "px-2",
                                  isCurrent &&
                                    "border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)] ring-1 ring-inset ring-[var(--color-info)]",
                                )}
                              >
                                {busy && <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />}
                                {label(status)}
                              </Button>
                            );
                          })}
                          <Button
                            type="button"
                            variant="success"
                            size="sm"
                            onClick={() => handleLeadToProject(lead)}
                            disabled={leadBusy}
                            loading={processingLead === `${lead._id}:project`}
                            loadingLabel="Project"
                          >
                            <FolderKanban size={13} aria-hidden="true" />
                            Project
                          </Button>
                        </div>
                        {/* Close a lead out of the funnel: lost or not-a-fit. The
                            backend marks these terminal so the lead leaves the
                            active funnel automatically. */}
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className="text-micro font-semibold text-[var(--color-text-subtle)]">Sluiten:</span>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleLeadStatus(lead, "verloren")}
                            disabled={leadBusy}
                            loading={processingLead === `${lead._id}:verloren`}
                            loadingLabel="Verloren"
                          >
                            <Flag size={12} aria-hidden="true" />
                            Verloren
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleLeadStatus(lead, "gediskwalificeerd")}
                            disabled={leadBusy}
                            loading={processingLead === `${lead._id}:gediskwalificeerd`}
                            loadingLabel="Niet-fit"
                          >
                            <ShieldCheck size={12} aria-hidden="true" />
                            Niet-fit
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Delivery</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--color-text)]">Actieve projecten</h2>
            </div>
            <div className="flex items-center gap-3">
              {onShowProjectForm && (
                <IconButton
                  onClick={onShowProjectForm}
                  label="Nieuw LaventeCare project starten"
                  title="Nieuw project starten"
                  variant="success"
                  icon={<Plus size={16} />}
                />
              )}
              <FolderKanban size={20} className="text-[var(--color-success)]" />
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {activeProjects.length === 0 ? (
              <EmptyState title="Nog geen projecten" body="Zodra leads doorgaan naar delivery ontstaat hier de projectlaag met fase, status, waarde en deadlines." />
            ) : (
              activeProjects.map((project) => {
                const projectId = project._id ?? project.id;
                const projectBusy = Boolean(projectId && processingProject?.startsWith(`${projectId}:`));
                return (
                  <div key={projectId ?? project.naam} className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-4")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-semibold text-[var(--color-text)]">{project.naam}</h3>
                        <p className="mt-1 text-xs text-[var(--color-text-muted)]">{projectFaseLabel(project.fase)} - {projectStatusLabel(project.status)}</p>
                      </div>
                      <span className="rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--color-success)]">
                        {formatMoney(project.waardeIndicatie)}
                      </span>
                    </div>
                    {project.samenvatting && <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">{project.samenvatting}</p>}
                    {project.deadline && <p className="mt-3 text-xs font-semibold text-[var(--color-text-muted)]">Deadline: {formatDate(project.deadline)}</p>}
                    {projectId && (
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <FormField id={`laventecare-project-${projectId}-phase`} label="Projectfase">
                          {(controlProps) => (
                            <Select
                              {...controlProps}
                              value={project.fase}
                              onChange={(event) => handleProjectStatus(project, { fase: event.target.value })}
                              disabled={projectBusy}
                              density="compact"
                            >
                              {LAVENTECARE_PROJECT_PHASES.map((phase) => (
                                <option key={phase.value} value={phase.value}>
                                  {phase.label}
                                </option>
                              ))}
                            </Select>
                          )}
                        </FormField>
                        <FormField id={`laventecare-project-${projectId}-status`} label="Projectstatus">
                          {(controlProps) => (
                            <Select
                              {...controlProps}
                              value={project.status}
                              onChange={(event) => handleProjectStatus(project, { status: event.target.value })}
                              disabled={projectBusy}
                              density="compact"
                            >
                              {LAVENTECARE_PROJECT_STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </Select>
                          )}
                        </FormField>
                        {projectBusy ? (
                          <p className="sm:col-span-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
                            <Loader2 size={13} className="animate-spin motion-reduce:animate-none" />
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
