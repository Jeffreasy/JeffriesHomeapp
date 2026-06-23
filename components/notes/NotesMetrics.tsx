import { AlertTriangle, CalendarClock, Link2, ListChecks, Pin, ShieldCheck, StickyNote } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatDate, toneClasses, type NoteScope, type Tone } from "./NotesUtils";
import { MetricTile, SectionTitle } from "./NotesPrimitives";
import { cn } from "@/lib/utils";
import type { NoteRecord } from "@/hooks/useNotes";

export function NotesSignals({
  pinnedCount,
  overdueCount,
  highPriorityCount,
}: {
  pinnedCount: number;
  overdueCount: number;
  highPriorityCount: number;
}) {
  return (
    <div className="glass p-4">
      <SectionTitle icon={ShieldCheck} title="Signalen" subtitle="Context voor je huidige notities" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <MetricTile
          icon={Pin}
          label="Vastgezet"
          value={`${pinnedCount}`}
          meta={pinnedCount === 1 ? "Belangrijke notitie bovenaan" : "Belangrijke notities bovenaan"}
          tone={pinnedCount > 0 ? "amber" : "slate"}
        />
        <MetricTile
          icon={AlertTriangle}
          label="Aandacht"
          value={`${overdueCount + highPriorityCount}`}
          meta={`${overdueCount} verlopen - ${highPriorityCount} hoge prioriteit`}
          tone={overdueCount + highPriorityCount > 0 ? "rose" : "green"}
        />
      </div>
    </div>
  );
}

export function NotesMetricsRow({
  totalCount,
  activeCount,
  completedCount,
  archivedCount,
  checklistDone,
  checklistTotal,
  attentionCount,
  deadlineSoon,
  deadlineOverdue,
  deadlineNext,
  tagsCount,
  linkedCount,
  onScope,
  activeScope,
}: {
  totalCount: number;
  activeCount: number;
  completedCount: number;
  archivedCount: number;
  checklistDone: number;
  checklistTotal: number;
  attentionCount: number;
  deadlineSoon: number;
  deadlineOverdue: number;
  deadlineNext: NoteRecord | null;
  tagsCount: number;
  linkedCount: number;
  onScope?: (scope: NoteScope) => void;
  activeScope?: NoteScope;
}) {
  // Each chip doubles as a scope shortcut into the board.
  const scopeOf = (scope: NoteScope) =>
    onScope ? { onClick: () => onScope(scope), active: activeScope === scope } : {};
  return (
    <section className="flex flex-wrap items-center gap-1.5 sm:gap-2" aria-label="Notitie-overzicht">
      <StatChip icon={StickyNote} label="Totaal" value={`${totalCount}`} meta={`${activeCount} actief · ${completedCount} afgerond · ${archivedCount} archief`} tone="amber" {...scopeOf("all")} />
      <StatChip icon={AlertTriangle} label="Aandacht" value={`${attentionCount}`} meta={attentionCount > 0 ? "Hoog, vandaag of verlopen" : "Geen urgente notities"} tone={attentionCount > 0 ? "rose" : "green"} {...scopeOf("attention")} />
      <StatChip icon={ListChecks} label="Checklists" value={`${checklistDone}/${checklistTotal}`} meta={checklistTotal > 0 ? "Afgevinkte / totaal checklist-items" : "Geen checklist-items"} tone={checklistTotal > 0 && checklistDone === checklistTotal ? "green" : "sky"} {...scopeOf("checklists")} />
      <StatChip icon={CalendarClock} label="Deadlines" value={`${deadlineSoon}`} meta={deadlineNext ? `Volgende: ${formatDate(deadlineNext.deadline ?? undefined)}` : "Geen aankomende deadlines"} tone={deadlineOverdue > 0 ? "rose" : deadlineSoon > 0 ? "amber" : "slate"} {...scopeOf("deadlines")} />
      <StatChip icon={Link2} label="Agenda" value={`${linkedCount}`} meta={tagsCount > 0 ? `${linkedCount} gekoppeld · ${tagsCount} tags` : "Geen agenda-koppelingen"} tone="indigo" {...scopeOf("linked")} />
    </section>
  );
}

// A compact, professional stat chip: one line of "[icon] Label Value", the
// detail moved to a tooltip. Doubles as a scope filter when onClick is set.
function StatChip({
  icon: Icon,
  label,
  value,
  meta,
  tone = "slate",
  onClick,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: string;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
}) {
  const t = toneClasses[tone];
  const content = (
    <>
      <Icon size={14} className={cn("shrink-0", t.icon)} />
      <span className="text-slate-400">{label}</span>
      <span className={cn("font-semibold tabular-nums", t.text)}>{value}</span>
    </>
  );
  const cls = cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs outline-none transition-colors sm:text-sm",
    active ? "border-amber-500/40 bg-amber-500/15" : "border-[var(--color-border)] bg-[var(--color-surface)]",
    onClick && "cursor-pointer hover:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-amber-400/60",
  );
  if (onClick) {
    return (
      <button type="button" title={meta} onClick={onClick} aria-pressed={active} className={cls}>
        {content}
      </button>
    );
  }
  return (
    <span title={meta} className={cls}>
      {content}
    </span>
  );
}
