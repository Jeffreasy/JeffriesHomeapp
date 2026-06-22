import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
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

/* ─── Panel (kept, still useful) ─────────────────────────────────────────── */

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-[var(--color-border)] bg-white/[0.03] p-4 sm:p-5", className)}>
      {children}
    </section>
  );
}

/* ─── Empty State ────────────────────────────────────────────────────────── */

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      <Icon size={24} className="text-slate-600" />
      <p className="text-sm font-medium text-slate-400">{title}</p>
      <p className="text-xs text-slate-600">{text}</p>
    </div>
  );
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
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
      <span className={todayCount > 0 ? "text-emerald-400 font-medium" : ""}>
        {todayCount > 0 ? `${todayCount} vandaag` : "Rustige dag"}
      </span>
      <span className="text-slate-700">·</span>
      <span>{monthCount} deze maand</span>
      {conflictCount > 0 && (
        <>
          <span className="text-slate-700">·</span>
          <span className="text-amber-400 font-medium flex items-center gap-1">
            <AlertTriangle size={11} />
            {conflictCount} {conflictCount === 1 ? "conflict" : "conflicten"}
          </span>
        </>
      )}
      {pendingCount > 0 && (
        <>
          <span className="text-slate-700">·</span>
          <span className="text-sky-400 font-medium">
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
  const label = isRunning ? "Synct…" : isSuccess ? "Gesynct" : status ? "Controleer" : "Geen sync";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        isRunning
          ? "bg-sky-500/10 text-sky-300"
          : isSuccess
            ? "bg-emerald-500/10 text-emerald-300"
            : "bg-amber-500/10 text-amber-300",
      )}
    >
      {isRunning && <Loader2 size={10} className="animate-spin" />}
      {isSuccess && <CheckCircle2 size={10} />}
      {!isRunning && !isSuccess && <AlertTriangle size={10} />}
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
    <div className="rounded-lg border border-indigo-500/15 bg-indigo-500/[0.06] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400/70 mb-2">
        Volgende afspraak
      </p>
      <div className="flex min-w-0 items-center gap-2">
        <AppIcon name={resolveAppIconName(event.symbol, "agenda")} tone="indigo" size="sm" framed className="h-8 w-8 rounded-lg" />
        <p className="min-w-0 truncate text-sm font-bold text-white">{event.titel}</p>
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
        <span>{dayName}</span>
        <span className="text-slate-600">·</span>
        <span>{getTimeLabel(event)}</span>
      </div>
      {event.locatie && (
        <p className="text-[11px] text-slate-500 mt-1 truncate">{event.locatie}</p>
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
          isToday ? "text-emerald-400" : "text-slate-400"
        )}>
          {isToday && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
          {label}
        </div>
        <div className="flex-1 h-px bg-[var(--color-border)]" />
        {onCreateNoteForDate && (
          <button
            type="button"
            onClick={onCreateNoteForDate}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-500/15 bg-amber-500/[0.06] px-2 text-[10px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/[0.1] cursor-pointer"
          >
            <Plus size={11} />
            Notitie
          </button>
        )}
        <span className="text-[10px] text-slate-600 tabular-nums">{events.length}</span>
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
                  "ml-4 mt-1 flex-wrap gap-1.5 border-l border-cyan-500/15 pl-3 transition-opacity",
                  linkedNotes.length > 0 ? "flex" : "hidden sm:flex sm:opacity-0 sm:group-hover/event:opacity-100"
                )}>
                  {linkedNotes.slice(0, 3).map((note) => (
                    <NoteChip key={note.id} note={note} onEdit={onEditNote} tone="cyan" />
                  ))}
                  {linkedNotes.length > 3 && (
                    <span className="rounded-md bg-cyan-500/10 px-1.5 py-1 text-[10px] font-medium text-cyan-300/70">
                      +{linkedNotes.length - 3}
                    </span>
                  )}
                  {onCreateNoteForEvent && (
                    <button
                      type="button"
                      onClick={() => onCreateNoteForEvent(event)}
                      className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-1.5 py-1 text-[10px] font-medium text-cyan-200 transition-colors hover:bg-cyan-500/15 cursor-pointer"
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
        <div className="ml-0 mt-2 rounded-lg border border-amber-500/12 bg-amber-500/[0.035] px-3 py-2 sm:ml-1">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300/70">
            <FileText size={11} />
            Dagnotities
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dayNotes.slice(0, 5).map((note) => (
              <NoteChip key={note.id} note={note} onEdit={onEditNote} tone="amber" />
            ))}
            {dayNotes.length > 5 && (
              <span className="rounded-md bg-amber-500/10 px-1.5 py-1 text-[10px] font-medium text-amber-300/70">
                +{dayNotes.length - 5}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NoteChip({ note, onEdit, tone }: { note: NoteRecord; onEdit?: (note: NoteRecord) => void; tone: "amber" | "cyan" }) {
  const isPinned = note.isPinned || note.is_pinned;
  const colorClass = tone === "cyan"
    ? "bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/15"
    : "bg-amber-500/10 text-amber-200 hover:bg-amber-500/15";

  return (
    <button
      type="button"
      onClick={() => onEdit?.(note)}
      className={`inline-flex max-w-full items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium transition-colors cursor-pointer ${colorClass}`}
      title={getDisplayTitle(note)}
    >
      {isPinned ? (
        <Pin size={10} className="shrink-0 text-amber-300 fill-amber-300" />
      ) : (
        <AppIcon name={resolveAppIconName(note.symbol, "note")} tone={tone} size="xs" />
      )}
      <span className="max-w-[180px] truncate">{getDisplayTitle(note)}</span>
    </button>
  );
}

/* ─── Legacy exports (keep DayBlock for other consumers) ──────────────── */

export { type PersonalEvent } from "@/hooks/usePersonalEvents";

// Re-export unused but previously exported names so any stale imports don't break
export const MetricTile = () => null;
export const SectionHeader = () => null;
export const ToolbarButton = () => null;
export const DayBlock = TimelineDay;
