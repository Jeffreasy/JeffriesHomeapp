"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Briefcase, Calendar, CalendarClock, Clock3, MoreHorizontal, Plus, RefreshCw, Trash2, Upload } from "lucide-react";

import { useUser } from "@clerk/nextjs";
import { useSchedule } from "@/hooks/useSchedule";
import { usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { useToast } from "@/components/ui/Toast";
import { syncApi } from "@/lib/api";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { StatsView } from "@/components/schedule/StatsView";
import { SalarisView } from "@/components/salary/SalarisView";
import { AfsprakenView } from "@/components/schedule/AfsprakenView";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { calcTotalHours, getHistory, getUpcoming, shiftBreakdown, teamBreakdown } from "@/lib/schedule";
import { generateUnifiedTimeline } from "@/lib/unified";

import { getAmsterdamTodayIso, formatHours, formatMetaDate, pluralize, type Tab, TABS } from "@/components/schedule/RoosterUtils";
import { shortSyncError, getShiftAppointments } from "@/components/schedule/scheduleUtils";
import { EmptyRoster } from "@/components/schedule/RoosterCards";
import { OverviewPanel, OverviewTab } from "@/components/schedule/RoosterOverview";
import { TabBar, tabBarPanelId, tabBarTabId } from "@/components/schedule/TabBar";
import {
  AppPageHeader,
  AppPageShell,
  PageToolbar,
} from "@/components/layout/AppPageShell";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { StatChip } from "@/components/ui/StatChip";
const LazyCreateEventModal = dynamic(
  () => import("@/components/schedule/CreateEventModal").then((module) => module.CreateEventModal),
  { ssr: false },
);


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
  const { openConfirm } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);

  const [todayIso, setTodayIso] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);
  const [tab, setTab] = useState<Tab>("overzicht");
  const [showHistory, setShowHistory] = useState(false);
  const [weekOverrides, setWeekOverrides] = useState<Record<string, boolean>>({});
  const [actionsOpen, setActionsOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  // Eén gedeelde sync-vlag (audit F9): header-Sync én "Verwerk nu" op de
  // Beheer-tab lezen/schrijven deze — geen dubbele gelijktijdige sync meer.
  const [calSyncing, setCalSyncing] = useState(false);
  // Laatste wachtrij-fout, persistent zoals op /agenda (audit F10).
  const [pendingSyncError, setPendingSyncError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
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
    error: eventsError,
    refetch: refetchEvents,
  } = usePersonalEvents({
    // Volledige dienstenlijst (audit F13): agenda én rooster geven de
    // ongefilterde lijst door zodat de conflict-tellingen overal identiek zijn;
    // analyzeConflicts slaat VERWIJDERDE diensten zelf over en past-diensten
    // kunnen per definitie niet met aankomende events overlappen.
    diensten,
  });

  // Pagina-aggregaties memoizen (audit DEEL 2 #14) zodat ze niet elke render
  // opnieuw over de dienstenlijst rekenen en verse identiteiten produceren.
  const upcomingHours = useMemo(() => calcTotalHours(upcoming), [upcoming]);
  const shifts = useMemo(() => shiftBreakdown(upcoming), [upcoming]);
  const teams = useMemo(() => teamBreakdown(upcoming), [upcoming]);
  // Expliciet hoge limiet (audit L1): "Toon alle N" in de historie-sidebar
  // liep anders stilzwijgend tegen de default-cap van 20 aan.
  const history = useMemo(() => getHistory(diensten, 500), [diensten]);
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
  // Eén gedeelde "afspraken bij dienst"-helper (audit DEEL 2 NextShiftCard):
  // conflicterende events over álle dagen die de (mogelijk nachtelijke) dienst
  // beslaat — zelfde contract als /agenda en de home-dashboardkaart.
  const nextShiftEvents = useMemo(
    () => getShiftAppointments(nextDienst, eventsByDate, conflictMap),
    [nextDienst, eventsByDate, conflictMap],
  );
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
      if (result.scheduleWriteError) {
        // De kalender is opgehaald maar het rooster kon niet worden weggeschreven
        // — nooit een schone "gesynchroniseerd" claimen (audit DEEL 2 #7).
        setPendingSyncError(`Rooster opslaan mislukt: ${result.scheduleWriteError}`);
        toastError(`Rooster opslaan mislukt: ${shortSyncError(result.scheduleWriteError)}`);
      } else if (result.pendingError) {
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
    const confirmed = await openConfirm({
      title: "Rooster wissen?",
      message:
        "Alle geimporteerde diensten en synchronisatiemetadata worden verwijderd. Deze actie kan niet ongedaan worden gemaakt.",
      confirmLabel: "Rooster wissen",
      cancelLabel: "Annuleren",
      variant: "danger",
    });
    if (!confirmed) return;

    setActionsOpen(false);
    setClearing(true);
    try {
      await clear();
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
      if (res.ok) success(`${res.count} diensten geïmporteerd`);
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
    <AppPageShell width="standard" className="space-y-6 text-slate-100">
      <div className="sticky top-0 z-30 space-y-2 bg-[var(--color-background)]/95 pb-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <AppPageHeader
            eyebrow="Planning"
            title="Rooster"
            description={
              meta
                ? `${meta.totalRows} diensten · ${formatMetaDate(meta.importedAt)}`
                : "Nog niet gesynchroniseerd"
            }
            leading={
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                <Calendar size={19} aria-hidden="true" />
              </div>
            }
            className="min-w-0 flex-1"
          />
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleCalendarSync}
              disabled={calSyncing}
              aria-busy={calSyncing}
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-wait disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={calSyncing ? "animate-spin" : ""}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">
                {calSyncing ? "Synchroniseren…" : "Synchroniseren"}
              </span>
              <span className="sm:hidden">Sync</span>
            </button>
            <button
              type="button"
              onClick={() => setActionsOpen(true)}
              aria-label="Meer roosteracties"
              aria-haspopup="dialog"
              aria-expanded={actionsOpen}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-white"
            >
              <MoreHorizontal size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <PageToolbar label="Roosteronderdelen">
          <TabBar
            tabs={TABS}
            active={tab}
            onChange={setTab}
            idPrefix="rooster"
            ariaLabel="Rooster onderdelen"
            tone="amber"
            className="w-full"
          />
        </PageToolbar>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        onChange={handleFile}
        disabled={importing}
        className="hidden"
      />

      <div className="space-y-6">
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

        {/* Afspraken-fetch faalde (audit DEEL 2 #2): voorheen negeerde /rooster
            een 500 volledig — een vrolijk-groene "rustig"-conflictchip naast een
            lege tijdlijn. Nu een expliciete banner met retry. */}
        {eventsError && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-200">
            <AlertTriangle size={13} className="shrink-0 text-amber-400" />
            <span className="min-w-0 flex-1">
              Afspraken en conflicten konden niet worden geladen — de tijdlijn en tellingen kunnen onvolledig zijn.
            </span>
            <button
              type="button"
              onClick={() => void refetchEvents()}
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

        {/* First-run: de skeleton/empty/error-states horen alleen bij de
            Overzicht-tab. Statistieken/Salaris/Beheer hebben eigen lege staten
            en moeten ook zónder rooster bereikbaar zijn — anders zijn het dode
            knoppen voor een nieuwe gebruiker (audit DEEL 2 #5). */}

        {/* Tijdens de koude load géén "Rooster ophalen"-CTA flashen (audit M18):
            eerst een lichte skeleton, pas bij een écht lege dataset de empty state. */}
        {tab === "overzicht" && !hasScheduleData && isLoading && (
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
        {tab === "overzicht" && !hasScheduleData && !isLoading && scheduleIsError && (
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

        {tab === "overzicht" && !hasScheduleData && !isLoading && !scheduleIsError && (
          <EmptyRoster
            syncing={calSyncing}
            onSync={handleCalendarSync}
            onUpload={() => fileRef.current?.click()}
          />
        )}

        {/* Overzicht toont zijn hero/tijdlijn alleen mét data; de overige tabs
            renderen altijd (eigen lege staten) zodat ze op first-run bereikbaar
            zijn (audit DEEL 2 #5). */}
        {(hasScheduleData || tab !== "overzicht") && (
          <>
            {/* The next-shift hero + snapshot only belong on the Overzicht tab —
                they're irrelevant on Statistieken/Salaris/Beheer and previously
                rendered there too, walling off the actual content. */}
            {tab === "overzicht" && hasScheduleData && (
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

            {tab === "overzicht" && hasScheduleData && (
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
      </div>

      <BottomSheet
        open={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title="Roosteracties"
        closeLabel="Roosteracties sluiten"
      >
        <div className="space-y-2 p-4 sm:p-5">
          <button
            type="button"
            onClick={() => {
              fileRef.current?.click();
              setActionsOpen(false);
            }}
            disabled={isLoading || importing}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-left text-sm font-semibold text-slate-200 transition-colors hover:bg-[var(--color-surface-hover)] disabled:cursor-wait disabled:opacity-50"
          >
            <Upload
              size={18}
              className={importing ? "animate-pulse text-amber-300" : "text-slate-400"}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block">{importing ? "Importeren…" : "CSV importeren"}</span>
              <span className="mt-0.5 block text-xs font-normal text-slate-500">
                Voeg diensten toe vanuit een roosterbestand
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActionsOpen(false);
              openNewEvent();
            }}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.06] px-4 text-left text-sm font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/10"
          >
            <Plus size={18} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block">Nieuwe afspraak</span>
              <span className="mt-0.5 block text-xs font-normal text-indigo-300/70">
                Plan een persoonlijk agenda-item
              </span>
            </span>
          </button>

          {meta && (
            <button
              type="button"
              onClick={() => void handleClearSchedule()}
              disabled={clearing}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-4 text-left text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/10 disabled:cursor-wait disabled:opacity-50"
            >
              {clearing ? (
                <RefreshCw size={18} className="animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 size={18} aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block">{clearing ? "Wissen…" : "Rooster wissen"}</span>
                <span className="mt-0.5 block text-xs font-normal text-rose-300/70">
                  Verwijder alle geïmporteerde diensten
                </span>
              </span>
            </button>
          )}
        </div>
      </BottomSheet>

      {modalOpen && (
        <LazyCreateEventModal
          open={modalOpen}
          onSuccess={() => refetchEvents()}
          onClose={() => {
            setModalOpen(false);
            setEditEvent(null);
          }}
          editEvent={editEvent}
        />
      )}
    </AppPageShell>
  );
}

/** Leesbare melding uit de (untyped) query-error van useSchedule. */
function scheduleErrorMessage(error: unknown) {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  return "De server gaf een fout terug. Controleer je verbinding en probeer het opnieuw.";
}
