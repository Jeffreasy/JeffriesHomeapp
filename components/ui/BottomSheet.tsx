"use client";

import { useId, type RefObject } from "react";
import { X } from "lucide-react";
import { useSwipe } from "@/hooks/useSwipe";
import { IconButton } from "@/components/ui/IconButton";
import { OverlaySurface } from "@/components/ui/OverlaySurface";
import { cn } from "@/lib/utils";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  ariaLabel?: string;
  closeLabel?: string;
  className?: string;
  contentClassName?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
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
  initialFocusRef,
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
      initialFocusRef={initialFocusRef}
      className={cn(
        "border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-overlay)] sm:rounded-t-2xl",
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
          <div className="h-1 w-10 rounded-full bg-[var(--color-border-strong)]" />
        </div>
        <div className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 pb-3">
          {title ? (
            <h2 id={titleId} className="min-w-0 truncate text-base font-semibold text-[var(--color-text)]">
              {title}
            </h2>
          ) : (
            <span className="sr-only">{ariaLabel}</span>
          )}
          <IconButton
            icon={<X size={18} />}
            label={closeLabel}
            onClick={onClose}
            className="-mr-1"
          />
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
