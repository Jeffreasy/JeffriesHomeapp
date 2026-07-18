import type { CSSProperties } from "react";
import type { Device } from "@/lib/api";
import { hexToRgb, kelvinToHex, rgbToHex } from "@/lib/utils";
import { contrastRatio, type RgbColor } from "@/lib/ui/colorContrast";

export type LampVisualMode = "offline" | "off" | "white" | "color";
export type LampDeliveryPhase = "reported" | "pending";

export type LampAmbientStyle = CSSProperties & {
  "--lamp-accent": string;
  "--lamp-text": string;
  "--lamp-ambient-soft": string;
  "--lamp-ambient-medium": string;
  "--lamp-ambient-border": string;
  "--lamp-ambient-ring": string;
  "--lamp-ambient-shadow": string;
  "--lamp-brightness": string;
};

export interface LampPresentation {
  isOnline: boolean;
  isOn: boolean;
  brightness: number;
  colorTemperature: number;
  mode: LampVisualMode;
  deliveryPhase: LampDeliveryPhase;
  accent: string;
  statusLabel: string;
  detailLabel: string;
  ambientStyle: LampAmbientStyle;
}

const DARK_SURFACE = { r: 10, g: 10, b: 15 };
const OFF_ACCENT = "#94a3b8";
const OFFLINE_ACCENT = "#64748b";
const LAMP_BASE_SURFACES: readonly RgbColor[] = [
  DARK_SURFACE,
  { r: 18, g: 18, b: 26 },
  { r: 26, g: 26, b: 38 },
];
const ACTIVE_AMBIENT_ALPHAS = [0.08, 0.14, 0.28] as const;
const INACTIVE_AMBIENT_ALPHAS = [0.025, 0.05] as const;
const MINIMUM_LAMP_TEXT_CONTRAST = 4.75;

function alphaColor(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function mixWithWhite(source: RgbColor, mix: number): RgbColor {
  return {
    r: source.r + (255 - source.r) * mix,
    g: source.g + (255 - source.g) * mix,
    b: source.b + (255 - source.b) * mix,
  };
}

function toRenderedRgb(source: RgbColor): RgbColor {
  return hexToRgb(rgbToHex(source.r, source.g, source.b));
}

function compositeColor(
  foreground: RgbColor,
  background: RgbColor,
  alpha: number,
): RgbColor {
  return {
    r: foreground.r * alpha + background.r * (1 - alpha),
    g: foreground.g * alpha + background.g * (1 - alpha),
    b: foreground.b * alpha + background.b * (1 - alpha),
  };
}
function hasMinimumLampAccentContrast(candidate: RgbColor, minimumContrast: number): boolean {
  return LAMP_BASE_SURFACES.every((surface) =>
    ACTIVE_AMBIENT_ALPHAS.every(
      (alpha) =>
        contrastRatio(candidate, compositeColor(candidate, surface, alpha)) >=
        minimumContrast,
    ),
  );
}

function ensureReadableLampText(accent: string, active: boolean): string {
  const source = hexToRgb(accent);
  const alphas = active ? ACTIVE_AMBIENT_ALPHAS : INACTIVE_AMBIENT_ALPHAS;
  const backgrounds = LAMP_BASE_SURFACES.flatMap((surface) =>
    alphas.map((alpha) => compositeColor(source, surface, alpha)),
  );

  for (let mix = 0; mix <= 1; mix += 0.04) {
    const candidate = toRenderedRgb(mixWithWhite(source, mix));
    if (
      backgrounds.every(
        (background) =>
          contrastRatio(candidate, background) >= MINIMUM_LAMP_TEXT_CONTRAST,
      )
    ) {
      return rgbToHex(candidate.r, candidate.g, candidate.b);
    }
  }

  return "#ffffff";
}

/**
 * Lamp colours are physical-state data, not theme tokens. Keep their hue while
 * lifting very dark RGB values until controls remain visible on the dark shell.
 */
export function ensureVisibleLampAccent(hex: string, minimumContrast = 3): string {
  const source = hexToRgb(hex);
  if (hasMinimumLampAccentContrast(source, minimumContrast)) {
    return rgbToHex(source.r, source.g, source.b);
  }

  for (let mix = 0.08; mix <= 0.8; mix += 0.08) {
    const candidate = toRenderedRgb({
      r: source.r + (255 - source.r) * mix,
      g: source.g + (255 - source.g) * mix,
      b: source.b + (255 - source.b) * mix,
    });
    if (hasMinimumLampAccentContrast(candidate, minimumContrast)) {
      return rgbToHex(candidate.r, candidate.g, candidate.b);
    }
  }

  return OFF_ACCENT;
}

/** Runtime CSS variables are the only bridge from a physical colour into UI styling. */
export function createLampAmbientStyle(accent: string, active: boolean): LampAmbientStyle {
  const safeAccent = active ? ensureVisibleLampAccent(accent) : accent;
  const textAccent = ensureReadableLampText(safeAccent, active);
  return {
    "--lamp-accent": safeAccent,
    "--lamp-text": textAccent,
    "--lamp-ambient-soft": alphaColor(safeAccent, active ? 0.08 : 0.025),
    "--lamp-ambient-medium": alphaColor(safeAccent, active ? 0.14 : 0.05),
    "--lamp-ambient-border": alphaColor(safeAccent, active ? 0.3 : 0.12),
    "--lamp-ambient-ring": alphaColor(safeAccent, active ? 0.5 : 0.2),
    "--lamp-ambient-shadow": alphaColor(safeAccent, active ? 0.32 : 0),
    "--lamp-brightness": active ? "100%" : "0%",
  };
}

export function deriveLampPresentation(
  device: Device,
  options: { pending?: boolean } = {},
): LampPresentation {
  const isOnline = device.status === "online";
  const reportedOn = device.current_state?.on ?? false;
  // Offline payloads can contain a stale on-state. Never turn that into active UI.
  const isOn = isOnline && reportedOn;
  const brightness = Math.max(0, Math.min(100, device.current_state?.brightness ?? 100));
  const colorTemperature = Math.max(2200, Math.min(6500, device.current_state?.color_temp ?? 2700));
  const r = device.current_state?.r ?? 0;
  const g = device.current_state?.g ?? 0;
  const b = device.current_state?.b ?? 0;
  const hasRgb = r > 0 || g > 0 || b > 0;
  const mode: LampVisualMode = !isOnline
    ? "offline"
    : !isOn
      ? "off"
      : hasRgb
        ? "color"
        : "white";
  const sourceAccent = mode === "color"
    ? rgbToHex(r, g, b)
    : mode === "white"
      ? kelvinToHex(colorTemperature)
      : mode === "offline"
        ? OFFLINE_ACCENT
        : OFF_ACCENT;
  const accent = isOn ? ensureVisibleLampAccent(sourceAccent) : sourceAccent;
  const deliveryPhase: LampDeliveryPhase = options.pending ? "pending" : "reported";

  const reportedDetail = mode === "offline"
    ? "Offline"
    : mode === "off"
      ? "Uit"
      : mode === "color"
        ? `${brightness}% / ${sourceAccent.toUpperCase()}`
        : `${brightness}% / ${colorTemperature}K`;

  return {
    isOnline,
    isOn,
    brightness,
    colorTemperature,
    mode,
    deliveryPhase,
    accent,
    statusLabel: options.pending ? "Wordt toegepast..." : reportedDetail,
    detailLabel: options.pending ? `${reportedDetail} - bevestiging volgt` : reportedDetail,
    ambientStyle: {
      ...createLampAmbientStyle(accent, isOn),
      "--lamp-brightness": `${brightness}%`,
    },
  };
}
