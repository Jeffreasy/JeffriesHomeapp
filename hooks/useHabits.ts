"use client";

import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getLevel } from "@/convex/lib/habitConstants";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HabitRecord {
  _id:               Id<"habits">;
  _creationTime:     number;
  userId:            string;
  naam:              string;
  emoji:             string;
  type:              "positief" | "negatief";
  beschrijving?:     string;
  frequentie:        string;
  aangepasteDagen?:  number[];
  doelAantal?:       number;
  roosterFilter?:    string;
  isKwantitatief:    boolean;
  doelWaarde?:       number;
  eenheid?:          string;
  doelTijd?:         string;
  xpPerVoltooiing:   number;
  moeilijkheid:      string;
  financieCategorie?: string;
  huidigeStreak:     number;
  langsteStreak:     number;
  totaalVoltooid:    number;
  totaalXP:          number;
  kleur?:            string;
  volgorde:          number;
  isActief:          boolean;
  isPauze:           boolean;
  gepauzeerOm?:      string;
  aangemaakt:        string;
  gewijzigd:         string;
}

export interface HabitLogEntry {
  _id:        Id<"habitLogs">;
  voltooid:   boolean;
  waarde?:    number;
  isIncident: boolean;
  notitie?:   string;
  xpVerdiend: number;
}

export interface HabitWithLog extends HabitRecord {
  log: HabitLogEntry | null;
}

export interface HabitBadgeRecord {
  _id:          Id<"habitBadges">;
  badgeId:      string;
  habitId?:     Id<"habits">;
  naam:         string;
  emoji:        string;
  beschrijving: string;
  xpBonus:      number;
  behaaldOp:    string;
}

export type HabitCreateData = {
  naam:              string;
  emoji:             string;
  type:              "positief" | "negatief";
  beschrijving?:     string;
  frequentie:        "dagelijks" | "weekdagen" | "weekenddagen" | "aangepast" | "x_per_week" | "x_per_maand";
  aangepasteDagen?:  number[];
  doelAantal?:       number;
  roosterFilter?:    "alle" | "werkdagen" | "vrijeDagen" | "vroegeDienst" | "lateDienst";
  isKwantitatief?:   boolean;
  doelWaarde?:       number;
  eenheid?:          string;
  doelTijd?:         string;
  moeilijkheid?:     "makkelijk" | "normaal" | "moeilijk";
  financieCategorie?: string;
  kleur?:            string;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHabits(datum?: string) {
  const { user } = useUser();
  const userId = user?.id ?? "";

  // Queries
  const forDate = useQuery(
    api.habits.getForDate,
    userId ? { userId, datum } : "skip",
  ) as { datum: string; dienst: { shiftType: string; team: string } | null; habits: HabitWithLog[] } | undefined;

  const stats = useQuery(
    api.habits.getStats,
    userId ? { userId } : "skip",
  );

  const badges = useQuery(
    api.habits.getBadges,
    userId ? { userId } : "skip",
  ) as HabitBadgeRecord[] | undefined;

  const allHabits = useQuery(
    api.habits.list,
    userId ? { userId } : "skip",
  ) as HabitRecord[] | undefined;

  // Mutations
  const createHabit       = useMutation(api.habits.create);
  const updateHabit       = useMutation(api.habits.update);
  const toggleCompletion  = useMutation(api.habits.toggleCompletion);
  const logIncident       = useMutation(api.habits.logIncident);
  const reorderHabits     = useMutation(api.habits.reorder);
  const togglePause       = useMutation(api.habits.togglePause);
  const archiveHabit      = useMutation(api.habits.archive);
  const removeHabit       = useMutation(api.habits.remove);

  // Level calculation
  const level = useMemo(() => {
    if (!stats) return { level: 1, xp: 0, nextXP: 100, progress: 0, titel: "Beginner" };
    return getLevel(stats.totaalXP);
  }, [stats]);

  // Today summary
  const todaySummary = useMemo(() => {
    if (!forDate) return { due: 0, completed: 0, rate: 0 };
    const due = forDate.habits.length;
    // Negatieve habits zonder incident vandaag = "voltooid" (auto-streak)
    const completed = forDate.habits.filter((h) =>
      h.log?.voltooid || (h.type === "negatief" && !h.log?.isIncident)
    ).length;
    return { due, completed, rate: due > 0 ? completed / due : 0 };
  }, [forDate]);

  return {
    // Data
    todayHabits:   forDate?.habits ?? [],
    todayDienst:   forDate?.dienst ?? null,
    habits:        allHabits ?? [],
    stats,
    badges:        badges ?? [],
    level,
    todaySummary,
    isLoading:     forDate === undefined,

    // Actions
    create: (data: HabitCreateData) =>
      createHabit({ userId, ...data }),
    update: (id: Id<"habits">, data: Partial<HabitCreateData>) =>
      updateHabit({ id, ...data }),
    toggle: (habitId: Id<"habits">, waarde?: number, notitie?: string) =>
      toggleCompletion({ userId, habitId, datum, waarde, notitie }),
    incident: (habitId: Id<"habits">, notitie?: string) =>
      logIncident({ userId, habitId, notitie }),
    reorder: (items: Array<{ id: Id<"habits">; volgorde: number }>) =>
      reorderHabits({ items }),
    pause:   (id: Id<"habits">) => togglePause({ id }),
    archive: (id: Id<"habits">) => archiveHabit({ id }),
    remove:  (id: Id<"habits">) => removeHabit({ id }),
  };
}
