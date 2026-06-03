"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { personalEventsApi, type PersonalEventRow } from "@/lib/api";
import { type DienstRow } from "@/lib/schedule";
import { analyzeConflicts, type ConflictInfo } from "@/lib/conflictDetection";
import { getEventCategoryIcon, resolveAppIconName, type AppIconName } from "@/lib/symbols";

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
  symbol?:           AppIconName;
  status:            "Aankomend" | "Voorbij" | "VERWIJDERD" | string;
  kalender:          string;
  shiftType?:        string;
  team?:             string;
}

const PENDING_STATUSES = new Set(["PendingCreate", "PendingUpdate", "PendingDelete"]);
const DELETED_STATUSES = new Set(["VERWIJDERD", "cancelled"]);

type AmsterdamNow = {
  date: string;
  time: string;
};

function fromRow(r: PersonalEventRow): PersonalEvent {
  const category = parseCategoryMetadata(r.beschrijving);
  const metadataSymbol = parseSymbolMetadata(r.beschrijving);
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
    symbol:       resolveAppIconName(r.symbol ?? metadataSymbol, getEventCategoryIcon(category)),
    status:       r.status,
    kalender:     r.kalender,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getDisplayEndDate(event: PersonalEvent): string {
  return event.eindDatum || event.startDatum;
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

function parseCategoryMetadata(description?: string | null): string | undefined {
  return description?.match(/\[categorie:([a-z0-9_-]+)\]/i)?.[1];
}

function parseSymbolMetadata(description?: string | null): string | undefined {
  return description?.match(/\[symbol:([a-z0-9_-]+)\]/i)?.[1];
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

function isPending(event: PersonalEvent): boolean {
  return PENDING_STATUSES.has(event.status);
}

function isDeleted(event: PersonalEvent): boolean {
  return DELETED_STATUSES.has(event.status);
}

function getAmsterdamNow(now = new Date()): AmsterdamNow {
  const date = now.toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
  const time = new Intl.DateTimeFormat("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return { date, time };
}

function isEventPast(event: PersonalEvent, now: AmsterdamNow): boolean {
  const endDate = getDisplayEndDate(event) || event.startDatum;

  if (event.heledag) {
    return endDate < now.date;
  }

  const endTime = event.eindTijd || "23:59";
  return endDate < now.date || (endDate === now.date && endTime <= now.time);
}

function normalizeTemporalStatus(event: PersonalEvent, now: AmsterdamNow): PersonalEvent {
  if (isPending(event) || isDeleted(event)) return event;
  const shouldBePast = isEventPast(event, now);
  if (shouldBePast && event.status !== "Voorbij") return { ...event, status: "Voorbij" };
  if (!shouldBePast && event.status === "Voorbij") return { ...event, status: "Aankomend" };
  return event;
}

function startSortKey(event: PersonalEvent): string {
  return `${event.startDatum || "9999-12-31"}T${event.startTijd || "00:00"}`;
}

function endSortKey(event: PersonalEvent): string {
  return `${getDisplayEndDate(event) || event.startDatum || "9999-12-31"}T${event.eindTijd || "23:59"}`;
}

function compareEvents(a: PersonalEvent, b: PersonalEvent): number {
  return startSortKey(a).localeCompare(startSortKey(b)) || a.titel.localeCompare(b.titel);
}

function addDaysIso(baseIso: string, days: number): string {
  const date = new Date(`${baseIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function isActionableConflict(event: PersonalEvent, conflict?: ConflictInfo): boolean {
  if (!conflict || conflict.level === "info") return false;
  if (conflict.level === "soft" && (event.heledag || !event.startTijd || !event.eindTijd)) return false;
  return true;
}

// ─── Hook (Go API) ───────────────────────────────────────────────────────────

export function usePersonalEvents(options?: { diensten?: DienstRow[] }) {
  const { user, isLoaded: userLoaded } = useUser();
  const userId = user?.id ?? "";
  const [now, setNow] = useState<AmsterdamNow>(() => getAmsterdamNow());

  const {
    data: raw = [],
    error: loadError,
    isLoading,
    refetch: refetchRows,
  } = useQuery<PersonalEventRow[], Error>({
    queryKey: ["/personal-events", userId],
    queryFn: () => personalEventsApi.list(userId),
    enabled: userLoaded && Boolean(userId),
    staleTime: 10_000,
  });

  useEffect(() => {
    const interval = window.setInterval(() => setNow(getAmsterdamNow()), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  const reload = useCallback(async () => {
    setNow(getAmsterdamNow());
    if (!userLoaded || !userId) return;
    await refetchRows();
  }, [refetchRows, userId, userLoaded]);

  const events = useMemo(
    () => raw.map(fromRow),
    [raw]
  );

  const visibleEvents = useMemo(() => {
    return events
      .map((e) => normalizeTemporalStatus(e, now))
      .filter((e) => e.kalender !== "Rooster" && !isDeleted(e) && !isScheduleDuplicateEvent(e, options?.diensten ?? []))
      .sort(compareEvents);
  }, [events, now, options?.diensten]);

  const upcoming = useMemo(
    () => visibleEvents
      .filter((e) => !isEventPast(e, now) && e.status !== "PendingDelete" && !isDeleted(e))
      .sort(compareEvents),
    [now, visibleEvents]
  );

  const pending = useMemo(
    () => visibleEvents.filter(isPending).sort(compareEvents),
    [visibleEvents]
  );

  const history = useMemo(
    () => visibleEvents
      .filter((e) => e.status === "Voorbij" || isEventPast(e, now))
      .sort((a, b) => endSortKey(b).localeCompare(endSortKey(a))),
    [now, visibleEvents]
  );

  const conflictMap = useMemo(
    () => {
      if (!options?.diensten?.length) return new Map<string, ConflictInfo>();
      const rawConflicts = analyzeConflicts(upcoming, options.diensten);
      const actionable = new Map<string, ConflictInfo>();
      const eventById = new Map(upcoming.map((event) => [event.eventId, event]));

      for (const [eventId, conflict] of rawConflicts) {
        const event = eventById.get(eventId);
        if (event && isActionableConflict(event, conflict)) {
          actionable.set(eventId, conflict);
        }
      }

      return actionable;
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
      let day = e.startDatum;
      const end = getDisplayEndDate(e);
      while (day <= end) {
        (map[day] ??= []).push(e);
        day = addDaysIso(day, 1);
      }
    }
    for (const dayEvents of Object.values(map)) {
      dayEvents.sort(compareEvents);
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
    error:           loadError,
    isLoading:       !userLoaded || isLoading,
    refetch:         reload,
  };
}
