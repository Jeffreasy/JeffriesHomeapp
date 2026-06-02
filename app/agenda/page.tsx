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

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useSchedule } from "@/hooks/useSchedule";
import { syncApi } from "@/lib/api";
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

import {
  getAmsterdamTodayIso,
  addDaysIso,
  formatDateLabel,
  formatDateTime,
  eventCoversDate,
  errorMessage,
  parseCategory,
} from "@/components/schedule/AgendaUtils";
import {
  Panel,
  MetricTile,
  SectionHeader,
  EmptyState,
  StatusPill,
  ToolbarButton,
  DayBlock,
} from "@/components/schedule/AgendaCards";

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

export default function AgendaPage() {
  const { user } = useUser();
  const { success, error: toastError } = useToast();
  const { diensten, refetch: refetchDiensten } = useSchedule();
  const {
    upcoming,
    pending,
    history,
    withConflicts,
    conflictMap,
    nextAppointment,
    isLoading,
    refetch: refetchEvents,
  } = usePersonalEvents({ diensten });

  const { data: syncStatuses } = useQuery<Record<string, SyncStatus>>({
    queryKey: ["sync-status"],
    queryFn: () => syncApi.status(),
    refetchInterval: 10000,
  });

  const processPendingNow = async (_args: { userId: string }) => ({ aangemaakt: 0, verwijderd: 0 });

  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);

  const todayIso = getAmsterdamTodayIso();
  const tomorrowIso = addDaysIso(todayIso, 1);
  const monthEndIso = addDaysIso(todayIso, 30);
  const syncStatus = syncStatuses?.personal;

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
      toastError("Niet ingelogd");
      return;
    }
    setSyncing(true);
    try {
      await syncApi.calendar(user.id);
      await refetchEvents();
      await refetchDiensten();
      success(`Agenda gesynchroniseerd`);
    } catch (err) {
      toastError(`Agenda sync mislukt: ${errorMessage(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleProcessPending = async () => {
    if (!user?.id) {
      toastError("Niet ingelogd");
      return;
    }
    setProcessing(true);
    try {
      const result = await processPendingNow({ userId: user.id });
      success(`Wachtrij verwerkt: ${result.aangemaakt} aangemaakt, ${result.verwijderd} verwijderd`);
    } catch (err) {
      toastError(`Wachtrij verwerken mislukt: ${errorMessage(err)}`);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="text-slate-100">
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10">
                <Sparkles size={20} className="text-indigo-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Agenda
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold text-white">Persoonlijke agenda</h1>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {formatDateLabel(todayIso)} - {monthEvents.length} afspraken in de komende 30 dagen.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <ToolbarButton icon={RefreshCw} label="Sync agenda" onClick={handleSync} loading={syncing} tone="blue" />
              <ToolbarButton icon={Zap} label="Verwerk wachtrij" onClick={handleProcessPending} loading={processing} tone="indigo" />
              <ToolbarButton icon={Plus} label="Nieuwe afspraak" onClick={openNewEvent} tone="green" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
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
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <DayBlock
                    label={`Vandaag - ${formatDateLabel(todayIso)}`}
                    events={todayEvents}
                    onEdit={openEditEvent}
                    onRefetch={refetchEvents}
                    todayIso={todayIso}
                    conflictMap={conflictMap}
                  />
                  <DayBlock
                    label={`Morgen - ${formatDateLabel(tomorrowIso)}`}
                    events={tomorrowEvents}
                    onEdit={openEditEvent}
                    onRefetch={refetchEvents}
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
                      onRefetch={refetchEvents}
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
                      onRefetch={refetchEvents}
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
                      onRefetch={refetchEvents}
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
                    <div key={category} className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
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
                    <PersonalEventItem key={event.eventId} event={event} onEdit={openEditEvent} onRefetch={refetchEvents} />
                  ))}
                </div>
              </Panel>
            )}
          </aside>
        </section>
      </main>

      <CreateEventModal
        open={modalOpen}
        editEvent={editEvent}
        onSuccess={() => refetchEvents()}
        onClose={() => {
          setModalOpen(false);
          setEditEvent(null);
        }}
      />
    </div>
  );
}
