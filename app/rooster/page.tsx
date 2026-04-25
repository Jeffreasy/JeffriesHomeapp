"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Calendar,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Euro,
  FileSpreadsheet,
  History,
  List,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useAction } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useSchedule } from "@/hooks/useSchedule";
import { usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { useToast } from "@/components/ui/Toast";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { DienstItem } from "@/components/schedule/DienstItem";
import { StatsView } from "@/components/schedule/StatsView";
import { SalarisView } from "@/components/schedule/SalarisView";
import { AfsprakenView } from "@/components/schedule/AfsprakenView";
import { PersonalEventItem } from "@/components/schedule/PersonalEventItem";
import { CreateEventModal } from "@/components/schedule/CreateEventModal";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  calcTotalHours,
  getHistory,
  getUpcoming,
  shiftBreakdown,
  teamBreakdown,
  type DienstRow,
} from "@/lib/schedule";
import { generateUnifiedTimeline, type UnifiedWeek } from "@/lib/unified";
import { cn } from "@/lib/utils";
import { api } from "@/convex/_generated/api";

type Tab = "overzicht" | "statistieken" | "salaris" | "afspraken_beheer";
type Tone = "amber" | "blue" | "green" | "indigo" | "rose" | "slate";

const TABS: Array<{ id: Tab; label: string; icon: LucideIcon }> = [
  { id: "overzicht", label: "Overzicht", icon: List },
  { id: "statistieken", label: "Statistieken", icon: BarChart2 },
  { id: "salaris", label: "Salaris", icon: Euro },
  { id: "afspraken_beheer", label: "Beheer", icon: CalendarDays },
];

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

function getAmsterdamTodayIso() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function formatShortDate(iso?: string) {
  if (!iso) return "Geen datum";
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function formatMetaDate(iso?: string) {
  if (!iso) return "nooit";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "onbekend";
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function formatHours(hours: number) {
  return `${Math.round(hours * 10) / 10}u`;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export default function RoosterPage() {
  const {
    diensten,
    nextDienst,
    upcoming,
    meta,
    isLoading,
    importXlsx,
    clear,
  } = useSchedule();

  const { success, error: toastError } = useToast();
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

  useEffect(() => {
    const updateToday = () => setTodayIso(getAmsterdamTodayIso());
    const timeout = window.setTimeout(updateToday, 0);
    const interval = window.setInterval(updateToday, 60_000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  const timelineDiensten = useMemo(() => getUpcoming(diensten, 90), [diensten]);

  const {
    upcoming: upcomingEvents,
    eventsByDate,
    conflictMap,
    withConflicts,
    pending: pendingEvents,
  } = usePersonalEvents({ diensten: timelineDiensten });

  const syncSchedule = useAction(api.actions.syncSchedule.syncNow);
  const syncPersonal = useAction(api.actions.syncPersonalEvents.syncPersonalNow);

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
  const nextShiftEvents = nextDienst ? (eventsByDate[nextDienst.startDatum] ?? []) : [];
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
      const [scheduleRes, personalRes] = await Promise.allSettled([
        syncSchedule({ userId: user.id }),
        syncPersonal({ userId: user.id }),
      ]);

      const scheduleSuccess = scheduleRes.status === "fulfilled";
      const personalSuccess = personalRes.status === "fulfilled";

      if (scheduleSuccess && personalSuccess) {
        success("Rooster en persoonlijke agenda gesynchroniseerd.");
      } else if (scheduleSuccess || personalSuccess) {
        success("Gedeeltelijk gesynchroniseerd: een agenda kon niet worden opgehaald.");
      } else {
        throw new Error("Beide agenda-syncs zijn mislukt");
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

    const res = await importXlsx(file);
    if (res.ok) success(`${res.count} diensten geimporteerd`);
    else toastError(`Import mislukt: ${res.error}`);
    event.target.value = "";
  };

  const isWeekOpen = (weeknr: string, index: number) => weekOverrides[weeknr] ?? index < 3;
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
    <div className="min-h-screen bg-[#0a0a0f] text-slate-100">
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
                aria-label="XLSX rooster importeren"
                onClick={() => fileRef.current?.click()}
                disabled={isLoading}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload size={16} />
                <span className="hidden sm:inline">XLSX</span>
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
              <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
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

              <div className="space-y-4">
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
              <Panel>
                <ErrorBoundary>
                  <StatsView diensten={diensten} />
                </ErrorBoundary>
              </Panel>
            )}

            {tab === "salaris" && (
              <Panel>
                <ErrorBoundary>
                  <SalarisView />
                </ErrorBoundary>
              </Panel>
            )}

            {tab === "afspraken_beheer" && (
              <Panel>
                <ErrorBoundary>
                  <AfsprakenView
                    diensten={upcoming}
                    onEditEvent={handleEditEvent}
                    onNewEvent={openNewEvent}
                  />
                </ErrorBoundary>
              </Panel>
            )}
          </>
        )}
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

function OverviewPanel({
  upcomingHours,
  upcomingCount,
  eventCount,
  todayEventCount,
  hardConflicts,
  conflicts,
  nextDienst,
  shifts,
  teams,
}: {
  upcomingHours: number;
  upcomingCount: number;
  eventCount: number;
  todayEventCount: number;
  hardConflicts: number;
  conflicts: number;
  nextDienst: DienstRow | null;
  shifts: Record<string, number>;
  teams: Record<string, number>;
}) {
  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-white/6 px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Control center
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">Werk, agenda en signalen</h2>
          </div>
          <Link
            href="/finance"
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.06]"
          >
            Finance openen
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="grid gap-px bg-white/[0.06] sm:grid-cols-2 xl:grid-cols-4">
        <StatusMetric
          icon={Clock3}
          label="Komende uren"
          value={formatHours(upcomingHours)}
          sub={pluralize(upcomingCount, "dienst", "diensten")}
          tone="amber"
        />
        <StatusMetric
          icon={Calendar}
          label="Volgende dienst"
          value={nextDienst ? `${nextDienst.startTijd} - ${nextDienst.eindTijd}` : "Geen dienst"}
          sub={nextDienst ? `${nextDienst.dag}, ${formatShortDate(nextDienst.startDatum)}` : "Rooster rustig"}
          tone={nextDienst ? "indigo" : "slate"}
        />
        <StatusMetric
          icon={CalendarDays}
          label="Agenda"
          value={todayEventCount > 0 ? `${todayEventCount} vandaag` : `${eventCount} aankomend`}
          sub="persoonlijke afspraken"
          tone={todayEventCount > 0 ? "green" : "blue"}
        />
        <StatusMetric
          icon={AlertTriangle}
          label="Conflicten"
          value={hardConflicts > 0 ? `${hardConflicts} hard` : String(conflicts)}
          sub={hardConflicts > 0 ? "direct nalopen" : "aandachtspunten"}
          tone={hardConflicts > 0 ? "rose" : conflicts > 0 ? "amber" : "green"}
        />
      </div>

      <div className="grid gap-3 px-5 py-4 sm:grid-cols-3 sm:px-6">
        <MiniBreakdown label="Shifts" value={`V ${shifts["Vroeg"] ?? 0} / L ${shifts["Laat"] ?? 0}`} sub={`${shifts["Dienst"] ?? 0} dagdienst`} />
        <MiniBreakdown label="Team R." value={String(teams["R."] ?? 0)} sub="komende diensten" />
        <MiniBreakdown label="Team A." value={String(teams["A."] ?? 0)} sub="komende diensten" />
      </div>
    </Panel>
  );
}

function OverviewTab({
  unifiedWeeks,
  isWeekOpen,
  toggleWeek,
  setAllWeeks,
  todayIso,
  eventsByDate,
  conflictMap,
  onEditEvent,
  upcomingEvents,
  withConflicts,
  pendingEvents,
  history,
  showHistory,
  setShowHistory,
  metaRows,
  metaSyncedAt,
  thisMonthEvents,
}: {
  unifiedWeeks: UnifiedWeek[];
  isWeekOpen: (weeknr: string, index: number) => boolean;
  toggleWeek: (weeknr: string, index: number) => void;
  setAllWeeks: (open: boolean) => void;
  todayIso: string | null;
  eventsByDate: Record<string, PersonalEvent[]>;
  conflictMap: Map<string, unknown>;
  onEditEvent: (event: PersonalEvent) => void;
  upcomingEvents: PersonalEvent[];
  withConflicts: PersonalEvent[];
  pendingEvents: PersonalEvent[];
  history: DienstRow[];
  showHistory: boolean;
  setShowHistory: (show: boolean | ((current: boolean) => boolean)) => void;
  metaRows: number;
  metaSyncedAt?: string;
  thisMonthEvents: number;
}) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Panel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <SectionTitle
              icon={List}
              label="Tijdlijn"
              title="Diensten en afspraken"
              sub={`${unifiedWeeks.length} weken`}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllWeeks(true)}
                className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
              >
                Alles open
              </button>
              <button
                type="button"
                onClick={() => setAllWeeks(false)}
                className="h-9 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
              >
                Compact
              </button>
            </div>
          </div>
        </Panel>

        {unifiedWeeks.length > 0 ? (
          <div className="space-y-3">
            {unifiedWeeks.map((week, index) => (
              <WeekBlock
                key={week.weeknr}
                week={week}
                index={index}
                open={isWeekOpen(week.weeknr, index)}
                onToggle={() => toggleWeek(week.weeknr, index)}
                todayIso={todayIso}
                eventsByDate={eventsByDate}
                conflictMap={conflictMap}
                onEditEvent={onEditEvent}
              />
            ))}
          </div>
        ) : (
          <Panel>
            <EmptyInline
              icon={Calendar}
              title="Geen komende items"
              text="Sync je rooster of maak een afspraak om je tijdlijn te vullen."
            />
          </Panel>
        )}
      </div>

      <aside className="space-y-5 xl:sticky xl:top-32 xl:self-start">
        <Panel>
          <SectionTitle
            icon={CalendarDays}
            label="Agenda"
            title="Aankomende afspraken"
            sub={pluralize(upcomingEvents.length, "afspraak", "afspraken")}
          />
          <div className="mt-4 space-y-2">
            {upcomingEvents.length > 0 ? (
              upcomingEvents.slice(0, 5).map((event) => (
                <PersonalEventItem
                  key={event.eventId}
                  event={event}
                  isToday={todayIso ? event.startDatum === todayIso : false}
                  onEdit={onEditEvent}
                  conflictInfo={conflictMap.get(event.eventId) as never}
                />
              ))
            ) : (
              <EmptyInline
                icon={CalendarDays}
                title="Geen afspraken"
                text="Je persoonlijke agenda heeft geen komende items."
              />
            )}
          </div>
        </Panel>

        <Panel>
          <SectionTitle
            icon={CheckCircle2}
            label="Status"
            title="Datakwaliteit"
            sub={formatMetaDate(metaSyncedAt)}
          />
          <div className="mt-4 space-y-3">
            <StatusRow icon={FileSpreadsheet} label="Roosterregels" value={pluralize(metaRows, "dienst", "diensten")} tone="blue" />
            <StatusRow
              icon={AlertTriangle}
              label="Conflicten"
              value={withConflicts.length > 0 ? `${withConflicts.length} aandachtspunt(en)` : "Geen conflicten"}
              tone={withConflicts.length > 0 ? "amber" : "green"}
            />
            <StatusRow
              icon={Zap}
              label="Wachtrij"
              value={pendingEvents.length > 0 ? `${pendingEvents.length} pending` : "Geen pending acties"}
              tone={pendingEvents.length > 0 ? "indigo" : "green"}
            />
            <StatusRow icon={CalendarClock} label="Deze maand" value={pluralize(thisMonthEvents, "afspraak", "afspraken")} tone="slate" />
          </div>
        </Panel>

        {history.length > 0 && (
          <Panel>
            <button
              type="button"
              onClick={() => setShowHistory((current) => !current)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <SectionTitle
                icon={History}
                label="Historie"
                title="Gedraaide diensten"
                sub={pluralize(history.length, "item")}
              />
              <ChevronDown
                size={16}
                className={cn("shrink-0 text-slate-500 transition-transform", showHistory && "rotate-180")}
              />
            </button>
            <AnimatePresence initial={false}>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 space-y-2 opacity-70">
                    {history.slice(0, 8).map((dienst) => (
                      <DienstItem key={dienst.eventId} dienst={dienst} afspraken={eventsByDate[dienst.startDatum]} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Panel>
        )}
      </aside>
    </section>
  );
}

function WeekBlock({
  week,
  index,
  open,
  onToggle,
  todayIso,
  eventsByDate,
  conflictMap,
  onEditEvent,
}: {
  week: UnifiedWeek;
  index: number;
  open: boolean;
  onToggle: () => void;
  todayIso: string | null;
  eventsByDate: Record<string, PersonalEvent[]>;
  conflictMap: Map<string, unknown>;
  onEditEvent: (event: PersonalEvent) => void;
}) {
  const appointmentCount = week.items.filter((item) => item.type === "afspraak").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[0.025]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.035] sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <span className="text-xs font-bold text-slate-300">{index + 1}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white">Week {week.weeknr}</p>
            <p className="mt-1 text-xs text-slate-500">
              {pluralize(week.dienstenAantal, "dienst", "diensten")} - {formatHours(week.werkUren)} - {pluralize(appointmentCount, "afspraak", "afspraken")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-200">
            {pluralize(week.items.length, "item")}
          </span>
          <ChevronDown
            size={16}
            className={cn("text-slate-500 transition-transform", open && "rotate-180")}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-white/6 p-3">
              {week.items.map((item) => (
                item.type === "dienst" ? (
                  <DienstItem
                    key={`dienst-${item.data.eventId}`}
                    dienst={item.data}
                    isToday={todayIso ? item.date === todayIso : false}
                    afspraken={eventsByDate[item.date]}
                  />
                ) : (
                  <PersonalEventItem
                    key={`event-${item.data.eventId}`}
                    event={item.data}
                    isToday={todayIso ? item.date === todayIso : false}
                    onEdit={onEditEvent}
                    conflictInfo={conflictMap.get(item.data.eventId) as never}
                  />
                )
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  sub,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Icon size={16} className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
        </div>
      </div>
      {sub && <span className="shrink-0 text-xs text-slate-500">{sub}</span>}
    </div>
  );
}

function SectionTitle({
  icon: Icon,
  label,
  title,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
        <Icon size={16} className="text-amber-300" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <h2 className="truncate text-base font-bold text-white">{title}</h2>
        {sub && <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function StatusMetric({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
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

function MiniBreakdown({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.025] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{sub}</p>
    </div>
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

function EmptyRoster({
  syncing,
  onSync,
  onUpload,
}: {
  syncing: boolean;
  onSync: () => void;
  onUpload: () => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
        <Calendar size={28} className="text-slate-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-300">Rooster ophalen</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Synchroniseer je dienstenrooster en persoonlijke agenda, of importeer een XLSX-bestand.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onSync}
          disabled={syncing}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
        >
          <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
          Sync agenda
        </button>
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.07]"
        >
          <Upload size={15} />
          XLSX uploaden
        </button>
      </div>
    </div>
  );
}

function EmptyInline({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-center">
      <Icon size={22} className="text-slate-600" />
      <p className="mt-3 text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}
