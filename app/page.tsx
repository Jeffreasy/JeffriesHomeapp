"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { useDevices, useLampCommand } from "@/hooks/useHomeapp";
import { useSchedule } from "@/hooks/useSchedule";
import { useSalary } from "@/hooks/useSalary";
import { useLoonstroken } from "@/hooks/useLoonstroken";
import { useHabits } from "@/hooks/useHabits";
import { usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { usePrivacy } from "@/hooks/usePrivacy";
import { type ScenePreset } from "@/lib/scenes";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { PersonalEventItem } from "@/components/schedule/PersonalEventItem";
import { CreateEventModal } from "@/components/schedule/CreateEventModal";
import { getShiftAppointments } from "@/components/schedule/scheduleUtils";
import { QuickNote } from "@/components/notes/QuickNote";
import { DailyChecklist } from "@/components/habits/DailyChecklist";

import {
  type DashboardDateInfo,
  formatCurrency,
  getDashboardDateInfo,
} from "@/components/dashboard/DashboardUtils";
import { calculateScheduleSalaryForecast } from "@/lib/salaryForecast";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState, ErrorState, Panel, RouteTile, SectionHeader, StatusRow } from "@/components/dashboard/DashboardPrimitives";
import { OverviewPanel } from "@/components/dashboard/DashboardOverviewPanel";
import { CommandPanel } from "@/components/dashboard/DashboardCommandPanel";
import { AppIcon } from "@/components/ui/AppIcon";

export default function DashboardPage() {
  const [dateInfo, setDateInfo] = useState<DashboardDateInfo | null>(null);
  // `dateInfo` is null on the server and the first client paint, then set in the
  // effect below — so we reuse it as a "mounted" signal. The devices query is the
  // only dashboard source persisted to IndexedDB (the rest are on
  // PERSIST_DENY_PREFIXES), so its cache is already present on the client's first
  // paint but never during SSR; gating the device-derived UI on `mounted` keeps
  // the server and hydration renders identical (otherwise the lamp cell + the
  // "alles aan" toggle hydration-mismatch).
  const mounted = dateInfo !== null;

  useEffect(() => {
    const updateDateInfo = () => setDateInfo(getDashboardDateInfo());
    const timeout = window.setTimeout(updateDateInfo, 0);
    const interval = window.setInterval(updateDateInfo, 60_000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const queryClient = useQueryClient();
  const { data: devices = [], isLoading: devicesLoading, error: devicesError } = useDevices();
  const { sendBatch } = useLampCommand();
  // Empty until mounted so SSR and the first client paint match (see `mounted`).
  const dashboardDevices = useMemo(() => (mounted ? devices : []), [mounted, devices]);
  const {
    diensten,
    nextDienst,
    isLoading: scheduleLoading,
    isError: scheduleError,
    refetch: refetchSchedule,
  } = useSchedule();
  const {
    huidig: salarisHuidig,
    isLoading: salaryLoading,
    isError: salaryError,
    refetch: refetchSalary,
  } = useSalary();
  const loonstroken = useLoonstroken();
  const { isError: habitsError } = useHabits();
  const {
    upcoming: upcomingEvents,
    eventsByDate,
    conflictMap,
    withConflicts,
    isLoading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = usePersonalEvents({ diensten });
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy("finance");
  
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const onlineDevices = useMemo(() => dashboardDevices.filter((d) => d.status === "online"), [dashboardDevices]);
  const onDevices = useMemo(() => onlineDevices.filter((d) => d.current_state?.on), [onlineDevices]);
  // allOn reflects ONLINE devices only — the toggle-all action also acts only on
  // online devices, so counting offline ones made the label contradict the action.
  const allOn = onlineDevices.length > 0 && onDevices.length === onlineDevices.length;
  
  const todayIso = dateInfo?.todayIso;
  const personalUpcomingEvents = useMemo(
    () => upcomingEvents.filter((event) => event.kalender !== "Rooster"),
    [upcomingEvents]
  );
  const getDashboardConflict = (event: PersonalEvent) => {
    const conflict = conflictMap.get(event.eventId);
    if (!conflict || conflict.level === "info") return undefined;
    if (conflict.level === "soft" && event.heledag) return undefined;
    return conflict;
  };
  const dashboardAppointments = personalUpcomingEvents.slice(0, 3);
  const moreAppointments = Math.max(0, personalUpcomingEvents.length - dashboardAppointments.length);
  // Gedeelde helper (overnight-aware, over alle dagen die de dienst beslaat) i.p.v.
  // alleen de startdag — zelfde contract als /rooster en /agenda. Home houdt zijn
  // eigen conflict-definitie (geen info-level, geen soft+heledag), dus zonder
  // conflictMap ophalen en daarna filteren.
  const nextShiftEvents = getShiftAppointments(nextDienst, eventsByDate).filter(
    (event) => event.kalender !== "Rooster" && getDashboardConflict(event)
  );
  const nextEvent = personalUpcomingEvents[0] ?? null;
  const hardConflicts = withConflicts.filter((event) => conflictMap.get(event.eventId)?.level === "hard").length;
  const actionableConflicts = personalUpcomingEvents.filter((event) => getDashboardConflict(event)).length;
  
  const scheduleForecast = useMemo(
    () => calculateScheduleSalaryForecast(diensten, dateInfo?.period, {
      salaryRecords: salarisHuidig ? [salarisHuidig] : [],
      loonstroken: loonstroken.records,
    }),
    [diensten, dateInfo?.period, loonstroken.records, salarisHuidig]
  );
  const werkelijkNetto = dateInfo ? loonstroken.byPeriode.get(dateInfo.period)?.netto : undefined;
  const salaryForecast = salarisHuidig && salarisHuidig.nettoPrognose > 0
    ? salarisHuidig.nettoPrognose
    : scheduleForecast?.nettoPrognose;
  const nettoLabel = werkelijkNetto ? "Netto salaris" : "Netto prognose";
  const nettoValue = werkelijkNetto ?? salaryForecast;
  const financeLoading = salaryLoading || loonstroken.isLoading;
  const financeFailed = Boolean(salaryError || loonstroken.isError);
  // H5: mask() alleen op échte bedragen — laden/ontbreken/fout worden nooit
  // als "••••" gemaskeerd (dat suggereert verborgen data die er niet is).
  const nettoDisplay = typeof nettoValue === "number"
    ? mask(formatCurrency(nettoValue))
    : financeLoading
      ? "Laden…"
      : financeFailed
        ? "Kon niet laden"
        : "—";
  const nettoSub = typeof nettoValue !== "number" && financeFailed
    ? "Salarisdata niet beschikbaar"
    : werkelijkNetto
      ? "loonstrook bevestigd"
      : salarisHuidig && salarisHuidig.nettoPrognose > 0
        ? "Render salarisberekening"
        : scheduleForecast
          ? `${scheduleForecast.aantalDiensten} diensten · ${scheduleForecast.totaalUren}u rooster`
          : scheduleLoading || financeLoading
            ? "rooster laden"
            : "geen roosterdata deze maand";

  const greeting = dateInfo?.greeting ?? "Welkom";
  const today = dateInfo?.todayLabel ?? "vandaag";
  const hasLoadingData = devicesLoading || scheduleLoading || salaryLoading || eventsLoading || loonstroken.isLoading;
  // DEEL 2 #1: rode variant van de update-banner zodra één van de vijf
  // databronnen faalde — de pagina mag een backend-storing niet verzwijgen.
  const hasFailedData = Boolean(
    devicesError || scheduleError || financeFailed || eventsError || habitsError
  );

  const retryHabits = () => {
    // useHabits exposeert (nog) geen refetch; invalideer alle habit-queries
    // (Orval-keys beginnen met "/habits").
    queryClient.invalidateQueries({
      predicate: (query) =>
        typeof query.queryKey[0] === "string" && (query.queryKey[0] as string).startsWith("/habits"),
    });
  };

  // Retry op de rode banner: alleen de gefaalde bronnen opnieuw ophalen.
  const retryFailedSources = () => {
    if (devicesError) queryClient.invalidateQueries({ queryKey: ["devices"] });
    if (scheduleError) void refetchSchedule();
    if (salaryError) void refetchSalary();
    if (loonstroken.isError) void loonstroken.refetch();
    if (eventsError) void refetchEvents();
    if (habitsError) retryHabits();
  };

  // DEEL 2 #4: één gebundelde batch-call (zelfde pad als de lampen-pagina)
  // i.p.v. N losse mutates → één refetch en één gebundelde fout-toast.
  const toggleAll = () => {
    sendBatch(onlineDevices, { on: !allOn });
  };

  const applyScene = (scene: ScenePreset) => {
    sendBatch(onlineDevices, scene.command);
  };

  const openNewEvent = () => {
    setEditEvent(null);
    setModalOpen(true);
  };

  return (
    <div className="text-slate-100">
      <DashboardHeader
        greeting={greeting}
        today={today}
        privacyOn={privacyOn}
        togglePrivacy={togglePrivacy}
        allOn={allOn}
        onlineDevicesCount={onlineDevices.length}
        toggleAll={toggleAll}
      />

      <main className="mx-auto max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-5 lg:px-8 lg:py-7">
        {hasLoadingData && (
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-500">
            <AppIcon name="activity" tone="blue" size="xs" />
            Dashboardgegevens worden bijgewerkt
          </div>
        )}

        {hasFailedData && !hasLoadingData && (
          <div
            role="alert"
            className="flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"
          >
            <span className="flex items-center gap-2">
              <AppIcon name="warning" tone="rose" size="xs" />
              Sommige gegevens konden niet worden bijgewerkt
            </span>
            <button
              type="button"
              onClick={retryFailedSources}
              className="shrink-0 rounded-lg border border-red-400/30 bg-red-500/10 px-2.5 py-1 font-semibold text-red-100 transition-colors hover:bg-red-500/20"
            >
              Opnieuw proberen
            </button>
          </div>
        )}

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
          <OverviewPanel
            nextDienst={nextDienst}
            nextEvent={nextEvent}
            nettoLabel={nettoLabel}
            nettoValue={nettoDisplay}
            nettoSub={nettoSub}
            lampsOn={onDevices.length}
            lampsTotal={dashboardDevices.length}
            devicesOnline={onlineDevices.length}
            conflicts={actionableConflicts}
            hardConflicts={hardConflicts}
            todayIso={todayIso}
            appointmentsLoading={eventsLoading}
            appointmentsFailed={Boolean(eventsError)}
            scheduleLoading={scheduleLoading}
            scheduleFailed={Boolean(scheduleError)}
            devicesLoading={!mounted || devicesLoading}
            devicesFailed={Boolean(devicesError)}
            financeLoading={financeLoading}
            financeFailed={financeFailed}
          />

          {devicesError ? (
            <Panel>
              <SectionHeader icon="lights" label="Direct bedienen" title="Licht en sfeer" compact />
              <ErrorState
                title="Lampen konden niet geladen worden"
                text="De devicelijst is niet opgehaald — bediening is tijdelijk niet mogelijk."
                onRetry={() => queryClient.invalidateQueries({ queryKey: ["devices"] })}
              />
            </Panel>
          ) : (
            <CommandPanel
              allOn={allOn}
              onlineCount={onlineDevices.length}
              totalCount={devices.length}
              onCount={onDevices.length}
              loading={devicesLoading}
              onToggleAll={toggleAll}
              onApplyScene={applyScene}
            />
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <div>
              <SectionHeader
                icon="time"
                label="Planning"
                title="Werk en afspraken"
                href="/rooster"
                actionLabel="Rooster"
              />
              <div className="space-y-4">
                {scheduleError ? (
                  <ErrorState
                    title="Rooster kon niet geladen worden"
                    text="Je diensten zijn niet opgehaald — dit is een laadfout, geen leeg rooster."
                    onRetry={() => void refetchSchedule()}
                  />
                ) : (
                  <NextShiftCard
                    dienst={nextDienst}
                    afspraken={nextShiftEvents}
                    conflictMap={conflictMap}
                    todayIso={todayIso}
                  />
                )}

                <Panel className="p-3 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Aankomende afspraken</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {eventsError
                          ? "Agenda kon niet worden geladen"
                          : eventsLoading
                          ? "Google Calendar wordt gelezen"
                          : personalUpcomingEvents.length > 0
                          ? `${dashboardAppointments.length} eerstvolgende · ${personalUpcomingEvents.length} totaal`
                          : "Je agenda is leeg voor de komende periode"}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                      <Link
                        href="/agenda"
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)] sm:h-9"
                      >
                        Agenda
                      </Link>
                      <button
                        type="button"
                        onClick={openNewEvent}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/15 sm:h-9"
                      >
                        <AppIcon name="add" tone="indigo" size="xs" />
                        Nieuw
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-2 sm:mt-4">
                    {eventsError ? (
                      <ErrorState
                        title="Afspraken konden niet geladen worden"
                        text="Je agenda is niet opgehaald — dit is een laadfout, geen lege agenda."
                        onRetry={() => void refetchEvents()}
                      />
                    ) : eventsLoading ? (
                      <EmptyState
                        icon="calendar"
                        title="Afspraken laden"
                        text="Je Google Calendar en lokale wachtrij worden opgehaald."
                      />
                    ) : dashboardAppointments.length > 0 ? (
                      dashboardAppointments.map((event) => (
                        <PersonalEventItem
                          key={event.eventId}
                          event={event}
                          isToday={todayIso ? event.startDatum === todayIso : false}
                          onEdit={(selected) => {
                            setEditEvent(selected);
                            setModalOpen(true);
                          }}
                          conflictInfo={getDashboardConflict(event)}
                          compact
                        />
                      ))
                    ) : (
                      <EmptyState
                        icon="calendar"
                        title="Geen aankomende afspraken"
                        text="Voeg een afspraak toe of synchroniseer je Google Calendar."
                      />
                    )}
                    {moreAppointments > 0 && (
                      <Link
                        href="/agenda"
                        className="flex min-h-11 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] text-xs font-semibold text-slate-400 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
                      >
                        Bekijk {moreAppointments} meer in Agenda
                      </Link>
                    )}
                  </div>
                </Panel>
              </div>
            </div>

            <div className="hidden md:block">
              <SectionHeader
                icon="automations"
                label="Navigatie"
                title="Snel naar je belangrijkste modules"
              />
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <RouteTile href="/lampen" icon="lights" label="Lampen" sub="Kamers en scenes" tone="amber" />
                <RouteTile href="/rooster" icon="roster" label="Rooster" sub="Diensten en import" tone="indigo" />
                <RouteTile href="/agenda" icon="agenda" label="Agenda" sub="Afspraken en sync" tone="blue" />
                <RouteTile href="/finance" icon="finance" label="Finance" sub="Salaris en uitgaven" tone="green" />
                <RouteTile href="/notities" icon="pageNote" label="Notities" sub="Capture en lijsten" tone="blue" />
                <RouteTile href="/automations" icon="automations" label="Automations" sub="Regels en schema's" tone="amber" />
                <RouteTile href="/laventecare" icon="business" label="LaventeCare" sub="Leads en facturen" tone="indigo" />
              </div>
            </div>
          </div>

          {/* H4/M-I: de aside is op mobiel gewoon zichtbaar (onder de
              hoofdkolom) — DailyChecklist/QuickNote/Status bestonden daar niet. */}
          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            {habitsError ? (
              <Panel>
                <SectionHeader icon="habit" label="Vandaag" title="Checklist" compact />
                <ErrorState
                  title="Checklist kon niet geladen worden"
                  text="Je habits zijn niet opgehaald — dit is een laadfout, geen lege lijst."
                  onRetry={retryHabits}
                />
              </Panel>
            ) : (
              <DailyChecklist />
            )}
            <QuickNote />
            <Panel>
              <SectionHeader
                icon="shield"
                label="Kwaliteit"
                title="Status"
                compact
              />
              <div className="space-y-3">
                {/* H7: zelfde vocabulaire als /focus — dit is de bridge-lijn. */}
                <StatusRow
                  icon="statusOk"
                  label="Bridge & lampen"
                  value={
                    devicesLoading
                      ? "Laden…"
                      : devicesError
                        ? "Kon niet laden"
                        : devices.length === 0
                          ? "Nog geen lampen"
                          : `${onlineDevices.length}/${devices.length} lampen online`
                  }
                  tone={
                    devicesError
                      ? "rose"
                      : devicesLoading
                        ? "slate"
                        : onlineDevices.length === devices.length && devices.length > 0
                          ? "green"
                          : "amber"
                  }
                />
                <StatusRow
                  icon="habit"
                  label="Agenda conflicten"
                  value={
                    eventsError
                      ? "Kon niet laden"
                      : hardConflicts > 0
                        ? `${hardConflicts} harde overlap`
                        : actionableConflicts > 0
                          ? `${actionableConflicts} aandachtspunt(en)`
                          : "Geen conflicten"
                  }
                  tone={eventsError ? "rose" : hardConflicts > 0 ? "rose" : actionableConflicts > 0 ? "amber" : "green"}
                />
                <StatusRow
                  icon="hide"
                  label="Privacy"
                  value={privacyOn ? "Financiële waarden verborgen" : "Financiële waarden zichtbaar"}
                  tone={privacyOn ? "green" : "slate"}
                />
              </div>
            </Panel>
          </aside>
        </section>
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
