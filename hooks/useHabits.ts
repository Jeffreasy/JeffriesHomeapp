"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { getLevel } from "@/lib/habit-constants";

import {
  useGetHabits,
  useGetHabitsForDate,
  useGetHabitsStats,
  useGetHabitsBadges,
  postHabits,
  patchHabitsId,
  postHabitsIdToggle,
  postHabitsIdIncident,
  postHabitsReorder,
  postHabitsIdPause,
  postHabitsIdArchive,
  deleteHabitsId,
} from "@/lib/api/generated/habits/habits";

import type { ModelHabit, ModelHabitBadge, GetHabitsStats200 } from "@/lib/api/model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HabitRecord {
  id: string;
  _id: string;
  _creationTime: number;
  userId: string;
  user_id: string;
  naam: string;
  emoji: string;
  beschrijving?: string;
  type: string;
  frequentie: string;
  isKwantitatief: boolean;
  is_kwantitatief: boolean;
  isActief: boolean;
  is_actief: boolean;
  isPauze: boolean;
  is_pauze: boolean;
  huidigeStreak: number;
  huidige_streak: number;
  langsteStreak: number;
  langste_streak: number;
  totaalVoltooid: number;
  totaal_voltooid: number;
  totaalXP: number;
  totaal_xp: number;
  xpPerVoltooiing: number;
  xp_per_voltooiing: number;
  doelWaarde?: number | null;
  doel_waarde?: number | null;
  doelAantal?: number | null;
  doel_aantal?: number | null;
  doelTijd?: string | null;
  doel_tijd?: string | null;
  eenheid?: string;
  roosterFilter?: string | null;
  rooster_filter?: string | null;
  aangepasteDagen?: number[] | null;
  aangepaste_dagen?: number[] | null;
  moeilijkheid?: string;
  financieCategorie?: string | null;
  financie_categorie?: string | null;
  gepauzeerOm?: string | null;
  gepauzeer_om?: string | null;
  kleur?: string;
  volgorde: number;
  aangemaakt: string;
  gewijzigd: string;
}

export interface HabitLogEntry {
  _id: string;
  voltooid: boolean;
  waarde?: number | null;
  isIncident: boolean;
  trigger?: string | null;
  notitie?: string | null;
  xpVerdiend: number;
}

export interface HabitWithLogRecord extends HabitRecord {
  log: HabitLogEntry | null;
}
export type HabitWithLog = HabitWithLogRecord;

export interface HabitStatsRecord {
  totaal_xp?: number;
  activeHabits?: number;
  totaalVoltooid?: number;
  perfectDays?: number;
  currentStreak?: number;
  longestStreak?: number;
  [key: string]: any; // Allow other properties for now
}

export interface HabitBadgeRecord {
  _id: string;
  badgeId: string;
  habitId?: string | null;
  naam: string;
  emoji: string;
  beschrijving: string;
  xpBonus: number;
  behaaldOp: string;
}

export type HabitCreateData = {
  naam: string;
  emoji: string;
  type: "positief" | "negatief";
  beschrijving?: string;
  frequentie: "dagelijks" | "weekdagen" | "weekenddagen" | "aangepast" | "x_per_week" | "x_per_maand";
  aangepaste_dagen?: number[];
  aangepasteDagen?: number[];
  doel_aantal?: number;
  doelAantal?: number;
  rooster_filter?: string;
  roosterFilter?: string;
  is_kwantitatief?: boolean;
  isKwantitatief?: boolean;
  doel_waarde?: number;
  doelWaarde?: number;
  eenheid?: string;
  doel_tijd?: string;
  doelTijd?: string;
  moeilijkheid?: "makkelijk" | "normaal" | "moeilijk";
  financie_categorie?: string;
  financieCategorie?: string;
  kleur?: string;
};

function toRecord(row: ModelHabit): HabitRecord {
  return {
    ...row,
    id: row.id ?? "",
    _id: row.id ?? "",
    _creationTime: new Date(row.aangemaakt || new Date()).getTime(),
    userId: row.user_id ?? "",
    user_id: row.user_id ?? "",
    isKwantitatief: row.is_kwantitatief ?? false,
    is_kwantitatief: row.is_kwantitatief ?? false,
    isActief: row.is_actief ?? true,
    is_actief: row.is_actief ?? true,
    isPauze: row.is_pauze ?? false,
    is_pauze: row.is_pauze ?? false,
    huidigeStreak: row.huidige_streak ?? 0,
    huidige_streak: row.huidige_streak ?? 0,
    langsteStreak: row.langste_streak ?? 0,
    langste_streak: row.langste_streak ?? 0,
    totaalVoltooid: row.totaal_voltooid ?? 0,
    totaal_voltooid: row.totaal_voltooid ?? 0,
    totaalXP: row.totaal_xp ?? 0,
    totaal_xp: row.totaal_xp ?? 0,
    xpPerVoltooiing: row.xp_per_voltooiing ?? 0,
    xp_per_voltooiing: row.xp_per_voltooiing ?? 0,
    doelWaarde: row.doel_waarde,
    doelAantal: row.doel_aantal,
    doelTijd: row.doel_tijd,
    roosterFilter: row.rooster_filter,
    aangepasteDagen: row.aangepaste_dagen,
    financieCategorie: row.financie_categorie,
    gepauzeerOm: row.gepauzeer_om,
    naam: row.naam ?? "",
    emoji: row.emoji ?? "",
    type: row.type ?? "positief",
    frequentie: row.frequentie ?? "dagelijks",
    volgorde: row.volgorde ?? 0,
    aangemaakt: row.aangemaakt ?? new Date().toISOString(),
    gewijzigd: row.gewijzigd ?? new Date().toISOString(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLogEntry(log: any): HabitLogEntry {
  return {
    _id: log.id,
    voltooid: log.voltooid,
    waarde: log.waarde,
    isIncident: log.is_incident,
    trigger: log.trigger_cat,
    notitie: log.notitie,
    xpVerdiend: log.xp_verdiend,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toWithLog(wl: any): HabitWithLogRecord {
  return {
    ...toRecord(wl as ModelHabit),
    log: wl.log ? toLogEntry(wl.log) : null,
  };
}

function toBadge(row: ModelHabitBadge): HabitBadgeRecord {
  return {
    ...row,
    _id: row.id ?? "",
    badgeId: row.badge_id ?? "",
    habitId: row.habit_id,
    naam: row.naam || "",
    emoji: row.emoji || "",
    beschrijving: row.beschrijving || "",
    xpBonus: row.xp_bonus || 0,
    behaaldOp: row.behaald_op || new Date().toISOString(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useHabits(datum?: string) {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const queryParams = { userId, datum: datum ?? new Date().toISOString().slice(0, 10) };
  
  const { data: allHabitsRaw, isLoading: loadingHabits } = useGetHabits({ userId }, { query: { enabled: !!userId } });
  const { data: statsRaw, isLoading: loadingStats } = useGetHabitsStats({ userId }, { query: { enabled: !!userId } });
  const { data: badgesRaw, isLoading: loadingBadges } = useGetHabitsBadges({ userId }, { query: { enabled: !!userId } });
  const { data: forDateRaw, isLoading: loadingForDate } = useGetHabitsForDate(queryParams, { query: { enabled: !!userId } });

  const allHabits = useMemo<HabitRecord[]>(() => (Array.isArray(allHabitsRaw?.data) ? allHabitsRaw.data as ModelHabit[] : []).map(toRecord), [allHabitsRaw]);
  const stats = statsRaw?.data as HabitStatsRecord | undefined;
  const badges = useMemo<HabitBadgeRecord[]>(() => (Array.isArray(badgesRaw?.data) ? badgesRaw.data as ModelHabitBadge[] : []).map(toBadge), [badgesRaw]);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const forDateData = forDateRaw?.data as any;
  const todayHabitsRaw = Array.isArray(forDateData?.habits) ? forDateData.habits : [];
  const todayHabits = useMemo<HabitWithLogRecord[]>(() => todayHabitsRaw.map(toWithLog), [todayHabitsRaw]);

  const level = useMemo(() => {
    if (!stats) return { level: 1, xp: 0, nextXP: 100, progress: 0, titel: "Beginner" };
    return getLevel(stats.totaal_xp || 0);
  }, [stats]);

  const todaySummary = useMemo(() => {
    const due = todayHabits.length;
    const completed = todayHabits.filter((h) =>
      h.log?.voltooid || (h.type === "negatief" && !h.log?.isIncident)
    ).length;
    return { due, completed, rate: due > 0 ? completed / due : 0 };
  }, [todayHabits]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["/habits"] });
  };

  return {
    todayHabits,
    todayDienst: null,
    habits: allHabits,
    stats,
    badges,
    level,
    todaySummary,
    isLoading: loadingHabits || loadingStats || loadingBadges || loadingForDate,

    create: async (data: HabitCreateData) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await postHabits(data as any, { userId });
      invalidateAll();
    },
    update: async (id: string, data: Partial<HabitCreateData>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await patchHabitsId(id, data as any);
      invalidateAll();
    },
    toggle: async (habitId: string, waarde?: number, notitie?: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await postHabitsIdToggle(habitId, { datum: queryParams.datum, waarde, notitie } as any, { userId });
      invalidateAll();
    },
    increment: async (habitId: string, stap: number) => {
      const habit = todayHabits.find((h: HabitWithLogRecord) => h.id === habitId);
      const currentVal = habit?.log?.waarde ?? 0;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await postHabitsIdToggle(habitId, { datum: queryParams.datum, waarde: currentVal + stap } as any, { userId });
      invalidateAll();
    },
    incident: async (habitId: string, trigger?: string, notitie?: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await postHabitsIdIncident(habitId, { trigger, notitie } as any, { userId });
      invalidateAll();
    },
    reorder: async (items: Array<{ id: string; volgorde: number }>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await postHabitsReorder({ items } as any);
      invalidateAll();
    },
    pause: async (id: string) => {
      await postHabitsIdPause(id);
      invalidateAll();
    },
    archive: async (id: string) => {
      await postHabitsIdArchive(id);
      invalidateAll();
    },
    remove: async (id: string) => {
      await deleteHabitsId(id);
      invalidateAll();
    },
  };
}
