"use client";

import { useId } from "react";
import { X } from "lucide-react";
import { useSwipe } from "@/hooks/useSwipe";
import { OverlaySurface } from "@/components/ui/OverlaySurface";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  closeLabel?: string;
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  open,
  onClose,
  title,
  ariaLabel = "Paneel",
  closeLabel = "Paneel sluiten",
  className,
  contentClassName,
  children,
}: BottomSheetProps) {
  const titleId = useId();
  const { onTouchStart, onTouchEnd, onTouchCancel } = useSwipe({
    onSwipeDown: onClose,
    threshold: 80,
  });

  return (
    <OverlaySurface
      open={open}
      onClose={onClose}
      presentation="sheet"
      maxWidth="lg"
      ariaLabel={title ? undefined : ariaLabel}
      ariaLabelledBy={title ? titleId : undefined}
      className={cn(
        "max-h-[min(88dvh,720px)] border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_-24px_70px_rgba(0,0,0,0.45)] sm:rounded-t-2xl",
        className,
      )}
    >
      <div
        className="shrink-0"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        <div className="flex justify-center pb-2 pt-3" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 pb-3">
          {title ? (
            <h2 id={titleId} className="min-w-0 truncate text-base font-semibold text-white">
              {title}
            </h2>
          ) : (
            <span className="sr-only">{ariaLabel}</span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-hover)] text-slate-400 transition-colors hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom,0px)]",
          contentClassName,
        )}
      >
        {children}
      </div>
    </OverlaySurface>
  );
}
