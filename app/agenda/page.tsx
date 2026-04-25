"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useAction, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useSchedule } from "@/hooks/useSchedule";
import {
  formatDateRange,
  getDisplayEndDate,
  getTimeLabel,
  usePersonalEvents,
  type PersonalEvent,
} from "@/hooks/usePersonalEvents";
import { PersonalEventItem } from "@/components/schedule/PersonalEventItem";
import { CreateEventModal } from "@/components/schedule/CreateEventModal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

type Tone = "amber" | "blue" | "green" | "indigo" | "rose" | "slate";

type SyncStatus = {
  source: string;
  status: string;
  startedAt?: string;
  finishedAt?: string;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  updatedAt: string;
};

const toneClasses: Record<Tone, { icon: string; surface: string; border: string; text: string }> = {
  amber:  { icon: "text-amber-300",  surface: "bg-amber-500/10",  border: "border-amber-500/20",  text: "text-amber-200" },
  blue:   { icon: "text-sky-300",    surface: "bg-sky-500/10",    border: "border-sky-500/20",    text: "text-sky-200" },
  green:  { icon: "text-emerald-300", surface: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-200" },
  indigo: { icon: "text-indigo-300",  surface: "bg-indigo-500/10",  border: "border-indigo-500/20",  text: "text-indigo-200" },
  rose:   { icon: "text-rose-300",    surface: "bg-rose-500/10",    border: "border-rose-500/20",    text: "text-rose-200" },
  slate:  { icon: "text-slate-300",   surface: "bg-white/5",        border: "border-white/10",       text: "text-slate-200" },
};

function getAmsterdamTodayIso() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function addDaysIso(baseIso: string, days: number) {
  const date = new Date(`${baseIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(iso: string) {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

function formatDateTime(value?: string) {
  if (!value) return "Nog niet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Onbekend";
  return date.toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventCoversDate(event: PersonalEvent, datum: string) {
  return event.startDatum <= datum && getDisplayEndDate(event) >= datum;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Onbekende fout";
}

function parseCategory(event: PersonalEvent) {
  const match = event.beschrijving?.match(/\[categorie:(\w+)\]/);
  return match?.[1] ?? "overig";
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("glass rounded-2xl border border-white/8 p-4 sm:p-5", className)}>
      {children}
    </section>
  );
}

function MetricTile({
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
    <div className="glass rounded-2xl border border-white/8 p-4">
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

function SectionHeader({
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
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
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

function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center">
      <Icon size={28} className="mx-auto text-slate-600" />
      <p className="mt-3 text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-1 text-xs text-slate-500">{text}</p>
    </div>
  );
}

function StatusPill({ status }: { status?: string }) {
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

function ToolbarButton({
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
        "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
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

function DayBlock({
  label,
  events,
  onEdit,
  todayIso,
  conflictMap,
}: {
  label: string;
  events: PersonalEvent[];
  onEdit: (event: PersonalEvent) => void;
  todayIso: string;
  conflictMap: ReturnType<typeof usePersonalEvents>["conflictMap"];
}) {
  return (
    <div>
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

export default function AgendaPage() {
  const { user } = useUser();
  const { success, error } = useToast();
  const { diensten } = useSchedule();
  const {
    upcoming,
    pending,
    history,
    withConflicts,
    conflictMap,
    nextAppointment,
    isLoading,
  } = usePersonalEvents({ diensten });
  const syncStatuses = useQuery(api.syncStatus.listForUser) as SyncStatus[] | undefined;
  const syncPersonalNow = useAction(api.actions.syncPersonalEvents.syncPersonalNow);
  const processPendingNow = useAction(api.actions.processPendingCalendar.processPendingNow);

  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const todayIso = getAmsterdamTodayIso();
  const tomorrowIso = addDaysIso(todayIso, 1);
  const monthEndIso = addDaysIso(todayIso, 30);
  const syncStatus = syncStatuses?.find((status) => status.source === "personal");

  const todayEvents = useMemo(
    () => upcoming.filter((event) => eventCoversDate(event, todayIso)),
    [todayIso, upcoming],
  );
  const tomorrowEvents = useMemo(
    () => upcoming.filter((event) => eventCoversDate(event, tomorrowIso)),
    [tomorrowIso, upcoming],
  );
  const monthEvents = useMemo(
    () => upcoming.filter((event) => event.startDatum >= todayIso && event.startDatum <= monthEndIso),
    [monthEndIso, todayIso, upcoming],
  );
  const laterEvents = useMemo(
    () => monthEvents.filter((event) => !eventCoversDate(event, todayIso) && !eventCoversDate(event, tomorrowIso)),
    [monthEvents, todayIso, tomorrowIso],
  );

  const categoryStats = useMemo(() => {
    const stats = new Map<string, number>();
    for (const event of monthEvents) {
      const category = parseCategory(event);
      stats.set(category, (stats.get(category) ?? 0) + 1);
    }
    return Array.from(stats.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [monthEvents]);

  const openNewEvent = () => {
    setEditEvent(null);
    setModalOpen(true);
  };

  const openEditEvent = (event: PersonalEvent) => {
    setEditEvent(event);
    setModalOpen(true);
  };

  const handleSync = async () => {
    if (!user?.id) {
      error("Niet ingelogd");
      return;
    }
    setSyncing(true);
    try {
      const result = await syncPersonalNow({ userId: user.id });
      success(`Agenda gesynchroniseerd: ${result.total} items`);
    } catch (err) {
      error(`Agenda sync mislukt: ${errorMessage(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleProcessPending = async () => {
    if (!user?.id) {
      error("Niet ingelogd");
      return;
    }
    setProcessing(true);
    try {
      const result = await processPendingNow({ userId: user.id });
      success(`Wachtrij verwerkt: ${result.aangemaakt} aangemaakt, ${result.verwijderd} verwijderd`);
    } catch (err) {
      error(`Wachtrij verwerken mislukt: ${errorMessage(err)}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-5 pb-28 md:ml-56 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
              <Sparkles size={12} />
              Agenda
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Persoonlijke agenda</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              {formatDateLabel(todayIso)} - {monthEvents.length} afspraken in de komende 30 dagen.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ToolbarButton icon={RefreshCw} label="Sync agenda" onClick={handleSync} loading={syncing} tone="blue" />
            <ToolbarButton icon={Zap} label="Verwerk wachtrij" onClick={handleProcessPending} loading={processing} tone="indigo" />
            <ToolbarButton icon={Plus} label="Nieuwe afspraak" onClick={openNewEvent} tone="green" />
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            icon={CalendarClock}
            label="Vandaag"
            value={todayEvents.length > 0 ? `${todayEvents.length} afspraken` : "Rustig"}
            sub={todayEvents[0] ? `${todayEvents[0].titel} - ${getTimeLabel(todayEvents[0])}` : "Geen agenda-items vandaag"}
            tone={todayEvents.length > 0 ? "green" : "slate"}
          />
          <MetricTile
            icon={CalendarDays}
            label="Komende 30 dagen"
            value={`${monthEvents.length}`}
            sub={nextAppointment ? `${nextAppointment.titel} - ${formatDateRange(nextAppointment)}` : "Geen volgende afspraak"}
            tone="indigo"
          />
          <MetricTile
            icon={AlertTriangle}
            label="Conflicten"
            value={`${withConflicts.length}`}
            sub={withConflicts.length > 0 ? "Controleer overlap met diensten" : "Geen bekende overlap"}
            tone={withConflicts.length > 0 ? "rose" : "green"}
          />
          <MetricTile
            icon={Zap}
            label="Wachtrij"
            value={`${pending.length}`}
            sub={pending.length > 0 ? "Nog naar Google Calendar" : "Geen pending acties"}
            tone={pending.length > 0 ? "amber" : "slate"}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Panel>
              <SectionHeader icon={Clock3} label="Vandaag en morgen" title="Directe planning" />
              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-2">
                  <DayBlock
                    label={`Vandaag - ${formatDateLabel(todayIso)}`}
                    events={todayEvents}
                    onEdit={openEditEvent}
                    todayIso={todayIso}
                    conflictMap={conflictMap}
                  />
                  <DayBlock
                    label={`Morgen - ${formatDateLabel(tomorrowIso)}`}
                    events={tomorrowEvents}
                    onEdit={openEditEvent}
                    todayIso={todayIso}
                    conflictMap={conflictMap}
                  />
                </div>
              )}
            </Panel>

            <Panel>
              <SectionHeader
                icon={CalendarDays}
                label="Komende maand"
                title="Afspraken"
                action={<span className="text-xs text-slate-500">{laterEvents.length} later</span>}
              />
              {isLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-14 animate-pulse rounded-2xl bg-white/5" />
                  ))}
                </div>
              ) : laterEvents.length > 0 ? (
                <div className="space-y-2">
                  {laterEvents.map((event) => (
                    <PersonalEventItem
                      key={event.eventId}
                      event={event}
                      isToday={eventCoversDate(event, todayIso)}
                      onEdit={openEditEvent}
                      conflictInfo={conflictMap.get(event.eventId)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={CalendarDays} title="Geen verdere afspraken" text="De komende maand is verder leeg." />
              )}
            </Panel>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <Panel>
              <SectionHeader
                icon={RefreshCw}
                label="Google Calendar"
                title="Sync status"
                action={<StatusPill status={syncStatus?.status} />}
              />
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Laatste succes</span>
                  <span className="text-right font-medium text-slate-200">{formatDateTime(syncStatus?.lastSuccessAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-500">Laatste update</span>
                  <span className="text-right font-medium text-slate-200">{formatDateTime(syncStatus?.updatedAt)}</span>
                </div>
                {syncStatus?.lastError && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">
                    {syncStatus.lastError}
                  </div>
                )}
              </div>
            </Panel>

            <Panel>
              <SectionHeader icon={AlertTriangle} label="Signalen" title="Conflicten" />
              {withConflicts.length > 0 ? (
                <div className="space-y-2">
                  {withConflicts.slice(0, 5).map((event) => (
                    <PersonalEventItem
                      key={event.eventId}
                      event={event}
                      onEdit={openEditEvent}
                      conflictInfo={conflictMap.get(event.eventId)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="Geen conflicten" text="Geen overlap met bekende diensten." />
              )}
            </Panel>

            <Panel>
              <SectionHeader icon={Zap} label="Wachtrij" title="Pending Calendar" />
              {pending.length > 0 ? (
                <div className="space-y-2">
                  {pending.map((event) => (
                    <PersonalEventItem
                      key={event.eventId}
                      event={event}
                      onEdit={openEditEvent}
                      conflictInfo={conflictMap.get(event.eventId)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="Wachtrij leeg" text="Alle lokale acties zijn verwerkt." />
              )}
            </Panel>

            <Panel>
              <SectionHeader icon={Sparkles} label="Verdeling" title="Categorieen" />
              {categoryStats.length > 0 ? (
                <div className="space-y-2">
                  {categoryStats.map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                      <span className="text-sm font-medium capitalize text-slate-300">{category}</span>
                      <span className="text-xs text-slate-500">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CalendarClock} title="Geen categorieen" text="Nog geen afspraken in deze periode." />
              )}
            </Panel>

            {history.length > 0 && (
              <Panel>
                <SectionHeader icon={History} label="Historie" title="Recent voorbij" />
                <div className="space-y-2 opacity-70">
                  {history.slice(0, 4).map((event) => (
                    <PersonalEventItem key={event.eventId} event={event} onEdit={openEditEvent} />
                  ))}
                </div>
              </Panel>
            )}
          </aside>
        </section>
      </div>

      <CreateEventModal
        open={modalOpen}
        editEvent={editEvent}
        onClose={() => {
          setModalOpen(false);
          setEditEvent(null);
        }}
      />
    </main>
  );
}
