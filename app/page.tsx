"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Home,
  Landmark,
  Lightbulb,
  NotebookPen,
  Plus,
  Power,
  ShieldCheck,
  Target,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useDevices, useLampCommand } from "@/hooks/useHomeapp";
import { useSchedule } from "@/hooks/useSchedule";
import { useSalary } from "@/hooks/useSalary";
import { useLoonstroken } from "@/hooks/useLoonstroken";
import {
  formatDateRange,
  getTimeLabel,
  usePersonalEvents,
  type PersonalEvent,
} from "@/hooks/usePersonalEvents";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { PersonalEventItem } from "@/components/schedule/PersonalEventItem";
import { CreateEventModal } from "@/components/schedule/CreateEventModal";
import { usePrivacy } from "@/hooks/usePrivacy";
import { CUSTOM_SCENES, type ScenePreset } from "@/lib/scenes";
import { QuickNote } from "@/components/notes/QuickNote";
import { DailyChecklist } from "@/components/habits/DailyChecklist";

type DashboardDateInfo = {
  greeting: string;
  todayLabel: string;
  todayIso: string;
  period: string;
};

type Tone = "amber" | "blue" | "green" | "indigo" | "rose" | "slate";

function getDashboardDateInfo(): DashboardDateInfo {
  const now = new Date();
  const todayIso = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const hour = Number(
    new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(now)
  );

  return {
    greeting:
      hour < 6
        ? "Goedenacht"
        : hour < 12
          ? "Goedemorgen"
          : hour < 18
            ? "Goedemiddag"
            : "Goedenavond",
    todayLabel: now.toLocaleDateString("nl-NL", {
      timeZone: "Europe/Amsterdam",
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    todayIso,
    period: todayIso.slice(0, 7),
  };
}

function formatCurrency(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) return "Geen data";
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(iso?: string) {
  if (!iso) return "Geen datum";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function formatEventMeta(event: PersonalEvent | null) {
  if (!event) return "Geen aankomende afspraak";
  const dateLabel = formatDateRange(event);
  const timeLabel = getTimeLabel(event);
  return `${dateLabel} - ${timeLabel}`;
}

const toneClasses: Record<Tone, { icon: string; surface: string; border: string; text: string }> = {
  amber: {
    icon: "text-amber-300",
    surface: "bg-amber-500/10",
    border: "border-amber-500/20",
    text: "text-amber-200",
  },
  blue: {
    icon: "text-sky-300",
    surface: "bg-sky-500/10",
    border: "border-sky-500/20",
    text: "text-sky-200",
  },
  green: {
    icon: "text-emerald-300",
    surface: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    text: "text-emerald-200",
  },
  indigo: {
    icon: "text-indigo-300",
    surface: "bg-indigo-500/10",
    border: "border-indigo-500/20",
    text: "text-indigo-200",
  },
  rose: {
    icon: "text-rose-300",
    surface: "bg-rose-500/10",
    border: "border-rose-500/20",
    text: "text-rose-200",
  },
  slate: {
    icon: "text-slate-300",
    surface: "bg-white/5",
    border: "border-white/10",
    text: "text-slate-200",
  },
};

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
  const { hidden: privacyOn, toggle: togglePrivacy, mask } = usePrivacy();
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
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <Home size={20} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Jeffries Homeapp
              </p>
              <h1 className="mt-1 truncate text-2xl font-bold text-white">{greeting}</h1>
              <p className="mt-1 text-sm capitalize text-slate-500">{today}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={togglePrivacy}
              title={privacyOn ? "Privacy mode uitzetten" : "Privacy mode aanzetten"}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06]"
            >
              {privacyOn ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline">{privacyOn ? "Privacy aan" : "Privacy uit"}</span>
            </button>

            <button
              type="button"
              onClick={toggleAll}
              disabled={onlineDevices.length === 0}
              title={allOn ? "Alle online lampen uitzetten" : "Alle online lampen aanzetten"}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-600"
            >
              <Power size={16} />
              <span>{allOn ? "Alles uit" : "Alles aan"}</span>
            </button>
          </div>
        </div>
      </header>

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
            href="/rooster"
            icon={Calendar}
            tone={hardConflicts > 0 ? "rose" : todayEvents.length > 0 ? "green" : "blue"}
            label="Agenda"
            value={todayEvents.length > 0 ? `${todayEvents.length} vandaag` : "Rustige dag"}
            sub={formatEventMeta(nextEvent)}
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <RouteTile href="/lampen" icon={Lightbulb} label="Lampen" sub="Kamers en scenes" tone="amber" />
                <RouteTile href="/rooster" icon={CalendarDays} label="Rooster" sub="Diensten en import" tone="indigo" />
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

function OverviewPanel({
  nextDienst,
  nextEvent,
  nettoLabel,
  nettoValue,
  nettoSub,
  lampsOn,
  lampsTotal,
  devicesOnline,
  conflicts,
  hardConflicts,
}: {
  nextDienst: ReturnType<typeof useSchedule>["nextDienst"];
  nextEvent: PersonalEvent | null;
  nettoLabel: string;
  nettoValue: string;
  nettoSub: string;
  lampsOn: number;
  lampsTotal: number;
  devicesOnline: number;
  conflicts: number;
  hardConflicts: number;
}) {
  const conflictLabel = hardConflicts > 0 ? `${hardConflicts} harde overlap` : `${conflicts} aandachtspunt(en)`;

  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-white/6 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Control center
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Vandaag in een oogopslag</h2>
          </div>
          <Link
            href="/rooster"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
          >
            Agenda openen
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCell
          icon={Clock3}
          tone="indigo"
          label="Volgende dienst"
          value={nextDienst ? `${nextDienst.startTijd} - ${nextDienst.eindTijd}` : "Geen dienst"}
          sub={nextDienst ? `${nextDienst.dag}, ${formatShortDate(nextDienst.startDatum)}` : "Rooster rustig"}
        />
        <OverviewCell
          icon={Calendar}
          tone={hardConflicts > 0 ? "rose" : conflicts > 0 ? "amber" : "blue"}
          label="Volgende afspraak"
          value={nextEvent?.titel ?? "Geen afspraak"}
          sub={nextEvent ? formatEventMeta(nextEvent) : conflictLabel}
        />
        <OverviewCell
          icon={Wallet}
          tone="green"
          label={nettoLabel}
          value={nettoValue}
          sub={nettoSub}
        />
        <OverviewCell
          icon={Lightbulb}
          tone={lampsOn > 0 ? "amber" : "slate"}
          label="Woning"
          value={lampsTotal === 0 ? "Geen lampen" : `${lampsOn}/${lampsTotal} aan`}
          sub={`${devicesOnline} online`}
        />
      </div>
    </Panel>
  );
}

function CommandPanel({
  allOn,
  onlineCount,
  totalCount,
  onCount,
  onToggleAll,
  onApplyScene,
}: {
  allOn: boolean;
  onlineCount: number;
  totalCount: number;
  onCount: number;
  onToggleAll: () => void;
  onApplyScene: (scene: ScenePreset) => void;
}) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Direct bedienen
          </p>
          <h2 className="mt-1 text-lg font-bold text-white">Licht en sfeer</h2>
          <p className="mt-1 text-sm text-slate-500">
            {totalCount === 0 ? "Geen devices gekoppeld" : `${onlineCount}/${totalCount} online - ${onCount} aan`}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleAll}
          disabled={onlineCount === 0}
          title={allOn ? "Alle online lampen uitzetten" : "Alle online lampen aanzetten"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/25 bg-amber-500/10 text-amber-200 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-600"
        >
          <Power size={18} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {CUSTOM_SCENES.slice(0, 6).map((scene) => (
          <SceneButton
            key={scene.id}
            scene={scene}
            disabled={onlineCount === 0}
            onClick={() => onApplyScene(scene)}
          />
        ))}
      </div>
    </Panel>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-white/8 bg-white/[0.035] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl sm:p-5 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  icon: Icon,
  label,
  title,
  href,
  actionLabel,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  href?: string;
  actionLabel?: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${compact ? "mb-3" : "mb-4"}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon size={16} className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
        </div>
      </div>
      {href && (
        <Link
          href={href}
          className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl px-2 text-xs font-semibold text-amber-300/80 transition-colors hover:bg-amber-500/10 hover:text-amber-200"
        >
          {actionLabel ?? "Open"}
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function MetricTile({
  href,
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <Link href={href} className="group block min-w-0">
      <motion.div
        whileHover={{ y: -2 }}
        className={`min-h-[132px] rounded-2xl border ${classes.border} ${classes.surface} p-4 transition-colors group-hover:bg-white/[0.06]`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${classes.border} bg-black/10`}>
            <Icon size={18} className={classes.icon} />
          </div>
          <ArrowRight size={15} className="mt-1 text-slate-600 transition-colors group-hover:text-slate-300" />
        </div>
        <div className="mt-4 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 truncate text-lg font-bold text-white">{value}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{sub}</p>
        </div>
      </motion.div>
    </Link>
  );
}

function OverviewCell({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  tone: Tone;
  label: string;
  value: string;
  sub: string;
}) {
  const classes = toneClasses[tone];

  return (
    <div className="min-h-[132px] min-w-0 bg-[#0f0f16]/95 p-4 sm:p-5">
      <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${classes.border} ${classes.surface}`}>
        <Icon size={16} className={classes.icon} />
      </div>
      <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={`mt-1 truncate text-base font-bold ${classes.text}`}>{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function SceneButton({
  scene,
  disabled,
  onClick,
}: {
  scene: ScenePreset;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`Scene ${scene.label} toepassen`}
      className="flex min-h-[72px] min-w-0 flex-col items-start justify-between rounded-xl border border-white/8 bg-white/[0.035] p-3 text-left transition-colors hover:border-white/14 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className="h-3 w-8 rounded-full border border-white/20"
        style={{ backgroundColor: scene.color }}
      />
      <span className="truncate text-sm font-semibold text-slate-200">{scene.label}</span>
    </button>
  );
}

function RouteTile({
  href,
  icon: Icon,
  label,
  sub,
  tone,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  sub: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <Link href={href} className="group block min-w-0">
      <div className="flex min-h-[86px] items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.06]">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${classes.border} ${classes.surface}`}>
          <Icon size={18} className={classes.icon} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{label}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{sub}</p>
        </div>
        <ChevronRight size={15} className="shrink-0 text-slate-600 transition-colors group-hover:text-slate-300" />
      </div>
    </Link>
  );
}

function StatusRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: Tone;
}) {
  const classes = toneClasses[tone];

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.025] px-3 py-3">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${classes.surface}`}>
        <Icon size={15} className={classes.icon} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
      <Icon size={22} className="text-slate-600" />
      <p className="mt-3 text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}
