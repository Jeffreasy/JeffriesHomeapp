"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Zap,
} from "lucide-react";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useSchedule } from "@/hooks/useSchedule";
import { syncApi } from "@/lib/api";
import {
  formatDateRange,
  getTimeLabel,
  usePersonalEvents,
  type PersonalEvent,
} from "@/hooks/usePersonalEvents";
import { PersonalEventItem } from "@/components/schedule/PersonalEventItem";
import { CreateEventModal } from "@/components/schedule/CreateEventModal";
import { useToast } from "@/components/ui/Toast";

import {
  getAmsterdamTodayIso,
  addDaysIso,
  formatDateLabel,
  formatDateTime,
  eventCoversDate,
  errorMessage,
} from "@/components/schedule/AgendaUtils";
import {
  Panel,
  EmptyState,
  InlineStats,
  StatusPill,
  NextEventCard,
  TimelineDay,
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

  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);
  const [syncing, setSyncing] = useState(false);

  const todayIso = getAmsterdamTodayIso();
  const monthEndIso = addDaysIso(todayIso, 30);
  const syncStatus = syncStatuses?.personal;

  // ─── Computed data ──────────────────────────────────────────────────────

  const todayEvents = useMemo(
    () => upcoming.filter((e) => eventCoversDate(e, todayIso)),
    [todayIso, upcoming],
  );

  const monthEvents = useMemo(
    () => upcoming.filter((e) => e.startDatum >= todayIso && e.startDatum <= monthEndIso),
    [monthEndIso, todayIso, upcoming],
  );

  // Group events by date for the timeline
  const timelineGroups = useMemo(() => {
    const groups = new Map<string, PersonalEvent[]>();
    for (const event of upcoming) {
      const key = event.startDatum;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    }
    // Sort by date
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, events]) => ({
        date,
        label: formatDateLabel(date),
        isToday: date === todayIso,
        events,
      }));
  }, [upcoming, todayIso]);

  // ─── Actions ────────────────────────────────────────────────────────────

  const openNewEvent = () => {
    setEditEvent(null);
    setModalOpen(true);
  };

  const openEditEvent = (event: PersonalEvent) => {
    setEditEvent(event);
    setModalOpen(true);
  };

  const handleSync = async () => {
    if (!user?.id) { toastError("Niet ingelogd"); return; }
    setSyncing(true);
    try {
      await syncApi.calendar(user.id);
      await refetchEvents();
      await refetchDiensten();
      success("Agenda gesynchroniseerd");
    } catch (err) {
      toastError(`Sync mislukt: ${errorMessage(err)}`);
    } finally {
      setSyncing(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="text-slate-100">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          {/* Left: Title + Stats */}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-white truncate">Agenda</h1>
              <span className="text-xs text-slate-600 hidden sm:inline">
                {formatDateLabel(todayIso)}
              </span>
            </div>
            <div className="mt-1">
              <InlineStats
                todayCount={todayEvents.length}
                monthCount={monthEvents.length}
                conflictCount={withConflicts.length}
                pendingCount={pending.length}
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Sync — icon only */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white/[0.03] text-slate-400 hover:text-sky-300 hover:border-sky-500/20 transition-colors disabled:opacity-40 cursor-pointer"
              title="Sync met Google Calendar"
            >
              {syncing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
            </button>

            {/* Sync status pill */}
            <StatusPill status={syncStatus?.status} />

            {/* New event — primary */}
            <button
              onClick={openNewEvent}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15 transition-colors cursor-pointer"
            >
              <Plus size={14} />
              <span className="hidden sm:inline">Nieuw</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────── */}
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:py-7">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">

          {/* ── Timeline ─────────────────────────────────────────────── */}
          <div className="space-y-5">
            {isLoading ? (
              <div className="space-y-4">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-40 animate-pulse rounded bg-white/5" />
                    <div className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
                    <div className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
                  </div>
                ))}
              </div>
            ) : timelineGroups.length > 0 ? (
              <div className="space-y-5">
                {timelineGroups.map((group) => (
                  <TimelineDay
                    key={group.date}
                    dateIso={group.date}
                    label={group.label}
                    isToday={group.isToday}
                    events={group.events}
                    onEdit={openEditEvent}
                    onRefetch={refetchEvents}
                    conflictMap={conflictMap}
                  />
                ))}
              </div>
            ) : (
              <Panel>
                <EmptyState
                  icon={CalendarDays}
                  title="Geen aankomende afspraken"
                  text="Maak een nieuwe afspraak aan of sync je Google Calendar."
                />
              </Panel>
            )}

            {/* Pending section — only when relevant */}
            {pending.length > 0 && (
              <Panel>
                <div className="flex items-center gap-2 mb-3">
                  <Zap size={14} className="text-sky-400" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Wachtrij — {pending.length} naar Google Calendar
                  </p>
                </div>
                <div className="space-y-1">
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
              </Panel>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────── */}
          <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">

            {/* Next appointment */}
            <NextEventCard event={nextAppointment} />

            {/* Conflicts — only when present */}
            {withConflicts.length > 0 && (
              <Panel>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {withConflicts.length} {withConflicts.length === 1 ? "conflict" : "conflicten"}
                  </p>
                </div>
                <div className="space-y-1">
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
              </Panel>
            )}

            {/* Sync details — compact */}
            <div className="rounded-xl border border-[var(--color-border)] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                  Google Calendar
                </p>
                <StatusPill status={syncStatus?.status} />
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-600">Laatste sync</span>
                  <span className="text-slate-400">{formatDateTime(syncStatus?.lastSuccessAt)}</span>
                </div>
                {syncStatus?.lastError && (
                  <p className="text-[10px] text-red-400/80 mt-1 leading-relaxed">
                    {syncStatus.lastError}
                  </p>
                )}
              </div>
            </div>

            {/* History — compact, only when present */}
            {history.length > 0 && (
              <div className="rounded-xl border border-[var(--color-border)] bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <History size={12} className="text-slate-600" />
                  <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider">
                    Recent voorbij
                  </p>
                </div>
                <div className="space-y-1 opacity-60">
                  {history.slice(0, 3).map((event) => (
                    <PersonalEventItem
                      key={event.eventId}
                      event={event}
                      onEdit={openEditEvent}
                      onRefetch={refetchEvents}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* No-conflict state */}
            {withConflicts.length === 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-500/[0.04] border border-emerald-500/10 px-4 py-3">
                <CheckCircle2 size={14} className="text-emerald-500/50" />
                <p className="text-[11px] text-emerald-400/60 font-medium">Geen conflicten met diensten</p>
              </div>
            )}
          </aside>
        </div>
      </main>

      {/* ── Modal ──────────────────────────────────────────────────────── */}
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
