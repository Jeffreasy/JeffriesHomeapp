"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { personalEventsApi, type PersonalEventRow } from "@/lib/api";
import { type DienstRow } from "@/lib/schedule";
import { analyzeConflicts, type ConflictInfo } from "@/lib/conflictDetection";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PersonalEvent {
  _id:               string;
  userId:            string;
  eventId:           string;
  titel:             string;
  startDatum:        string;
  startTijd?:        string;
  eindDatum:         string;
  eindTijd?:         string;
  heledag:           boolean;
  locatie?:          string;
  beschrijving?:     string;
  status:            "Aankomend" | "Voorbij" | "VERWIJDERD" | string;
  kalender:          string;
}

function fromRow(r: PersonalEventRow): PersonalEvent {
  return {
    _id:          r.id ?? "",
    userId:       r.user_id,
    eventId:      r.event_id,
    titel:        r.titel,
    startDatum:   r.start_datum,
    startTijd:    r.start_tijd ?? undefined,
    eindDatum:    r.eind_datum,
    eindTijd:     r.eind_tijd ?? undefined,
    heledag:      r.heledag,
    locatie:      r.locatie ?? undefined,
    beschrijving: r.beschrijving ?? undefined,
    status:       r.status,
    kalender:     r.kalender,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDisplayEndDate(event: PersonalEvent): string {
  if (!event.heledag) return event.eindDatum || event.startDatum;
  const raw = event.eindDatum;
  if (!raw || raw.length < 10) return event.startDatum;
  const d = new Date(raw + "T12:00:00");
  if (isNaN(d.getTime())) return event.startDatum;
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function getTimeLabel(event: PersonalEvent): string {
  if (event.heledag) return "Hele dag";
  if (event.startTijd && event.eindTijd) return `${event.startTijd}\u2013${event.eindTijd}`;
  if (event.startTijd) return event.startTijd;
  return "Hele dag";
}

export function isMultiDay(event: PersonalEvent): boolean {
  if (!event.startDatum || !event.eindDatum) return false;
  return event.startDatum !== getDisplayEndDate(event);
}

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
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
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

// ─── Hook (Go API) ───────────────────────────────────────────────────────────

export function usePersonalEvents(options?: { diensten?: DienstRow[] }) {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const [raw, setRaw] = useState<PersonalEventRow[] | undefined>(undefined);

  const reload = useCallback(() => {
    if (!userId) return;
    personalEventsApi.list(userId).then(setRaw);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  const events = useMemo(
    () => (raw ?? []).map(fromRow),
    [raw]
  );

  const visibleEvents = useMemo(
    () => events.filter((e) => !isScheduleDuplicateEvent(e, options?.diensten ?? [])),
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
    isLoading:       raw === undefined,
    refetch:         reload,
  };
}
