"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Target, Check, AlertTriangle, ChevronRight, Flame, Plus } from "lucide-react";
import { isPeriodHabit, isPeriodSatisfied, useHabits, type HabitWithLog } from "@/hooks/useHabits";
import { usePrivacy } from "@/hooks/usePrivacy";
import { DEFAULT_STAP, formatLevel } from "@/lib/habit-constants";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface, surfaceVariants } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { IconButton } from "@/components/ui/IconButton";
import { AppIcon } from "@/components/ui/AppIcon";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { uiMotion } from "@/lib/ui/motion";
import { habitColorStyle } from "./HabitsUtils";

/**
 * DailyChecklist — Dashboard widget.
 * Mobile-first: compact, touch-friendly, 56px min-height items.
 */
export function DailyChecklist() {
  const { todayHabits, todaySummary, level, toggle, increment, isLoading, pendingHabitIds, announcement } = useHabits();
  const { hidden: privacyOn } = usePrivacy("habits");

  if (isLoading) {
    return (
      <Surface padding="sm">
        <Skeleton className="mb-3 h-5 w-32" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </Surface>
    );
  }

  if (todayHabits.length === 0) {
    return (
      <ButtonLink href="/habits" variant="secondary" fullWidth className="h-auto justify-start gap-3 p-5 text-left">
        <AppIcon name="habit" tone="accent" size="md" framed />
        <span>
          <span className="block text-sm font-semibold text-[var(--color-text)]">Habits instellen</span>
          <span className="mt-0.5 block text-xs font-normal text-[var(--color-text-subtle)]">Begin met je eerste gewoonte →</span>
        </span>
      </ButtonLink>
    );
  }
  const progressPercent = Math.round(todaySummary.rate * 100);

  return (
    <Surface padding="none">
      <div className="px-4 pt-4">
        <SurfaceHeader
          icon={<Target size={15} className="text-[var(--color-warning)]" />}
          title="Vandaag"
          meta={formatLevel(level.level, level.titel)}
          action={(
            <ButtonLink href="/habits" variant="ghost" size="sm" className="-mr-2">
              Alles <ChevronRight size={12} aria-hidden="true" />
            </ButtonLink>
          )}
          headingLevel={3}
          compact
        />
      </div>
      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-micro text-[var(--color-text-subtle)]">
            {todaySummary.completed}/{todaySummary.due} voltooid
          </span>
          <span className={progressPercent === 100 ? "text-[var(--color-success)]" : "text-[var(--color-warning)]"}>
            {progressPercent}%
          </span>
        </div>
        <Progress
          value={progressPercent}
          label={`${todaySummary.completed} van ${todaySummary.due} habits voltooid`}
          tone={progressPercent === 100 ? "success" : "warning"}
          className="h-1.5"
        />
      </div>

      {/* Polite live region: kondig optimistische toggle-resultaten aan (a11y). */}
      <span aria-live="polite" role="status" className="sr-only">
        {announcement}
      </span>

      {/* Habit items */}
      <div className="px-2 pb-2 space-y-0.5" role="list" aria-label="Habits vandaag">
        <AnimatePresence>
          {todayHabits.map((habit) => (
            <HabitCheckItem
              key={habit._id}
              habit={habit}
              masked={privacyOn}
              pending={pendingHabitIds.has(habit._id)}
              onToggle={() => toggle(habit._id)}
              onIncrement={(stap) => increment(habit._id, stap)}
            />
          ))}
        </AnimatePresence>
      </div>
    </Surface>
  );
}

function HabitCheckItem({ habit, onToggle, onIncrement, masked, pending }: { habit: HabitWithLog; onToggle: () => void; onIncrement: (stap: number) => void; masked: boolean; pending: boolean }) {
  const isCompleted = habit.log?.voltooid === true;
  const isNegative = habit.type === "negatief";
  const hasIncident = habit.log?.isIncident === true;
  const streakStr = habit.huidigeStreak > 0 ? habit.huidigeStreak : 0;
  const isQuantitative = Boolean(habit.isKwantitatief && habit.doelWaarde);
  const stap = DEFAULT_STAP[habit.eenheid ?? "x"] ?? 1;
  const currentWaarde = habit.log?.waarde ?? 0;
  const periodHabit = isPeriodHabit(habit);
  const periodTarget = habit.doelAantal ?? 0;
  const periodCount = habit.periodVoltooidCount ?? 0;
  const periodSatisfied = isPeriodSatisfied(habit);
  const isSuccess = isNegative ? !hasIncident : isCompleted || periodSatisfied;
  const rowInert = isNegative || isQuantitative;
  const habitStyle = habitColorStyle(habit.kleur);
  const surfaceTone = hasIncident ? "danger" : isSuccess ? "success" : "subtle";
  const rowClass = cn(
    surfaceVariants({ tone: surfaceTone, radius: "sm", padding: "none" }),
    "flex min-h-14 w-full items-center gap-3 px-3 py-3 transition-[opacity,transform]",
    pending && "opacity-60",
  );

  const rowContent = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
          isNegative && hasIncident && "border-[var(--color-danger-border)] bg-[var(--color-danger)] text-[var(--color-primary-foreground)]",
          isNegative && !hasIncident && "border-[var(--color-success-border)] bg-[var(--color-success-subtle)] text-[var(--color-success)]",
          !isNegative && isCompleted && "border-[var(--habit-color)] bg-[var(--habit-color)] text-[var(--habit-color-foreground)]",
          !isNegative && !isCompleted && "border-[var(--habit-color-border)] bg-[var(--habit-color-soft)] text-[var(--habit-color-contrast)]",
        )}
      >
        {isNegative ? (
          hasIncident ? <AlertTriangle size={12} /> : <Check size={14} />
        ) : (
          isCompleted && <Check size={14} />
        )}
      </span>

      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 text-base">{masked ? "•" : habit.emoji}</span>
        <span
          className={cn(
            "truncate text-sm font-medium transition-colors",
            isSuccess ? "text-[var(--color-text-muted)]" : hasIncident ? "text-[var(--color-danger)]" : "text-[var(--color-text)]",
            isSuccess && !isNegative && "line-through",
          )}
        >
          {masked ? "Verborgen habit" : habit.naam}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-1.5">
        {periodHabit && periodTarget > 0 && (
          <span className={cn("text-micro font-semibold tabular-nums", periodSatisfied ? "text-[var(--color-success)]" : "text-[var(--color-info)]")}>
            {masked ? "••" : `${periodCount}/${periodTarget} ${habit.frequentie === "x_per_week" ? "deze week" : "deze maand"}`}
          </span>
        )}
        {isQuantitative && (
          <span className="text-micro font-medium tabular-nums text-[var(--color-text-muted)]">
            {masked ? "••" : `${currentWaarde}/${habit.doelWaarde} ${habit.eenheid ?? ""}`.trim()}
          </span>
        )}
        {isNegative && (
          <span className={cn("text-micro font-semibold", hasIncident ? "text-[var(--color-danger)]" : "text-[var(--color-success)]")}>
            {hasIncident ? "Incident" : "Schoon"}
          </span>
        )}
        {isQuantitative && isCompleted && <span className="text-micro font-semibold text-[var(--color-success)]">Doel behaald</span>}
        {streakStr > 0 && (
          <span className="flex items-center gap-0.5 text-micro font-medium text-[var(--color-warning)]">
            <Flame size={10} aria-hidden="true" />{streakStr}
          </span>
        )}
      </span>
    </>
  );

  if (!rowInert) {
    return (
      <motion.div layout role="listitem" style={habitStyle}>
        <motion.button
          type="button"
          layout
          onClick={onToggle}
          disabled={pending}
          aria-busy={pending}
          className={cn(buttonVariants({ variant: "ghost", fullWidth: true }), rowClass, "h-auto justify-start active:scale-[0.97]")}
          whileTap={pending ? undefined : uiMotion.press.subtle}
        >
          {rowContent}
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div layout role="listitem" aria-busy={pending} className={rowClass} style={habitStyle}>
      {rowContent}
      {isQuantitative && (
        <IconButton
          onClick={() => onIncrement(stap)}
          disabled={pending || isCompleted}
          aria-busy={pending}
          label={`${masked ? "Habit" : habit.naam} ${stap} ${habit.eenheid ?? ""} bijtellen`.trim()}
          title={isCompleted ? "Doel bereikt" : `+${stap} ${habit.eenheid ?? ""}`.trim()}
          variant="secondary"
          className="border-[var(--habit-color-border)] bg-[var(--habit-color-soft)] text-[var(--habit-color-contrast)]"
          icon={<Plus size={14} />}
        />
      )}
    </motion.div>
  );
}