import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SurfaceHeaderProps {
  icon?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  action?: ReactNode;
  headingLevel?: 2 | 3 | 4;
  compact?: boolean;
  className?: string;
}

export function SurfaceHeader({
  icon,
  eyebrow,
  title,
  meta,
  action,
  headingLevel = 2,
  compact = false,
  className,
}: SurfaceHeaderProps) {
  const Heading = ("h" + String(headingLevel)) as ElementType;

  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-3",
        compact ? "mb-3" : "mb-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-hover)]"
          >
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? (
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
              {eyebrow}
            </p>
          ) : null}
          <Heading className="text-base font-bold leading-tight text-[var(--color-text)]">
            {title}
          </Heading>
          {meta ? (
            <div className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">{meta}</div>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
