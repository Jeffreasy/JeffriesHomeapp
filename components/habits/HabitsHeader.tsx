"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatLevel, formatXP } from "@/lib/habit-constants";
import { AppIcon } from "@/components/ui/AppIcon";
import type { HabitStatsRecord } from "@/hooks/useHabits";

export function HabitsHeader({
  level,
  stats,
  privacyOn,
  togglePrivacy,
  setShowForm,
}: {
  level: { level: number; titel: string };
  stats?: HabitStatsRecord;
  privacyOn: boolean;
  togglePrivacy: () => void;
  setShowForm: (show: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <AppIcon name="habit" tone="amber" size="lg" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Zelfregie
              </p>
              <h1 className="mt-1 truncate text-2xl font-bold text-white">
                Habits
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {formatLevel(level.level, level.titel)} -{" "}
                {formatXP(stats?.totaalXP ?? 0)}
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:shrink-0 sm:items-center">
            <button
              type="button"
              onClick={togglePrivacy}
              title={privacyOn ? "Habits tonen" : "Habits verbergen"}
              aria-label={privacyOn ? "Habits tonen" : "Habits verbergen"}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors",
                privacyOn
                  ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                  : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]",
              )}
            >
              <AppIcon
                name={privacyOn ? "hide" : "show"}
                tone={privacyOn ? "indigo" : "slate"}
                size="sm"
              />
              <span>{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => setShowForm(true)}
              aria-label="Nieuwe habit toevoegen"
              title="Nieuwe habit toevoegen"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              <AppIcon name="add" tone="amber" size="sm" />
              <span>Nieuw</span>
            </motion.button>
          </div>
        </div>
      </div>
    </header>
  );
}
