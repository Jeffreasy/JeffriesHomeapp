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
  name: string;
  time: string;
  action: AutomationAction;
  description: string;
}

export const DIENST_WEKKER_PACKS: Record<ShiftType, DienstWekkerTemplate[]> = {
  Vroeg: [
    {
      name: "🌅 Vroeg — Opstaan (05:00)",
      time: "05:00",
      description: "Zachte ochtendverlichting bij het opstaan",
      action: { type: "scene", sceneId: "ochtend" },
    },
    {
      name: "☀️ Vroeg — Klaar (05:30)",
      time: "05:30",
      description: "Heldere verlichting om klaar te maken",
      action: { type: "scene", sceneId: "helder" },
    },
    {
      name: "🚪 Vroeg — Vertrek (06:15)",
      time: "06:15",
      description: "Alle lampen uit bij vertrek",
      action: { type: "off" },
    },
  ],
  Laat: [
    {
      name: "🌙 Laat — Klaar (12:30)",
      time: "12:30",
      description: "Zet lichten aan voor vertrek laat dienst",
      action: { type: "scene", sceneId: "helder" },
    },
    {
      name: "🚪 Laat — Vertrek (13:45)",
      time: "13:45",
      description: "Alle lampen uit bij vertrek laat dienst",
      action: { type: "off" },
    },
  ],
  Dienst: [
    {
      name: "💼 Dienst — Vertrek (12:00)",
      time: "12:00",
      description: "Alle lampen uit bij vertrek dagdienst",
      action: { type: "off" },
    },
  ],
  any: [],
};

/** Create a full set of automation objects for a shift type */
export function createDienstWekkerPack(shiftType: ShiftType): Automation[] {
  const templates = DIENST_WEKKER_PACKS[shiftType] ?? [];
  return templates.map((t) =>
    createAutomation({
      name: t.name,
      enabled: true,
      group: `dienst-wekker-${shiftType.toLowerCase()}`,
      trigger: {
        time: t.time,
        triggerType: "schedule",
        shiftType,
      },
      action: t.action,
    })
  );
}
