"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Briefcase, Calendar, CalendarClock, Clock3, Plus, RefreshCw, Trash2, Upload } from "lucide-react";

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
import { calcTotalHours, getEndKey, getHistory, getUpcoming, shiftBreakdown, teamBreakdown } from "@/lib/schedule";
import { generateUnifiedTimeline } from "@/lib/unified";

import { getAmsterdamTodayIso, formatHours, formatMetaDate, pluralize, type Tab, TABS } from "@/components/schedule/RoosterUtils";
import { shortSyncError } from "@/components/schedule/scheduleUtils";
import { EmptyRoster } from "@/components/schedule/RoosterCards";
import { OverviewPanel, OverviewTab } from "@/components/schedule/RoosterOverview";
import { TabBar, tabBarPanelId, tabBarTabId } from "@/components/schedule/TabBar";
import { StatChip } from "@/components/ui/StatChip";

const tabId = (id: Tab) => tabBarTabId("rooster", id);
const tabPanelId = (id: Tab) => tabBarPanelId("rooster", id);

function MobileRosterSnapshot({
  upcomingHours,
  upcomingCount,
  eventCount,
  todayEventCount,
  conflicts,
  hardConflicts,
}: {
  upcomingHours: number;
  upcomingCount: number;
  eventCount: number;
  todayEventCount: number;
  conflicts: number;
  hardConflicts: number;
}) {
  return (
    <section className="flex flex-wrap items-center gap-1.5 md:hidden" aria-label="Rooster samenvatting">
      {/* inlineMeta i.p.v. alleen een title-tooltip — tooltips zijn op touch
          onbereikbaar (audit L2). */}
      <StatChip
        icon={Clock3}
        label="Uren"
        value={formatHours(upcomingHours)}
        meta={`${pluralize(upcomingCount, "dienst", "diensten")} · komende 30 dagen`}
        inlineMeta="30 dgn"
        tone="amber"
      />
      <StatChip
        icon={Briefcase}
        label="Diensten"
        value={String(upcomingCount)}
        meta="komende 30 dagen"
        inlineMeta="30 dgn"
        tone="sky"
      />
      {/* Stable metric — the value no longer silently switches meaning between
          "vandaag" and "aankomend" depending on the day (audit N6). */}
      <StatChip
        icon={CalendarClock}
        label="Afspraken"
        value={String(eventCount)}
        meta={`${todayEventCount} vandaag · ${eventCount} komend`}
        inlineMeta={`${todayEventCount} vandaag`}
        tone="indigo"
      />
      <StatChip
        icon={AlertTriangle}
        label="Conflicten"
        value={hardConflicts > 0 ? String(hardConflicts) : String(conflicts)}
        meta={hardConflicts > 0 ? "direct nalopen" : conflicts > 0 ? "aandacht" : "rustig"}
        inlineMeta={hardConflicts > 0 ? "direct nalopen" : conflicts > 0 ? "aandacht" : "rustig"}
        tone={hardConflicts > 0 ? "rose" : conflicts > 0 ? "amber" : "green"}
      />
    </section>
  );
}

export default function RoosterPage() {
  const {
    diensten,
    nextDienst,
    upcoming,
    meta,
    isLoading,
    isError: scheduleIsError,
    error: scheduleError,
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
  const [clearing, setClearing] = useState(false);
  // Eén gedeelde sync-vlag (audit F9): header-Sync én "Verwerk nu" op de
  // Beheer-tab lezen/schrijven deze — geen dubbele gelijktijdige sync meer.
  const [calSyncing, setCalSyncing] = useState(false);
  // Laatste wachtrij-fout, persistent zoals op /agenda (audit F10).
  const [pendingSyncError, setPendingSyncError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [compactTimeline, setCompactTimeline] = useState(false);
  // Timeout van de "Wissen?"-bevestiging, zodat die geannuleerd kan worden bij
  // bevestigen/annuleren/unmount (audit L13).
  const confirmClearTimeoutRef = useRef<number | null>(null);
  const cancelConfirmClearTimeout = () => {
    if (confirmClearTimeoutRef.current !== null) {
      window.clearTimeout(confirmClearTimeoutRef.current);
      confirmClearTimeoutRef.current = null;
    }
  };
  useEffect(() => cancelConfirmClearTimeout, []);

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
  } = usePersonalEvents({
    // Volledige dienstenlijst (audit F13): agenda én rooster geven de
    // ongefilterde lijst door zodat de conflict-tellingen overal identiek zijn;
    // analyzeConflicts slaat VERWIJDERDE diensten zelf over en past-diensten
    // kunnen per definitie niet met aankomende events overlappen.
    diensten,
  });

  const upcomingHours = calcTotalHours(upcoming);
  const shifts = shiftBreakdown(upcoming);
  const teams = teamBreakdown(upcoming);
  // Expliciet hoge limiet (audit L1): "Toon alle N" in de historie-sidebar
  // liep anders stilzwijgend tegen de default-cap van 20 aan.
  const history = getHistory(diensten, 500);
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
  const nextShiftEvents = useMemo(() => {
    if (!nextDienst) return [];
    // A night shift (e.g. 22:00–07:00) rolls past midnight, so getEndKey()
    // returns a later calendar day than startDatum. Collect conflicting events
    // across every day the shift spans — otherwise an early-morning appointment
    // on the following day (which conflictMap *does* flag as a hard conflict) is
    // silently dropped from this card.
    const endDay = getEndKey(nextDienst).slice(0, 10);
    const result: PersonalEvent[] = [];
    const seen = new Set<string>();
    let day = nextDienst.startDatum;
    let guard = 0;
    while (day <= endDay && guard++ < 32) {
      for (const event of eventsByDate[day] ?? []) {
        if (seen.has(event.eventId)) continue;
        if (!conflictMap.has(event.eventId)) continue;
        seen.add(event.eventId);
        result.push(event);
      }
      day = addDaysIso(day, 1);
    }
    return result;
  }, [nextDienst, eventsByDate, conflictMap]);
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
    if (calSyncing) return;
    if (!user?.id) {
      toastError("Niet ingelogd");
      return;
    }

    setCalSyncing(true);
    try {
      const result = await syncApi.calendar(user.id);
      await Promise.all([refetch(), refetchEvents()]);
      if (result.pendingError) {
        // Persistent bewaren naast de toast (audit F10).
        setPendingSyncError(result.pendingError);
        toast(`Rooster en agenda opgehaald; wachtrij faalde: ${shortSyncError(result.pendingError)}`, "info");
      } else {
        setPendingSyncError(null);
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
    if (clearing) return;
    // Bevestiging is gegeven — de 3,5s-auto-reset mag de knoppen niet meer
    // onder de cursor vandaan trekken (audit L13).
    cancelConfirmClearTimeout();
    setClearing(true);
    try {
      await clear();
      setConfirmClear(false);
      success("Rooster gewist");
    } catch (err) {
      const message = err instanceof Error ? err.message : "onbekende fout";
      toastError(`Wissen mislukt: ${message}`);
    } finally {
      setClearing(false);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const res = await importCsv(file);
      if (res.ok) success(`${res.count} diensten geimporteerd`);
      else toastError(`Import mislukt: ${res.error}`);
    } finally {
      setImporting(false);
      event.target.value = "";
    }
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
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-4 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 sm:h-11 sm:w-11">
                <Calendar size={20} className="text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Planning
                </p>
                <h1 className="mt-1 truncate text-xl font-bold text-white sm:text-2xl">Rooster</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {meta
                    ? `${meta.totalRows} diensten - gesynct ${formatMetaDate(meta.importedAt)}`
                    : "Nog geen rooster gesynchroniseerd"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {meta && (
                confirmClear ? (
                  <div className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 sm:col-span-1">
                    <span className="text-xs font-semibold text-rose-300">{clearing ? "Wissen..." : "Wissen?"}</span>
                    <button
                      type="button"
                      onClick={handleClearSchedule}
                      disabled={clearing}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-rose-200 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {clearing && <RefreshCw size={12} className="animate-spin" />}
                      Ja
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        cancelConfirmClearTimeout();
                        setConfirmClear(false);
                      }}
                      disabled={clearing}
                      className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Nee
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="Rooster wissen"
                    onClick={() => {
                      // Timeout-id bewaren zodat bevestigen/annuleren/unmount
                      // hem kan annuleren (audit L13).
                      cancelConfirmClearTimeout();
                      setConfirmClear(true);
                      confirmClearTimeoutRef.current = window.setTimeout(() => {
                        confirmClearTimeoutRef.current = null;
                        setConfirmClear(false);
                      }, 3500);
                    }}
                    className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-slate-400 transition-colors hover:border-rose-500/25 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 size={15} />
                    <span className="hidden sm:inline">Wissen</span>
                  </button>
                )
              )}

              <button
                type="button"
                aria-label="CSV rooster importeren"
                aria-busy={importing}
                onClick={() => fileRef.current?.click()}
                disabled={isLoading || importing}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={16} className={importing ? "animate-pulse" : ""} />
                <span className="hidden sm:inline">{importing ? "Importeren" : "CSV"}</span>
              </button>

              <button
                type="button"
                onClick={handleCalendarSync}
                disabled={calSyncing}
                aria-busy={calSyncing}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw size={16} className={calSyncing ? "animate-spin" : ""} />
                <span>{calSyncing ? "Synchroniseren…" : "Sync"}</span>
              </button>

              <button
                type="button"
                aria-label="Nieuwe afspraak"
                onClick={openNewEvent}
                className="inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 text-sm font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/15"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Afspraak</span>
              </button>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} disabled={importing} className="hidden" />
            </div>
          </div>

          <TabBar tabs={TABS} active={tab} onChange={setTab} idPrefix="rooster" ariaLabel="Rooster onderdelen" tone="amber" />
        </div>
      </header>

      {/* Bottom padding komt van ClientShell (pb-28 op mobiel) — hier niet dupliceren. */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {isLoading && hasScheduleData && (
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-500">
            <Clock3 size={13} className="text-sky-300" />
            Roostergegevens worden bijgewerkt
          </div>
        )}

        {/* Failed ≠ empty (audit DEEL 2 #2): een mislukte refresh mét gecachte
            data toont een persistente amber banner i.p.v. stil verouderde data. */}
        {scheduleIsError && hasScheduleData && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <AlertTriangle size={13} className="shrink-0 text-amber-400" />
            <span className="min-w-0 flex-1">
              Rooster verversen mislukt — je ziet mogelijk verouderde gegevens.
            </span>
            <button
              type="button"
              onClick={() => void refetch()}
              className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 cursor-pointer"
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        {/* Persistente wachtrij-fout van de laatste sync — pariteit met het
            sidebar-paneel op /agenda (audit F10). */}
        {pendingSyncError && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="shrink-0 text-amber-400" />
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">Wachtrij-fout</p>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-400/80">{shortSyncError(pendingSyncError)}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCalendarSync}
                disabled={calSyncing}
                className="rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:opacity-50 cursor-pointer"
              >
                Opnieuw syncen
              </button>
              <button
                type="button"
                onClick={() => setPendingSyncError(null)}
                className="rounded-md px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:text-slate-300 cursor-pointer"
              >
                Verbergen
              </button>
            </div>
          </div>
        )}

        {/* Tijdens de koude load géén "Rooster ophalen"-CTA flashen (audit M18):
            eerst een lichte skeleton, pas bij een écht lege dataset de empty state. */}
        {!hasScheduleData && isLoading && (
          <div className="space-y-4" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-40 animate-pulse rounded bg-white/5" />
                <div className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
                <div className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
              </div>
            ))}
          </div>
        )}

        {/* Failed ≠ empty (audit DEEL 2 #2): een 500 zonder data toont een
            foutpaneel met retry, niet de uitnodigende "Rooster ophalen"-CTA. */}
        {!hasScheduleData && !isLoading && scheduleIsError && (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] px-6 py-12 text-center">
            <AlertTriangle size={28} className="text-amber-400" />
            <h3 className="mt-4 text-lg font-semibold text-amber-100">Rooster kon niet worden geladen</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              {scheduleErrorMessage(scheduleError)}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 cursor-pointer"
            >
              <RefreshCw size={15} />
              Opnieuw proberen
            </button>
          </div>
        )}

        {!hasScheduleData && !isLoading && !scheduleIsError && (
          <EmptyRoster
            syncing={calSyncing}
            onSync={handleCalendarSync}
            onUpload={() => fileRef.current?.click()}
          />
        )}

        {hasScheduleData && (
          <>
            {/* The next-shift hero + snapshot only belong on the Overzicht tab —
                they're irrelevant on Statistieken/Salaris/Beheer and previously
                rendered there too, walling off the actual content. */}
            {tab === "overzicht" && (
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

                <div className="order-1 space-y-3 xl:order-2">
                  {/* Beide varianten renderen en via CSS tonen — voorkomt de
                      compact↔full flip na hydration met matchMedia (audit N5). */}
                  <div className="md:hidden">
                    <NextShiftCard
                      dienst={nextDienst}
                      compact
                      onImport={handleCalendarSync}
                      afspraken={nextShiftEvents}
                      conflictMap={conflictMap}
                      todayIso={todayIso}
                    />
                  </div>
                  <div className="hidden md:block">
                    <NextShiftCard
                      dienst={nextDienst}
                      onImport={handleCalendarSync}
                      afspraken={nextShiftEvents}
                      conflictMap={conflictMap}
                      todayIso={todayIso}
                    />
                  </div>
                  <MobileRosterSnapshot
                    upcomingHours={upcomingHours}
                    upcomingCount={upcoming.length}
                    eventCount={upcomingEvents.length}
                    todayEventCount={todayEvents.length}
                    hardConflicts={hardConflicts}
                    conflicts={withConflicts.length}
                  />
                </div>
              </section>
            )}

            {tab === "overzicht" && (
              <div role="tabpanel" id={tabPanelId("overzicht")} aria-labelledby={tabId("overzicht")} tabIndex={0}>
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
              </div>
            )}

            {tab === "statistieken" && (
              <div
                role="tabpanel"
                id={tabPanelId("statistieken")}
                aria-labelledby={tabId("statistieken")}
                tabIndex={0}
                className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5"
              >
                <ErrorBoundary>
                  <StatsView diensten={diensten} />
                </ErrorBoundary>
              </div>
            )}

            {tab === "salaris" && (
              <div
                role="tabpanel"
                id={tabPanelId("salaris")}
                aria-labelledby={tabId("salaris")}
                tabIndex={0}
                className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5"
              >
                <ErrorBoundary>
                  <SalarisView diensten={diensten} />
                </ErrorBoundary>
              </div>
            )}

            {tab === "afspraken_beheer" && (
              <div
                role="tabpanel"
                id={tabPanelId("afspraken_beheer")}
                aria-labelledby={tabId("afspraken_beheer")}
                tabIndex={0}
                className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5"
              >
                <ErrorBoundary>
                  {/* Volledige dienstenlijst — zelfde invoer als de pagina zelf
                      én als /agenda, zodat conflict-tellingen overal identiek
                      zijn (audit N10/F13). Sync-vlag gedeeld met de header-knop
                      (audit F9); wachtrij-fouten landen in de pagina-banner
                      (audit F10). */}
                  <AfsprakenView
                    diensten={diensten}
                    onEditEvent={handleEditEvent}
                    onNewEvent={openNewEvent}
                    syncing={calSyncing}
                    onSyncingChange={setCalSyncing}
                    onPendingSyncError={setPendingSyncError}
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

/** Leesbare melding uit de (untyped) query-error van useSchedule. */
function scheduleErrorMessage(error: unknown) {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  return "De server gaf een fout terug. Controleer je verbinding en probeer het opnieuw.";
}

/** Advance an ISO date (YYYY-MM-DD) by `days`, noon-anchored to match eventsByDate keys. */
function addDaysIso(baseIso: string, days: number): string {
  const date = new Date(`${baseIso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return baseIso;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
