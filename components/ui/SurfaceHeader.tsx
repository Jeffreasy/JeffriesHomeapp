import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SurfaceHeaderProps {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  compact?: boolean;
  className?: string;
}

/**
 * Canonical heading contract for dashboard surfaces. Domain adapters supply
 * their icon and action, while spacing, hierarchy and truncation stay shared.
 */
export function SurfaceHeader({
  icon,
  eyebrow,
  title,
  meta,
  action,
  compact = false,
  className,
}: SurfaceHeaderProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center justify-between gap-3",
        compact ? "mb-3" : "mb-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]"
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
            {eyebrow}
          </p>
          <h2 className="truncate text-base font-bold text-[var(--color-text)]">{title}</h2>
        </div>
      </div>
      {action ??
        (meta ? (
          <span className="shrink-0 text-xs text-[var(--color-text-muted)]">{meta}</span>
        ) : null)}
    </div>
  );
}
