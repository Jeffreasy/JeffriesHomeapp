import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Clock3,
  FileText,
  Pin,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { PersonalEventItem } from "./PersonalEventItem";
import { usePersonalEvents, type PersonalEvent, getTimeLabel } from "@/hooks/usePersonalEvents";
import type { NoteRecord } from "@/hooks/useNotes";
import { getLinkedEventId } from "@/components/notes/NoteAgendaUtils";
import { getDisplayTitle } from "@/components/notes/NotesUtils";
import { AppIcon } from "@/components/ui/AppIcon";
import { resolveAppIconName } from "@/lib/symbols";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Button } from "@/components/ui/Button";

/* ─── Empty State ────────────────────────────────────────────────────────── */

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return <FeedbackState icon={Icon} title={title} description={text} compact />;
}

/* ─── Inline Stats Bar ───────────────────────────────────────────────────── */

export function InlineStats({
  todayCount,
  monthCount,
  conflictCount,
  pendingCount,
}: {
  todayCount: number;
  monthCount: number;
  conflictCount: number;
  pendingCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
      <span className={todayCount > 0 ? "text-[var(--color-primary-hover)] font-medium" : ""}>
        {todayCount > 0 ? `${todayCount} vandaag` : "Rustige dag"}
      </span>
      <span className="text-[var(--color-text-subtle)]">·</span>
      <span>{monthCount} deze maand</span>
      {conflictCount > 0 && (
        <>
          <span className="text-[var(--color-text-subtle)]">·</span>
          <span className="flex items-center gap-1 font-medium text-[var(--color-danger)]">
            <AlertTriangle size={11} />
            {conflictCount} {conflictCount === 1 ? "conflict" : "conflicten"}
          </span>
        </>
      )}
      {pendingCount > 0 && (
        <>
          <span className="text-[var(--color-text-subtle)]">·</span>
          <span className="text-[var(--color-info)] font-medium">
            {pendingCount} in wachtrij
          </span>
        </>
      )}
    </div>
  );
}

/* ─── Status Pill (for sync) ─────────────────────────────────────────────── */

export function StatusPill({ status }: { status?: string }) {
  const isRunning = status === "running";
  const isSuccess = status === "success";
  // "pending" is een neutrale "nog niet gesynct"-staat, geen fout — daarom geen
  // alarmerende "Controleer" met waarschuwingsicoon (audit L pending-pill).
  const isPending = status === "pending" || status === "queued" || status === "idle";
  const label = isRunning
    ? "Synct…"
    : isSuccess
      ? "Gesynct"
      : isPending
        ? "Nog niet gesynct"
        : status
          ? "Controleer"
          : "Geen sync";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-semibold uppercase tracking-wider",
        isRunning
          ? "bg-[var(--color-info-subtle)] text-[var(--color-info)]"
          : isSuccess
            ? "bg-[var(--color-success-subtle)] text-[var(--color-success)]"
            : isPending
              ? "bg-[var(--color-surface-active)] text-[var(--color-text-muted)]"
              : "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]",
      )}
    >
      {isRunning && <Loader2 size={10} className="animate-spin motion-reduce:animate-none" />}
      {isSuccess && <CheckCircle2 size={10} />}
      {isPending && <Clock3 size={10} />}
      {!isRunning && !isSuccess && !isPending && <AlertTriangle size={10} />}
      {label}
    </span>
  );
}

/* ─── Next Event Card ────────────────────────────────────────────────────── */

export function NextEventCard({ event }: { event: PersonalEvent | null }) {
  if (!event) return null;

  const dayName = new Date(event.startDatum + "T12:00:00").toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="rounded-xl border border-[var(--color-info-border)] bg-[var(--color-info-subtle)] px-4 py-3">
      <p className="text-micro font-semibold uppercase tracking-wider text-[var(--color-info)] mb-2">
        Volgende afspraak
      </p>
      <div className="flex min-w-0 items-center gap-2">
        <AppIcon name={resolveAppIconName(event.symbol, "agenda")} tone="info" size="sm" framed className="h-8 w-8 rounded-lg" />
        <p className="min-w-0 truncate text-sm font-bold text-[var(--color-text)]">{event.titel}</p>
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-xs text-[var(--color-text-muted)]">
        <span>{dayName}</span>
        <span className="text-[var(--color-text-subtle)]">·</span>
        <span>{getTimeLabel(event)}</span>
      </div>
      {event.locatie && (
        <p className="text-micro text-[var(--color-text-muted)] mt-1 truncate">{event.locatie}</p>
      )}
    </div>
  );
}

/* ─── Timeline Day Group ─────────────────────────────────────────────────── */

export function TimelineDay({
  label,
  isToday,
  events,
  onEdit,
  onRefetch,
  conflictMap,
  notes = [],
  notesByEventId,
  onEditNote,
  onCreateNoteForDate,
  onCreateNoteForEvent,
}: {
  label: string;
  isToday: boolean;
  events: PersonalEvent[];
  onEdit: (event: PersonalEvent) => void;
  onRefetch?: () => void | Promise<void>;
  conflictMap: ReturnType<typeof usePersonalEvents>["conflictMap"];
  notes?: NoteRecord[];
  notesByEventId?: Map<string, NoteRecord[]>;
  onEditNote?: (note: NoteRecord) => void;
  onCreateNoteForDate?: () => void;
  onCreateNoteForEvent?: (event: PersonalEvent) => void;
}) {
  const dayNotes = notes.filter((note) => !getLinkedEventId(note));

  return (
    <div>
      {/* Day separator */}
      <div className="flex items-center gap-3 mb-2">
        <div className={cn(
          "flex items-center gap-2 text-xs font-semibold tracking-wide",
          isToday ? "text-[var(--color-primary-hover)]" : "text-[var(--color-text-muted)]"
        )}>
          {isToday && (
            <span className="flex h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-primary)] motion-reduce:animate-none" />
          )}
          {label}
        </div>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        {onCreateNoteForDate && (
          <Button size="sm" variant="primary" onClick={onCreateNoteForDate}>
            <Plus size={11} />
            Notitie
          </Button>
        )}
        <span className="text-micro text-[var(--color-text-subtle)] tabular-nums">{events.length}</span>
      </div>

      {/* Events */}
      <div className="space-y-1 ml-0 sm:ml-1">
        {events.map((event) => {
          const linkedNotes = notesByEventId?.get(event.eventId) ?? [];
          const isRooster = event.kalender === "Rooster";
          return (
            <div key={event.eventId} className="group/event">
              <PersonalEventItem
                event={event}
                isToday={isToday}
                onEdit={onEdit}
                onRefetch={onRefetch}
                conflictInfo={conflictMap.get(event.eventId)}
              />
              {(linkedNotes.length > 0 || onCreateNoteForEvent) && (
                <div className={cn(
                  "ml-4 mt-1 flex-wrap gap-1.5 border-l border-[var(--color-info-border)] pl-3 transition-opacity",
                  linkedNotes.length > 0 ? "flex" : "hidden sm:flex sm:opacity-0 sm:group-hover/event:opacity-100"
                )}>
                  {linkedNotes.slice(0, 3).map((note) => (
                    <NoteChip key={note.id} note={note} onEdit={onEditNote} tone="info" />
                  ))}
                  {linkedNotes.length > 3 && (
                    <span className="rounded-md bg-[var(--color-info-subtle)] px-1.5 py-1 text-micro font-medium text-[var(--color-info)]">
                      +{linkedNotes.length - 3}
                    </span>
                  )}
                  {onCreateNoteForEvent && (
                    <button
                      type="button"
                      onClick={() => onCreateNoteForEvent(event)}
                      className="inline-flex min-h-[var(--touch-target)] items-center gap-1 rounded-md bg-[var(--color-info-subtle)] px-1.5 py-1 text-micro font-medium text-[var(--color-info)] transition-colors hover:bg-[var(--color-info-border)] cursor-pointer"
                    >
                      <Plus size={10} />
                      Notitie bij {isRooster ? "dienst" : "afspraak"}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {dayNotes.length > 0 && (
        <div className="ml-0 mt-2 rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] px-3 py-2 sm:ml-1">
          <div className="mb-1.5 flex items-center gap-1.5 text-micro font-semibold uppercase tracking-wider text-[var(--color-primary-hover)]">
            <FileText size={11} />
            Dagnotities
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dayNotes.slice(0, 5).map((note) => (
              <NoteChip key={note.id} note={note} onEdit={onEditNote} tone="accent" />
            ))}
            {dayNotes.length > 5 && (
              <span className="rounded-md bg-[var(--color-primary-subtle)] px-1.5 py-1 text-micro font-medium text-[var(--color-primary-hover)]">
                +{dayNotes.length - 5}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NoteChip({ note, onEdit, tone }: { note: NoteRecord; onEdit?: (note: NoteRecord) => void; tone: "accent" | "info" }) {
  const isPinned = note.isPinned || note.is_pinned;
  const colorClass = tone === "info"
    ? "bg-[var(--color-info-subtle)] text-[var(--color-info)] hover:bg-[var(--color-info-border)]"
    : "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-border)]";

  return (
    <button
      type="button"
      onClick={() => onEdit?.(note)}
      className={`inline-flex min-h-[var(--touch-target)] max-w-full items-center gap-1 rounded-md px-1.5 py-1 text-micro font-medium transition-colors cursor-pointer ${colorClass}`}
      title={getDisplayTitle(note)}
    >
      {isPinned ? (
        <Pin size={10} className="shrink-0 text-[var(--color-primary-hover)] fill-[var(--color-primary)]" />
      ) : (
        <AppIcon name={resolveAppIconName(note.symbol, "note")} tone={tone} size="xs" />
      )}
      <span className="max-w-[180px] truncate">{getDisplayTitle(note)}</span>
    </button>
  );
}

export { type PersonalEvent } from "@/hooks/usePersonalEvents";
