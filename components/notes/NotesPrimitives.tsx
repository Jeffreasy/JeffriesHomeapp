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
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta: string;
  tone?: Tone;
}) {
  const toneClass = toneClasses[tone];

  return (
    <div className={cn("glass p-4", toneClass.border)}>
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", toneClass.surface)}>
          <Icon size={18} className={toneClass.icon} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
          <p className={cn("mt-2 truncate text-2xl font-bold leading-tight", toneClass.text)}>{value}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{meta}</p>
        </div>
      </div>
    </div>
  );
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
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
          <Icon size={17} className="text-amber-300" />
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
}: {
  active: boolean;
  icon: LucideIcon;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
        active
          ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
      )}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}
