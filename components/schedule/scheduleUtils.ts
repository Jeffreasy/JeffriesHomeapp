import type { PersonalEvent } from "@/hooks/usePersonalEvents";

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
