"use client";

import { Target } from "lucide-react";
import { HabitCard } from "./HabitCard";
import { DistributionRow, EmptyState, HabitListSkeleton, SectionHeader, SidePanel, TopStreaks } from "./HabitsCards";

export function HabitsOverzichtTab({
  groupedHabits,
  isLoading,
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
  habits,
  todayHabits,
}: {
  groupedHabits: any;
  isLoading: boolean;
  setShowForm: (show: boolean) => void;
  privacyOn: boolean;
  toggle: (id: string) => void;
  increment: (id: string, step: number) => void;
  incident: (id: string, trigger?: string, note?: string) => void;
  pause: (id: string) => void;
  archive: (id: string) => void;
  setConfirmDelete: (id: string) => void;
  setEditingHabit: (id: string) => void;
  dayHealth: any;
  habits: any[];
  todayHabits: any[];
}) {
  return (
    <div className="mt-5 space-y-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-3">
          <SectionHeader title="Actief" meta={`${groupedHabits.actief.length} habits`} />
          <HabitListSkeleton loading={isLoading} />
          {!isLoading && groupedHabits.actief.length === 0 && (
            <EmptyState icon={Target} title="Nog geen actieve habits" actionLabel="Habit toevoegen" onAction={() => setShowForm(true)} />
          )}
          {!isLoading && groupedHabits.actief.length > 0 && (
            <div className="space-y-2">
              {groupedHabits.actief.map((habit: any) => (
                <HabitCard
                  key={habit._id}
                  habit={{ ...habit, log: null }}
                  masked={privacyOn}
                  onToggle={() => toggle(habit._id!)}
                  onIncrement={(stap) => increment(habit._id!, stap)}
                  onIncident={(trigger, notitie) => incident(habit._id!, trigger, notitie)}
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
          <SidePanel title="Verdeling">
            <div className="space-y-2">
              <DistributionRow label="Actief" value={groupedHabits.actief.length} total={Math.max(1, habits.length)} tone="amber" />
              <DistributionRow label="Gepauzeerd" value={groupedHabits.gepauzeerd.length} total={Math.max(1, habits.length)} tone="sky" />
              <DistributionRow label="Incidenten vandaag" value={dayHealth.incidents} total={Math.max(1, todayHabits.length)} tone="rose" />
            </div>
          </SidePanel>
          <TopStreaks
            streaks={habits.filter(h => h.huidigeStreak > 0).sort((a, b) => b.huidigeStreak - a.huidigeStreak).slice(0, 5).map(h => ({ naam: h.naam, emoji: h.emoji, streak: h.huidigeStreak, type: h.type }))}
            masked={privacyOn}
          />
        </aside>
      </div>

      {groupedHabits.gepauzeerd.length > 0 && (
        <div className="space-y-3 opacity-75">
          <SectionHeader title="Gepauzeerd" meta={`${groupedHabits.gepauzeerd.length} habits`} />
          <div className="grid gap-2 xl:grid-cols-2">
            {groupedHabits.gepauzeerd.map((habit: any) => (
              <HabitCard
                key={habit._id}
                habit={{ ...habit, log: null }}
                masked={privacyOn}
                onToggle={() => undefined}
                onIncrement={() => undefined}
                onIncident={() => undefined}
                onPause={() => pause(habit._id!)}
                onArchive={() => archive(habit._id!)}
                onRemove={() => setConfirmDelete(habit._id!)}
                onEdit={() => setEditingHabit(habit._id!)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
