"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  EyeOff,
  Landmark,
  Lightbulb,
  NotebookPen,
  Plus,
  ShieldCheck,
  Target,
  Wallet,
  Zap,
} from "lucide-react";
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

import { type DashboardDateInfo, formatCurrency, getDashboardDateInfo } from "@/components/dashboard/DashboardUtils";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { EmptyState, MetricTile, Panel, RouteTile, SectionHeader, StatusRow } from "@/components/dashboard/DashboardPrimitives";
import { OverviewPanel } from "@/components/dashboard/DashboardOverviewPanel";
import { CommandPanel } from "@/components/dashboard/DashboardCommandPanel";

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
  const { nextDienst, thisWeek, upcoming: upcomingShifts, isLoading: scheduleLoading } = useSchedule();
  const { huidig: salarisHuidig, isLoading: salaryLoading } = useSalary();
  const loonstroken = useLoonstroken();
  const {
    upcoming: upcomingEvents,
    eventsByDate,
    conflictMap,
    withConflicts,
    isLoading: eventsLoading,
  } = usePersonalEvents({ diensten: thisWeek });
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy("finance");
  
  const [editEvent, setEditEvent] = useState<PersonalEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const onlineDevices = useMemo(() => devices.filter((d) => d.status === "online"), [devices]);
  const onDevices = useMemo(() => devices.filter((d) => d.current_state?.on), [devices]);
  const allOn = onDevices.length === devices.length && devices.length > 0;
  
  const todayIso = dateInfo?.todayIso;
  const todayEvents = todayIso ? (eventsByDate[todayIso] ?? []) : [];
  const nextShiftEvents = nextDienst ? (eventsByDate[nextDienst.startDatum] ?? []) : [];
  const nextEvent = upcomingEvents[0] ?? null;
  const hardConflicts = withConflicts.filter((event) => conflictMap.get(event.eventId)?.level === "hard").length;
  
  const werkelijkNetto = dateInfo ? loonstroken.byPeriode.get(dateInfo.period)?.netto : undefined;
  const nettoLabel = werkelijkNetto ? "Netto salaris" : "Netto prognose";
  const nettoValue = werkelijkNetto ?? salarisHuidig?.nettoPrognose;
  const nettoSub = werkelijkNetto ? "loonstrook bevestigd" : "op basis van rooster";
  
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

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {hasLoadingData && (
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-500">
            <Activity size={13} className="text-sky-300" />
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
            conflicts={withConflicts.length}
            hardConflicts={hardConflicts}
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

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            href="/lampen"
            icon={Lightbulb}
            tone={onlineDevices.length === 0 ? "slate" : onDevices.length > 0 ? "amber" : "blue"}
            label="Lampen"
            value={devices.length === 0 ? "Geen lampen" : `${onDevices.length}/${devices.length} aan`}
            sub={`${onlineDevices.length} online`}
          />
          <MetricTile
            href="/rooster"
            icon={CalendarDays}
            tone={nextDienst ? "indigo" : "slate"}
            label="Rooster"
            value={nextDienst ? `${nextDienst.dag} ${nextDienst.startTijd}` : "Geen dienst"}
            sub={`${upcomingShifts.length} komende diensten`}
          />
          <MetricTile
            href="/agenda"
            icon={Calendar}
            tone={hardConflicts > 0 ? "rose" : todayEvents.length > 0 ? "green" : "blue"}
            label="Agenda"
            value={todayEvents.length > 0 ? `${todayEvents.length} vandaag` : "Rustige dag"}
            sub={nextEvent?.titel ?? "Geen aankomende afspraak"}
          />
          <MetricTile
            href="/finance"
            icon={Wallet}
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
                icon={Clock3}
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

                <Panel>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">Aankomende afspraken</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {upcomingEvents.length > 0
                          ? `${upcomingEvents.length} items in je agenda`
                          : "Je agenda is leeg voor de komende periode"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={openNewEvent}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/10 px-3 text-xs font-semibold text-indigo-200 transition-colors hover:bg-indigo-500/15"
                    >
                      <Plus size={14} />
                      Nieuwe afspraak
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {upcomingEvents.length > 0 ? (
                      upcomingEvents.slice(0, 5).map((event) => (
                        <PersonalEventItem
                          key={event.eventId}
                          event={event}
                          isToday={todayIso ? event.startDatum === todayIso : false}
                          onEdit={(selected) => {
                            setEditEvent(selected);
                            setModalOpen(true);
                          }}
                          conflictInfo={conflictMap.get(event.eventId)}
                        />
                      ))
                    ) : (
                      <EmptyState
                        icon={Calendar}
                        title="Geen aankomende afspraken"
                        text="Voeg een afspraak toe of synchroniseer je Google Calendar."
                      />
                    )}
                  </div>
                </Panel>
              </div>
            </div>

            <div>
              <SectionHeader
                icon={Zap}
                label="Navigatie"
                title="Snel naar je belangrijkste modules"
              />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <RouteTile href="/lampen" icon={Lightbulb} label="Lampen" sub="Kamers en scenes" tone="amber" />
                <RouteTile href="/rooster" icon={CalendarDays} label="Rooster" sub="Diensten en import" tone="indigo" />
                <RouteTile href="/agenda" icon={Calendar} label="Agenda" sub="Afspraken en sync" tone="blue" />
                <RouteTile href="/finance" icon={Landmark} label="Financien" sub="Salaris en uitgaven" tone="green" />
                <RouteTile href="/notities" icon={NotebookPen} label="Notities" sub="Capture en lijsten" tone="blue" />
              </div>
            </div>
          </div>

          <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
            <DailyChecklist />
            <QuickNote />
            <Panel>
              <SectionHeader
                icon={ShieldCheck}
                label="Kwaliteit"
                title="Status"
                compact
              />
              <div className="space-y-3">
                <StatusRow
                  icon={CheckCircle2}
                  label="Devices"
                  value={devices.length === 0 ? "Nog geen lampen" : `${onlineDevices.length}/${devices.length} online`}
                  tone={onlineDevices.length === devices.length && devices.length > 0 ? "green" : "amber"}
                />
                <StatusRow
                  icon={Target}
                  label="Agenda conflicten"
                  value={hardConflicts > 0 ? `${hardConflicts} harde overlap` : `${withConflicts.length} aandachtspunt(en)`}
                  tone={hardConflicts > 0 ? "rose" : withConflicts.length > 0 ? "amber" : "green"}
                />
                <StatusRow
                  icon={EyeOff}
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
        onClose={() => {
          setModalOpen(false);
          setEditEvent(null);
        }}
        editEvent={editEvent}
      />
    </div>
  );
}
