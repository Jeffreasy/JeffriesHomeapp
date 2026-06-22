"use client";

import { ArrowRight, CheckCircle2, Clock3, FolderKanban, Loader2, Plus, Tag, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectItem, WorkstreamItem } from "./LaventeCareTypes";
import { LAVENTECARE_WORKSTREAM_TYPES } from "./LaventeCareTypes";
import { EmptyState } from "./LaventeCareCards";
import { formatDate, formatMoney, label, toneClasses } from "./LaventeCareUtils";

const statusFlow = [
  { value: "analyse", label: "Analyse" },
  { value: "uitvoering", label: "Uitvoering" },
  { value: "wacht_op_klant", label: "Wacht" },
  { value: "afgerond", label: "Afgerond" },
] as const;

export function LaventeCareWorkstreamsView({
  workstreams,
  projects,
  activeWorkstreamCount,
  processingWorkstream,
  onShowWorkstreamForm,
  handleWorkstreamStatus,
  handleWorkstreamToProject,
}: {
  workstreams: WorkstreamItem[];
  projects: ProjectItem[];
  activeWorkstreamCount: number;
  processingWorkstream: string | null;
  onShowWorkstreamForm: () => void;
  handleWorkstreamStatus: (workstream: WorkstreamItem, fields: { status?: string }) => Promise<void>;
  handleWorkstreamToProject: (workstream: WorkstreamItem) => Promise<void>;
}) {
  const grouped = groupWorkstreams(workstreams);
  const projectNameById = new Map(projects.map((project) => [project._id ?? project.id, project.naam]));

  return (
    <section className="space-y-4">
      <div className="glass min-w-0 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-violet-500/10 text-violet-300">
              <Workflow size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Flexibele werkbank</p>
              <h2 className="mt-1 text-lg font-bold text-white">Opdrachten tussen actie en project</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
                Kleine en middelgrote klussen blijven licht genoeg om snel te sturen, maar krijgen wel scope,
                deliverable, stack-tags, notities, agenda-context en dossierdocumenten. Omgezette opdrachten blijven
                als historie zichtbaar zodra ze project zijn geworden.
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-500">
                {workstreams.length} totaal - {activeWorkstreamCount} actief
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onShowWorkstreamForm}
            className="btn btn--primary justify-center border-violet-500/30 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25"
          >
            <Plus size={16} />
            Nieuwe opdracht
          </button>
        </div>
      </div>

      {workstreams.length === 0 ? (
        <EmptyState
          title="Nog geen opdrachten"
          body="Maak een opdracht voor kleine klussen zoals een quickscan, integratiecheck, supportvraag, automatisering of adviesmoment."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-4">
          {grouped.map((group) => (
            <div key={group.status} className="min-w-0 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-normal text-slate-400">{group.label}</p>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-bold text-slate-500">
                  {group.items.length}
                </span>
              </div>
              {group.items.map((workstream) => (
                <WorkstreamCard
                  key={workstream._id ?? workstream.id}
                  workstream={workstream}
                  projectName={workstream.project_id ? projectNameById.get(workstream.project_id) : undefined}
                  processingWorkstream={processingWorkstream}
                  onStatus={handleWorkstreamStatus}
                  onConvert={handleWorkstreamToProject}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function WorkstreamCard({
  workstream,
  projectName,
  processingWorkstream,
  onStatus,
  onConvert,
}: {
  workstream: WorkstreamItem;
  projectName?: string;
  processingWorkstream: string | null;
  onStatus: (workstream: WorkstreamItem, fields: { status?: string }) => Promise<void>;
  onConvert: (workstream: WorkstreamItem) => Promise<void>;
}) {
  const id = workstream._id ?? workstream.id;
  const typeLabel = LAVENTECARE_WORKSTREAM_TYPES.find((item) => item.value === workstream.type)?.label ?? label(workstream.type);
  const highPriority = workstream.prioriteit === "hoog";
  const priorityTone = highPriority ? toneClasses.rose : toneClasses.violet;
  const busy = processingWorkstream?.startsWith(`${id}:`);
  const linkedToProject = Boolean(workstream.project_id);

  return (
    <article className="glass min-w-0 p-4 bg-[var(--color-surface)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", priorityTone.border, priorityTone.surface, priorityTone.text)}>
              {label(workstream.prioriteit)}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-bold text-slate-400">
              {typeLabel}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-white">{workstream.titel}</h3>
          {workstream.klantNaam && <p className="mt-1 truncate text-xs font-semibold text-slate-500">{workstream.klantNaam}</p>}
        </div>
        <Workflow size={17} className="mt-1 shrink-0 text-violet-300" />
      </div>

      {workstream.doel && <p className="mt-3 line-clamp-3 text-sm leading-5 text-slate-400">{workstream.doel}</p>}
      {workstream.deliverable && (
        <p className="mt-3 flex gap-2 text-xs leading-5 text-slate-500">
          <ArrowRight size={13} className="mt-0.5 shrink-0 text-violet-300" />
          <span className="line-clamp-2">{workstream.deliverable}</span>
        </p>
      )}
      {linkedToProject && (
        <p className="mt-3 flex gap-2 rounded-lg border border-emerald-500/15 bg-emerald-500/[0.06] px-3 py-2 text-xs font-semibold leading-5 text-emerald-100">
          <FolderKanban size={13} className="mt-0.5 shrink-0 text-emerald-300" />
          <span className="min-w-0 truncate">{projectName ? `Onder project: ${projectName}` : "Onder project gekoppeld"}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {workstream.deadline && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-bold text-amber-200">
            <Clock3 size={12} />
            {formatDate(workstream.deadline)}
          </span>
        )}
        {typeof workstream.waardeIndicatie === "number" && (
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold text-emerald-200">
            {formatMoney(workstream.waardeIndicatie)}
          </span>
        )}
        {(workstream.stackTags ?? []).slice(0, 4).map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] font-bold text-slate-400">
            <Tag size={11} />
            {tag}
          </span>
        ))}
      </div>

      {workstream.volgendeStap && (
        <p className="mt-3 rounded-lg border border-sky-500/15 bg-sky-500/[0.06] px-3 py-2 text-xs leading-5 text-sky-100">
          {workstream.volgendeStap}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {isClosedWorkstream(workstream.status) ? (
          <div className="col-span-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-100">
            {workstream.status === "omgezet_project" ? "Omgezet naar project" : label(workstream.status)}
          </div>
        ) : statusFlow.map((status) => {
          const statusBusy = processingWorkstream === `${id}:status:${status.value}`;
          return (
            <button
              key={status.value}
              type="button"
              onClick={() => onStatus(workstream, { status: status.value })}
              disabled={Boolean(processingWorkstream)}
              className={cn(
                "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                status.value === "afgerond"
                  ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
              )}
            >
              {statusBusy ? <Loader2 size={13} className="animate-spin" /> : status.value === "afgerond" ? <CheckCircle2 size={13} /> : null}
              {status.label}
            </button>
          );
        })}
        {!isClosedWorkstream(workstream.status) && !linkedToProject ? (
          <button
            type="button"
            onClick={() => onConvert(workstream)}
            disabled={Boolean(processingWorkstream)}
            className="col-span-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 text-xs font-bold text-emerald-100 transition-colors hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy && processingWorkstream === `${id}:project` ? <Loader2 size={13} className="animate-spin" /> : <FolderKanban size={13} />}
            Project maken
          </button>
        ) : null}
      </div>
    </article>
  );
}

function groupWorkstreams(workstreams: WorkstreamItem[]) {
  const groups = [
    { status: "nieuw", label: "Nieuw", items: [] as WorkstreamItem[] },
    { status: "intake", label: "Intake", items: [] as WorkstreamItem[] },
    { status: "analyse", label: "Analyse", items: [] as WorkstreamItem[] },
    { status: "uitvoering", label: "Uitvoering", items: [] as WorkstreamItem[] },
    { status: "wacht_op_klant", label: "Wachten", items: [] as WorkstreamItem[] },
    { status: "actief", label: "Actief", items: [] as WorkstreamItem[] },
    { status: "omgezet_project", label: "Omgezet", items: [] as WorkstreamItem[] },
    { status: "afgerond", label: "Afgerond", items: [] as WorkstreamItem[] },
    { status: "gesloten", label: "Gesloten", items: [] as WorkstreamItem[] },
    { status: "gearchiveerd", label: "Archief", items: [] as WorkstreamItem[] },
    { status: "overig", label: "Overig", items: [] as WorkstreamItem[] },
  ];
  const byStatus = new Map(groups.map((group) => [group.status, group]));
  const overig = byStatus.get("overig")!;

  for (const item of workstreams) {
    // 'done' is the backend synonym for afgerond; any unrecognised status goes to
    // 'Overig' instead of being silently mislabeled as 'Nieuw'.
    const key = item.status === "done" ? "afgerond" : item.status;
    const target = byStatus.get(key) ?? overig;
    target.items.push(item);
  }

  return groups.filter((group) => group.items.length > 0);
}

function isClosedWorkstream(status: string) {
  return ["afgerond", "done", "gesloten", "gearchiveerd", "omgezet_project"].includes(status);
}
