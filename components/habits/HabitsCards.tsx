"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Tone, toneClasses, maskHabitName } from "./HabitsUtils";
import { formatStreakShort } from "@/lib/habit-constants";
import { Badge } from "@/components/ui/Badge";
import { FeedbackState } from "@/components/ui/FeedbackState";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { MetricCard as UiMetricCard } from "@/components/ui/MetricCard";

function surfaceTone(tone: Tone) {
  return tone === "neutral" ? "subtle" : tone;
}

export function MetricCard({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone: Tone }) {
  return <UiMetricCard icon={Icon} label={label} value={value} tone={tone} />;
}

export function MiniStat({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const classes = toneClasses[tone];
  return (
    <Surface tone={surfaceTone(tone)} radius="sm" padding="sm">
      <p className="text-micro font-semibold uppercase text-[var(--color-text-subtle)]">{label}</p>
      <p className={cn("mt-1 text-lg font-bold", classes.text)}>{value}</p>
    </Surface>
  );
}

export function SectionHeader({ title, meta }: { title: string; meta: string }) {
  return <SurfaceHeader title={title} action={<Badge size="sm">{meta}</Badge>} headingLevel={2} compact />;
}

export function SidePanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Surface padding="sm">
      <SurfaceHeader title={title} headingLevel={3} compact />
      {children}
    </Surface>
  );
}

export function TopStreaks({ streaks, masked }: { streaks: Array<{ naam: string; emoji: string; streak: number; type?: string; frequentie?: string }>; masked: boolean }) {
  return (
    <SidePanel title="Streaks">
      {streaks.length === 0 ? (
        <FeedbackState title="Geen actieve streaks" compact />
      ) : (
        <div className="space-y-2">
          {streaks.slice(0, 4).map((streak, index) => (
            <Surface key={`${streak.naam}-${index}`} tone="subtle" radius="sm" padding="xs" className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text)]"><span className="mr-2">{masked ? "•" : streak.emoji}</span>{maskHabitName(streak.naam, index, masked)}</p>
                <p className="mt-0.5 text-micro uppercase text-[var(--color-text-subtle)]">{masked ? "Afgeschermd" : streak.type ?? "habit"}</p>
              </div>
              <Badge tone="accent" size="sm" className="shrink-0">{formatStreakShort(streak.streak, streak.frequentie)}</Badge>
            </Surface>
          ))}
        </div>
      )}
    </SidePanel>
  );
}

export function DistributionRow({ label, value, total, tone }: { label: string; value: number; total: number; tone: Tone }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const classes = toneClasses[tone];
  const progressTone = tone === "success" || tone === "warning" || tone === "danger" ? tone : "accent";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--color-text-subtle)]">{label}</span>
        <span className={cn("font-bold", classes.text)}>{value}</span>
      </div>
      <Progress value={pct} label={`${label}: ${value} van ${total}`} tone={progressTone} className="h-1.5" />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, actionLabel, onAction }: { icon: LucideIcon; title: string; text?: string; actionLabel?: string; onAction?: () => void }) {
  return <FeedbackState icon={Icon} title={title} description={text ?? ""} actionLabel={actionLabel} onAction={onAction} />;
}

export function HabitListSkeleton({ loading }: { loading: boolean }) {
  if (!loading) return null;
  return <div className="space-y-2">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-24" />)}</div>;
}
