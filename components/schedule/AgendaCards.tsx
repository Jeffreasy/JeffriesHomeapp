import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Loader2, CalendarDays, type LucideIcon } from "lucide-react";
import { type Tone, toneClasses } from "./RoosterUtils";
import { PersonalEventItem } from "./PersonalEventItem";
import { usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { eventCoversDate } from "./AgendaUtils";

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("glass min-w-0 rounded-2xl p-4 sm:p-5", className)}>
      {children}
    </section>
  );
}

export function MetricTile({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
}) {
  const toneClass = toneClasses[tone];
  return (
    <div className="glass min-w-0 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-2 truncate text-xl font-bold text-white">{value}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", toneClass.surface, toneClass.border)}>
          <Icon size={17} className={toneClass.icon} />
        </div>
      </div>
    </div>
  );
}

export function SectionHeader({
  icon: Icon,
  label,
  title,
  action,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
          <Icon size={17} className="text-slate-300" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
          <h2 className="mt-0.5 text-lg font-bold text-white">{title}</h2>
        </div>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-8 text-center min-w-0">
      <Icon size={28} className="mx-auto text-slate-600" />
      <p className="mt-3 text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );
}

export function StatusPill({ status }: { status?: string }) {
  const isRunning = status === "running";
  const isSuccess = status === "success";
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-semibold uppercase tracking-wider",
        isRunning
          ? "border-blue-500/25 bg-blue-500/10 text-blue-200"
          : isSuccess
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
            : "border-amber-500/25 bg-amber-500/10 text-amber-200",
      )}
    >
      {isRunning ? <Loader2 size={12} className="animate-spin" /> : isSuccess ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {status ?? "unknown"}
    </span>
  );
}

export function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  loading,
  tone = "slate",
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  loading?: boolean;
  tone?: Tone;
}) {
  const toneClass = toneClasses[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 min-w-0",
        toneClass.surface,
        toneClass.border,
        toneClass.text,
      )}
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
      {label}
    </button>
  );
}

export function DayBlock({
  label,
  events,
  onEdit,
  onRefetch,
  todayIso,
  conflictMap,
}: {
  label: string;
  events: PersonalEvent[];
  onEdit: (event: PersonalEvent) => void;
  onRefetch?: () => void;
  todayIso: string;
  conflictMap: ReturnType<typeof usePersonalEvents>["conflictMap"];
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <span className="text-[10px] text-slate-600">{events.length}</span>
      </div>
      {events.length > 0 ? (
        <div className="space-y-2">
          {events.map((event) => (
            <PersonalEventItem
              key={event.eventId}
              event={event}
              isToday={eventCoversDate(event, todayIso)}
              onEdit={onEdit}
              onRefetch={onRefetch}
              conflictInfo={conflictMap.get(event.eventId)}
            />
          ))}
        </div>
      ) : (
        <EmptyState icon={CalendarDays} title="Geen afspraken" text="Geen items voor dit blok." />
      )}
    </div>
  );
}
