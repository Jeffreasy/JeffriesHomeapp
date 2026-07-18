import type { CSSProperties } from "react";

// Maps a label palette key (stored on the backend) to validated visual variables.
// Keep the keys in sync with store.NormalizeLabelColor on the backend.

export const LABEL_COLOR_KEYS = [
  "slate",
  "amber",
  "sky",
  "emerald",
  "rose",
  "violet",
  "orange",
  "teal",
  "blue",
  "pink",
  "lime",
  "cyan",
  "red",
  "indigo",
  "fuchsia",
] as const;

export type LabelColorKey = (typeof LABEL_COLOR_KEYS)[number];

const LABEL_PALETTE: Record<LabelColorKey, string> = {
  slate: "#94a3b8",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  emerald: "#10b981",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  orange: "#f97316",
  teal: "#14b8a6",
  blue: "#3b82f6",
  pink: "#ec4899",
  lime: "#84cc16",
  cyan: "#06b6d4",
  red: "#ef4444",
  indigo: "#6366f1",
  fuchsia: "#d946ef",
};

export interface ContactLabelColorVariables extends CSSProperties {
  "--contact-label-color": string;
  "--contact-label-surface": string;
  "--contact-label-border": string;
  "--contact-label-text": string;
}

export function normalizeLabelColor(color?: string | null): LabelColorKey {
  const normalized = color?.trim().toLowerCase() ?? "";
  return (LABEL_COLOR_KEYS as readonly string[]).includes(normalized)
    ? (normalized as LabelColorKey)
    : "slate";
}

export function labelColorStyle(color?: string | null): ContactLabelColorVariables {
  const base = LABEL_PALETTE[normalizeLabelColor(color)];
  return {
    "--contact-label-color": base,
    "--contact-label-surface": `color-mix(in srgb, ${base} 12%, transparent)`,
    "--contact-label-border": `color-mix(in srgb, ${base} 30%, transparent)`,
    "--contact-label-text": `color-mix(in srgb, ${base} 45%, white)`,
  };
}

export function labelChipClasses(): string {
  return "border-[var(--contact-label-border)] bg-[var(--contact-label-surface)] text-[var(--contact-label-text)]";
}

export function labelDotClasses(): string {
  return "bg-[var(--contact-label-color)]";
}
