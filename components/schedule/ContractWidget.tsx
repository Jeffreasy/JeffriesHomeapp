"use client";

import { useMemo, type CSSProperties } from "react";
import { CheckCircle2, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Progress } from "@/components/ui/Progress";
import { Surface } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { useSchedule } from "@/hooks/useSchedule";
import { DEFAULT_CONTRACT_HOURS_PER_WEEK } from "@/lib/contract";
import { analyzeContract, getCurrentWeekBalance } from "@/lib/schedule";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";
import { cn } from "@/lib/utils";
import { hoursValue } from "./RoosterUtils";
import { formatWeekLabel } from "./scheduleUtils";

export function ContractWidget({
  contractUren = DEFAULT_CONTRACT_HOURS_PER_WEEK,
}: {
  contractUren?: number;
} = {}) {
  const { diensten } = useSchedule();
  const stats = useMemo(
    () => analyzeContract(diensten, contractUren),
    [diensten, contractUren],
  );
  const currentOrNextWeek = useMemo(() => getCurrentWeekBalance(stats), [stats]);

  if (!currentOrNextWeek) return null;

  const isOver = currentOrNextWeek.delta > 0;
  const isUnder = currentOrNextWeek.delta < 0;
  const currentTone: Exclude<UiTone, "neutral" | "accent" | "info"> = isOver
    ? "warning"
    : isUnder
      ? "danger"
      : "success";
  const DeltaIcon = isOver ? TrendingUp : isUnder ? TrendingDown : CheckCircle2;

  return (
    <Surface tone={currentTone} radius="lg" padding="lg" className="mb-6">
      <SurfaceHeader
        eyebrow="Contracturen"
        title={formatWeekLabel(currentOrNextWeek.weeknr)}
        meta="Werkelijke uren ten opzichte van je weekcontract"
        icon={<Target size={18} className={uiToneClasses[currentTone].icon} />}
        action={
          <Badge tone={currentTone}>
            <DeltaIcon size={14} aria-hidden="true" />
            {currentOrNextWeek.delta > 0 ? "+" : ""}
            {hoursValue(currentOrNextWeek.delta)}u
          </Badge>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] lg:items-end">
        <div>
          <p className="text-4xl font-black leading-none tracking-tight text-[var(--color-text)] tabular-nums sm:text-5xl">
            {hoursValue(currentOrNextWeek.actualHours)}
            <span className="ml-1 text-xl font-bold text-[var(--color-text-subtle)] sm:text-2xl">
              /{hoursValue(currentOrNextWeek.expectedHours)}u
            </span>
          </p>
          <Progress
            value={currentOrNextWeek.actualHours}
            max={currentOrNextWeek.expectedHours}
            label="Voortgang contracturen deze week"
            tone={currentTone}
            className="mt-4 h-2.5"
          />
          {isOver ? (
            <p className="mt-2 text-xs font-medium text-[var(--color-warning)]">
              Overuren staan apart in de weekbalans; de voortgang blijft begrensd op het contractdoel.
            </p>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Totaalbalans <span className="normal-case tracking-normal">(t/m deze week)</span>
            </span>
            <span className={cn("text-xl font-black tabular-nums", uiToneClasses[
              stats.totalDelta > 0 ? "warning" : stats.totalDelta < 0 ? "danger" : "success"
            ].text)}>
              {stats.totalDelta > 0 ? "+" : ""}
              {hoursValue(stats.totalDelta)}u
            </span>
          </div>

          <div>
            <div className="flex h-8 w-full items-end gap-1 opacity-80" aria-label="Contracttrend over maximaal vijftien weken">
              {stats.weeklyBalances.slice(-15).map((week) => {
                const height = Math.max(2, Math.min(32, Math.abs(week.delta) * 2));
                const barTone = week.future
                  ? "bg-[var(--color-text-subtle)]"
                  : week.delta > 0
                    ? "bg-[var(--color-warning)]"
                    : week.delta < 0
                      ? "bg-[var(--color-danger)]"
                      : "bg-[var(--color-success)]";
                return (
                  <span
                    key={week.weeknr}
                    title={`${formatWeekLabel(week.weeknr)}: ${week.delta > 0 ? "+" : ""}${hoursValue(week.delta)}u${week.future ? " (gepland)" : ""}`}
                    className={cn(
                      "h-[var(--schedule-bar-height)] min-w-1 flex-1 rounded-t-sm transition-opacity duration-[var(--motion-standard)] hover:opacity-100 motion-reduce:transition-none",
                      barTone,
                      week.future ? "opacity-30" : "opacity-70",
                    )}
                    style={{ "--schedule-bar-height": String(height) + "px" } as CSSProperties}
                  />
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-micro font-bold uppercase tracking-wider text-[var(--color-text-muted)]">
              <span>Trend 15 weken</span>
              <span>{stats.weeklyBalances.length} weken</span>
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}
