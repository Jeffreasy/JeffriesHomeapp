import { type DienstRow } from "./schedule";
import { type PersonalEvent } from "@/hooks/usePersonalEvents";

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

function detectConflict(
  event: PersonalEvent,
  dienst: DienstRow,
): ConflictLevel | null {
  if (event.startDatum !== dienst.startDatum) return null;

  // Hele-dag event → altijd zacht conflict
  if (event.heledag || !event.startTijd || !event.eindTijd) return "soft";

  // Beide hebben tijden → echte overlap check
  const overlaps = timeRangesOverlap(
    event.startTijd, event.eindTijd,
    dienst.startTijd, dienst.eindTijd,
  );

  return overlaps ? "hard" : "info";
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
