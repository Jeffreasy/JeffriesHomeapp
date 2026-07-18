"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  type ReactNode,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { OverlaySurface, type OverlayPresentation } from "@/components/ui/OverlaySurface";

const ModalCloseContext = createContext<(() => void) | null>(null);

export function useModalRequestClose() {
  return useContext(ModalCloseContext);
}

export function ModalCancelButton({
  className,
  children = "Annuleren",
  onFallback,
}: {
  className?: string;
  children?: ReactNode;
  onFallback?: () => void;
}) {
  const requestClose = useContext(ModalCloseContext);
  return (
    <button
      type="button"
      onClick={requestClose ?? onFallback}
      className={cn("inline-flex min-h-11 items-center justify-center", className)}
    >
      {children}
    </button>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  theme?: "primary" | "sky" | "emerald" | "rose" | "violet" | "slate" | "amber" | "surface";
  presentation?: OverlayPresentation;
  dirty?: boolean;
  dirtyMessage?: string;
  closeLabel?: string;
  closeDisabled?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  dataAppModal?: string;
  ariaBusy?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const themeClasses = {
  primary: "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]",
  sky: "border-sky-500/20 bg-sky-500/10",
  emerald: "border-emerald-500/20 bg-emerald-500/10",
  rose: "border-rose-500/20 bg-rose-500/10",
  violet: "border-violet-500/20 bg-violet-500/10",
  slate: "border-slate-500/20 bg-slate-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
  surface: "border-[var(--color-border)] bg-[var(--color-surface)]",
};

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = "2xl",
  className,
  contentClassName,
  headerClassName,
  footerClassName,
  theme = "primary",
  presentation = "responsive",
  dirty = false,
  dirtyMessage = "Niet-opgeslagen invoer gaat verloren.",
  closeLabel = "Sluiten",
  closeDisabled = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  dataAppModal,
  ariaBusy,
  initialFocusRef,
}: ModalProps) {
  const titleId = useId();
  const subtitleId = useId();
  const { openConfirm } = useConfirm();

  const requestClose = useCallback(async () => {
    if (closeDisabled) return;
    if (dirty) {
      const discard = await openConfirm({
        title: "Wijzigingen verwerpen?",
        message: dirtyMessage,
        confirmLabel: "Verwerpen",
        cancelLabel: "Verder bewerken",
        variant: "danger",
      });
      if (!discard) return;
    }
    onClose();
  }, [closeDisabled, dirty, dirtyMessage, onClose, openConfirm]);

  return (
    <OverlaySurface
      open={isOpen}
      onClose={requestClose}
      role="dialog"
      ariaLabelledBy={titleId}
      ariaDescribedBy={subtitle ? subtitleId : undefined}
      presentation={presentation}
      maxWidth={maxWidth}
      closeOnBackdrop={closeOnBackdrop && !closeDisabled}
      closeOnEscape={closeOnEscape && !closeDisabled}
      initialFocusRef={initialFocusRef}
      dataAppModal={dataAppModal}
      ariaBusy={ariaBusy}
      className={cn("glass", themeClasses[theme], className)}
    >
      <ModalCloseContext.Provider value={requestClose}>
        <div className="flex min-h-0 flex-1 flex-col">
          {presentation !== "dialog" && (
            <div className="flex shrink-0 justify-center pb-1 pt-3 sm:hidden" aria-hidden="true">
              <div className="h-1 w-10 rounded-full bg-white/20" />
            </div>
          )}

          <header
            className={cn(
              "flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3 sm:px-6 sm:py-4",
              headerClassName,
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              {icon && <div className="shrink-0 text-white/80" aria-hidden="true">{icon}</div>}
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-base font-bold tracking-tight text-white sm:text-lg">
                  {title}
                </h2>
                {subtitle && (
                  <div id={subtitleId} className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={requestClose}
              disabled={closeDisabled}
              className="-mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={closeLabel}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 custom-scrollbar sm:p-6", contentClassName)}>
            {children}
          </div>

          {footer && (
            <footer
              className={cn(
                "shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-3",
                footerClassName,
              )}
            >
              {footer}
            </footer>
          )}
        </div>
      </ModalCloseContext.Provider>
    </OverlaySurface>
  );
}
