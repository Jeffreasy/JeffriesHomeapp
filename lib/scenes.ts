/**
 * scenes.ts — Single source of truth voor alle scene presets.
 *
 * Geïmporteerd door: SceneBar, RoomSection, automations.ts
 * Zodat er maar ÉÉN plek is waar scenes worden gedefinieerd.
 */

export interface ScenePreset {
  id: string;
  label: string;
  /** Kleur voor UI-weergave */
  color: string;
  /** DeviceCommand-velden — direct naar backend gestuurd */
  command: {
    on?: boolean;
    brightness?: number;
    color_temp_mireds?: number;
    r?: number;
    g?: number;
    b?: number;
    /** WiZ native effect-ID (1–32) voor ingebouwde lampanimatrices */
    scene_id?: number;
  };
}

// ─── Aangepaste witte/kleur presets ─────────────────────────────────────────
export const CUSTOM_SCENES: ScenePreset[] = [
  { id: "helder",  label: "Helder",  color: "#fff4d6", command: { on: true, brightness: 100, color_temp_mireds: 200 } },
  { id: "avond",   label: "Avond",   color: "#ff9040", command: { on: true, brightness: 60,  color_temp_mireds: 370 } },
  { id: "nacht",   label: "Nacht",   color: "#6070ff", command: { on: true, brightness: 15,  color_temp_mireds: 455 } },
  { id: "film",    label: "Film",    color: "#c040ff", command: { on: true, r: 100, g: 0, b: 180, brightness: 30 } },
  { id: "focus",   label: "Focus",   color: "#40d4ff", command: { on: true, brightness: 90,  color_temp_mireds: 165 } },
  { id: "ochtend", label: "Ochtend", color: "#ffb060", command: { on: true, brightness: 40,  color_temp_mireds: 400 } },
];

// ─── WiZ native ingebouwde effecten (sceneId 1–32) ──────────────────────────
export const WIZ_SCENES: ScenePreset[] = [
  { id: "wiz-romance",   label: "Romance",     color: "#ff4060", command: { on: true, scene_id: 2  } },
  { id: "wiz-sunset",    label: "Zonsonder",   color: "#ff6030", command: { on: true, scene_id: 3  } },
  { id: "wiz-party",     label: "Party",       color: "#ff20a0", command: { on: true, scene_id: 4  } },
  { id: "wiz-fireplace", label: "Haard",       color: "#ff8030", command: { on: true, scene_id: 5  } },
  { id: "wiz-wakeup",    label: "Ontwaken",    color: "#ffcc60", command: { on: true, scene_id: 9  } },
  { id: "wiz-bedtime",   label: "Bedtijd",     color: "#a080ff", command: { on: true, scene_id: 10 } },
  { id: "wiz-relax",     label: "Relax",       color: "#80b0ff", command: { on: true, scene_id: 17 } },
  { id: "wiz-tvtime",    label: "TV",          color: "#4080ff", command: { on: true, scene_id: 19 } },
  { id: "wiz-spring",    label: "Lente",       color: "#60e080", command: { on: true, scene_id: 21 } },
  { id: "wiz-christmas", label: "Kerst",       color: "#40e040", command: { on: true, scene_id: 31 } },
];

// ─── Uit ────────────────────────────────────────────────────────────────────
export const OFF_SCENE: ScenePreset = {
  id: "uit", label: "Uit", color: "#64748b", command: { on: false },
};

/** Alle presets — custom + WiZ native + uit */
export const SCENE_PRESETS: ScenePreset[] = [...CUSTOM_SCENES, ...WIZ_SCENES, OFF_SCENE];

/**
 * Subset die gebruikt wordt door automations (alleen de 6 aangepaste presets).
 * WiZ native scenes en "uit" zijn geen automation-acties.
 */
export const AUTOMATION_SCENE_PRESETS = CUSTOM_SCENES;

/**
 * SCENE_DEFINITIONS — compatible met automation.ts bestaand formaat.
 * key = scene id, value = { label, command }
 */
export const SCENE_DEFINITIONS = Object.fromEntries(
  AUTOMATION_SCENE_PRESETS.map((s) => [s.id, { label: s.label, command: s.command }])
) as Record<string, { label: string; command: ScenePreset["command"] }>;

// ─── Active scene detectie ──────────────────────────────────────────────────

interface DeviceLike {
  status: string;
  current_state?: {
    on?: boolean;
    brightness?: number;
    color_temp?: number;
    r?: number;
    g?: number;
    b?: number;
  };
}

/**
 * Vergelijk de actuele staat van lampen met alle presets.
 * Geeft het id terug van de preset die het meest overeenkomt (>= 70% match),
 * of null als geen overeenkomst gevonden.
 */
export function detectActiveScene(devices: DeviceLike[]): string | null {
  const online = devices.filter((d) => d.status === "online");
  if (online.length === 0) return null;

  const allOff = online.every((d) => !d.current_state?.on);
  if (allOff) return "uit";

  for (const preset of CUSTOM_SCENES) {
    const cmd = preset.command;
    const threshold = Math.ceil(online.length * 0.7); // 70% moet matchen

    const matches = online.filter((d) => {
      const s = d.current_state;
      if (!s) return false;
      if (cmd.on !== undefined && Boolean(s.on) !== cmd.on) return false;
      if (cmd.brightness !== undefined && Math.abs((s.brightness ?? 100) - cmd.brightness) > 8) return false;
      if (cmd.color_temp_mireds !== undefined) {
        const targetK = Math.round(1_000_000 / cmd.color_temp_mireds);
        if (Math.abs((s.color_temp ?? 4000) - targetK) > 300) return false;
      }
      if (cmd.r !== undefined && Math.abs((s.r ?? 0) - cmd.r) > 15) return false;
      if (cmd.g !== undefined && Math.abs((s.g ?? 0) - cmd.g) > 15) return false;
      if (cmd.b !== undefined && Math.abs((s.b ?? 0) - cmd.b) > 15) return false;
      return true;
    });

    if (matches.length >= threshold) return preset.id;
  }
  return null;
}
