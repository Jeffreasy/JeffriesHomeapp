import type { ComponentPropsWithRef, CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface RangeProps extends Omit<ComponentPropsWithRef<"input">, "type"> {
  fillValue?: number;
  track?: "default" | "accent" | "lamp" | "temperature";
}

const trackClasses = {
  default: "",
  accent: "[--range-fill-color:var(--color-primary)]",
  lamp:
    "[--range-fill-color:var(--lamp-accent,var(--color-primary))] [--range-thumb-color:var(--lamp-accent,var(--color-primary))] [--range-thumb-shadow:var(--lamp-ambient-ring,var(--color-primary-border))]",
  temperature:
    "[--range-thumb-color:var(--color-warning)] [--range-thumb-shadow:var(--color-warning-border)] [--range-track:var(--range-temperature-track)]",
} as const;

export function Range({
  className,
  fillValue,
  track = "default",
  style,
  ...props
}: RangeProps) {
  const minimum = Number(props.min ?? 0);
  const maximum = Number(props.max ?? 100);
  const normalizedMinimum = Number.isFinite(minimum) ? minimum : 0;
  const normalizedMaximum = Number.isFinite(maximum) && maximum > normalizedMinimum
    ? maximum
    : normalizedMinimum + 100;
  const fillPercentage = fillValue === undefined
    ? undefined
    : ((fillValue - normalizedMinimum) / (normalizedMaximum - normalizedMinimum)) * 100;
  const rangeStyle = fillPercentage === undefined
    ? style
    : {
        ...style,
        "--range-fill": String(Math.min(100, Math.max(0, fillPercentage))) + "%",
      } as CSSProperties;

  return (
    <input
      {...props}
      type="range"
      className={cn("range-control", trackClasses[track], className)}
      style={rangeStyle}
    />
  );
}
