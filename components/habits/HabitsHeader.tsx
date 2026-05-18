"use client";

import { Eye, EyeOff, Plus, Target } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatLevel, formatXP } from "@/lib/habit-constants";

export function HabitsHeader({
  level,
  stats,
  privacyOn,
  togglePrivacy,
  setShowForm,
}: {
  level: { level: number; titel: string };
  stats: any;
  privacyOn: boolean;
  togglePrivacy: () => void;
  setShowForm: (show: boolean) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[#080a0f]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
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
                : "border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-slate-300 hover:bg-[rgba(255,255,255,0.06)]",
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
  );
}
