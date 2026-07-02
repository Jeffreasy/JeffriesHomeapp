"use client";

import type { ReactNode } from "react";
import { Plus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Tone, toneClasses, maskHabitName } from "./HabitsUtils";
import { formatStreakShort } from "@/lib/habit-constants";

export function MetricCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: Tone }) {
  const classes = toneClasses[tone];
  return (
    <div className={cn("rounded-lg border p-3 sm:p-4", classes.border, classes.surface)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <p className={cn("mt-1.5 truncate text-xl font-bold sm:mt-2 sm:text-2xl", classes.text)}>{value}</p>
        </div>
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/15", classes.icon)}>
          <Icon size={19} />
        </div>
      </div>
    </div>
  );
}

export function MiniStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const classes = toneClasses[tone];
  return (
    <div className={cn("rounded-lg border p-3", classes.border, classes.surface)}>
      <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", classes.text)}>{value}</p>
    </div>
  );
}

export function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold uppercase text-slate-300">{title}</h2>
      <span className="rounded-md border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-2 py-1 text-xs font-semibold text-slate-500">
        {meta}
      </span>
    </div>
  );
}

export function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass p-4">
      <h3 className="mb-3 text-xs font-bold uppercase text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

export function TopStreaks({
  streaks,
  masked,
}: {
  streaks: Array<{ naam: string; emoji: string; streak: number; type?: string; frequentie?: string }>;
  masked: boolean;
}) {
  return (
    <SidePanel title="Streaks">
      {streaks.length === 0 ? (
        <p className="text-sm text-slate-500">Geen actieve streaks</p>
      ) : (
        <div className="space-y-2">
          {streaks.slice(0, 4).map((streak, index) => (
            <div key={`${streak.naam}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-[rgba(255,255,255,0.03)] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-200">
                  <span className="mr-2">{masked ? "•" : streak.emoji}</span>
                  {maskHabitName(streak.naam, index, masked)}
                </p>
                <p className="mt-0.5 text-[10px] uppercase text-slate-600">{masked ? "Afgeschermd" : streak.type ?? "habit"}</p>
              </div>
              <span className="shrink-0 text-sm font-bold text-amber-200">{formatStreakShort(streak.streak, streak.frequentie)}</span>
            </div>
          ))}
        </div>
      )}
    </SidePanel>
  );
}

export function DistributionRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: Tone }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const classes = toneClasses[tone];
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-500">{label}</span>
        <span className={cn("font-bold", classes.text)}>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div className={cn("h-full rounded-full", classes.surface)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  text,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-4 py-10 text-center">
      <Icon size={34} className="mx-auto text-slate-700" />
      <p className="mt-3 text-sm font-semibold text-slate-400">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{text}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-11 items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/15"
        >
          <Plus size={15} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function HabitListSkeleton({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((item) => (
        <div key={item} className="h-24 animate-pulse glass" />
      ))}
    </div>
  );
}
