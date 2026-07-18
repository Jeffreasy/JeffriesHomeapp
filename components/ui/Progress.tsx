import type { ComponentPropsWithRef, CSSProperties } from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps
  extends Omit<
    ComponentPropsWithRef<"div">,
    "aria-label" | "aria-valuemax" | "aria-valuemin" | "aria-valuenow" | "role"
  > {
  value: number;
  max?: number;
  label: string;
  tone?: "accent" | "success" | "warning" | "danger";
}

const toneClasses = {
  accent: "bg-[var(--color-primary)]",
  success: "bg-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]",
  danger: "bg-[var(--color-danger)]",
} as const;

export function Progress({
  value,
  max = 100,
  label,
  tone = "accent",
  className,
  ...props
}: ProgressProps) {
  const safeMax = Number.isFinite(max) && max > 0 ? max : 100;
  const normalizedValue = Number.isFinite(value) ? value : 0;
  const safeValue = Math.min(safeMax, Math.max(0, normalizedValue));
  const percentage = (safeValue / safeMax) * 100;
  const style = { "--progress-value": String(percentage) + "%" } as CSSProperties;

  return (
    <div
      {...props}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={safeMax}
      aria-valuenow={safeValue}
      className={cn("h-2 overflow-hidden rounded-full bg-[var(--color-surface-active)]", className)}
    >
      <div
        aria-hidden="true"
        style={style}
        className={cn(
          "h-full w-[var(--progress-value)] rounded-full transition-[width] duration-[var(--motion-slow)] ease-[var(--ease-standard)] motion-reduce:transition-none",
          toneClasses[tone],
        )}
      />
    </div>
  );
}
