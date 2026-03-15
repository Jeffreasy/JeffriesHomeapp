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

// ─── Engine helpers ───────────────────────────────────────────────────────────

/** Returns true if this automation should fire right now (within this minute).
 *  For schedule-based triggers, also checks the stored DienstenData. */
export function shouldFire(automation: Automation): boolean {
  if (!automation.enabled) return false;

  const now = new Date();
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (automation.trigger.time !== nowTime) return false;

  const triggerType = automation.trigger.triggerType ?? "time";

  if (triggerType === "time") {
    // Classic day-of-week check
    const nowDay = (now.getDay() + 6) % 7; // 0=Ma...6=Zo
    const days = automation.trigger.days ?? ALL_DAYS;
    if (!days.includes(nowDay)) return false;
  } else if (triggerType === "schedule") {
    // Check if today has a dienst matching the requested shiftType
    if (!_hasDienstToday(automation.trigger.shiftType ?? "any")) return false;
  }

  // Prevent double-fire within same minute
  if (automation.lastFiredAt) {
    const lastFired = new Date(automation.lastFiredAt);
    if (now.getTime() - lastFired.getTime() < 60_000) return false;
  }

  return true;
}

/** Check localStorage schedule for a dienst today matching the shiftType */
function _hasDienstToday(shiftType: ShiftType): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("homeapp_schedule");
    if (!raw) return false;
    const diensten: Array<{ startDatum: string; shiftType: string; status: string }> = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);

    return diensten.some((d) => {
      if (d.startDatum !== today) return false;
      if (d.status === "VERWIJDERD" || d.status === "Gedraaid") return false;
      if (shiftType === "any") return true;
      return d.shiftType === shiftType;
    });
  } catch {
    return false;
  }
}

/** Build the DeviceCommand from an AutomationAction */
export function actionToCommand(action: AutomationAction): Record<string, any> {
  switch (action.type) {
    case "scene": {
      const scene = SCENE_DEFINITIONS[action.sceneId!];
      return scene?.command ?? {};
    }
    case "on":          return { on: true };
    case "off":         return { on: false };
    case "brightness":  return { on: true, brightness: action.brightness };
    case "color_temp":  return { on: true, color_temp_mireds: action.colorTempMireds };
    case "color": {
      const hex = action.colorHex ?? "#ffffff";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { on: true, r, g, b };
    }
    default: return {};
  }
}
