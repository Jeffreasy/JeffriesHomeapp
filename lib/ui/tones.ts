export type CoreTone = "amber" | "green" | "rose" | "sky" | "indigo" | "slate";

export type ToneClasses = {
  border: string;
  surface: string;
  icon: string;
  text: string;
};

/** Canonical semantic tones for shared UI. Domain-specific meaning stays in domain code. */
export const coreToneClasses: Record<CoreTone, ToneClasses> = {
  amber: {
    border: "border-amber-500/25",
    surface: "bg-amber-500/10",
    icon: "text-amber-300",
    text: "text-amber-200",
  },
  green: {
    border: "border-emerald-500/20",
    surface: "bg-emerald-500/10",
    icon: "text-emerald-300",
    text: "text-emerald-200",
  },
  rose: {
    border: "border-rose-500/20",
    surface: "bg-rose-500/10",
    icon: "text-rose-300",
    text: "text-rose-200",
  },
  sky: {
    border: "border-sky-500/20",
    surface: "bg-sky-500/10",
    icon: "text-sky-300",
    text: "text-sky-200",
  },
  indigo: {
    border: "border-indigo-500/20",
    surface: "bg-indigo-500/10",
    icon: "text-indigo-300",
    text: "text-indigo-200",
  },
  slate: {
    border: "border-[var(--color-border)]",
    surface: "bg-[var(--color-surface)]",
    icon: "text-[var(--color-text-muted)]",
    text: "text-[var(--color-text)]",
  },
};
