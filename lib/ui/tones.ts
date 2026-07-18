export type UiTone =
  | "neutral"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface ToneClasses {
  border: string;
  surface: string;
  icon: string;
  text: string;
  dot: string;
}

export const uiToneClasses: Record<UiTone, ToneClasses> = {
  neutral: {
    border: "border-[var(--color-border)]",
    surface: "bg-[var(--color-surface-muted)]",
    icon: "text-[var(--color-text-muted)]",
    text: "text-[var(--color-text)]",
    dot: "bg-[var(--color-text-muted)]",
  },
  accent: {
    border: "border-[var(--color-primary-border)]",
    surface: "bg-[var(--color-primary-subtle)]",
    icon: "text-[var(--color-primary-hover)]",
    text: "text-[var(--color-primary-hover)]",
    dot: "bg-[var(--color-primary)]",
  },
  info: {
    border: "border-[var(--color-info-border)]",
    surface: "bg-[var(--color-info-subtle)]",
    icon: "text-[var(--color-info)]",
    text: "text-[var(--color-info)]",
    dot: "bg-[var(--color-info)]",
  },
  success: {
    border: "border-[var(--color-success-border)]",
    surface: "bg-[var(--color-success-subtle)]",
    icon: "text-[var(--color-success)]",
    text: "text-[var(--color-success)]",
    dot: "bg-[var(--color-success)]",
  },
  warning: {
    border: "border-[var(--color-warning-border)]",
    surface: "bg-[var(--color-warning-subtle)]",
    icon: "text-[var(--color-warning)]",
    text: "text-[var(--color-warning)]",
    dot: "bg-[var(--color-warning)]",
  },
  danger: {
    border: "border-[var(--color-danger-border)]",
    surface: "bg-[var(--color-danger-subtle)]",
    icon: "text-[var(--color-danger)]",
    text: "text-[var(--color-danger)]",
    dot: "bg-[var(--color-danger)]",
  },
};
