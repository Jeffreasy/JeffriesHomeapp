"use client";

import { Button } from "@/components/ui/Button";
import { surfaceVariants } from "@/components/ui/Surface";
import { ArrowRight, CheckCircle2, Clock3, FolderKanban, Plus, Tag, Workflow } from "lucide-react";
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
      <div className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-5")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)]">
              <Workflow size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-normal text-[var(--color-text-muted)]">Flexibele werkbank</p>
              <h2 className="mt-1 text-lg font-bold text-[var(--color-text)]">Opdrachten tussen actie en project</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-text-muted)]">
                Kleine en middelgrote klussen blijven licht genoeg om snel te sturen, maar krijgen wel scope,
                deliverable, stack-tags, notities, agenda-context en dossierdocumenten. Omgezette opdrachten blijven
                als historie zichtbaar zodra ze project zijn geworden.
              </p>
              <p className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
                {workstreams.length} totaal - {activeWorkstreamCount} actief
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={onShowWorkstreamForm}
            variant="secondary" className="border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)] hover:bg-[var(--color-info-border)]"
          >
            <Plus size={16} />
            Nieuwe opdracht
          </Button>
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
              <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-normal text-[var(--color-text-muted)]">{group.label}</p>
                <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-micro font-bold text-[var(--color-text-muted)]">
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
  const priorityTone = highPriority ? toneClasses.danger : toneClasses.info;
  // Per-item busy scoping: alleen de kaart waarvan een actie loopt disabled,
  // niet alle sibling-opdrachten (mirrors LaventeCareFunnelView).
  const busy = Boolean(processingWorkstream?.startsWith(`${id}:`));
  const linkedToProject = Boolean(workstream.project_id);

  return (
    <article className={cn(surfaceVariants({ padding: "none" }), "min-w-0 p-4")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full border px-2 py-0.5 text-micro font-bold", priorityTone.border, priorityTone.surface, priorityTone.text)}>
              {label(workstream.prioriteit)}
            </span>
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-0.5 text-micro font-bold text-[var(--color-text-muted)]">
              {typeLabel}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-[var(--color-text)]">{workstream.titel}</h3>
          {workstream.klantNaam && <p className="mt-1 truncate text-xs font-semibold text-[var(--color-text-muted)]">{workstream.klantNaam}</p>}
        </div>
        <Workflow size={17} className="mt-1 shrink-0 text-[var(--color-info)]" />
      </div>

      {workstream.doel && <p className="mt-3 line-clamp-3 text-sm leading-5 text-[var(--color-text-muted)]">{workstream.doel}</p>}
      {workstream.deliverable && (
        <p className="mt-3 flex gap-2 text-xs leading-5 text-[var(--color-text-muted)]">
          <ArrowRight size={13} className="mt-0.5 shrink-0 text-[var(--color-info)]" />
          <span className="line-clamp-2">{workstream.deliverable}</span>
        </p>
      )}
      {linkedToProject && (
        <p className="mt-3 flex gap-2 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] px-3 py-2 text-xs font-semibold leading-5 text-[var(--color-success)]">
          <FolderKanban size={13} className="mt-0.5 shrink-0 text-[var(--color-success)]" />
          <span className="min-w-0 truncate">{projectName ? `Onder project: ${projectName}` : "Onder project gekoppeld"}</span>
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {workstream.deadline && (
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] px-2 py-1 text-micro font-bold text-[var(--color-primary-hover)]">
            <Clock3 size={12} />
            {formatDate(workstream.deadline)}
          </span>
        )}
        {typeof workstream.waardeIndicatie === "number" && (
          <span className="rounded-full border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] px-2 py-1 text-micro font-bold text-[var(--color-success)]">
            {formatMoney(workstream.waardeIndicatie)}
          </span>
        )}
        {(workstream.stackTags ?? []).slice(0, 4).map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-2 py-1 text-micro font-bold text-[var(--color-text-muted)]">
            <Tag size={11} />
            {tag}
          </span>
        ))}
      </div>

      {workstream.volgendeStap && (
        <p className="mt-3 rounded-lg border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] px-3 py-2 text-xs leading-5 text-[var(--color-info)]">
          {workstream.volgendeStap}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        {isClosedWorkstream(workstream.status) ? (
          <div className="col-span-2 rounded-lg border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] px-3 py-2 text-xs font-bold text-[var(--color-success)]">
            {workstream.status === "omgezet_project" ? "Omgezet naar project" : label(workstream.status)}
          </div>
        ) : statusFlow.map((status) => {
          const statusBusy = processingWorkstream === `${id}:status:${status.value}`;
          return (
            <Button
              key={status.value}
              type="button"
              size="sm"
              variant={status.value === "afgerond" ? "success" : "secondary"}
              onClick={() => onStatus(workstream, { status: status.value })}
              disabled={busy}
              loading={statusBusy}
              loadingLabel={status.label}
            >
              {status.value === "afgerond" ? <CheckCircle2 size={13} aria-hidden="true" /> : null}
              {status.label}
            </Button>
          );
        })}
        {!isClosedWorkstream(workstream.status) && !linkedToProject ? (
          <Button
            type="button"
            variant="success"
            size="sm"
            onClick={() => onConvert(workstream)}
            disabled={busy}
            loading={processingWorkstream === `${id}:project`}
            loadingLabel="Project maken"
            className="col-span-2"
          >
            <FolderKanban size={13} aria-hidden="true" />
            Project maken
          </Button>
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
