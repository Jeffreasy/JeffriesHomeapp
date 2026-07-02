import type { PersonalEvent } from "@/hooks/usePersonalEvents";
import { type DienstRow, getEndKey } from "@/lib/schedule";
import type { ConflictInfo } from "@/lib/conflictDetection";

/**
 * Shared schedule/agenda helpers — extracted so the agenda page, rooster page
 * and AfsprakenView stop maintaining diverging copies (audit F10/L6/L8).
 */

/**
 * Compact, word-boundary-safe truncation for sync/wachtrij error strings so
 * banners and toasts never render a full stack-achtige foutlap.
 */
export function shortSyncError(error: string) {
  const trimmed = error.trim();
  if (trimmed.length <= 140) return trimmed;
  // Truncate on a word boundary so the message never cuts mid-word.
  const head = trimmed.slice(0, 137);
  const lastSpace = head.lastIndexOf(" ");
  const clipped = lastSpace > 80 ? head.slice(0, lastSpace) : head;
  return `${clipped.trimEnd()}…`;
}

/** "2026-27" → "27" (falls back to the raw key for unexpected formats). */
export function formatWeekNumber(weeknr: string) {
  const [, week] = weeknr.split("-");
  return week ? String(Number(week)) : weeknr;
}

/** "2026-27" → "Week 27" — the one week-label formatter (audit L8). */
export function formatWeekLabel(weeknr: string) {
  return `Week ${formatWeekNumber(weeknr)}`;
}

/**
 * Shared ordering for day-level event lists: all-day items first, then by
 * start time, then title — identical between the calendar grid and the
 * timeline so the same day never sorts differently per view (audit L6).
 */
export function compareAllDayFirst(a: PersonalEvent, b: PersonalEvent) {
  const allDayDelta = Number(Boolean(b.heledag)) - Number(Boolean(a.heledag));
  if (allDayDelta !== 0) return allDayDelta;
  return `${a.startTijd || "00:00"}-${a.titel}`.localeCompare(
    `${b.startTijd || "00:00"}-${b.titel}`,
    "nl",
  );
}

/** Noon-anchored ISO date advance — matches the keys in eventsByDate. */
function advanceIsoDay(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * The single "afspraken bij dienst" contract shared by the rooster page, the
 * agenda page and the home dashboard — previously three diverging versions
 * (conflicts×all-days / all×start-day / conflicts×start-day) fed the same
 * NextShiftCard (audit F10 / DEEL 2 NextShiftCard).
 *
 * Collects the personal events that fall on *any* calendar day the shift spans,
 * so a night shift (e.g. 22:00–07:00) that rolls past midnight still surfaces an
 * early-morning appointment on the following day (the K9 overnight fix). Results
 * are deduplicated by eventId and sorted (all-day first, then by start time).
 *
 * When `conflictMap` is passed, the list is narrowed to events that map has an
 * (actionable) conflict for — what the rooster hero and home dashboard want.
 * Omit it to get every appointment across the spanned days (the agenda sidebar).
 */
export function getShiftAppointments(
  dienst: DienstRow | null | undefined,
  eventsByDate: Record<string, PersonalEvent[]>,
  conflictMap?: Map<string, ConflictInfo>,
): PersonalEvent[] {
  if (!dienst) return [];
  const endDay = getEndKey(dienst).slice(0, 10);
  const seen = new Set<string>();
  const result: PersonalEvent[] = [];
  let day = dienst.startDatum;
  let guard = 0;
  while (day <= endDay && guard++ < 32) {
    for (const event of eventsByDate[day] ?? []) {
      if (seen.has(event.eventId)) continue;
      if (conflictMap && !conflictMap.has(event.eventId)) continue;
      seen.add(event.eventId);
      result.push(event);
    }
    day = advanceIsoDay(day, 1);
  }
  return result.sort(compareAllDayFirst);
}
