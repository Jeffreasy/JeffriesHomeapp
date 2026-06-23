import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Tone, toneClasses } from "./NotesUtils";

export function MetricTile({
  icon: Icon,
  label,
  value,
  meta,
  tone = "slate",
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
        <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
        <p className={cn("mt-1 truncate text-xl font-bold leading-tight sm:mt-2 sm:text-2xl", toneClass.text)}>{value}</p>
        <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-slate-500 sm:line-clamp-none">{meta}</p>
      </div>
    </div>
  );

  if (onClick) {
    // Actionable tiles double as scope shortcuts, so they get real button
    // affordance (hover + focus ring + pressed state) instead of looking
    // clickable while being inert.
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "glass min-w-0 cursor-pointer p-3 text-left outline-none transition-colors hover:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-amber-400/60 sm:p-4",
          toneClass.border,
          active && "ring-1 ring-amber-400/50",
          className,
        )}
      >
        {inner}
      </button>
    );
  }

  return <div className={cn("glass min-w-0 p-3 sm:p-4", toneClass.border, className)}>{inner}</div>;
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
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 sm:h-9 sm:w-9">
          <Icon size={16} className="text-amber-300" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
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
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/60",
        active
          ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200",
        className,
      )}
    >
      <Icon size={15} className="shrink-0" />
      {children}
    </button>
  );
}
