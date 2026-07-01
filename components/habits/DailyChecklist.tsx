"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Target, Check, AlertTriangle, ChevronRight, Flame, Plus } from "lucide-react";
import Link from "next/link";
import { isPeriodHabit, isPeriodSatisfied, useHabits, type HabitWithLog } from "@/hooks/useHabits";
import { usePrivacy } from "@/hooks/usePrivacy";
import { DEFAULT_STAP, formatLevel } from "@/lib/habit-constants";

/**
 * DailyChecklist — Dashboard widget.
 * Mobile-first: compact, touch-friendly, 56px min-height items.
 */
export function DailyChecklist() {
  const { todayHabits, todaySummary, level, toggle, increment, isLoading, pendingHabitIds, announcement } = useHabits();
  const { hidden: privacyOn } = usePrivacy("habits");

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-5 w-32 bg-[rgba(255,255,255,0.05)] rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-[rgba(255,255,255,0.05)] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (todayHabits.length === 0) {
    return (
      <Link href="/habits">
        <div className="glass rounded-2xl p-5 hover:bg-[rgba(255,255,255,0.03)] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
              <Target size={18} className="text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200">Habits instellen</p>
              <p className="text-xs text-slate-500">Begin met je eerste gewoonte →</p>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  const progressPercent = Math.round(todaySummary.rate * 100);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/15 border border-orange-500/20 flex items-center justify-center">
            <Target size={15} className="text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Vandaag</h3>
            <p className="text-[10px] text-slate-500">
              {formatLevel(level.level, level.titel)}
            </p>
          </div>
        </div>

        <Link href="/habits" className="text-[10px] text-orange-400/70 hover:text-orange-400 flex items-center gap-0.5 transition-colors">
          Alles <ChevronRight size={10} />
        </Link>
      </div>

      {/* Progress bar */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-slate-500">
            {todaySummary.completed}/{todaySummary.due} voltooid
          </span>
          <span className="text-[10px] font-bold" style={{ color: progressPercent === 100 ? "#22c55e" : "#f97316" }}>
            {progressPercent}%
          </span>
        </div>
        <div className="h-1.5 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: progressPercent === 100 ? "#22c55e" : "#f97316" }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
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
    </div>
  );
}

function HabitCheckItem({ habit, onToggle, onIncrement, masked, pending }: { habit: HabitWithLog; onToggle: () => void; onIncrement: (stap: number) => void; masked: boolean; pending: boolean }) {
  const isCompleted = habit.log?.voltooid === true;
  const isNegative = habit.type === "negatief";
  const hasIncident = habit.log?.isIncident === true;
  const streakStr = habit.huidigeStreak > 0 ? habit.huidigeStreak : 0;
  // Kwantitatieve habits mogen NIET met één tap "compleet" flippen (H7): het
  // dashboard toont huidig/doel en een compacte +stap in plaats van een toggle.
  const isQuantitative = Boolean(habit.isKwantitatief && habit.doelWaarde);
  const stap = DEFAULT_STAP[habit.eenheid ?? "x"] ?? 1;
  const currentWaarde = habit.log?.waarde ?? 0;
  // N5: week/maand-habits zijn "voldaan" zodra het periode-doel is gehaald.
  const periodHabit = isPeriodHabit(habit);
  const periodTarget = habit.doelAantal ?? 0;
  const periodCount = habit.periodVoltooidCount ?? 0;
  const periodSatisfied = isPeriodSatisfied(habit);

  // Negatieve habits: auto-streak, geen toggle nodig
  // Positieve habits: toggle aan/uit
  const isSuccess = isNegative ? !hasIncident : isCompleted || periodSatisfied;
  // Rijen zonder rij-brede toggle (negatief + kwantitatief) renderen als div,
  // zodat de +stap-knop een echte (geldige, klikbare) button kan zijn.
  const rowInert = isNegative || isQuantitative;

  const rowClass = "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all min-h-[56px]";
  const rowStyle = {
    background: isSuccess
      ? "rgba(34, 197, 94, 0.06)"
      : hasIncident
        ? "rgba(239, 68, 68, 0.06)"
        : "rgba(255,255,255,0.02)",
    border: isSuccess
      ? "1px solid rgba(34, 197, 94, 0.12)"
      : hasIncident
        ? "1px solid rgba(239, 68, 68, 0.12)"
        : "1px solid transparent",
    opacity: pending ? 0.6 : 1,
  };

  const rowContent = (
    <>
      {/* Check circle / Shield icon */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
        style={{
          background: isNegative
            ? (hasIncident ? "#ef4444" : "rgba(34, 197, 94, 0.15)")
            : (isCompleted ? habit.kleur ?? "#22c55e" : "rgba(255,255,255,0.05)"),
          border: isNegative
            ? "none"
            : (isCompleted ? "none" : `2px solid ${habit.kleur ?? "rgba(255,255,255,0.12)"}`),
        }}
      >
        {isNegative ? (
          hasIncident
            ? <AlertTriangle size={12} className="text-white" />
            : <Check size={14} className="text-green-400" />
        ) : (
          isCompleted && <Check size={14} className="text-white" />
        )}
      </div>

      {/* Emoji + name */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-base shrink-0">{masked ? "•" : habit.emoji}</span>
        <span
          className="text-sm font-medium truncate transition-all"
          style={{
            color: isSuccess ? "rgba(255,255,255,0.4)" : hasIncident ? "#f87171" : "rgba(255,255,255,0.85)",
            textDecoration: isSuccess && !isNegative ? "line-through" : "none",
          }}
        >
          {masked ? "Verborgen habit" : habit.naam}
        </span>
      </div>

      {/* Voortgang (kwantitatief/periode) + streak badge */}
      <div className="flex items-center gap-1.5 shrink-0">
        {periodHabit && periodTarget > 0 && (
          <span
            className={`text-[10px] font-semibold tabular-nums ${
              periodSatisfied ? "text-green-400/90" : "text-sky-400/80"
            }`}
          >
            {masked
              ? "••"
              : `${periodCount}/${periodTarget} ${habit.frequentie === "x_per_week" ? "deze week" : "deze maand"}`}
          </span>
        )}
        {isQuantitative && (
          <span className="text-[10px] text-slate-400 font-medium tabular-nums">
            {masked ? "••" : `${currentWaarde}/${habit.doelWaarde} ${habit.eenheid ?? ""}`.trim()}
          </span>
        )}
        {/* Zichtbare status voor rijen zonder rij-brede toggle (a11y-low) */}
        {isNegative && (
          <span className={`text-[10px] font-semibold ${hasIncident ? "text-red-400" : "text-green-400/80"}`}>
            {hasIncident ? "Incident" : "Schoon"}
          </span>
        )}
        {isQuantitative && isCompleted && (
          <span className="text-[10px] font-semibold text-green-400/80">Doel behaald</span>
        )}
        {streakStr > 0 && (
          <span className="text-[10px] text-orange-400/80 font-medium flex items-center gap-0.5">
            <Flame size={10} className="text-orange-400" />{streakStr}
          </span>
        )}
      </div>
    </>
  );

  if (!rowInert) {
    return (
      <motion.div layout role="listitem">
        <motion.button
          layout
          onClick={onToggle}
          disabled={pending}
          aria-busy={pending}
          className={`${rowClass} active:scale-[0.97] disabled:cursor-default cursor-pointer`}
          style={rowStyle}
          whileTap={pending ? {} : { scale: 0.97 }}
        >
          {rowContent}
        </motion.button>
      </motion.div>
    );
  }

  return (
    <motion.div layout role="listitem" aria-busy={pending} className={rowClass} style={rowStyle}>
      {rowContent}
      {/* Compacte +stap voor kwantitatieve habits (H7): geen stille één-tap
          naar "compleet", wel snel bijtellen vanaf het dashboard. */}
      {isQuantitative && (
        <button
          type="button"
          onClick={() => onIncrement(stap)}
          disabled={pending || isCompleted}
          aria-busy={pending}
          aria-label={`${masked ? "Habit" : habit.naam} ${stap} ${habit.eenheid ?? ""} bijtellen`.trim()}
          title={isCompleted ? "Doel bereikt" : `+${stap} ${habit.eenheid ?? ""}`.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform active:scale-90 disabled:opacity-30 disabled:cursor-default cursor-pointer"
          style={{
            background: `${habit.kleur ?? "#f97316"}15`,
            border: `1px solid ${habit.kleur ?? "#f97316"}30`,
          }}
        >
          <Plus size={14} style={{ color: habit.kleur ?? "#f97316" }} />
        </button>
      )}
    </motion.div>
  );
}
