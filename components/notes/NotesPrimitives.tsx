import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";
import { type Tone, toneClasses } from "./NotesUtils";
import { Button } from "@/components/ui/Button";

export function MetricTile({
  icon: Icon,
  label,
  value,
  meta,
  tone = "neutral",
  onClick,
  active = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: string;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  const toneClass = toneClasses[tone];

  const inner = (
    <div className="flex items-start gap-2.5 sm:gap-3">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10", toneClass.surface)}>
        <Icon size={16} className={toneClass.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">{label}</p>
        <p className={cn("mt-1 truncate text-xl font-bold leading-tight sm:mt-2 sm:text-2xl", toneClass.text)}>{value}</p>
        <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-[var(--color-text-muted)] sm:line-clamp-none">{meta}</p>
      </div>
    </div>
  );

  if (onClick) {
    // Actionable tiles double as scope shortcuts, so they get real button
    // affordance (hover + focus ring + pressed state) instead of looking
    // clickable while being inert.
    return (
      <Button
        variant="secondary"
        fullWidth
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          surfaceVariants({ padding: "none" }),
          "justify-start p-3 text-left sm:p-4",
          toneClass.border,
          active && "ring-1 ring-[var(--color-primary)]",
          className,
        )}
      >
        {inner}
      </Button>
    );
  }

  return <div className={cn(surfaceVariants({ padding: "none" }), "p-3 sm:p-4", toneClass.border, className)}>{inner}</div>;
}

export function SectionTitle({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] sm:h-9 sm:w-9">
          <Icon size={16} className="text-[var(--color-primary-hover)]" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[var(--color-text)]">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-[var(--color-text-muted)]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function SegmentedButton({
  active,
  icon: Icon,
  children,
  onClick,
  className,
}: {
  active: boolean;
  icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <Button
      variant={active ? "primary" : "secondary"}
      size="sm"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-w-0 gap-2 rounded-lg px-3",
        className,
      )}
    >
      <Icon size={15} className="shrink-0" />
      {children}
    </Button>
  );
}
