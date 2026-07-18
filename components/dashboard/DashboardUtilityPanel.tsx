"use client";

import dynamic from "next/dynamic";
import { ChevronDown, ListChecks, StickyNote } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { IconButton } from "@/components/ui/IconButton";
import { Surface } from "@/components/ui/Surface";

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
      <Surface padding="xs" className="flex min-h-14 items-center gap-3 px-3 sm:px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]">
          <ListChecks size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="dashboard-tools-title" className="text-sm font-semibold text-[var(--color-text)]">
            Routine en snelle capture
          </h2>
          <p className="truncate text-xs text-[var(--color-text-muted)]">
            Checklist en notities staan buiten je primaire bedienflow
          </p>
        </div>

        <div className="hidden items-center gap-2 xl:flex">
          <ButtonLink href="/habits" variant="ghost" size="sm">
            Habits
          </ButtonLink>
          <ButtonLink href="/notities" variant="ghost" size="sm">
            Notities
          </ButtonLink>
        </div>

        <IconButton
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          aria-controls="dashboard-tools-content"
          label={expanded ? "Routine en snelle capture sluiten" : "Routine en snelle capture openen"}
          icon={<ChevronDown size={18} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />}
        />
      </Surface>

      {expanded && (
        <div id="dashboard-tools-content" className="grid gap-4 xl:grid-cols-2">
          <LazyDailyChecklist />
          <Surface padding="sm">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
              <StickyNote size={14} className="text-[var(--color-primary-hover)]" aria-hidden="true" />
              Capture
            </div>
            <LazyQuickNote />
          </Surface>
        </div>
      )}
    </section>
  );
}
