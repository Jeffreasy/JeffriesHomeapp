"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flame,
  LayoutGrid,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Progress } from "@/components/ui/Progress";
import { Surface } from "@/components/ui/Surface";
import { AppIcon } from "@/components/ui/AppIcon";
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
        <Surface padding="sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase text-[var(--color-text-subtle)]">
                Dagstatus
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <IconButton
                  onClick={() => moveDate(-1)}
                  label="Vorige dag"
                  icon={<ChevronLeft size={18} />}
                  variant="secondary"
                />
                <Button
                  onClick={resetDate}
                  aria-label="Terug naar vandaag"
                  variant={isToday ? "primary" : "secondary"}
                  size="sm"
                  className="min-w-36"
                >
                  {formatDateLabel(activeDate, currentToday)}
                </Button>
                <IconButton
                  onClick={() => moveDate(1)}
                  disabled={disableNext}
                  label="Volgende dag"
                  icon={<ChevronRight size={18} />}
                  variant="secondary"
                />
              </div>
            </div>

            <div className="min-w-0 lg:w-80">
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-text-muted)]">
                  {todaySummary.completed}/{todaySummary.due} voltooid
                </span>
                <span
                  className={cn(
                    "font-bold",
                    completionPct === 100
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-warning)]",
                  )}
                >
                  {completionPct}%
                </span>
              </div>
              <Progress
                value={completionPct}
                label={`${todaySummary.completed} van ${todaySummary.due} habits voltooid`}
                tone={completionPct === 100 ? "success" : "warning"}
              />
            </div>
          </div>
        </Surface>

        <Surface tone="info" radius="sm" padding="sm" className="hidden md:block">
          <div className="flex items-start gap-3">
<AppIcon name="shield" tone="accent" size="md" framed />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-[var(--color-primary-hover)]">
                Privacy
              </p>
              <p className="mt-1 text-lg font-bold text-[var(--color-text)]">
                {privacyOn ? "Verborgen" : "Zichtbaar"}
              </p>
              <p className="mt-1 text-sm text-[var(--color-primary-hover)]">
                {privacyOn ? "Privé modus actief" : "Details zichtbaar"}
              </p>
            </div>
          </div>
        </Surface>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
        <MetricCard
          icon={Target}
          label="Vandaag"
          value={`${todaySummary.completed}/${todaySummary.due}`}
          tone="accent"
        />
        <MetricCard
          icon={LayoutGrid}
          label="Actief"
          value={groupedHabits.actief.length.toString()}
          tone="info"
        />
        <MetricCard
          icon={AlertTriangle}
          label="Incidenten"
          value={dayHealth.incidents.toString()}
          tone={dayHealth.incidents > 0 ? "danger" : "success"}
        />
        <MetricCard
          icon={Flame}
          label="Record"
          value={`${Math.max(0, ...habits.map((h) => h.langsteStreak))}d`}
          tone="success"
        />
      </section>
    </>
  );
}
