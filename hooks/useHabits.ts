"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { getLevel } from "@/lib/habit-constants";
import { useToast } from "@/components/ui/Toast";

import {
  useGetHabits,
  useGetHabitsForDate,
  useGetHabitsStats,
  useGetHabitsBadges,
  getGetHabitsForDateQueryKey,
  postHabits,
  patchHabitsId,
  postHabitsIdToggle,
  postHabitsIdIncident,
  postHabitsReorder,
  postHabitsIdPause,
  postHabitsIdArchive,
  deleteHabitsId,
} from "@/lib/api/generated/habits/habits";
import { ApiError, habitsApi } from "@/lib/api";

import type { ModelHabit, ModelHabitBadge } from "@/lib/api/model";
import { todayStr } from "@/components/habits/HabitsUtils";


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
  /**
   * Completions in the current ISO week / calendar month (Amsterdam) — only
   * present for x_per_week / x_per_maand habits (N5, for-date payload).
   */
  periodVoltooidCount?: number;
}
export type HabitWithLog = HabitWithLogRecord;

/** Weekly/monthly habits are period-based: toggleable any day, satisfied per period. */
export function isPeriodHabit(habit: Pick<HabitRecord, "frequentie">): boolean {
  return habit.frequentie === "x_per_week" || habit.frequentie === "x_per_maand";
}

/** True when a weekly/monthly habit already met its period target (N5). */
export function isPeriodSatisfied(
  habit: Pick<HabitWithLogRecord, "frequentie" | "doelAantal" | "doel_aantal" | "periodVoltooidCount">,
): boolean {
  if (!isPeriodHabit(habit)) return false;
  const target = habit.doelAantal ?? habit.doel_aantal ?? 0;
  return target > 0 && (habit.periodVoltooidCount ?? 0) >= target;
}

export interface HabitStatsRecord {
  totaal_xp?: number;
  totaalXP?: number;
  activeHabits?: number;
  totaalVoltooid?: number;
  perfectDays?: number;
  currentStreak?: number;
  longestStreak?: number;
  [key: string]: unknown;
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
  frequentie:
    | "dagelijks"
    | "weekdagen"
    | "weekenddagen"
    | "aangepast"
    | "x_per_week"
    | "x_per_maand";
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

type HabitLogApiRow = {
  id?: string;
  voltooid?: boolean;
  waarde?: number | null;
  is_incident?: boolean;
  trigger_cat?: string | null;
  notitie?: string | null;
  xp_verdiend?: number;
};

type HabitWithLogApiRow = ModelHabit & {
  log?: HabitLogApiRow | null;
  /** Completions this ISO week / month for x_per_week / x_per_maand habits (N5). */
  period_voltooid_count?: number;
};

function toLogEntry(log: HabitLogApiRow): HabitLogEntry {
  return {
    _id: log.id ?? "",
    voltooid: log.voltooid ?? false,
    waarde: log.waarde,
    isIncident: log.is_incident ?? false,
    trigger: log.trigger_cat,
    notitie: log.notitie,
    xpVerdiend: log.xp_verdiend ?? 0,
  };
}

function toWithLog(wl: HabitWithLogApiRow): HabitWithLogRecord {
  return {
    ...toRecord(wl as ModelHabit),
    log: wl.log ? toLogEntry(wl.log) : null,
    periodVoltooidCount:
      typeof wl.period_voltooid_count === "number"
        ? wl.period_voltooid_count
        : undefined,
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

function numberFrom(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toStats(data: unknown): HabitStatsRecord | undefined {
  if (!data || typeof data !== "object") return undefined;
  const row = data as Record<string, unknown>;
  const totalXP = numberFrom(row.totaal_xp ?? row.totaalXP);

  return {
    ...row,
    totaal_xp: totalXP,
    totaalXP: totalXP,
    activeHabits: numberFrom(row.activeHabits),
    totaalVoltooid: numberFrom(row.totaalVoltooid),
    perfectDays: numberFrom(row.perfectDays),
    currentStreak: numberFrom(row.currentStreak),
    longestStreak: numberFrom(row.longestStreak),
  };
}

const HABIT_QUERY_KEYS = [
  ["/habits"],
  ["/habits/for-date"],
  ["/habits/stats"],
  ["/habits/badges"],
  ["/habits/heatmap"],
] as const;

function toApiPayload(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );
}

function toHabitPayload(data: Partial<HabitCreateData>): ModelHabit {
  return toApiPayload({
    naam: data.naam,
    emoji: data.emoji,
    type: data.type,
    beschrijving: data.beschrijving,
    frequentie: data.frequentie,
    aangepaste_dagen: data.aangepaste_dagen ?? data.aangepasteDagen,
    doel_aantal: data.doel_aantal ?? data.doelAantal,
    rooster_filter: data.rooster_filter ?? data.roosterFilter,
    is_kwantitatief: data.is_kwantitatief ?? data.isKwantitatief,
    doel_waarde: data.doel_waarde ?? data.doelWaarde,
    eenheid: data.eenheid,
    doel_tijd: data.doel_tijd ?? data.doelTijd,
    moeilijkheid: data.moeilijkheid,
    financie_categorie: data.financie_categorie ?? data.financieCategorie,
    kleur: data.kleur,
  }) as ModelHabit;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Streak milestones that earn a celebratory toast after a completing toggle. */
const STREAK_MILESTONES = [7, 30, 100];

export function useHabits(datum?: string) {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  // N4: the effective default "vandaag" must roll over at midnight — a frozen
  // `todayStr()` from mount made DailyChecklist (home), HabitStats and
  // BadgeShowcase write check-offs to yesterday in a PWA left open overnight.
  // Reactive: minute tick + visibilitychange, only when no explicit `datum`.
  const [internalToday, setInternalToday] = useState(() => todayStr());
  useEffect(() => {
    if (datum) return;
    const update = () =>
      setInternalToday((prev) => {
        const next = todayStr();
        return next === prev ? prev : next;
      });
    update();
    const interval = window.setInterval(update, 60_000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [datum]);

  const queryParams = useMemo(
    () => ({ userId, datum: datum ?? internalToday }),
    [userId, datum, internalToday],
  );


  const {
    data: allHabitsRaw,
    isLoading: loadingHabits,
    isError: errorHabits,
  } = useGetHabits(
    { userId },
    { query: { enabled: !!userId } },
  );
  const {
    data: statsRaw,
    isLoading: loadingStats,
    isError: errorStats,
  } = useGetHabitsStats(
    { userId },
    { query: { enabled: !!userId } },
  );
  const {
    data: badgesRaw,
    isLoading: loadingBadges,
    isError: errorBadges,
  } = useGetHabitsBadges(
    { userId },
    { query: { enabled: !!userId } },
  );
  const {
    data: forDateRaw,
    isLoading: loadingForDate,
    isError: errorForDate,
  } = useGetHabitsForDate(
    queryParams,
    { query: { enabled: !!userId } },
  );

  const allHabits = useMemo<HabitRecord[]>(
    () =>
      (Array.isArray(allHabitsRaw?.data)
        ? (allHabitsRaw.data as ModelHabit[])
        : []
      ).map(toRecord),
    [allHabitsRaw],
  );
  const stats = useMemo(() => toStats(statsRaw?.data), [statsRaw]);
  const badges = useMemo<HabitBadgeRecord[]>(
    () =>
      (Array.isArray(badgesRaw?.data)
        ? (badgesRaw.data as ModelHabitBadge[])
        : []
      ).map(toBadge),
    [badgesRaw],
  );

  const todayHabits = useMemo<HabitWithLogRecord[]>(() => {
    const forDateData = forDateRaw?.data as
      | { habits?: HabitWithLogApiRow[] }
      | undefined;
    return Array.isArray(forDateData?.habits)
      ? forDateData.habits.map(toWithLog)
      : [];
  }, [forDateRaw]);

  const level = useMemo(() => {
    if (!stats)
      return { level: 1, xp: 0, nextXP: 100, progress: 0, titel: "Beginner" };
    return getLevel(stats.totaal_xp || 0);
  }, [stats]);

  const todaySummary = useMemo(() => {
    // N5: a weekly/monthly habit that already met its period target but wasn't
    // completed today no longer counts as "open vandaag" — it neither presses
    // the day percentage down nor inflates it.
    const counted = todayHabits.filter(
      (h) => !(isPeriodSatisfied(h) && !h.log?.voltooid),
    );
    const due = counted.length;
    const completed = counted.filter(
      (h) => h.log?.voltooid || (h.type === "negatief" && !h.log?.isIncident),
    ).length;
    return { due, completed, rate: due > 0 ? completed / due : 0 };
  }, [todayHabits]);

  const { error: toastError, success: toastSuccess } = useToast();
  // Polite live-region text describing the latest optimistic toggle/increment
  // result — rendered as an sr-only region by consumers (a11y low).
  const [announcement, setAnnouncement] = useState("");
  // Per-habit in-flight tracking: a pending action on habit A must never block
  // (or silently drop) a tap on habit B — cards disable only their own habit.
  const [pendingHabitIds, setPendingHabitIds] = useState<ReadonlySet<string>>(
    () => new Set<string>(),
  );

  const invalidateAll = () => {
    for (const queryKey of HABIT_QUERY_KEYS) {
      queryClient.invalidateQueries({ queryKey });
    }
  };

  // Per-habit in-flight guard + error toast. Prevents the double/triple-tap
  // duplicate-toggle bug for the SAME habit while leaving other habits tappable,
  // and surfaces failures instead of silently leaving the tick unchanged.
  // Returns true on success so callers (e.g. incident-undo) can react.
  const runHabitAction = async (
    habitId: string,
    action: () => Promise<void>,
    errorMessage: string,
  ): Promise<boolean> => {
    if (pendingHabitIds.has(habitId)) return false;
    setPendingHabitIds((prev) => new Set(prev).add(habitId));
    try {
      await action();
      return true;
    } catch (err) {
      // 409's dragen een betekenisvolle Nederlandse melding uit de backend
      // ("Er is al een incident gelogd op deze dag.", gearchiveerd/gepauzeerd).
      toastError(
        err instanceof ApiError && err.status === 409 && err.message
          ? err.message
          : errorMessage,
      );
      return false;
    } finally {
      setPendingHabitIds((prev) => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  };

  // ── Optimistic cache patching (M4) ─────────────────────────────────────────
  // Check-off should feel instant: patch the /habits/for-date cache before the
  // POST, roll back to the snapshot on error, and reconcile via invalidation
  // afterwards (same pattern as the notes mutation layer in hooks/useNotes.ts).
  type ForDateCache = {
    data?: { habits?: HabitWithLogApiRow[] };
    status?: number;
  };
  const forDateQueryKey = getGetHabitsForDateQueryKey(queryParams);

  const patchForDateLog = (
    habitId: string,
    patch: (log: HabitLogApiRow | null, habit: HabitWithLogApiRow) => HabitLogApiRow,
  ) => {
    queryClient.setQueryData<ForDateCache>(forDateQueryKey, (old) => {
      if (!old?.data?.habits) return old;
      return {
        ...old,
        data: {
          ...old.data,
          habits: old.data.habits.map((habit) =>
            habit.id === habitId
              ? { ...habit, log: patch(habit.log ?? null, habit) }
              : habit,
          ),
        },
      };
    });
  };

  const runOptimisticHabitAction = async (
    habitId: string,
    applyOptimistic: () => void,
    action: () => Promise<void>,
    errorMessage: string,
  ): Promise<boolean> => {
    if (pendingHabitIds.has(habitId)) return false;
    setPendingHabitIds((prev) => new Set(prev).add(habitId));
    await queryClient.cancelQueries({ queryKey: forDateQueryKey });
    const snapshot = queryClient.getQueryData<ForDateCache>(forDateQueryKey);
    applyOptimistic();
    try {
      await action();
      return true;
    } catch (err) {
      if (snapshot !== undefined) {
        queryClient.setQueryData(forDateQueryKey, snapshot);
      }
      toastError(
        err instanceof ApiError && err.status === 409 && err.message
          ? err.message
          : errorMessage,
      );
      return false;
    } finally {
      setPendingHabitIds((prev) => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
      // onSettled: reconcile streaks/XP/stats with the server truth.
      invalidateAll();
    }
  };

  // Streak-milestone feedback (low): a completing toggle for TODAY that pushes
  // the streak exactly onto 7/30/100 earns a celebratory toast. Derived from
  // the pre-toggle streak (+1) — deterministic for a same-day completion.
  const maybeCelebrateStreak = (
    habit: HabitWithLogRecord | undefined,
    becameVoltooid: boolean,
  ) => {
    if (!becameVoltooid || !habit) return;
    if (queryParams.datum !== todayStr()) return;
    const reached = (habit.huidigeStreak ?? 0) + 1;
    if (STREAK_MILESTONES.includes(reached)) {
      toastSuccess(`🔥 ${reached} dagen streak!`);
    }
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
    /** Combined error flag across the habits queries (home-dashboard consumes this). */
    isError: errorHabits || errorStats || errorBadges || errorForDate,
    pendingHabitIds,
    /** Latest optimistic toggle result, for a polite aria-live region. */
    announcement,
    /** The Amsterdam "YYYY-MM-DD" this hook instance reads/writes logs for. */
    datum: queryParams.datum,

    create: async (data: HabitCreateData) => {
      await postHabits(toHabitPayload(data), { userId });
      invalidateAll();
    },
    update: async (id: string, data: Partial<HabitCreateData>) => {
      await patchHabitsId(id, toHabitPayload(data) as Record<string, unknown>);
      invalidateAll();
    },
    toggle: async (habitId: string, waarde?: number, notitie?: string) => {
      const habit = todayHabits.find((h) => h.id === habitId);
      // R1: send the intended state explicitly — the backend now accepts
      // `voltooid: false` to un-complete, so "Heropenen" is a real flip and the
      // optimistic patch below is honest instead of a snap-back lie.
      const nextVoltooid = !(habit?.log?.voltooid ?? false);
      const naam = habit?.naam ?? "Habit";
      const ok = await runOptimisticHabitAction(
        habitId,
        () => {
          patchForDateLog(habitId, (log) => ({
            ...(log ?? {}),
            voltooid: nextVoltooid,
            waarde: waarde ?? log?.waarde,
          }));
          setAnnouncement(`${naam} ${nextVoltooid ? "voltooid" : "heropend"}`);
        },
        async () => {
          await postHabitsIdToggle(
            habitId,
            toApiPayload({
              datum: queryParams.datum,
              voltooid: nextVoltooid,
              waarde,
              notitie,
            }),
            { userId },
          );
        },
        "Habit bijwerken is mislukt",
      );
      if (ok) maybeCelebrateStreak(habit, nextVoltooid);
      return ok;
    },
    increment: async (habitId: string, stap: number) => {
      const habit = todayHabits.find((h) => h.id === habitId);
      const doel = habit?.doelWaarde ?? null;
      const currentVal = habit?.log?.waarde ?? 0;
      // R5: clamp in the REQUEST too — the optimistic patch already clamped on
      // 0, but the unclamped value went to the server ("-2/8" after refetch).
      const nextWaarde = Math.max(0, currentVal + stap);
      const wasVoltooid = habit?.log?.voltooid ?? false;
      const nextVoltooid = doel != null ? nextWaarde >= doel : wasVoltooid;
      const naam = habit?.naam ?? "Habit";
      const ok = await runOptimisticHabitAction(
        habitId,
        () => {
          patchForDateLog(habitId, (log) => ({
            ...(log ?? {}),
            waarde: nextWaarde,
            voltooid: nextVoltooid,
          }));
          setAnnouncement(
            doel != null
              ? `${naam}: ${nextWaarde} van ${doel}${nextVoltooid ? " — doel behaald" : ""}`
              : `${naam}: ${nextWaarde}`,
          );
        },
        async () => {
          await postHabitsIdToggle(
            habitId,
            toApiPayload({
              datum: queryParams.datum,
              waarde: nextWaarde,
              voltooid: nextVoltooid,
            }),
            { userId },
          );
        },
        "Habit bijwerken is mislukt",
      );
      if (ok) maybeCelebrateStreak(habit, nextVoltooid && !wasVoltooid);
      return ok;
    },
    incident: (habitId: string, trigger?: string, notitie?: string) =>
      runHabitAction(
        habitId,
        async () => {
          // Send the SELECTED date — logging an incident while viewing
          // yesterday must not silently write to today (M5/H4). Backend
          // accepts an optional `datum` (Amsterdam, max 30 days back).
          await postHabitsIdIncident(
            habitId,
            toApiPayload({ datum: queryParams.datum, trigger, notitie }),
            { userId },
          );
          invalidateAll();
        },
        "Incident registreren is mislukt",
      ),
    removeIncident: (habitId: string, datum?: string) =>
      runHabitAction(
        habitId,
        async () => {
          await habitsApi.deleteIncident(habitId, userId, datum ?? queryParams.datum);
          invalidateAll();
        },
        "Incident verwijderen is mislukt",
      ),
    reorder: async (items: Array<{ id: string; volgorde: number }>) => {
      await postHabitsReorder({ items });
      invalidateAll();
    },
    pause: (id: string) =>
      runHabitAction(
        id,
        async () => {
          await postHabitsIdPause(id);
          invalidateAll();
        },
        "Pauzeren is mislukt",
      ),
    archive: (id: string) =>
      runHabitAction(
        id,
        async () => {
          await postHabitsIdArchive(id);
          invalidateAll();
        },
        "Archiveren is mislukt",
      ),
    remove: async (id: string) => {
      await deleteHabitsId(id);
      invalidateAll();
    },
  };
}
