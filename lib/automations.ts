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

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = "homeapp_automations";

export function loadAutomations(): Automation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAutomations(automations: Automation[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(automations));
}

export function createAutomation(
  data: Omit<Automation, "id" | "createdAt" | "lastFiredAt">
): Automation {
  return {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
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

/** Create a full set of automation objects for a shift type */
export function createDienstWekkerPack(shiftType: ShiftType, times: Partial<DienstWekkerTimes> = {}): Automation[] {
  const templates = DIENST_WEKKER_PACKS[shiftType] ?? [];
  return templates.map((t) =>
    createAutomation({
      name: `${t.name} (${times[t.id] ?? t.time})`,
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
