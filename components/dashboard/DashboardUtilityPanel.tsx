"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ChevronDown, ListChecks, StickyNote } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const LazyDailyChecklist = dynamic(
  () => import("@/components/habits/DailyChecklist").then((module) => module.DailyChecklist),
  { ssr: false },
);
const LazyQuickNote = dynamic(
  () => import("@/components/notes/QuickNote").then((module) => module.QuickNote),
  { ssr: false },
);

export function DashboardUtilityPanel() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section aria-labelledby="dashboard-tools-title" className="space-y-3">
      <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 sm:px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-white/[0.04] text-amber-300">
          <ListChecks size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="dashboard-tools-title" className="text-sm font-semibold text-white">
            Routine en snelle capture
          </h2>
          <p className="truncate text-xs text-[var(--color-text-muted)]">
            Checklist en notities staan buiten je primaire bedienflow
          </p>
        </div>

        <div className="hidden items-center gap-2 xl:flex">
          <Link href="/habits" className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200">
            Habits
          </Link>
          <Link href="/notities" className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-slate-200">
            Notities
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-controls="dashboard-tools-content"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-white/5 hover:text-slate-200"
        >
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={cn("transition-transform", expanded && "rotate-180")}
          />
          <span className="sr-only">
            {expanded ? "Routine en snelle capture sluiten" : "Routine en snelle capture openen"}
          </span>
        </button>
      </div>

      {expanded && (
        <div id="dashboard-tools-content" className="grid gap-4 xl:grid-cols-2">
          <LazyDailyChecklist />
          <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <StickyNote size={14} className="text-amber-300" aria-hidden="true" />
              Capture
            </div>
            <LazyQuickNote />
          </div>
        </div>
      )}
    </section>
  );
}
