import { AlertTriangle, CalendarClock, Link2, ListChecks, Pin, ShieldCheck, StickyNote } from "lucide-react";
import { formatDate, type NoteScope } from "./NotesUtils";
import { MetricTile, SectionTitle } from "./NotesPrimitives";
import { StatChip } from "@/components/ui/StatChip";
import type { NoteRecord } from "@/hooks/useNotes";
import { surfaceVariants } from "@/components/ui/Surface";

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
    <div className={surfaceVariants({ padding: "sm" })}>
      <SectionTitle icon={ShieldCheck} title="Signalen" subtitle="Context voor je huidige notities" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <MetricTile
          icon={Pin}
          label="Vastgezet"
          value={`${pinnedCount}`}
          meta={pinnedCount === 1 ? "Belangrijke notitie bovenaan" : "Belangrijke notities bovenaan"}
          tone={pinnedCount > 0 ? "accent" : "neutral"}
        />
        <MetricTile
          icon={AlertTriangle}
          label="Aandacht"
          value={`${overdueCount + highPriorityCount}`}
          meta={`${overdueCount} verlopen - ${highPriorityCount} hoge prioriteit`}
          tone={overdueCount + highPriorityCount > 0 ? "danger" : "success"}
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
      <StatChip icon={StickyNote} label="Totaal" value={`${totalCount}`} meta={`${activeCount} actief · ${completedCount} afgerond · ${archivedCount} archief`} tone="accent" {...scopeOf("all")} />
      <StatChip icon={AlertTriangle} label="Aandacht" value={`${attentionCount}`} meta={attentionCount > 0 ? "Hoog, vandaag of verlopen" : "Geen urgente notities"} tone={attentionCount > 0 ? "danger" : "success"} {...scopeOf("attention")} />
      <StatChip icon={ListChecks} label="Checklists" value={`${checklistDone}/${checklistTotal}`} meta={checklistTotal > 0 ? "Afgevinkte / totaal checklist-items" : "Geen checklist-items"} tone={checklistTotal > 0 && checklistDone === checklistTotal ? "success" : "info"} {...scopeOf("checklists")} />
      <StatChip
        icon={CalendarClock}
        label="Deadlines"
        value={`${deadlineSoon}`}
        // N4: de eerstvolgende deadline zichtbaar in de chip zelf — title-only
        // meta is onbereikbaar op touch.
        inlineMeta={deadlineNext ? `Volgende: ${formatDate(deadlineNext.deadline ?? undefined)}` : undefined}
        meta={deadlineNext ? `Volgende: ${formatDate(deadlineNext.deadline ?? undefined)}` : "Geen aankomende deadlines"}
        tone={deadlineOverdue > 0 ? "danger" : deadlineSoon > 0 ? "warning" : "neutral"}
        {...scopeOf("deadlines")}
      />
      <StatChip icon={Link2} label="Gekoppeld" value={`${linkedCount}`} meta={tagsCount > 0 ? `${linkedCount} gekoppeld · ${tagsCount} tags` : "Geen gekoppelde notities"} tone="info" {...scopeOf("linked")} />
    </section>
  );
}

