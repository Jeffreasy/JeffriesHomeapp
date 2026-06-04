"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flame,
  LayoutGrid,
  ShieldCheck,
  Target,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatDateLabel } from "./HabitsUtils";
import { MetricCard } from "./HabitsCards";
import type { HabitRecord } from "@/hooks/useHabits";

type TodaySummary = {
  due: number;
  completed: number;
  rate: number;
};

type GroupedHabits = {
  actief: HabitRecord[];
  gepauzeerd: HabitRecord[];
};

type DayHealth = {
  incidents: number;
  negativeClear: number;
  openPositive: number;
};

export function HabitsDashboardSummary({
  activeDate,
  currentToday,
  isToday,
  disableNext,
  moveDate,
  resetDate,
  todaySummary,
  completionPct,
  privacyOn,
  groupedHabits,
  dayHealth,
  habits,
}: {
  activeDate: string;
  currentToday: string;
  isToday: boolean;
  disableNext: boolean;
  moveDate: (days: number) => void;
  resetDate: () => void;
  todaySummary: TodaySummary;
  completionPct: number;
  privacyOn: boolean;
  groupedHabits: GroupedHabits;
  dayHealth: DayHealth;
  habits: HabitRecord[];
}) {
  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="glass p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Dagstatus
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => moveDate(-1)}
                  aria-label="Vorige dag"
                  title="Vorige dag"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-slate-300 transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={resetDate}
                  aria-label="Terug naar vandaag"
                  className={cn(
                    "inline-flex h-10 min-w-36 items-center justify-center rounded-lg border px-4 text-sm font-semibold transition-colors",
                    isToday
                      ? "border-amber-500/25 bg-amber-500/10 text-amber-200"
                      : "border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-slate-300 hover:bg-[rgba(255,255,255,0.06)]",
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-slate-300 transition-colors hover:bg-[rgba(255,255,255,0.06)] disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="min-w-0 lg:w-80">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-400">
                  {todaySummary.completed}/{todaySummary.due} voltooid
                </span>
                <span
                  className={cn(
                    "font-bold",
                    completionPct === 100
                      ? "text-emerald-300"
                      : "text-amber-300",
                  )}
                >
                  {completionPct}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    completionPct === 100 ? "bg-emerald-400" : "bg-amber-400",
                  )}
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
              <p className="text-xs font-semibold uppercase text-indigo-200/70">
                Privacy
              </p>
              <p className="mt-1 text-lg font-bold text-white">
                {privacyOn ? "Verborgen" : "Zichtbaar"}
              </p>
              <p className="mt-1 text-sm text-indigo-100/60">
                {privacyOn ? "Prive modus actief" : "Details zichtbaar"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Target}
          label="Vandaag"
          value={`${todaySummary.completed}/${todaySummary.due}`}
          tone="amber"
        />
        <MetricCard
          icon={LayoutGrid}
          label="Actief"
          value={groupedHabits.actief.length.toString()}
          tone="sky"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Incidenten"
          value={dayHealth.incidents.toString()}
          tone={dayHealth.incidents > 0 ? "rose" : "green"}
        />
        <MetricCard
          icon={Flame}
          label="Record"
          value={`${Math.max(0, ...habits.map((h) => h.langsteStreak))}d`}
          tone="green"
        />
      </section>
    </>
  );
}
