"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useDevices } from "@/hooks/useDevices";
import { useHabits } from "@/hooks/useHabits";
import { useLoonstroken } from "@/hooks/useLoonstroken";
import type { NoteRecord } from "@/hooks/useNotes";
import { usePersonalEvents, getTimeLabel, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useSalary } from "@/hooks/useSalary";
import { useSchedule } from "@/hooks/useSchedule";
import { type FocusAttention, type NoteRow, focusApi, notesApi } from "@/lib/api";
import { normalizeTime, type DienstRow } from "@/lib/schedule";
import { calculateScheduleSalaryForecast } from "@/lib/salaryForecast";
import {
  formatCurrency,
  formatEventMeta,
  formatRelativeDateLabel,
  getDashboardDateInfo,
  type DashboardDateInfo,
} from "@/components/dashboard/DashboardUtils";

export type FocusTimelineKind = "dienst" | "afspraak";

export type FocusTimelineItem = {
  id: string;
  kind: FocusTimelineKind;
  title: string;
  subtitle: string;
  date: string;
  startTime: string;
  endTime?: string;
  timeLabel: string;
  href: string;
  status: "now" | "next" | "later";
  tone: "amber" | "blue" | "green" | "indigo" | "rose" | "slate";
};

export type FocusNoteItem = {
  id: string;
  title: string;
  meta: string;
  priority: string;
  href: string;
};

export type FocusHabitItem = {
  id: string;
  title: string;
  meta: string;
  done: boolean;
};

function getAmsterdamClock() {
  const now = new Date();
  return {
    epochMs: now.getTime(),
    iso: now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" }),
    time: new Intl.DateTimeFormat("nl-NL", {
      timeZone: "Europe/Amsterdam",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now),
  };
}

function addDaysIso(iso: string, days: number) {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

// normalizeTime pads single-digit hours (e.g. a "9:00" from an unpadded CSV
// import) before the key is used in string comparisons below — without it, a
// 09:00 shift stored as "9:00" would sort AFTER "09:00" lexicographically
// (since '9' > '0'), letting a currently-active shift fail the "now" check or
// vanish from the 3-day timeline window entirely. Reuses the same helper the
// rooster page already relies on for this exact reason (lib/schedule.ts).
function timelineKey(date: string, time = "00:00") {
  return `${date} ${normalizeTime(time, "00:00")}`;
}

function normalizeEndKey(date: string, startTime: string, endDate?: string, endTime?: string) {
  const start = timelineKey(date, startTime);
  let end = timelineKey(endDate || date, endTime || "23:59");
  if (end <= start) end = timelineKey(addDaysIso(date, 1), endTime || "23:59");
  return end;
}

function itemStatus(date: string, startTime: string, endDate?: string, endTime?: string) {
  const now = getAmsterdamClock();
  const nowKey = timelineKey(now.iso, now.time);
  const start = timelineKey(date, startTime);
  const end = normalizeEndKey(date, startTime, endDate, endTime);
  if (start <= nowKey && nowKey <= end) return "now";
  return "later";
}

function dienstToTimeline(dienst: DienstRow): FocusTimelineItem {
  const status = itemStatus(dienst.startDatum, dienst.startTijd, dienst.eindDatum, dienst.eindTijd);
  return {
    id: `dienst-${dienst.eventId}`,
    kind: "dienst",
    title: dienst.shiftType || dienst.titel || "Dienst",
    subtitle: [dienst.locatie, dienst.team].filter(Boolean).join(" · ") || dienst.titel || "Werkrooster",
    date: dienst.startDatum,
    startTime: dienst.startTijd,
    endTime: dienst.eindTijd,
    timeLabel: `${dienst.startTijd || "?"}-${dienst.eindTijd || "?"}`,
    href: "/rooster",
    status,
    tone: status === "now" ? "green" : dienst.shiftType === "Laat" ? "rose" : dienst.shiftType === "Vroeg" ? "amber" : "indigo",
  };
}

function eventToTimeline(event: PersonalEvent): FocusTimelineItem {
  const status = itemStatus(event.startDatum, event.startTijd || "00:00", event.eindDatum, event.eindTijd || "23:59");
  return {
    id: `event-${event.eventId}`,
    kind: "afspraak",
    title: event.titel,
    subtitle: event.businessContextTitle || event.locatie || event.kalender || "Agenda",
    date: event.startDatum,
    startTime: event.startTijd || "00:00",
    endTime: event.eindTijd,
    timeLabel: getTimeLabel(event),
    href: "/agenda",
    status,
    tone: status === "now" ? "green" : event.businessContextType?.startsWith("laventecare") ? "blue" : "slate",
  };
}

function compareTimeline(a: FocusTimelineItem, b: FocusTimelineItem) {
  return timelineKey(a.date, a.startTime).localeCompare(timelineKey(b.date, b.startTime)) || a.title.localeCompare(b.title);
}

function makeTimeline(diensten: DienstRow[], events: PersonalEvent[]) {
  const now = getAmsterdamClock();
  const nowKey = timelineKey(now.iso, now.time);
  const limitKey = timelineKey(addDaysIso(now.iso, 3), "23:59");
  const items = [
    ...diensten.map(dienstToTimeline),
    ...events.filter((event) => event.kalender !== "Rooster").map(eventToTimeline),
  ]
    .filter((item) => {
      const end = normalizeEndKey(item.date, item.startTime, item.date, item.endTime || "23:59");
      const start = timelineKey(item.date, item.startTime);
      return end >= nowKey && start <= limitKey;
    })
    .sort(compareTimeline);

  const firstFuture = items.find((item) => item.status !== "now");
  return items.map((item) => (item.id === firstFuture?.id ? { ...item, status: "next" as const } : item));
}

function titleFromNote(note: NoteRecord) {
  return (note.titel || note.inhoud.split("\n")[0] || "Naamloze notitie").trim();
}

/**
 * R3-18: summary mode blanks `inhoud`, so an untitled note used to show
 * "Naamloze notitie" on the kiosk. The backend now returns a `preview` (first
 * ~80 chars) on the summary row — surface it as the note's first line. Defensive:
 * falls back to whatever `inhoud` carried when `preview` is absent.
 */
function previewFromRow(row: NoteRow): string {
  const preview = (row as NoteRow & { preview?: unknown }).preview;
  if (typeof preview === "string" && preview.trim()) return preview;
  return row.inhoud ?? "";
}

// De kiosk haalt notities via `fields=summary` + `limit` (M-G) i.p.v. het
// volledige corpus; deze mapper vult het NoteRecord-vormpje dat noteScore/
// makeFocusNotes verwachten (triage_flag reist mee via de spread).
function summaryRowToNote(row: NoteRow): NoteRecord {
  return {
    ...row,
    id: row.id ?? "",
    user_id: row.user_id ?? "",
    inhoud: previewFromRow(row),
    tags: row.tags ?? [],
    isPinned: row.is_pinned ?? false,
    isArchived: row.is_archived ?? false,
    isCompleted: row.is_completed ?? false,
    is_pinned: row.is_pinned ?? false,
    is_archived: row.is_archived ?? false,
    is_completed: row.is_completed ?? false,
    linkedEventId: row.linked_event_id,
    businessContextTitle: row.business_context_title ?? null,
    aangemaakt: row.aangemaakt ?? "",
    gewijzigd: row.gewijzigd ?? "",
  };
}

function noteScore(note: NoteRecord, todayIso?: string) {
  const priority = (note.prioriteit || "").toLowerCase();
  const triage = Boolean((note as NoteRecord & { triage_flag?: boolean }).triage_flag);
  let score = 0;
  if (note.isPinned || note.is_pinned) score += 50;
  if (priority === "hoog") score += 40;
  if (triage) score += 30;
  if (note.deadline && todayIso) {
    if (note.deadline.slice(0, 10) < todayIso) score += 60;
    if (note.deadline.slice(0, 10) === todayIso) score += 45;
  }
  return score;
}

function makeFocusNotes(notes: NoteRecord[], todayIso?: string): FocusNoteItem[] {
  return [...notes]
    .filter((note) => noteScore(note, todayIso) > 0)
    .sort((a, b) => noteScore(b, todayIso) - noteScore(a, todayIso) || b.gewijzigd.localeCompare(a.gewijzigd))
    .slice(0, 4)
    .map((note) => {
      const deadline = note.deadline ? formatRelativeDateLabel(note.deadline.slice(0, 10), todayIso) : null;
      return {
        id: note.id,
        title: titleFromNote(note),
        meta: [note.businessContextTitle, deadline, note.tags?.slice(0, 2).map((tag) => `#${tag}`).join(" ")].filter(Boolean).join(" · ") || "Actieve notitie",
        priority: note.prioriteit || "normaal",
        href: "/notities",
      };
    });
}

function makeHabitItems(todayHabits: ReturnType<typeof useHabits>["todayHabits"]): FocusHabitItem[] {
  return todayHabits.slice(0, 5).map((habit) => {
    const done = Boolean(habit.log?.voltooid || (habit.type === "negatief" && !habit.log?.isIncident));
    return {
      id: habit.id,
      title: `${habit.emoji ? `${habit.emoji} ` : ""}${habit.naam}`,
      meta: done ? "Afgerond" : habit.doelTijd ? `Doel ${habit.doelTijd}` : habit.roosterFilter || "Vandaag",
      done,
    };
  });
}

// Conflicts have no backend equivalent, so stay local. A "pending sync" item is
// deliberately NOT generated here — the backend's buildFocusAttention already
// emits one ("personal-pending") from the identical personal_events pending-
// status count, and since uniqueAttention() only dedups by exact id, a second,
// differently-worded local item for the same condition used to double up as
// two attention cards for one real fact.
function localAttention(conflictCount: number): FocusAttention[] {
  const items: FocusAttention[] = [];
  if (conflictCount > 0) {
    items.push({
      id: "local-agenda-conflicts",
      domain: "agenda",
      severity: "high",
      title: "Agenda conflicten",
      detail: `${conflictCount} afspraak/afspraken vragen aandacht`,
      href: "/agenda",
    });
  }
  return items;
}

function uniqueAttention(items: FocusAttention[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, 8);
}

export function useFocusData() {
  const { user, isLoaded } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const [dateInfo, setDateInfo] = useState<DashboardDateInfo | null>(null);
  const [clock, setClock] = useState<{ epochMs: number; iso: string; time: string } | null>(null);

  useEffect(() => {
    const update = () => {
      setDateInfo(getDashboardDateInfo());
      setClock(getAmsterdamClock());
    };
    update();
    // Align the tick to the minute boundary (F2): a plain 60s interval started
    // mid-minute makes the kiosk clock lag up to 59s behind the wall clock.
    let interval: number | undefined;
    const timeout = window.setTimeout(() => {
      update();
      interval = window.setInterval(update, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  const { data: devices = [], isLoading: devicesLoading } = useDevices();
  const schedule = useSchedule();
  const personal = usePersonalEvents({ diensten: schedule.diensten });
  const habits = useHabits(dateInfo?.todayIso);
  const salary = useSalary();
  const loonstroken = useLoonstroken();
  const financePrivacy = usePrivacy("finance");

  // M-G: eigen lichtgewicht notitiequery (limit + fields=summary) i.p.v.
  // useNotes' volledige corpus — de 2-minuten-poll hertrok anders elke keer
  // alle notitie-inhoud op een 24/7 kiosk.
  const notesQuery = useQuery({
    queryKey: ["focus-notes-summary", userId],
    queryFn: () => notesApi.listSummary(userId, 100),
    enabled: isLoaded && !!userId,
    staleTime: 60_000,
  });
  const summaryNotes = useMemo<NoteRecord[]>(
    () => (Array.isArray(notesQuery.data) ? notesQuery.data.map(summaryRowToNote) : []),
    [notesQuery.data],
  );
  const activeNotes = useMemo(
    () => summaryNotes.filter((note) => !note.isArchived && !note.isCompleted),
    [summaryNotes],
  );

  const summaryQuery = useQuery({
    queryKey: ["focus-summary", userId],
    queryFn: () => focusApi.summary(userId),
    enabled: isLoaded,
    // Enige 30s-poll voor de summary — het handmatige interval hieronder
    // dedupliceerde vroeger niet en pollde dubbel (2×/30s, M-G).
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
    staleTime: 15_000,
  });
  const refetchSchedule = schedule.refetch;
  const refetchPersonal = personal.refetch;
  const refetchNotesSummary = notesQuery.refetch;

  useEffect(() => {
    if (!isLoaded) return;
    const fast = window.setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ["devices"] });
    }, 30_000);
    const medium = window.setInterval(() => {
      void refetchSchedule();
      void refetchPersonal();
      void refetchNotesSummary();
      void queryClient.invalidateQueries({ queryKey: ["/habits"] });
      void queryClient.invalidateQueries({ queryKey: ["/habits/for-date"] });
      void queryClient.invalidateQueries({ queryKey: ["/habits/stats"] });
    }, 120_000);
    return () => {
      window.clearInterval(fast);
      window.clearInterval(medium);
    };
  }, [isLoaded, queryClient, refetchNotesSummary, refetchPersonal, refetchSchedule]);

  const timeline = useMemo(
    () => makeTimeline(schedule.upcoming.slice(0, 12), personal.upcoming.slice(0, 16)),
    // `clock` staat er expliciet in: makeTimeline leest de wandklok intern, dus
    // de minuut-tick moet het venster/nu-status laten herberekenen — ook als
    // useSchedule.upcoming ooit gememoized raakt (low).
    [personal.upcoming, schedule.upcoming, clock], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const nowItem = timeline.find((item) => item.status === "now") ?? null;
  const nextItem = nowItem ?? timeline.find((item) => item.status === "next") ?? timeline[0] ?? null;
  const focusNotes = useMemo(() => makeFocusNotes(activeNotes, dateInfo?.todayIso), [dateInfo?.todayIso, activeNotes]);
  const habitItems = useMemo(() => makeHabitItems(habits.todayHabits), [habits.todayHabits]);

  const salaryForecast = useMemo(
    () =>
      calculateScheduleSalaryForecast(schedule.diensten, dateInfo?.period, {
        salaryRecords: salary.huidig ? [salary.huidig] : [],
        loonstroken: loonstroken.records,
      }),
    [dateInfo?.period, loonstroken.records, salary.huidig, schedule.diensten],
  );

  const netValue = dateInfo ? loonstroken.byPeriode.get(dateInfo.period)?.netto ?? salary.huidig?.nettoPrognose ?? salaryForecast?.nettoPrognose : undefined;
  const netLabel = financePrivacy.mask(formatCurrency(netValue));

  const attention = useMemo(
    () =>
      uniqueAttention([
        ...localAttention(personal.withConflicts.length),
        ...(summaryQuery.data?.attention ?? []),
      ]),
    [personal.withConflicts.length, summaryQuery.data?.attention],
  );

  const onlineDevices = devices.filter((device) => device.status === "online").length;
  const onDevices = devices.filter((device) => device.current_state?.on).length;

  return {
    userId,
    dateInfo,
    clock,
    summary: summaryQuery.data,
    attention,
    timeline,
    nowItem,
    nextItem,
    focusNotes,
    habitItems,
    devices: {
      total: summaryQuery.data?.health.devicesTotal ?? devices.length,
      online: summaryQuery.data?.health.devicesOnline ?? onlineDevices,
      on: summaryQuery.data?.health.devicesOn ?? onDevices,
      // The backend deliberately derives bridge liveness from a dedicated
      // heartbeat, NOT per-device status (which only updates via sporadic UDP
      // posts and stays stale while the bridge is actively polling — see the
      // comment on FocusHandler.focusHealth). Falling back to "any device
      // reports online" here would reintroduce that exact stale signal, so
      // default to false (not live) rather than guess while data is loading.
      bridgeOnline: summaryQuery.data?.health.bridgeOnline ?? false,
    },
    schedule: {
      nextDienst: schedule.nextDienst,
      upcomingCount: schedule.upcoming.length,
      isLoading: schedule.isLoading,
    },
    personal: {
      nextAppointment: personal.nextAppointment,
      upcomingCount: personal.upcoming.length,
      conflicts: personal.withConflicts.length,
      pending: personal.pending.length,
      isLoading: personal.isLoading,
    },
    habits: {
      due: habits.todaySummary.due,
      completed: habits.todaySummary.completed,
      rate: habits.todaySummary.rate,
      isLoading: habits.isLoading,
    },
    notes: {
      active: activeNotes.length,
      pinned: activeNotes.filter((note) => note.isPinned).length,
      isLoading: notesQuery.isLoading,
    },
    finance: {
      value: netLabel,
      hidden: financePrivacy.hidden,
      // Same shared "finance" privacy scope as the eye-toggles on the other
      // pages — the kiosk gets its own toggle instead of a Settings-only mask.
      togglePrivacy: financePrivacy.toggle,
      meta: salaryForecast ? `${salaryForecast.aantalDiensten} diensten · ${salaryForecast.totaalUren}u rooster` : "Geen maandprognose",
    },
    business: summaryQuery.data?.business,
    generatedAt: summaryQuery.data?.generatedAt,
    sync: summaryQuery.data?.sync,
    // On an unattended 24/7 kiosk, a sustained backend outage must look
    // different from an ordinary loading flicker - surface this so panels can
    // show a distinct error state instead of being stuck on "Laden" forever.
    summaryError: summaryQuery.isError,
    isLoading:
      !dateInfo ||
      summaryQuery.isLoading ||
      devicesLoading ||
      schedule.isLoading ||
      personal.isLoading ||
      notesQuery.isLoading ||
      habits.isLoading,
  };
}

export function formatTimelineMeta(item: FocusTimelineItem | null, todayIso?: string) {
  if (!item) return "Geen geplande items";
  return `${formatRelativeDateLabel(item.date, todayIso)} · ${item.timeLabel}`;
}

export function formatNextAppointmentMeta(event: PersonalEvent | null, todayIso?: string) {
  return formatEventMeta(event, todayIso);
}
