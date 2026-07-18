import type { CSSProperties } from "react";
import type { Device } from "@/lib/api";
import { hexToRgb, kelvinToHex, rgbToHex } from "@/lib/utils";

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

function alphaColor(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`;
}

function linearChannel(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function luminance({ r, g, b }: { r: number; g: number; b: number }): number {
  return (
    0.2126 * linearChannel(r) +
    0.7152 * linearChannel(g) +
    0.0722 * linearChannel(b)
  );
}

function contrastRatio(
  first: { r: number; g: number; b: number },
  second: { r: number; g: number; b: number },
): number {
  const lighter = Math.max(luminance(first), luminance(second));
  const darker = Math.min(luminance(first), luminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Lamp colours are physical-state data, not theme tokens. Keep their hue while
 * lifting very dark RGB values until controls remain visible on the dark shell.
 */
export function ensureVisibleLampAccent(hex: string, minimumContrast = 3): string {
  const source = hexToRgb(hex);
  if (contrastRatio(source, DARK_SURFACE) >= minimumContrast) {
    return rgbToHex(source.r, source.g, source.b);
  }

  for (let mix = 0.08; mix <= 0.8; mix += 0.08) {
    const candidate = {
      r: source.r + (255 - source.r) * mix,
      g: source.g + (255 - source.g) * mix,
      b: source.b + (255 - source.b) * mix,
    };
    if (contrastRatio(candidate, DARK_SURFACE) >= minimumContrast) {
      return rgbToHex(candidate.r, candidate.g, candidate.b);
    }
  }

  return OFF_ACCENT;
}

/** Runtime CSS variables are the only bridge from a physical colour into UI styling. */
export function createLampAmbientStyle(accent: string, active: boolean): LampAmbientStyle {
  const safeAccent = active ? ensureVisibleLampAccent(accent) : accent;
  const textAccent = ensureVisibleLampAccent(safeAccent, 4.5);
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
