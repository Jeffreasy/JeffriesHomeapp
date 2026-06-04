"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, CalendarClock, Clock3, Plus, RefreshCw, Trash2, Upload } from "lucide-react";

import { useUser } from "@clerk/nextjs";
import { useSchedule } from "@/hooks/useSchedule";
import { usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { useToast } from "@/components/ui/Toast";
import { syncApi } from "@/lib/api";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { StatsView } from "@/components/schedule/StatsView";
import { SalarisView } from "@/components/salary/SalarisView";
import { AfsprakenView } from "@/components/schedule/AfsprakenView";
import { CreateEventModal } from "@/components/schedule/CreateEventModal";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { calcTotalHours, getHistory, getUpcoming, shiftBreakdown, teamBreakdown } from "@/lib/schedule";
import { generateUnifiedTimeline } from "@/lib/unified";
import { cn } from "@/lib/utils";

import { getAmsterdamTodayIso, formatMetaDate, formatShortDate, type Tab, TABS } from "@/components/schedule/RoosterUtils";
import { EmptyRoster, SectionHeader } from "@/components/schedule/RoosterCards";
import { OverviewPanel, OverviewTab } from "@/components/schedule/RoosterOverview";

function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto scrollbar-none">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
            active === id
              ? "border-amber-500/30 bg-amber-500/12 text-amber-200"
              : "border-transparent text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"
          )}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

export default function RoosterPage() {
  const {
    diensten,
    nextDienst,
    upcoming,
    meta,
    isLoading,
    importCsv,
    clear,
    refetch,
  } = useSchedule();

  const { success, error: toastError, toast } = useToast();
  const { user } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);

  const [todayIso, setTodayIso] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);
  const [tab, setTab] = useState<Tab>("overzicht");
  const [showHistory, setShowHistory] = useState(false);
  const [weekOverrides, setWeekOverrides] = useState<Record<string, boolean>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const [calSyncing, setCalSyncing] = useState(false);
  const [compactTimeline, setCompactTimeline] = useState(false);

  useEffect(() => {
    const updateToday = () => setTodayIso(getAmsterdamTodayIso());
    const timeout = window.setTimeout(updateToday, 0);
    const interval = window.setInterval(updateToday, 60_000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const updateCompactTimeline = () => setCompactTimeline(media.matches);
    updateCompactTimeline();
    media.addEventListener("change", updateCompactTimeline);

    return () => media.removeEventListener("change", updateCompactTimeline);
  }, []);

  const timelineDiensten = useMemo(() => getUpcoming(diensten, 90), [diensten]);

  const {
    upcoming: upcomingEvents,
    eventsByDate,
    conflictMap,
    withConflicts,
    pending: pendingEvents,
    refetch: refetchEvents,
  } = usePersonalEvents({ diensten: timelineDiensten });

  const upcomingHours = calcTotalHours(upcoming);
  const shifts = shiftBreakdown(upcoming);
  const teams = teamBreakdown(upcoming);
  const history = getHistory(diensten);
  const unifiedWeeks = useMemo(
    () => generateUnifiedTimeline(timelineDiensten, upcomingEvents),
    [timelineDiensten, upcomingEvents]
  );
  const hardConflicts = withConflicts.filter((event) => conflictMap.get(event.eventId)?.level === "hard").length;
  const todayEvents = todayIso ? (eventsByDate[todayIso] ?? []) : [];
  const currentMonth = todayIso?.slice(0, 7);
  const thisMonthEvents = currentMonth
    ? upcomingEvents.filter((event) => event.startDatum.slice(0, 7) === currentMonth)
    : [];
  const nextShiftEvents = nextDienst
    ? (eventsByDate[nextDienst.startDatum] ?? []).filter((event) => conflictMap.has(event.eventId))
    : [];
  const hasScheduleData = meta || nextDienst || diensten.length > 0;

  const openNewEvent = () => {
    setEditEvent(null);
    setModalOpen(true);
  };

  const handleEditEvent = (event: PersonalEvent) => {
    setEditEvent(event);
    setModalOpen(true);
  };

  const handleCalendarSync = async () => {
    if (!user?.id) {
      toastError("Niet ingelogd");
      return;
    }

    setCalSyncing(true);
    try {
      const result = await syncApi.calendar(user.id);
      await refetch();
      if (result.pendingError) {
        toast(`Rooster en agenda opgehaald; wachtrij faalde: ${shortSyncError(result.pendingError)}`, "info");
      } else {
        success("Rooster en persoonlijke agenda gesynchroniseerd.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "onbekende fout";
      toastError(`Fout bij synchroniseren: ${message}`);
    } finally {
      setCalSyncing(false);
    }
  };

  const handleClearSchedule = async () => {
    try {
      await clear();
      setConfirmClear(false);
      success("Rooster gewist");
    } catch (err) {
      const message = err instanceof Error ? err.message : "onbekende fout";
      toastError(`Wissen mislukt: ${message}`);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const res = await importCsv(file);
    if (res.ok) success(`${res.count} diensten geimporteerd`);
    else toastError(`Import mislukt: ${res.error}`);
    event.target.value = "";
  };

  const isWeekOpen = (weeknr: string, index: number) => weekOverrides[weeknr] ?? index < (compactTimeline ? 1 : 3);
  const toggleWeek = (weeknr: string, index: number) => {
    setWeekOverrides((current) => ({
      ...current,
      [weeknr]: !isWeekOpen(weeknr, index),
    }));
  };
  const setAllWeeks = (open: boolean) => {
    setWeekOverrides(Object.fromEntries(unifiedWeeks.map((week) => [week.weeknr, open])));
  };

  return (
    <div className="text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
                <Calendar size={20} className="text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Planning
                </p>
                <h1 className="mt-1 truncate text-2xl font-bold text-white">Rooster</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {meta
                    ? `${meta.totalRows} diensten - gesynct ${formatMetaDate(meta.importedAt)}`
                    : "Nog geen rooster gesynchroniseerd"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {meta && (
                confirmClear ? (
                  <div className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3">
                    <span className="text-xs font-semibold text-rose-300">Wissen?</span>
                    <button
                      type="button"
                      onClick={handleClearSchedule}
                      className="rounded-lg px-2 py-1 text-xs font-bold text-rose-200 hover:bg-rose-500/15"
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-white/5"
                    >
                      Nee
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="Rooster wissen"
                    onClick={() => {
                      setConfirmClear(true);
                      window.setTimeout(() => setConfirmClear(false), 3500);
                    }}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-slate-400 transition-colors hover:border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 size={15} />
                    <span className="hidden sm:inline">Wissen</span>
                  </button>
                )
              )}

              <button
                type="button"
                aria-label="CSV rooster importeren"
                onClick={() => fileRef.current?.click()}
                disabled={isLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={16} />
                <span className="hidden sm:inline">CSV</span>
              </button>

              <button
                type="button"
                onClick={handleCalendarSync}
                disabled={calSyncing}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} className={calSyncing ? "animate-spin" : ""} />
                <span>{calSyncing ? "Syncing" : "Sync"}</span>
              </button>

              <button
                type="button"
                aria-label="Nieuwe afspraak"
                onClick={openNewEvent}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 text-sm font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/15"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Afspraak</span>
              </button>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} className="hidden" />
            </div>
          </div>

          <TabBar active={tab} onChange={setTab} />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-7">
        {isLoading && (
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-500">
            <Clock3 size={13} className="text-sky-300" />
            Roostergegevens worden bijgewerkt
          </div>
        )}

        {!hasScheduleData && (
          <EmptyRoster
            syncing={calSyncing}
            onSync={handleCalendarSync}
            onUpload={() => fileRef.current?.click()}
          />
        )}

        {hasScheduleData && (
          <>
            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_420px]">
              <div className="order-2 hidden md:block xl:order-1">
                <OverviewPanel
                  upcomingHours={upcomingHours}
                  upcomingCount={upcoming.length}
                  eventCount={upcomingEvents.length}
                  todayEventCount={todayEvents.length}
                  hardConflicts={hardConflicts}
                  conflicts={withConflicts.length}
                  nextDienst={nextDienst}
                  shifts={shifts}
                  teams={teams}
                />
              </div>

              <div className="order-1 space-y-4 xl:order-2">
                <SectionHeader
                  icon={CalendarClock}
                  label="Volgende"
                  title="Eerstvolgende dienst"
                  sub={nextDienst ? formatShortDate(nextDienst.startDatum) : undefined}
                />
                <NextShiftCard
                  dienst={nextDienst}
                  onImport={handleCalendarSync}
                  afspraken={nextShiftEvents}
                  conflictMap={conflictMap}
                />
              </div>
            </section>

            {tab === "overzicht" && (
              <OverviewTab
                unifiedWeeks={unifiedWeeks}
                isWeekOpen={isWeekOpen}
                toggleWeek={toggleWeek}
                setAllWeeks={setAllWeeks}
                todayIso={todayIso}
                eventsByDate={eventsByDate}
                conflictMap={conflictMap}
                onEditEvent={handleEditEvent}
                upcomingEvents={upcomingEvents}
                withConflicts={withConflicts}
                pendingEvents={pendingEvents}
                history={history}
                showHistory={showHistory}
                setShowHistory={setShowHistory}
                metaRows={meta?.totalRows ?? diensten.length}
                metaSyncedAt={meta?.importedAt}
                thisMonthEvents={thisMonthEvents.length}
              />
            )}

            {tab === "statistieken" && (
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5">
                <ErrorBoundary>
                  <StatsView diensten={diensten} />
                </ErrorBoundary>
              </div>
            )}

            {tab === "salaris" && (
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5">
                <ErrorBoundary>
                  <SalarisView diensten={diensten} />
                </ErrorBoundary>
              </div>
            )}

            {tab === "afspraken_beheer" && (
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5">
                <ErrorBoundary>
                  <AfsprakenView
                    diensten={upcoming}
                    onEditEvent={handleEditEvent}
                    onNewEvent={openNewEvent}
                  />
                </ErrorBoundary>
              </div>
            )}
          </>
        )}
      </main>

      <CreateEventModal
        open={modalOpen}
        onSuccess={() => refetchEvents()}
        onClose={() => {
          setModalOpen(false);
          setEditEvent(null);
        }}
        editEvent={editEvent}
      />
    </div>
  );
}

function shortSyncError(error: string) {
  return error.length > 140 ? `${error.slice(0, 137)}...` : error;
}
