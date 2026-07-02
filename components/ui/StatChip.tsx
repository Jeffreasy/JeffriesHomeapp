import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toneClasses, type Tone } from "@/components/notes/NotesUtils";

/**
 * A compact one-line stat chip — "[icon] Label value" — with the detail in a
 * tooltip. Shared across the notes, rooster and agenda pages so a summary row
 * never becomes a wall of chunky cards. Doubles as a filter when onClick is set.
 */
export function StatChip({
  icon: Icon,
  label,
  value,
  meta,
  inlineMeta,
  tone = "slate",
  onClick,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  meta?: string;
  /**
   * Optional VISIBLE meta line rendered inline after the value (title-tooltips
   * are unreachable on touch). Keep it short, e.g. "Volgende: 4 jul".
   */
  inlineMeta?: string;
  tone?: Tone;
  onClick?: () => void;
  active?: boolean;
}) {
  const t = toneClasses[tone];
  const content = (
    <>
      <Icon size={14} className={cn("shrink-0", t.icon)} />
      <span className="text-slate-400">{label}</span>
      <span className={cn("font-semibold tabular-nums", t.text)}>{value}</span>
      {inlineMeta && (
        <span className="max-w-[10rem] truncate text-xs text-slate-500">
          · {inlineMeta}
        </span>
      )}
    </>
  );
  const cls = cn(
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs outline-none transition-colors sm:text-sm",
    active ? "border-amber-500/40 bg-amber-500/15" : "border-[var(--color-border)] bg-[var(--color-surface)]",
    onClick && "cursor-pointer hover:bg-[var(--color-surface-hover)] focus-visible:ring-2 focus-visible:ring-amber-400/60",
  );
  if (onClick) {
    return (
      <button type="button" title={meta} onClick={onClick} aria-pressed={active} className={cls}>
        {content}
      </button>
    );
  }
  return (
    <span title={meta} className={cls}>
      {content}
    </span>
  );
}
