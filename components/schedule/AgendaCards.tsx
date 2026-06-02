import { cn } from "@/lib/utils";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { PersonalEventItem } from "./PersonalEventItem";
import { usePersonalEvents, type PersonalEvent, getTimeLabel, formatDateRange } from "@/hooks/usePersonalEvents";
import { eventCoversDate, formatDateLabel } from "./AgendaUtils";

/* ─── Panel (kept, still useful) ─────────────────────────────────────────── */

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-[var(--color-border)] bg-white/[0.03] p-4 sm:p-5", className)}>
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
      {status ?? "—"}
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
    <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/[0.06] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400/70 mb-2">
        Volgende afspraak
      </p>
      <p className="text-sm font-bold text-white truncate">{event.titel}</p>
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
  dateIso,
  label,
  isToday,
  events,
  onEdit,
  onRefetch,
  conflictMap,
}: {
  dateIso: string;
  label: string;
  isToday: boolean;
  events: PersonalEvent[];
  onEdit: (event: PersonalEvent) => void;
  onRefetch?: () => void;
  conflictMap: ReturnType<typeof usePersonalEvents>["conflictMap"];
}) {
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
        <span className="text-[10px] text-slate-600 tabular-nums">{events.length}</span>
      </div>

      {/* Events */}
      <div className="space-y-1 ml-0 sm:ml-1">
        {events.map((event) => (
          <PersonalEventItem
            key={event.eventId}
            event={event}
            isToday={isToday}
            onEdit={onEdit}
            onRefetch={onRefetch}
            conflictInfo={conflictMap.get(event.eventId)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Legacy exports (keep DayBlock for other consumers) ──────────────── */

export { type PersonalEvent } from "@/hooks/usePersonalEvents";

// Re-export unused but previously exported names so any stale imports don't break
export const MetricTile = () => null;
export const SectionHeader = () => null;
export const ToolbarButton = () => null;
export const DayBlock = TimelineDay;
