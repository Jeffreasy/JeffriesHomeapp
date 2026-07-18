import type { CSSProperties } from "react";
import { type UiTone, uiToneClasses } from "@/lib/ui/tones";

export type ScheduleTone = UiTone;
export type ScheduleCategoryTone = Extract<UiTone, "neutral" | "accent" | "info">;

export interface SchedulePresentation {
  tone: ScheduleTone;
  color: string;
  surface: string;
  border: string;
  text: string;
  dot: string;
}

const TONE_COLORS: Record<ScheduleTone, string> = {
  neutral: "var(--color-text-muted)",
  accent: "var(--color-primary)",
  info: "var(--color-info)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
};

const SHIFT_TONES = {
  vroeg: "accent",
  laat: "info",
  dienst: "neutral",
} as const satisfies Record<string, ScheduleCategoryTone>;

export function tonePresentation(tone: ScheduleTone): SchedulePresentation {
  const classes = uiToneClasses[tone];
  return {
    tone,
    color: TONE_COLORS[tone],
    surface: classes.surface,
    border: classes.border,
    text: classes.text,
    dot: classes.dot,
  };
}

export function shiftPresentation(type: string): SchedulePresentation {
  const key = type.trim().toLocaleLowerCase("nl-NL") as keyof typeof SHIFT_TONES;
  return tonePresentation(SHIFT_TONES[key] ?? "info");
}

export function teamPresentation(team: string): SchedulePresentation {
  const prefix = team.trim().toLocaleUpperCase("nl-NL").charAt(0);
  if (prefix === "R") return tonePresentation("info");
  if (prefix === "A") return tonePresentation("accent");
  return tonePresentation("neutral");
}

export function conflictPresentation(level: string): SchedulePresentation {
  if (level === "hard") return tonePresentation("danger");
  if (level === "soft") return tonePresentation("warning");
  return tonePresentation("info");
}

export function statusPresentation(status?: string | null): SchedulePresentation {
  switch (status) {
    case "PendingCreate":
    case "PendingUpdate":
      return tonePresentation("info");
    case "PendingDelete":
      return tonePresentation("danger");
    case "Bezig":
      return tonePresentation("success");
    case "Rooster":
      return tonePresentation("info");
    default:
      return tonePresentation("neutral");
  }
}

export function scheduleToneVars(tone: ScheduleTone): CSSProperties {
  return {
    "--schedule-accent": TONE_COLORS[tone],
  } as CSSProperties;
}
