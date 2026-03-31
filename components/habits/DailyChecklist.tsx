"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Target, Check, AlertTriangle, ChevronRight, Flame } from "lucide-react";
import Link from "next/link";
import { useHabits, type HabitWithLog } from "@/hooks/useHabits";
import { formatStreak, formatLevel } from "@/lib/habit-constants";

/**
 * DailyChecklist — Dashboard widget.
 * Mobile-first: compact, touch-friendly, 56px min-height items.
 */
export function DailyChecklist() {
  const { todayHabits, todaySummary, level, toggle, isLoading } = useHabits();

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-4 animate-pulse">
        <div className="h-5 w-32 bg-white/5 rounded mb-3" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (todayHabits.length === 0) {
    return (
      <Link href="/habits">
        <div className="glass rounded-2xl p-5 hover:bg-white/3 transition-colors">
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
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: progressPercent === 100 ? "#22c55e" : "#f97316" }}
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Habit items */}
      <div className="px-2 pb-2 space-y-0.5">
        <AnimatePresence>
          {todayHabits.map((habit) => (
            <HabitCheckItem
              key={habit._id}
              habit={habit}
              onToggle={() => toggle(habit._id)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function HabitCheckItem({ habit, onToggle }: { habit: HabitWithLog; onToggle: () => void }) {
  const isCompleted = habit.log?.voltooid === true;
  const isNegative = habit.type === "negatief";
  const hasIncident = habit.log?.isIncident === true;
  const streakStr = habit.huidigeStreak > 0 ? habit.huidigeStreak : 0;

  // Negatieve habits: auto-streak, geen toggle nodig
  // Positieve habits: toggle aan/uit
  const isSuccess = isNegative ? !hasIncident : isCompleted;

  return (
    <motion.button
      layout
      onClick={isNegative ? undefined : onToggle}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all min-h-[56px] active:scale-[0.97]"
      style={{
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
        cursor: isNegative ? "default" : "pointer",
      }}
      whileTap={isNegative ? {} : { scale: 0.97 }}
    >
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
        <span className="text-base shrink-0">{habit.emoji}</span>
        <span
          className="text-sm font-medium truncate transition-all"
          style={{
            color: isSuccess ? "rgba(255,255,255,0.4)" : hasIncident ? "#f87171" : "rgba(255,255,255,0.85)",
            textDecoration: isSuccess && !isNegative ? "line-through" : "none",
          }}
        >
          {habit.naam}
        </span>
      </div>

      {/* Streak badge + type indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        {streakStr > 0 && (
          <span className="text-[10px] text-orange-400/80 font-medium flex items-center gap-0.5">
            <Flame size={10} className="text-orange-400" />{streakStr}
          </span>
        )}
      </div>
    </motion.button>
  );
}
