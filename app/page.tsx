"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDevices, useLampCommand } from "@/hooks/useHomeapp";
import { useSchedule } from "@/hooks/useSchedule";
import { useSalary } from "@/hooks/useSalary";
import { useLoonstroken } from "@/hooks/useLoonstroken";
import { usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { usePrivacy } from "@/hooks/usePrivacy";
import { type ScenePreset } from "@/lib/scenes";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { PersonalEventItem } from "@/components/schedule/PersonalEventItem";
import { CreateEventModal } from "@/components/schedule/CreateEventModal";
import { QuickNote } from "@/components/notes/QuickNote";
import { DailyChecklist } from "@/components/habits/DailyChecklist";

import {
  type DashboardDateInfo,
  calculateScheduleSalaryForecast,
  formatCurrency,
  formatEventMeta,
  formatRelativeDateLabel,
  getDashboardDateInfo,
} from "@/components/dashboard/DashboardUtils";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState, MetricTile, Panel, RouteTile, SectionHeader, StatusRow } from "@/components/dashboard/DashboardPrimitives";
import { OverviewPanel } from "@/components/dashboard/DashboardOverviewPanel";
import { CommandPanel } from "@/components/dashboard/DashboardCommandPanel";
import { AppIcon } from "@/components/ui/AppIcon";

export default function DashboardPage() {
  const [dateInfo, setDateInfo] = useState<DashboardDateInfo | null>(null);

  useEffect(() => {
    const updateDateInfo = () => setDateInfo(getDashboardDateInfo());
    const timeout = window.setTimeout(updateDateInfo, 0);
    const interval = window.setInterval(updateDateInfo, 60_000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const { data: devices = [], isLoading: devicesLoading } = useDevices();
  const { mutate: sendCommand } = useLampCommand();
  const { diensten, nextDienst, upcoming: upcomingShifts, isLoading: scheduleLoading } = useSchedule();
  const { huidig: salarisHuidig, isLoading: salaryLoading } = useSalary();
  const loonstroken = useLoonstroken();
  const {
    upcoming: upcomingEvents,
    eventsByDate,
    conflictMap,
    withConflicts,
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = usePersonalEvents({ diensten });
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy("finance");
  
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const onlineDevices = useMemo(() => devices.filter((d) => d.status === "online"), [devices]);
  const onDevices = useMemo(() => devices.filter((d) => d.current_state?.on), [devices]);
  const allOn = onDevices.length === devices.length && devices.length > 0;
  
  const todayIso = dateInfo?.todayIso;
  const personalUpcomingEvents = useMemo(
    () => upcomingEvents.filter((event) => event.kalender !== "Rooster"),
    [upcomingEvents]
  );
  const todayEvents = todayIso ? (eventsByDate[todayIso] ?? []).filter((event) => event.kalender !== "Rooster") : [];
  const getDashboardConflict = (event: PersonalEvent) => {
    const conflict = conflictMap.get(event.eventId);
    if (!conflict || conflict.level === "info") return undefined;
    if (conflict.level === "soft" && event.heledag) return undefined;
    return conflict;
  };
  const dashboardAppointments = personalUpcomingEvents.slice(0, 3);
  const moreAppointments = Math.max(0, personalUpcomingEvents.length - dashboardAppointments.length);
  const nextShiftEvents = nextDienst
    ? (eventsByDate[nextDienst.startDatum] ?? []).filter((event) => event.kalender !== "Rooster" && getDashboardConflict(event))
    : [];
  const nextEvent = personalUpcomingEvents[0] ?? null;
  const hardConflicts = withConflicts.filter((event) => conflictMap.get(event.eventId)?.level === "hard").length;
  const actionableConflicts = personalUpcomingEvents.filter((event) => getDashboardConflict(event)).length;
  
  const scheduleForecast = useMemo(
    () => calculateScheduleSalaryForecast(diensten, dateInfo?.period),
    [diensten, dateInfo?.period]
  );
  const werkelijkNetto = dateInfo ? loonstroken.byPeriode.get(dateInfo.period)?.netto : undefined;
  const salaryForecast = salarisHuidig && salarisHuidig.nettoPrognose > 0
    ? salarisHuidig.nettoPrognose
    : scheduleForecast?.nettoPrognose;
  const nettoLabel = werkelijkNetto ? "Netto salaris" : "Netto prognose";
  const nettoValue = werkelijkNetto ?? salaryForecast;
  const nettoSub = werkelijkNetto
    ? "loonstrook bevestigd"
    : salarisHuidig && salarisHuidig.nettoPrognose > 0
      ? "Render salarisberekening"
      : scheduleForecast
        ? `${scheduleForecast.aantalDiensten} diensten · ${scheduleForecast.totaalUren}u rooster`
        : scheduleLoading
          ? "rooster laden"
          : "geen roosterdata deze maand";
  
  const greeting = dateInfo?.greeting ?? "Welkom";
  const today = dateInfo?.todayLabel ?? "vandaag";
  const hasLoadingData = devicesLoading || scheduleLoading || salaryLoading || eventsLoading || loonstroken.isLoading;

  const toggleAll = () => {
    onlineDevices.forEach((device) => sendCommand({ id: device.id, cmd: { on: !allOn } }));
  };

  const applyScene = (scene: ScenePreset) => {
    onlineDevices.forEach((device) => sendCommand({ id: device.id, cmd: scene.command }));
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

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.8fr)]">
          <OverviewPanel
            nextDienst={nextDienst}
            nextEvent={nextEvent}
            nettoLabel={nettoLabel}
            nettoValue={mask(formatCurrency(nettoValue))}
            nettoSub={nettoSub}
            lampsOn={onDevices.length}
            lampsTotal={devices.length}
            devicesOnline={onlineDevices.length}
            conflicts={actionableConflicts}
            hardConflicts={hardConflicts}
            todayIso={todayIso}
            appointmentsLoading={eventsLoading}
          />

          <CommandPanel
            allOn={allOn}
            onlineCount={onlineDevices.length}
            totalCount={devices.length}
            onCount={onDevices.length}
            onToggleAll={toggleAll}
            onApplyScene={applyScene}
          />
        </section>

        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MetricTile
            href="/lampen"
            icon="lights"
            tone={onlineDevices.length === 0 ? "slate" : onDevices.length > 0 ? "amber" : "blue"}
            label="Lampen"
            value={devices.length === 0 ? "Geen lampen" : `${onDevices.length}/${devices.length} aan`}
            sub={`${onlineDevices.length} online`}
          />
          <MetricTile
            href="/rooster"
            icon="calendarDays"
            tone={nextDienst ? "indigo" : "slate"}
            label="Rooster"
            value={nextDienst ? nextDienst.startTijd : "Geen dienst"}
            sub={nextDienst ? `${formatRelativeDateLabel(nextDienst.startDatum, todayIso)} · ${upcomingShifts.length} diensten` : `${upcomingShifts.length} komende diensten`}
          />
          <MetricTile
            href="/agenda"
            icon="agenda"
            tone={hardConflicts > 0 ? "rose" : actionableConflicts > 0 ? "amber" : todayEvents.length > 0 ? "green" : "blue"}
            label="Agenda"
            value={eventsLoading ? "Laden" : todayEvents.length > 0 ? `${todayEvents.length} vandaag` : "Rustig"}
            sub={eventsLoading ? "Agenda wordt geladen" : nextEvent ? formatEventMeta(nextEvent, todayIso) : "Geen aankomende afspraak"}
          />
          <MetricTile
            href="/finance"
            icon="wallet"
            tone="green"
            label={nettoLabel}
            value={mask(formatCurrency(nettoValue))}
            sub={nettoSub}
          />
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
                <NextShiftCard
                  dienst={nextDienst}
                  afspraken={nextShiftEvents}
                  conflictMap={conflictMap}
                />

                <Panel className="p-3 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Aankomende afspraken</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {eventsLoading
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
                    {eventsLoading ? (
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
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <RouteTile href="/lampen" icon="lights" label="Lampen" sub="Kamers en scenes" tone="amber" />
                <RouteTile href="/rooster" icon="roster" label="Rooster" sub="Diensten en import" tone="indigo" />
                <RouteTile href="/agenda" icon="agenda" label="Agenda" sub="Afspraken en sync" tone="blue" />
                <RouteTile href="/finance" icon="finance" label="Financien" sub="Salaris en uitgaven" tone="green" />
                <RouteTile href="/notities" icon="pageNote" label="Notities" sub="Capture en lijsten" tone="blue" />
              </div>
            </div>
          </div>

          <aside className="hidden space-y-6 md:block xl:sticky xl:top-24 xl:self-start">
            <DailyChecklist />
            <QuickNote />
            <Panel>
              <SectionHeader
                icon="shield"
                label="Kwaliteit"
                title="Status"
                compact
              />
              <div className="space-y-3">
                <StatusRow
                  icon="statusOk"
                  label="Devices"
                  value={devices.length === 0 ? "Nog geen lampen" : `${onlineDevices.length}/${devices.length} online`}
                  tone={onlineDevices.length === devices.length && devices.length > 0 ? "green" : "amber"}
                />
                <StatusRow
                  icon="habit"
                  label="Agenda conflicten"
                  value={hardConflicts > 0 ? `${hardConflicts} harde overlap` : actionableConflicts > 0 ? `${actionableConflicts} aandachtspunt(en)` : "Geen conflicten"}
                  tone={hardConflicts > 0 ? "rose" : actionableConflicts > 0 ? "amber" : "green"}
                />
                <StatusRow
                  icon="hide"
                  label="Privacy"
                  value={privacyOn ? "Financiele waarden verborgen" : "Financiele waarden zichtbaar"}
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
