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
import { AfsprakenView } from "@/components/schedule/AfsprakenView";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { calcTotalHours, getHistory, getUpcoming, shiftBreakdown, teamBreakdown } from "@/lib/schedule";
import { generateUnifiedTimeline } from "@/lib/unified";

import { getAmsterdamTodayIso, formatHours, formatMetaDate, pluralize, type Tab, TABS } from "@/components/schedule/RoosterUtils";
import { shortSyncError, getShiftAppointments } from "@/components/schedule/scheduleUtils";
import { EmptyRoster } from "@/components/schedule/RoosterCards";
import { OverviewPanel, OverviewTab } from "@/components/schedule/RoosterOverview";
import { TabPanel, Tabs } from "@/components/ui/Tabs";
import {
  AppPageHeader,
  AppPageShell,
  PageToolbar,
} from "@/components/layout/AppPageShell";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { StatChip } from "@/components/ui/StatChip";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { surfaceVariants } from "@/components/ui/Surface";
import { Skeleton } from "@/components/ui/Skeleton";

function DeferredRosterPanel({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex min-h-40 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-active)] text-sm text-[var(--color-text-muted)]"
    >
      <RefreshCw aria-hidden className="h-4 w-4 animate-spin motion-reduce:animate-none" />
      {label}
    </div>
  );
}

const LazyStatsView = dynamic(
  () => import("@/components/schedule/StatsView").then((module) => module.StatsView),
  {
    ssr: false,
    loading: () => <DeferredRosterPanel label="Statistieken laden..." />,
  },
);

const LazySalarisView = dynamic(
  () => import("@/components/salary/SalarisView").then((module) => module.SalarisView),
  {
    ssr: false,
    loading: () => <DeferredRosterPanel label="Salarisoverzicht laden..." />,
  },
);

const LazyCreateEventModal = dynamic(
  () => import("@/components/schedule/CreateEventModal").then((module) => module.CreateEventModal),
  { ssr: false },
);


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
        tone="accent"
      />
      <StatChip
        icon={Briefcase}
        label="Diensten"
        value={String(upcomingCount)}
        meta="komende 30 dagen"
        inlineMeta="30 dgn"
        tone="info"
      />
      {/* Stable metric — the value no longer silently switches meaning between
          "vandaag" and "aankomend" depending on the day (audit N6). */}
      <StatChip
        icon={CalendarClock}
        label="Afspraken"
        value={String(eventCount)}
        meta={`${todayEventCount} vandaag · ${eventCount} komend`}
        inlineMeta={`${todayEventCount} vandaag`}
        tone="info"
      />
      <StatChip
        icon={AlertTriangle}
        label="Conflicten"
        value={hardConflicts > 0 ? String(hardConflicts) : String(conflicts)}
        meta={hardConflicts > 0 ? "direct nalopen" : conflicts > 0 ? "aandacht" : "rustig"}
        inlineMeta={hardConflicts > 0 ? "direct nalopen" : conflicts > 0 ? "aandacht" : "rustig"}
        tone={hardConflicts > 0 ? "danger" : conflicts > 0 ? "warning" : "success"}
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
    <AppPageShell width="standard" className="space-y-6 text-[var(--color-text)]">
      <div className="sticky top-0 z-[var(--layer-sticky)] space-y-2 bg-[var(--color-background)]/95 pb-3 backdrop-blur-xl">
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
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]">
                <Calendar size={19} aria-hidden="true" />
              </div>
            }
            className="min-w-0 flex-1"
          />
          <div className="flex shrink-0 items-center gap-2">
            <Button
              onClick={handleCalendarSync}
              loading={calSyncing}
              loadingLabel="Synchroniseren…"
              variant="primary"
              size="sm"
              className="shrink-0"
            >
              <RefreshCw size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Synchroniseren</span>
              <span className="sm:hidden">Sync</span>
            </Button>
            <IconButton
              onClick={() => setActionsOpen(true)}
              label="Meer roosteracties"
              aria-haspopup="dialog"
              aria-expanded={actionsOpen}
              icon={<MoreHorizontal size={18} />}
            />
          </div>
        </div>

        <PageToolbar label="Roosteronderdelen">
          <Tabs
            items={TABS}
            value={tab}
            onValueChange={setTab}
            idPrefix="rooster"
            ariaLabel="Rooster onderdelen"
            tone="accent"
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
          <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-[var(--color-text-muted)]">
            <Clock3 size={13} className="text-[var(--color-info)]" />
            Roostergegevens worden bijgewerkt
          </div>
        )}

        {/* Failed ≠ empty (audit DEEL 2 #2): een mislukte refresh mét gecachte
            data toont een persistente semantische waarschuwing i.p.v. stil verouderde data. */}
        {scheduleIsError && hasScheduleData && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] px-3 py-2 text-xs text-[var(--color-warning)]">
            <AlertTriangle size={13} className="shrink-0 text-[var(--color-warning)]" />
            <span className="min-w-0 flex-1">
              Rooster verversen mislukt — je ziet mogelijk verouderde gegevens.
            </span>
            <Button size="sm" variant="secondary" onClick={() => void refetch()}>
              Opnieuw proberen
            </Button>
          </div>
        )}

        {/* Afspraken-fetch faalde (audit DEEL 2 #2): voorheen negeerde /rooster
            een 500 volledig — een vrolijk-groene "rustig"-conflictchip naast een
            lege tijdlijn. Nu een expliciete banner met retry. */}
        {eventsError && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)] px-3 py-2 text-xs text-[var(--color-warning)]">
            <AlertTriangle size={13} className="shrink-0 text-[var(--color-warning)]" />
            <span className="min-w-0 flex-1">
              Afspraken en conflicten konden niet worden geladen — de tijdlijn en tellingen kunnen onvolledig zijn.
            </span>
            <Button size="sm" variant="secondary" onClick={() => void refetchEvents()}>
              Opnieuw proberen
            </Button>
          </div>
        )}

        {/* Persistente wachtrij-fout van de laatste sync — pariteit met het
            sidebar-paneel op /agenda (audit F10). */}
        {pendingSyncError && (
          <div className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)] px-3 py-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={13} className="shrink-0 text-[var(--color-danger)]" />
              <p className="text-micro font-semibold uppercase tracking-wider text-[var(--color-danger)]">Wachtrij-fout</p>
            </div>
            <p className="mt-1 text-micro leading-relaxed text-[var(--color-danger)]">{shortSyncError(pendingSyncError)}</p>
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" variant="primary" onClick={handleCalendarSync} loading={calSyncing} loadingLabel="Syncen…">
                Opnieuw syncen
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPendingSyncError(null)}>
                Verbergen
              </Button>
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
          <TabPanel idPrefix="rooster" value="overzicht">
            <div className="space-y-4" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-40 rounded" />
                  <Skeleton className="h-12 rounded-lg" />
                  <Skeleton className="h-12 rounded-lg" />
                </div>
              ))}
            </div>
          </TabPanel>
        )}

        {/* Failed ≠ empty (audit DEEL 2 #2): een 500 zonder data toont een
            foutpaneel met retry, niet de uitnodigende "Rooster ophalen"-CTA. */}
        {tab === "overzicht" && !hasScheduleData && !isLoading && scheduleIsError && (
          <TabPanel
            idPrefix="rooster"
            value="overzicht"
            className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)] px-6 py-12 text-center"
          >
            <AlertTriangle size={28} className="text-[var(--color-danger)]" />
            <h3 className="mt-4 text-lg font-semibold text-[var(--color-danger)]">Rooster kon niet worden geladen</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-[var(--color-text-muted)]">
              {scheduleErrorMessage(scheduleError)}
            </p>
            <Button variant="primary" onClick={() => void refetch()} className="mt-5">
              <RefreshCw size={15} />
              Opnieuw proberen
            </Button>
          </TabPanel>
        )}

        {tab === "overzicht" && !hasScheduleData && !isLoading && !scheduleIsError && (
          <TabPanel idPrefix="rooster" value="overzicht">
            <EmptyRoster
              syncing={calSyncing}
              onSync={handleCalendarSync}
              onUpload={() => fileRef.current?.click()}
            />
          </TabPanel>
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
              <TabPanel idPrefix="rooster" value="overzicht" className="space-y-6">
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
              </TabPanel>
            )}

            {tab === "statistieken" && (
              <TabPanel
                idPrefix="rooster"
                value="statistieken"
                className={surfaceVariants({ tone: "subtle" })}
              >
                <ErrorBoundary>
                  <LazyStatsView diensten={diensten} />
                </ErrorBoundary>
              </TabPanel>
            )}

            {tab === "salaris" && (
              <TabPanel
                idPrefix="rooster"
                value="salaris"
                className={surfaceVariants({ tone: "subtle" })}
              >
                <ErrorBoundary>
                  <LazySalarisView diensten={diensten} />
                </ErrorBoundary>
              </TabPanel>
            )}

            {tab === "afspraken_beheer" && (
              <TabPanel
                idPrefix="rooster"
                value="afspraken_beheer"
                className={surfaceVariants({ tone: "subtle" })}
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
              </TabPanel>
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
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              fileRef.current?.click();
              setActionsOpen(false);
            }}
            disabled={isLoading || importing}
            className="min-h-14 justify-start px-4 text-left"
          >
            <Upload
              size={18}
              className={importing ? "animate-pulse text-[var(--color-primary-hover)] motion-reduce:animate-none" : "text-[var(--color-text-muted)]"}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">
              <span className="block">{importing ? "Importeren…" : "CSV importeren"}</span>
              <span className="mt-0.5 block text-xs font-normal text-[var(--color-text-muted)]">
                Voeg diensten toe vanuit een roosterbestand
              </span>
            </span>
          </Button>

          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              setActionsOpen(false);
              openNewEvent();
            }}
            className="min-h-14 justify-start border-[var(--color-info-border)] bg-[var(--color-info-subtle)] px-4 text-left text-[var(--color-info)] hover:bg-[var(--color-info-border)]"
          >
            <Plus size={18} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block">Nieuwe afspraak</span>
              <span className="mt-0.5 block text-xs font-normal text-[var(--color-info)]">
                Plan een persoonlijk agenda-item
              </span>
            </span>
          </Button>

          {meta && (
            <Button
              fullWidth
              variant="danger"
              onClick={() => void handleClearSchedule()}
              loading={clearing}
              loadingLabel="Rooster wissen…"
              className="min-h-14 justify-start px-4 text-left"
            >
              {clearing ? (
                <RefreshCw size={18} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
              ) : (
                <Trash2 size={18} aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block">{clearing ? "Wissen…" : "Rooster wissen"}</span>
                <span className="mt-0.5 block text-xs font-normal text-[var(--color-danger)]">
                  Verwijder alle geïmporteerde diensten
                </span>
              </span>
            </Button>
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
