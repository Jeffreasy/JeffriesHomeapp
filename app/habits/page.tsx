"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  LayoutGrid,
  Plus,
  ShieldCheck,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { usePrivacy } from "@/hooks/usePrivacy";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitForm } from "@/components/habits/HabitForm";
import { HabitHeatmap } from "@/components/habits/HabitHeatmap";
import { HabitStats } from "@/components/habits/HabitStats";
import { BadgeShowcase } from "@/components/habits/BadgeShowcase";
import { cn } from "@/lib/utils";
import { formatLevel, formatXP } from "@/lib/habit-constants";
import type { HabitCreateData } from "@/hooks/useHabits";
import type { Id } from "@/convex/_generated/dataModel";

type TabId = "vandaag" | "overzicht" | "stats";
type Tone = "amber" | "green" | "rose" | "sky" | "indigo" | "slate";

const TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: "vandaag", label: "Vandaag", icon: CalendarCheck },
  { id: "overzicht", label: "Overzicht", icon: LayoutGrid },
  { id: "stats", label: "Statistieken", icon: BarChart3 },
];

const toneClasses: Record<Tone, { border: string; surface: string; icon: string; text: string }> = {
  amber: {
    border: "border-amber-500/25",
    surface: "bg-amber-500/10",
    icon: "text-amber-300",
    text: "text-amber-200",
  },
  green: {
    border: "border-emerald-500/20",
    surface: "bg-emerald-500/10",
    icon: "text-emerald-300",
    text: "text-emerald-200",
  },
  rose: {
    border: "border-rose-500/20",
    surface: "bg-rose-500/10",
    icon: "text-rose-300",
    text: "text-rose-200",
  },
  sky: {
    border: "border-sky-500/20",
    surface: "bg-sky-500/10",
    icon: "text-sky-300",
    text: "text-sky-200",
  },
  indigo: {
    border: "border-indigo-500/20",
    surface: "bg-indigo-500/10",
    icon: "text-indigo-300",
    text: "text-indigo-200",
  },
  slate: {
    border: "border-white/10",
    surface: "bg-white/[0.04]",
    icon: "text-slate-300",
    text: "text-slate-200",
  },
};

function todayStr(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string, today: string): string {
  if (!dateStr || !today) return "Vandaag";
  if (dateStr === today) return "Vandaag";
  if (dateStr === shiftDate(today, -1)) return "Gisteren";
  if (dateStr === shiftDate(today, 1)) return "Morgen";
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" });
}

function maskHabitName(name: string, index: number, masked: boolean) {
  return masked ? `Habit ${index + 1}` : name;
}

export default function HabitsPage() {
  const [selectedDate, setSelectedDate] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("vandaag");
  const [showForm, setShowForm] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Id<"habits"> | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Id<"habits"> | null>(null);
  const { hidden: privacyOn, toggle: togglePrivacy } = usePrivacy("habits");

  useEffect(() => {
    const timeout = window.setTimeout(() => setSelectedDate(todayStr()), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  const {
    todayHabits,
    todaySummary,
    todayDienst,
    habits,
    stats,
    level,
    create,
    update,
    toggle,
    increment,
    incident,
    pause,
    archive,
    remove,
    isLoading,
  } = useHabits(selectedDate || undefined);

  const currentToday = useMemo(() => (selectedDate ? todayStr() : ""), [selectedDate]);
  const activeDate = selectedDate || currentToday;
  const isToday = !!selectedDate && selectedDate === currentToday;
  const disableNext = !!selectedDate && !!currentToday && selectedDate >= currentToday;
  const completionPct = Math.round(todaySummary.rate * 100);

  const groupedHabits = useMemo(() => {
    const actief = habits.filter((h) => h.isActief && !h.isPauze);
    const gepauzeerd = habits.filter((h) => h.isActief && h.isPauze);
    return { actief, gepauzeerd };
  }, [habits]);

  const dayHealth = useMemo(() => {
    const incidents = todayHabits.filter((h) => h.log?.isIncident).length;
    const negativeClear = todayHabits.filter((h) => h.type === "negatief" && !h.log?.isIncident).length;
    const openPositive = todayHabits.filter((h) => h.type === "positief" && !h.log?.voltooid).length;
    return { incidents, negativeClear, openPositive };
  }, [todayHabits]);

  const editingInitial = useMemo(
    () => habits.find((h) => h._id === editingHabit) as Partial<HabitCreateData> | undefined,
    [editingHabit, habits],
  );

  const handleCreate = (data: HabitCreateData) => {
    create(data);
  };

  const handleEdit = (data: HabitCreateData) => {
    if (!editingHabit) return;
    update(editingHabit, data);
    setEditingHabit(null);
  };

  const handleDelete = () => {
    if (!confirmDelete) return;
    remove(confirmDelete);
    setConfirmDelete(null);
  };

  const moveDate = (days: number) => {
    setSelectedDate((date) => shiftDate(date || todayStr(), days));
  };

  const resetDate = () => setSelectedDate(todayStr());

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#080a0f] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080a0f]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10">
              <Target size={21} className="text-amber-300" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-slate-500">Zelfregie</p>
              <h1 className="mt-0.5 truncate text-2xl font-bold text-white">Habits</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {formatLevel(level.level, level.titel)} - {formatXP(stats?.totaalXP ?? 0)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={togglePrivacy}
              title={privacyOn ? "Habits tonen" : "Habits verbergen"}
              aria-label={privacyOn ? "Habits tonen" : "Habits verbergen"}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                privacyOn
                  ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
              )}
            >
              {privacyOn ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="hidden sm:inline">{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowForm(true)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Nieuw</span>
            </motion.button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-6">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Dagstatus</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveDate(-1)}
                    aria-label="Vorige dag"
                    title="Vorige dag"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:bg-white/[0.06]"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={resetDate}
                    className={cn(
                      "inline-flex h-10 min-w-36 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors",
                      isToday
                        ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                        : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
                    )}
                  >
                    {formatDateLabel(activeDate, currentToday)}
                  </button>
                  <button
                    type="button"
                    onClick={() => !disableNext && moveDate(1)}
                    disabled={disableNext}
                    aria-label="Volgende dag"
                    title="Volgende dag"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-300 transition-colors hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ChevronRight size={18} />
                  </button>
                  {todayDienst && (
                    <span className="inline-flex h-10 items-center rounded-lg border border-sky-500/20 bg-sky-500/10 px-3 text-xs font-semibold text-sky-200">
                      {todayDienst.shiftType} dienst
                    </span>
                  )}
                </div>
              </div>

              <div className="min-w-0 lg:w-80">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-400">
                    {todaySummary.completed}/{todaySummary.due} voltooid
                  </span>
                  <span className={cn("font-bold", completionPct === 100 ? "text-emerald-300" : "text-amber-300")}>
                    {completionPct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    className={cn("h-full rounded-full", completionPct === 100 ? "bg-emerald-400" : "bg-amber-400")}
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-indigo-500/25 bg-indigo-500/15">
                <ShieldCheck size={18} className="text-indigo-200" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-indigo-200/70">Privacy</p>
                <p className="mt-1 text-lg font-bold text-white">{privacyOn ? "Verborgen" : "Zichtbaar"}</p>
                <p className="mt-1 text-sm text-indigo-100/60">
                  {privacyOn ? "Prive modus actief" : "Details zichtbaar"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard icon={Target} label="Vandaag" value={`${todaySummary.completed}/${todaySummary.due}`} tone="amber" />
          <MetricCard icon={LayoutGrid} label="Actief" value={groupedHabits.actief.length.toString()} tone="sky" />
          <MetricCard icon={AlertTriangle} label="Incidenten" value={dayHealth.incidents.toString()} tone={dayHealth.incidents > 0 ? "rose" : "green"} />
          <MetricCard icon={Flame} label="Record" value={`${stats?.langsteStreakOoit ?? 0}d`} tone="green" />
        </section>

        <div className="mt-5 flex overflow-x-auto rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                "relative flex h-10 min-w-36 flex-1 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors",
                activeTab === id ? "text-amber-200" : "text-slate-500 hover:text-slate-300",
              )}
            >
              {activeTab === id && (
                <motion.span
                  layoutId="habits-tab"
                  className="absolute inset-0 rounded-md border border-amber-500/20 bg-amber-500/10"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <Icon size={16} />
                {label}
              </span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "vandaag" && (
            <motion.section
              key="vandaag"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]"
            >
              <div className="min-w-0 space-y-3">
                <SectionHeader title="Vandaag" meta={`${todayHabits.length} gepland`} />
                <HabitListSkeleton loading={isLoading} />
                {!isLoading && todayHabits.length === 0 && (
                  <EmptyState
                    icon={Target}
                    title={isToday ? "Geen habits vandaag" : "Geen habits op deze dag"}
                    actionLabel={isToday ? "Habit toevoegen" : undefined}
                    onAction={isToday ? () => setShowForm(true) : undefined}
                  />
                )}
                {!isLoading && todayHabits.length > 0 && (
                  <div className="space-y-2">
                    {todayHabits.map((habit) => (
                      <HabitCard
                        key={habit._id}
                        habit={habit}
                        masked={privacyOn}
                        onToggle={() => toggle(habit._id)}
                        onIncrement={(stap) => increment(habit._id, stap)}
                        onIncident={(trigger, notitie) => incident(habit._id, trigger, notitie)}
                        onPause={() => pause(habit._id)}
                        onArchive={() => archive(habit._id)}
                        onRemove={() => setConfirmDelete(habit._id)}
                        onEdit={() => setEditingHabit(habit._id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <aside className="space-y-3">
                <SidePanel title="Focus">
                  <div className="grid grid-cols-3 gap-2">
                    <MiniStat label="Open" value={dayHealth.openPositive.toString()} tone="amber" />
                    <MiniStat label="Clean" value={dayHealth.negativeClear.toString()} tone="green" />
                    <MiniStat label="XP" value={formatXP(stats?.totaalXP ?? 0)} tone="sky" />
                  </div>
                </SidePanel>
                <TopStreaks streaks={stats?.topStreaks ?? []} masked={privacyOn} />
              </aside>
            </motion.section>
          )}

          {activeTab === "overzicht" && (
            <motion.section
              key="overzicht"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 space-y-5"
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-3">
                  <SectionHeader title="Actief" meta={`${groupedHabits.actief.length} habits`} />
                  <HabitListSkeleton loading={isLoading} />
                  {!isLoading && groupedHabits.actief.length === 0 && (
                    <EmptyState icon={Target} title="Nog geen actieve habits" actionLabel="Habit toevoegen" onAction={() => setShowForm(true)} />
                  )}
                  {!isLoading && groupedHabits.actief.length > 0 && (
                    <div className="space-y-2">
                      {groupedHabits.actief.map((habit) => (
                        <HabitCard
                          key={habit._id}
                          habit={{ ...habit, log: null }}
                          masked={privacyOn}
                          onToggle={() => toggle(habit._id)}
                          onIncrement={(stap) => increment(habit._id, stap)}
                          onIncident={(trigger, notitie) => incident(habit._id, trigger, notitie)}
                          onPause={() => pause(habit._id)}
                          onArchive={() => archive(habit._id)}
                          onRemove={() => setConfirmDelete(habit._id)}
                          onEdit={() => setEditingHabit(habit._id)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <aside className="space-y-3">
                  <SidePanel title="Verdeling">
                    <div className="space-y-2">
                      <DistributionRow label="Actief" value={groupedHabits.actief.length} total={Math.max(1, habits.length)} tone="amber" />
                      <DistributionRow label="Gepauzeerd" value={groupedHabits.gepauzeerd.length} total={Math.max(1, habits.length)} tone="sky" />
                      <DistributionRow label="Incidenten vandaag" value={dayHealth.incidents} total={Math.max(1, todayHabits.length)} tone="rose" />
                    </div>
                  </SidePanel>
                  <TopStreaks streaks={stats?.topStreaks ?? []} masked={privacyOn} />
                </aside>
              </div>

              {groupedHabits.gepauzeerd.length > 0 && (
                <div className="space-y-3 opacity-75">
                  <SectionHeader title="Gepauzeerd" meta={`${groupedHabits.gepauzeerd.length} habits`} />
                  <div className="grid gap-2 xl:grid-cols-2">
                    {groupedHabits.gepauzeerd.map((habit) => (
                      <HabitCard
                        key={habit._id}
                        habit={{ ...habit, log: null }}
                        masked={privacyOn}
                        onToggle={() => undefined}
                        onIncrement={() => undefined}
                        onIncident={() => undefined}
                        onPause={() => pause(habit._id)}
                        onArchive={() => archive(habit._id)}
                        onRemove={() => setConfirmDelete(habit._id)}
                        onEdit={() => setEditingHabit(habit._id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </motion.section>
          )}

          {activeTab === "stats" && (
            <motion.section
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,420px)_1fr]"
            >
              <div className="space-y-4">
                <HabitStats masked={privacyOn} />
                <BadgeShowcase />
              </div>
              <div className="min-w-0">
                <HabitHeatmap />
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <motion.button
        type="button"
        onClick={() => setShowForm(true)}
        aria-label="Habit toevoegen"
        title="Habit toevoegen"
        className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 transition-transform"
        style={{ bottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.04 }}
      >
        <Plus size={24} />
      </motion.button>

      <AnimatePresence>
        {confirmDelete && (
          <>
            <motion.div
              key="delete-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
            />
            <motion.div
              key="delete-dialog"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-lg border border-rose-500/20 bg-[#11141c] p-5 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10">
                  <AlertTriangle size={20} className="text-rose-300" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Habit verwijderen?</h3>
                  <p className="mt-1 text-xs text-slate-500">Logs, streaks en badges worden verwijderd.</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="h-11 rounded-lg border border-white/10 bg-white/[0.04] text-sm font-semibold text-slate-300 transition-colors hover:bg-white/[0.07]"
                >
                  Annuleren
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-11 rounded-lg border border-rose-500/25 bg-rose-500/15 text-sm font-bold text-rose-200 transition-colors hover:bg-rose-500/20"
                >
                  Verwijderen
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <HabitForm open={showForm} onClose={() => setShowForm(false)} onSubmit={handleCreate} />

      {editingHabit && (
        <HabitForm
          open={!!editingHabit}
          onClose={() => setEditingHabit(null)}
          onSubmit={handleEdit}
          initial={editingInitial}
        />
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: Tone }) {
  const classes = toneClasses[tone];
  return (
    <div className={cn("rounded-lg border p-4", classes.border, classes.surface)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <p className={cn("mt-2 text-2xl font-bold", classes.text)}>{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/15", classes.icon)}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const classes = toneClasses[tone];
  return (
    <div className={cn("rounded-lg border p-3", classes.border, classes.surface)}>
      <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", classes.text)}>{value}</p>
    </div>
  );
}

function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold uppercase text-slate-300">{title}</h2>
      <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-xs font-semibold text-slate-500">
        {meta}
      </span>
    </div>
  );
}

function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <h3 className="mb-3 text-xs font-bold uppercase text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function TopStreaks({
  streaks,
  masked,
}: {
  streaks: Array<{ naam: string; emoji: string; streak: number; type?: string }>;
  masked: boolean;
}) {
  return (
    <SidePanel title="Streaks">
      {streaks.length === 0 ? (
        <p className="text-sm text-slate-500">Geen actieve streaks</p>
      ) : (
        <div className="space-y-2">
          {streaks.slice(0, 4).map((streak, index) => (
            <div key={`${streak.naam}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-200">
                  <span className="mr-2">{masked ? "•" : streak.emoji}</span>
                  {maskHabitName(streak.naam, index, masked)}
                </p>
                <p className="mt-0.5 text-[10px] uppercase text-slate-600">{masked ? "Afgeschermd" : streak.type ?? "habit"}</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-amber-200">{streak.streak}d</span>
            </div>
          ))}
        </div>
      )}
    </SidePanel>
  );
}

function DistributionRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: Tone }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const classes = toneClasses[tone];
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-500">{label}</span>
        <span className={cn("font-bold", classes.text)}>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={cn("h-full rounded-full", classes.surface)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
      <Icon size={34} className="mx-auto text-slate-700" />
      <p className="mt-3 text-sm font-semibold text-slate-400">{title}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15"
        >
          <Plus size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function HabitListSkeleton({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-24 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />
      ))}
    </div>
  );
}
