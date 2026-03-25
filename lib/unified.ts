import { type DienstRow } from "./schedule";
import { type PersonalEvent } from "@/hooks/usePersonalEvents";

/**
 * ─── Types ────────────────────────────────────────────────────────────────────
 */

export type UnifiedItem =
  | { type: "dienst"; date: string; time: string; data: DienstRow }
  | { type: "afspraak"; date: string; time: string; data: PersonalEvent };

export interface UnifiedWeek {
  weeknr: string;
  items: UnifiedItem[];
  werkUren: number;
  dienstenAantal: number;
}

/**
 * ─── Helpers ──────────────────────────────────────────────────────────────────
 */

/** Normalise weeknr string "YYYY-WW" derived from date. */
function getIsoWeek(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00"); // veilige parse
    if (isNaN(d.getTime())) return "Onbekend";
    
    // ISO week calculation
    const jan4 = new Date(d.getFullYear(), 0, 4);
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
    const weekNum = Math.floor((d.getTime() - monday.getTime()) / (7 * 86_400_000)) + 1;
    
    return `${d.getFullYear()}-${String(weekNum).padStart(2, "0")}`;
  } catch {
    return "Onbekend";
  }
}

/** 
 * Geeft een "YYYY-MM-DD HH:MM" string puur voor sorteer-doeleinden.
 * "24:00" = push to bottom of the day
 */
function getSortKey(item: UnifiedItem): string {
  const d = item.date;
  const t = item.time || "24:00"; 
  return `${d} ${t}`;
}

/**
 * ─── Aggregator ───────────────────────────────────────────────────────────────
 */

export function generateUnifiedTimeline(diensten: DienstRow[], events: PersonalEvent[]): UnifiedWeek[] {
  const allItems: UnifiedItem[] = [];

  // 1. Transformeer Diensten
  for (const d of diensten) {
    if (d.status === "Gedraaid" || d.status === "VERWIJDERD") continue;
    allItems.push({
      type: "dienst",
      date: d.startDatum,
      time: d.startTijd || "00:00",
      data: d,
    });
  }

  // 2. Transformeer Afspraken 
  for (const e of events) {
    if (e.status !== "Aankomend") continue;
    // Note: voor meerdaagse afspraken kopiëren in de toekomst, voor nu startDatum
    allItems.push({
      type: "afspraak",
      date: e.startDatum,
      time: e.heledag ? "00:00" : (e.startTijd || "00:00"),
      data: e,
    });
  }

  // 3. Sorteer chronologisch
  allItems.sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));

  // 4. Groepeer per week
  const weekMap = new Map<string, UnifiedItem[]>();
  
  for (const item of allItems) {
    // We gebruiken de datum van de item om de week te berekenen (onafhankelijk van dienst.weeknr, voor homogeniteit)
    const weeknr = getIsoWeek(item.date);
    if (!weekMap.has(weeknr)) weekMap.set(weeknr, []);
    weekMap.get(weeknr)!.push(item);
  }

  // 5. Formatteer naar output arrays
  const output: UnifiedWeek[] = [];
  
  // Array.from behoudt chronologische volgorde van Map keys zolang we de weken sorteren
  const sortedWeeks = Array.from(weekMap.keys()).sort((a, b) => a.localeCompare(b));

  for (const week of sortedWeeks) {
    const items = weekMap.get(week)!;
    
    // Bereken stats puur gebaseerd op de diensten in deze specifieke week
    let werkUren = 0;
    let dienstenAantal = 0;

    for (const item of items) {
      if (item.type === "dienst") {
        dienstenAantal++;
        werkUren += (item.data.duur || 0);
      }
    }

    output.push({
      weeknr: week,
      items,
      werkUren: Math.round(werkUren * 10) / 10,
      dienstenAantal,
    });
  }

  return output;
}
