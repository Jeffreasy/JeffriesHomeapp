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
  activeDate,
  setShowForm,
  privacyOn,
  toggle,
  increment,
  incident,
  removeIncident,
  incidentAllowed = true,
  pause,
  archive,
  setConfirmDelete,
  setEditingHabit,
  dayHealth,
  stats,
  habits,
  pendingHabitIds,
}: {
  todayHabits: HabitWithLog[];
  isLoading: boolean;
  isToday: boolean;
  /** The Amsterdam YYYY-MM-DD shown — cards are keyed by it so a parked stepper
   *  commit can never write to the newly-navigated date (R3). */
  activeDate: string;
  setShowForm: (show: boolean) => void;
  privacyOn: boolean;
  toggle: (id: string) => void;
  increment: (id: string, step: number) => void;
  incident: (id: string, trigger?: string, note?: string) => void;
  removeIncident?: (id: string) => void;
  incidentAllowed?: boolean;
  pause: (id: string) => void;
  archive: (id: string) => void;
  setConfirmDelete: (id: string) => void;
  setEditingHabit: (id: string) => void;
  dayHealth: DayHealth;
  stats?: HabitStatsRecord;
  habits: HabitRecord[];
  pendingHabitIds: ReadonlySet<string>;
}) {
  const activeCount = habits.filter((h) => h.isActief && !h.isPauze).length;
  const emptyTitle = isToday
    ? activeCount > 0
      ? "Niets gepland vandaag"
      : "Geen habits vandaag"
    : "Geen habits op deze dag";
  const emptyText = activeCount > 0
    ? `${activeCount} actieve habit${activeCount === 1 ? "" : "s"}, maar niet op deze datum.`
    : isToday
      ? "Maak je eerste habit aan om vandaag te kunnen afvinken."
      : "Je hebt nog geen habits op deze dag.";

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-3">
        <SectionHeader
          title={isToday ? "Vandaag" : "Gekozen dag"}
          meta={todayHabits.length > 0 ? `${todayHabits.length} gepland` : `${activeCount} actief`}
        />
        <HabitListSkeleton loading={isLoading} />
        {!isLoading && todayHabits.length === 0 && (
          <EmptyState
            icon={Target}
            title={emptyTitle}
            text={emptyText}
            actionLabel={isToday && activeCount === 0 ? "Habit toevoegen" : undefined}
            onAction={isToday && activeCount === 0 ? () => setShowForm(true) : undefined}
          />
        )}
        {!isLoading && todayHabits.length > 0 && (
          <div className="space-y-2">
            {todayHabits.map((habit) => (
              <HabitCard
                key={habit._id + ":" + activeDate}
                habit={habit}
                masked={privacyOn}
                pending={pendingHabitIds.has(habit._id)}
                onToggle={() => toggle(habit._id!)}
                onIncrement={(stap) => increment(habit._id!, stap)}
                onIncident={(trigger, notitie) =>
                  incident(habit._id!, trigger, notitie)
                }
                onRemoveIncident={
                  removeIncident ? () => removeIncident(habit._id!) : undefined
                }
                incidentDisabled={!incidentAllowed}
                onPause={() => pause(habit._id!)}
                onArchive={() => archive(habit._id!)}
                onRemove={() => setConfirmDelete(habit._id!)}
                onEdit={() => setEditingHabit(habit._id!)}
              />
            ))}
          </div>
        )}
      </div>

      <aside className="hidden space-y-3 lg:block">
        <SidePanel title="Focus">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat
              label="Open"
              value={dayHealth.openPositive.toString()}
              tone="accent"
            />
            <MiniStat
              label="Schoon"
              value={dayHealth.negativeClear.toString()}
              tone="success"
            />
            <MiniStat
              label="XP"
              value={formatXP(stats?.totaalXP ?? 0)}
              tone="info"
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
              frequentie: h.frequentie,
            }))}
          masked={privacyOn}
        />
      </aside>
    </div>
  );
}
