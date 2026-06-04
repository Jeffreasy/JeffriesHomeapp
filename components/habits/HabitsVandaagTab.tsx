"use client";

import { Target } from "lucide-react";
import { HabitCard } from "./HabitCard";
import { formatXP } from "@/lib/habit-constants";
import {
  EmptyState,
  HabitListSkeleton,
  MiniStat,
  SectionHeader,
  SidePanel,
  TopStreaks,
} from "./HabitsCards";
import type {
  HabitRecord,
  HabitStatsRecord,
  HabitWithLog,
} from "@/hooks/useHabits";

type DayHealth = {
  incidents: number;
  negativeClear: number;
  openPositive: number;
};

export function HabitsVandaagTab({
  todayHabits,
  isLoading,
  isToday,
  setShowForm,
  privacyOn,
  toggle,
  increment,
  incident,
  pause,
  archive,
  setConfirmDelete,
  setEditingHabit,
  dayHealth,
  stats,
  habits,
}: {
  todayHabits: HabitWithLog[];
  isLoading: boolean;
  isToday: boolean;
  setShowForm: (show: boolean) => void;
  privacyOn: boolean;
  toggle: (id: string) => void;
  increment: (id: string, step: number) => void;
  incident: (id: string, trigger?: string, note?: string) => void;
  pause: (id: string) => void;
  archive: (id: string) => void;
  setConfirmDelete: (id: string) => void;
  setEditingHabit: (id: string) => void;
  dayHealth: DayHealth;
  stats?: HabitStatsRecord;
  habits: HabitRecord[];
}) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-3">
        <SectionHeader title="Vandaag" meta={`${todayHabits.length} gepland`} />
        <HabitListSkeleton loading={isLoading} />
        {!isLoading && todayHabits.length === 0 && (
          <EmptyState
            icon={Target}
            title={isToday ? "Geen habits vandaag" : "Geen habits op deze dag"}
            actionLabel={isToday ? "Habit toevoegen" : undefined}
            onAction={isToday ? () => setShowForm(true) : undefined}
          />
        )}
        {!isLoading && todayHabits.length > 0 && (
          <div className="space-y-2">
            {todayHabits.map((habit) => (
              <HabitCard
                key={habit._id}
                habit={habit}
                masked={privacyOn}
                onToggle={() => toggle(habit._id!)}
                onIncrement={(stap) => increment(habit._id!, stap)}
                onIncident={(trigger, notitie) =>
                  incident(habit._id!, trigger, notitie)
                }
                onPause={() => pause(habit._id!)}
                onArchive={() => archive(habit._id!)}
                onRemove={() => setConfirmDelete(habit._id!)}
                onEdit={() => setEditingHabit(habit._id!)}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="space-y-3">
        <SidePanel title="Focus">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat
              label="Open"
              value={dayHealth.openPositive.toString()}
              tone="amber"
            />
            <MiniStat
              label="Clean"
              value={dayHealth.negativeClear.toString()}
              tone="green"
            />
            <MiniStat
              label="XP"
              value={formatXP(stats?.totaalXP ?? 0)}
              tone="sky"
            />
          </div>
        </SidePanel>
        <TopStreaks
          streaks={habits
            .filter((h) => h.huidigeStreak > 0)
            .sort((a, b) => b.huidigeStreak - a.huidigeStreak)
            .slice(0, 5)
            .map((h) => ({
              naam: h.naam,
              emoji: h.emoji,
              streak: h.huidigeStreak,
              type: h.type,
            }))}
          masked={privacyOn}
        />
      </aside>
    </div>
  );
}
