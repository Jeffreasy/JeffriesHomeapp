import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { uiToneClasses, type UiTone } from "@/lib/ui/tones";

/** Compact summary control shared by notes, roster and agenda. */
export function StatChip({
  icon: Icon,
  label,
  value,
  meta,
  inlineMeta,
  tone = "neutral",
  onClick,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta?: string;
  inlineMeta?: string;
  tone?: UiTone;
  onClick?: () => void;
  active?: boolean;
}) {
  const toneClass = uiToneClasses[tone];
  const content = (
    <>
      <Icon size={14} className={cn("shrink-0", toneClass.icon)} aria-hidden="true" />
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className={cn("font-semibold tabular-nums", toneClass.text)}>{value}</span>
      {inlineMeta ? (
        <span className="max-w-40 truncate text-xs text-[var(--color-text-subtle)]">
          · {inlineMeta}
        </span>
      ) : null}
    </>
  );
  const className = cn(
    "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs outline-none transition-colors sm:text-sm",
    onClick ? "min-h-11" : "h-8",
    active
      ? cn(toneClass.border, toneClass.surface)
      : "border-[var(--color-border)] bg-[var(--color-surface)]",
    onClick &&
      "cursor-pointer hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]",
  );

  if (onClick) {
    return (
      <button
        type="button"
        title={meta}
        onClick={onClick}
        aria-pressed={active}
        className={className}
      >
        {content}
      </button>
    );
  }

  return (
    <span title={meta} className={className}>
      {content}
    </span>
  );
}
