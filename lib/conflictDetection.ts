import { getStartKey, getEndKey, type DienstRow } from "./schedule";
import { getDisplayEndDate, type PersonalEvent } from "@/hooks/usePersonalEvents";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConflictLevel = "hard" | "soft" | "info";

export interface ConflictInfo {
  level:       ConflictLevel;
  dienstTitel: string;
  dienstTijd:  string;     // "07:00–14:30"
  shiftType:   string;     // "Vroeg" | "Laat"
  message:     string;     // Menselijke samenvatting
}

// ─── Core: tijdsbereik-overlap ─────────────────────────────────────────────────

/** Parse "HH:MM" → minuten sinds middernacht. */
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** True als twee tijdsbereiken overlappen (≥1 minuut). */
export function timeRangesOverlap(
  s1: string, e1: string,
  s2: string, e2: string,
): boolean {
  const a0 = toMinutes(s1), a1 = toMinutes(e1);
  const b0 = toMinutes(s2), b1 = toMinutes(e2);
  return a0 < b1 && b0 < a1;
}

// ─── Per-event conflict detectie ──────────────────────────────────────────────

/** "YYYY-MM-DD HH:MM" datetime key for the start of an event. */
function eventStartKey(event: PersonalEvent): string {
  return `${event.startDatum} ${event.heledag ? "00:00" : event.startTijd || "00:00"}`;
}

/** "YYYY-MM-DD HH:MM" datetime key for the (display) end of an event. */
function eventEndKey(event: PersonalEvent): string {
  return `${getDisplayEndDate(event)} ${event.heledag ? "23:59" : event.eindTijd || "23:59"}`;
}

function detectConflict(
  event: PersonalEvent,
  dienst: DienstRow,
): ConflictLevel | null {
  // Compare full datetime ranges, not just the dienst's start day. getStartKey/
  // getEndKey roll night shifts past midnight, so an overnight or multi-day
  // dienst is matched against an appointment on its later day too — these were
  // previously silently missed.
  const dStart = getStartKey(dienst);
  const dEnd = getEndKey(dienst);
  const evStart = eventStartKey(event);
  const evEnd = eventEndKey(event);

  // No overlap of the two datetime ranges → not a conflict.
  if (evStart >= dEnd || dStart >= evEnd) return null;

  // Hele-dag / event zonder tijden → zacht conflict (geen exacte tijdsoverlap).
  if (event.heledag || !event.startTijd || !event.eindTijd) return "soft";

  // Beide hebben tijden en de datetime-ranges overlappen → hard conflict.
  return "hard";
}

// ─── Bulk analyse ─────────────────────────────────────────────────────────────

function buildMessage(level: ConflictLevel, event: PersonalEvent, dienst: DienstRow): string {
  const dienstLabel = `${dienst.shiftType} ${dienst.startTijd}–${dienst.eindTijd}`;
  switch (level) {
    case "hard":
      return `Overlapt met ${dienstLabel}`;
    case "soft":
      return event.heledag
        ? `Hele dag — ${dienstLabel} gepland`
        : `Mogelijk conflict met ${dienstLabel}`;
    case "info":
      return `Zelfde dag als ${dienstLabel}, geen overlap`;
  }
}

/**
 * Analyseer alle aankomende events tegen alle diensten.
 * Retourneert een Map van eventId → ergste conflict.
 * Als een event overlap heeft met meerdere diensten, pakt het de zwaarste.
 */
export function analyzeConflicts(
  events:   PersonalEvent[],
  diensten: DienstRow[],
): Map<string, ConflictInfo> {
  const result = new Map<string, ConflictInfo>();
  const levelOrder: Record<ConflictLevel, number> = { hard: 2, soft: 1, info: 0 };

  for (const event of events) {
    if (event.kalender === "Rooster") continue;
    for (const dienst of diensten) {
      const level = detectConflict(event, dienst);
      if (!level) continue;

      const existing = result.get(event.eventId);
      if (existing && levelOrder[existing.level] >= levelOrder[level]) continue;

      result.set(event.eventId, {
        level,
        dienstTitel: dienst.titel || dienst.shiftType,
        dienstTijd:  `${dienst.startTijd}–${dienst.eindTijd}`,
        shiftType:   dienst.shiftType,
        message:     buildMessage(level, event, dienst),
      });
    }
  }

  return result;
}
