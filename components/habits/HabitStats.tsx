"use client";

import { TrendingUp, Flame, Target, Award } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { formatXP, formatStreak, formatLevel } from "@/lib/habit-constants";
import { Progress } from "@/components/ui/Progress";
import { Skeleton } from "@/components/ui/Skeleton";
import { Surface, surfaceVariants } from "@/components/ui/Surface";

/**
 * HabitStats — Statistics dashboard.
 * Mobile-first: stacked cards, XP progress bar, streak leaderboard.
 */
export function HabitStats({ masked = false }: { masked?: boolean }) {
  const { stats, level, habits, badges } = useHabits();

  if (!stats) {
    return (
      <div className={`${surfaceVariants({ padding: "sm" })}`}>
        <Skeleton className="mb-4 h-5 w-24" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }

  const topStreaks = habits
    .filter(h => h.huidigeStreak > 0)
    .sort((a, b) => b.huidigeStreak - a.huidigeStreak)
    .slice(0, 5)
    .map(h => ({ naam: h.naam, emoji: h.emoji, streak: h.huidigeStreak, type: h.type, frequentie: h.frequentie }));

  const langsteStreakOoit = Math.max(0, ...habits.map(h => h.langsteStreak));

  return (
    <div className="space-y-3">
      {/* XP / Level card */}
      <div className={surfaceVariants({ padding: "sm" })}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award size={16} className="text-[var(--color-warning)]" />
            <h3 className="text-sm font-bold text-[var(--color-text)]">
              {formatLevel(level.level, level.titel)}
            </h3>
          </div>
          <span className="text-xs font-bold text-[var(--color-warning)]">{formatXP(stats.totaalXP ?? 0)}</span>
        </div>

        {/* XP Progress bar */}
        <div className="mb-2">
          <Progress
            value={Math.round(level.progress * 100)}
            label={`Voortgang naar niveau ${level.level + 1}`}
            tone="accent"
            className="h-2.5"
          />
          <div className="flex justify-between mt-1">
            <span className="text-micro text-[var(--color-text-subtle)]">
              {level.nextXP > 0 ? `Nog ${level.nextXP} XP voor Lv.${level.level + 1}` : "Max level! 🌟"}
            </span>
            <span className="text-micro text-[var(--color-text-subtle)]">{Math.round(level.progress * 100)}%</span>
          </div>
        </div>
      </div>

      {/* Stats grid — 2x2 on mobile */}
      <div className="grid grid-cols-2 gap-2">
        <StatMiniCard
          icon={<Target size={14} className="text-[var(--color-info)]" />}
          label="Actieve Habits"
          value={(stats.activeHabits ?? 0).toString()}
          accent="blue"
        />
        <StatMiniCard
          icon={<TrendingUp size={14} className="text-[var(--color-success)]" />}
          label="Totaal Voltooid"
          value={(stats.totaalVoltooid ?? 0).toString()}
          accent="green"
        />
        <StatMiniCard
          icon={<Flame size={14} className="text-[var(--color-warning)]" />}
          label="Langste Streak"
          value={`${langsteStreakOoit}d`}
          accent="orange"
        />
        <StatMiniCard
          icon={<Award size={14} className="text-[var(--color-warning)]" />}
          label="Badges"
          value={badges.length.toString()}
          accent="amber"
        />
      </div>

      {/* Top Streaks leaderboard */}
      {topStreaks.length > 0 && (
        <div className={surfaceVariants({ padding: "sm" })}>
          <h4 className="text-xs font-bold text-[var(--color-text)] mb-3 flex items-center gap-1.5">
            <Flame size={13} className="text-[var(--color-warning)]" /> Actieve Streaks
          </h4>
          <div className="space-y-2">
          {topStreaks.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xs font-bold text-[var(--color-text-subtle)] w-4">#{i + 1}</span>
                  <span className="text-sm">{masked ? "•" : s.emoji}</span>
                  <span className="truncate text-xs text-[var(--color-text)]">{masked ? `Habit ${i + 1}` : s.naam}</span>
                  {s.type === "negatief" && (
                    <span className="shrink-0 rounded border border-[var(--color-success-border)] bg-[var(--color-success-subtle)] px-1 py-0.5 text-micro text-[var(--color-success)]">
                      {masked ? "Privé" : "Auto"}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs font-bold text-[var(--color-warning)]">
                  {formatStreak(s.streak, s.frequentie)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatMiniCard({ icon, label, value, accent }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: "blue" | "green" | "orange" | "amber";
}) {
  const tone = {
    blue: "info",
    green: "success",
    orange: "accent",
    amber: "warning",
  }[accent] as "info" | "success" | "accent" | "warning";

  return (
    <Surface tone={tone} radius="md" padding="sm" className="flex flex-col gap-1.5">
      {icon}
      <span className="text-lg font-extrabold leading-none text-[var(--color-text)]">{value}</span>
      <span className="text-micro text-[var(--color-text-subtle)]">{label}</span>
    </Surface>
  );
}
