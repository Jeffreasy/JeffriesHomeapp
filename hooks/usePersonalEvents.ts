"use client";

import { useMemo } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { type DienstRow } from "@/lib/schedule";
import { analyzeConflicts, type ConflictInfo } from "@/lib/conflictDetection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalEvent {
  _id:               string;
  userId:            string;
  eventId:           string;
  titel:             string;
  startDatum:        string;         // "YYYY-MM-DD"
  startTijd?:        string;         // "HH:MM" — undefined bij hele-dag
  eindDatum:         string;
  eindTijd?:         string;
  heledag:           boolean;
  locatie?:          string;
  beschrijving?:     string;
  status:            "Aankomend" | "Voorbij" | "VERWIJDERD" | string;
  kalender:          string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Geeft weergave-eindatum terug voor hele-dag events (Google slaat +1 dag op). */
export function getDisplayEndDate(event: PersonalEvent): string {
  if (!event.heledag) return event.eindDatum || event.startDatum;
  const raw = event.eindDatum;
  if (!raw || raw.length < 10) return event.startDatum; // fallback
  const d = new Date(raw + "T12:00:00");
  if (isNaN(d.getTime())) return event.startDatum;
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Geeft een leesbare tijd/label terug. */
export function getTimeLabel(event: PersonalEvent): string {
  if (event.heledag) return "Hele dag";
  if (event.startTijd && event.eindTijd) return `${event.startTijd}\u2013${event.eindTijd}`;
  if (event.startTijd) return event.startTijd;
  return "Hele dag";
}

/** True als startDatum !== eindDatum (na correctie voor hele-dag). */
export function isMultiDay(event: PersonalEvent): boolean {
  if (!event.startDatum || !event.eindDatum) return false;
  return event.startDatum !== getDisplayEndDate(event);
}

/** Formatteert zoiets als "22 mrt" of "22 mrt – 12 mei". */
export function formatDateRange(event: PersonalEvent, locale = "nl-NL"): string {
  const fmt = (d: string): string => {
    if (!d || d.length < 10) return "?";
    const dt = new Date(d + "T12:00:00");
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString(locale, { day: "numeric", month: "short" });
  };
  const start = fmt(event.startDatum);
  const end   = fmt(getDisplayEndDate(event));
  return isMultiDay(event) ? `${start} \u2013 ${end}` : start;
}

function normalizeText(value?: string): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isShiftLikeTitle(title: string): boolean {
  return /\b(vroeg|laat|dienst)\b/.test(normalizeText(title));
}

function isRosterShadowTitle(title: string): boolean {
  return /^[ar]\s+(vroeg|laat|dienst)$/.test(normalizeText(title));
}

function isScheduleDuplicateEvent(event: PersonalEvent, diensten: DienstRow[]): boolean {
  if (isRosterShadowTitle(event.titel)) return true;
  if (event.heledag || !event.startTijd || !event.eindTijd) return false;
  if (!isShiftLikeTitle(event.titel)) return false;

  const title = normalizeText(event.titel);
  return diensten.some((dienst) => {
    const sameSlot =
      dienst.startDatum === event.startDatum &&
      dienst.startTijd === event.startTijd &&
      dienst.eindTijd === event.eindTijd;
    if (!sameSlot) return false;

    const shift = normalizeText(dienst.shiftType);
    const team = normalizeText(dienst.team);
    const teamShift = normalizeText(`${dienst.team} ${dienst.shiftType}`);
    const plainShiftTitles = new Set(["dienst", "vroeg", "laat"]);

    return (
      title === teamShift ||
      title === normalizeText(`${team} ${shift}`) ||
      title === shift ||
      plainShiftTitles.has(title) ||
      (Boolean(team) && title.includes(team) && title.includes(shift))
    );
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePersonalEvents(options?: { diensten?: DienstRow[] }) {
  const { user } = useUser();
  const userId   = user?.id ?? "";

  const events = useQuery(
    api.personalEvents.list,
    userId ? { userId } : "skip"
  ) as PersonalEvent[] | undefined;

  const visibleEvents = useMemo(
    () => (events ?? []).filter((e) => !isScheduleDuplicateEvent(e, options?.diensten ?? [])),
    [events, options?.diensten]
  );

  const upcoming = useMemo(
    () => visibleEvents.filter((e) => e.status === "Aankomend"),
    [visibleEvents]
  );

  const pending = useMemo(
    () => visibleEvents.filter((e) => e.status === "PendingCreate"),
    [visibleEvents]
  );

  const history = useMemo(
    () => visibleEvents.filter((e) => e.status === "Voorbij"),
    [visibleEvents]
  );

  const conflictMap = useMemo(
    () => {
      if (!options?.diensten?.length) return new Map<string, ConflictInfo>();
      return analyzeConflicts(upcoming, options.diensten);
    },
    [upcoming, options?.diensten]
  );

  const withConflicts = useMemo(
    () => upcoming.filter((e) => conflictMap.has(e.eventId)),
    [upcoming, conflictMap]
  );

  // O(1) date lookup for components that render per-day
  const eventsByDate = useMemo(() => {
    const map: Record<string, PersonalEvent[]> = {};
    for (const e of upcoming) {
      (map[e.startDatum] ??= []).push(e);
    }
    return map;
  }, [upcoming]);

  const nextAppointment = upcoming[0] ?? null;

  return {
    events:          visibleEvents,
    upcoming,
    pending,
    history,
    withConflicts,
    conflictMap,
    eventsByDate,
    nextAppointment,
    isLoading:       events === undefined,
  };
}
