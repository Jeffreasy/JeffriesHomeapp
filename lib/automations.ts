// ─── Types ────────────────────────────────────────────────────────────────────

/** Days: 0=Ma, 1=Di, 2=Wo, 3=Do, 4=Vr, 5=Za, 6=Zo */
export const DAY_LABELS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAYS = [0, 1, 2, 3, 4];
export const WEEKEND = [5, 6];

export type ActionType = "scene" | "on" | "off" | "brightness" | "color_temp" | "color";

export type ShiftType = "Vroeg" | "Laat" | "Dienst" | "any";

import { SCENE_DEFINITIONS } from "@/lib/scenes";
export { SCENE_DEFINITIONS };


export interface AutomationTrigger {
  time: string;    // "HH:MM" 24h

  // ── Type "time" (default, backward compatible) ────────────────────────────
  days?: number[]; // 0=Ma...6=Zo — required when triggerType = "time"

  // ── Type "schedule" (dienst-aware) ───────────────────────────────────────
  /** When set to "schedule", fires only on days with a matching dienst */
  triggerType?: "time" | "schedule";
  shiftType?: ShiftType; // "Vroeg" | "Laat" | "Dienst" | "any"

  // ── Smart Exclusions ──────────────────────────────────────────────────────
  /** If today matches any of these shifts, do NOT fire the automation */
  excludedShifts?: ShiftType[];
}

export interface AutomationAction {
  type: ActionType;
  // scene
  sceneId?: string; // keyof SCENE_DEFINITIONS (b.v. "helder", "avond", ...)
  // brightness
  brightness?: number;
  // color_temp
  colorTempMireds?: number;
  // color (hex)
  colorHex?: string;
  // target: undefined = all lamps
  deviceIds?: string[];
}

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  createdAt: string;
  lastFiredAt?: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  /** Optional group tag for visual grouping (e.g. "vroeg-wekker") */
  group?: string;
}

// ─── Dienst-Wekker Templates ─────────────────────────────────────────────────

export interface DienstWekkerTemplate {
  id: string;
  name: string;
  label: string;
  time: string;
  action: AutomationAction;
  description: string;
}

export type DienstWekkerTimes = Record<string, string>;

export const DIENST_WEKKER_PACKS: Record<ShiftType, DienstWekkerTemplate[]> = {
  Vroeg: [
    {
      id: "opstaan",
      name: "Vroeg - Opstaan",
      label: "Opstaan",
      time: "05:00",
      description: "Zachte ochtendverlichting bij het opstaan",
      action: { type: "scene", sceneId: "ochtend" },
    },
    {
      id: "klaar",
      name: "Vroeg - Klaar",
      label: "Klaar maken",
      time: "05:30",
      description: "Heldere verlichting om klaar te maken",
      action: { type: "scene", sceneId: "helder" },
    },
    {
      id: "vertrek",
      name: "Vroeg - Vertrek",
      label: "Vertrek",
      time: "06:15",
      description: "Alle lampen uit bij vertrek",
      action: { type: "off" },
    },
  ],
  Laat: [
    {
      id: "klaar",
      name: "Laat - Klaar",
      label: "Klaar maken",
      time: "12:30",
      description: "Zet lichten aan voor vertrek laat dienst",
      action: { type: "scene", sceneId: "helder" },
    },
    {
      id: "vertrek",
      name: "Laat - Vertrek",
      label: "Vertrek",
      time: "13:45",
      description: "Alle lampen uit bij vertrek laat dienst",
      action: { type: "off" },
    },
  ],
  Dienst: [
    {
      id: "vertrek",
      name: "Dienst - Vertrek",
      label: "Vertrek",
      time: "12:00",
      description: "Alle lampen uit bij vertrek dagdienst",
      action: { type: "off" },
    },
  ],
  any: [],
};

function createAutomation(
  data: Omit<Automation, "id" | "createdAt" | "lastFiredAt">,
): Automation {
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
}

/** Create a full set of automation objects for a shift type */
export function createDienstWekkerPack(shiftType: ShiftType, times: Partial<DienstWekkerTimes> = {}): Automation[] {
  const templates = DIENST_WEKKER_PACKS[shiftType] ?? [];
  // M5: géén tijd in de naam bakken — de weergavetijd komt uit trigger.time,
  // zodat naam en werkelijke triggertijd nooit uit elkaar kunnen lopen.
  return templates.map((t) =>
    createAutomation({
      name: t.name,
      enabled: true,
      group: `dienst-wekker-${shiftType.toLowerCase()}`,
      trigger: {
        time: times[t.id] ?? t.time,
        triggerType: "schedule",
        shiftType,
      },
      action: t.action,
    })
  );
}

export function getDienstWekkerDefaultTimes(shiftType: ShiftType): DienstWekkerTimes {
  return Object.fromEntries((DIENST_WEKKER_PACKS[shiftType] ?? []).map((template) => [template.id, template.time]));
}

/** True als deze automation onderdeel is van een dienst-wekker-pack (M5). */
export function isDienstWekkerAutomation(automation: Pick<Automation, "group">): boolean {
  return (automation.group ?? "").startsWith("dienst-wekker");
}

// ─── Next-run preview (M4) ───────────────────────────────────────────────────

/** Huidige weekdag-index (0=Ma…6=Zo) + minuten sinds middernacht in Amsterdam. */
function amsterdamNow(now: Date): { dayIdx: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekdayMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const dayIdx = weekdayMap[get("weekday")] ?? 0;
  // "24" kan voorkomen bij middernacht in sommige runtimes — normaliseer naar 0.
  const hour = Number(get("hour")) % 24;
  const minutes = hour * 60 + Number(get("minute"));
  return { dayIdx, minutes };
}

/**
 * "Volgende run"-label voor vaste-dagen-automations, berekend in Amsterdam-tijd.
 * Retourneert bv. "vandaag 07:00", "morgen 07:00" of "Za 07:00".
 * Voor rooster-getriggerde automations (dienst-wekker) is de volgende run
 * afhankelijk van het rooster en niet client-side te bepalen → null.
 */
export function nextRunLabel(trigger: AutomationTrigger, now: Date = new Date()): string | null {
  if (trigger.triggerType === "schedule") return null;
  const days = trigger.days;
  if (!days || days.length === 0) return null;
  const [hh, mm] = trigger.time.split(":").map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  const triggerMinutes = hh * 60 + mm;

  const { dayIdx, minutes } = amsterdamNow(now);
  for (let offset = 0; offset <= 7; offset++) {
    const candidate = (dayIdx + offset) % 7;
    if (!days.includes(candidate)) continue;
    if (offset === 0 && triggerMinutes <= minutes) continue; // vandaag al geweest
    const dayLabel = offset === 0 ? "vandaag" : offset === 1 ? "morgen" : DAY_LABELS[candidate];
    return `${dayLabel} ${trigger.time}`;
  }
  return null;
}

export function actionLabel(action: AutomationAction): string {
  switch (action.type) {
    case "scene":
      return `Scene: ${SCENE_DEFINITIONS[action.sceneId!]?.label ?? action.sceneId}`;
    case "on":
      return "Alle lampen aan";
    case "off":
      return "Alle lampen uit";
    case "brightness":
      return `Helderheid ${action.brightness}%`;
    case "color_temp":
      return `Kleurtemperatuur ${Math.round(1_000_000 / (action.colorTempMireds ?? 370))}K`;
    case "color":
      return `Kleur ${action.colorHex?.toUpperCase()}`;
    default:
      return "Onbekende actie";
  }
}
