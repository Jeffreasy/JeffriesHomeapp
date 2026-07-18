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
import { IconButton } from "@/components/ui/IconButton";
import { OverlaySurface, type OverlayPresentation } from "@/components/ui/OverlaySurface";
import type { UiTone } from "@/lib/ui/tones";
import { cn } from "@/lib/utils";

const ModalCloseContext = createContext<(() => void) | null>(null);

export function useModalRequestClose() {
  return useContext(ModalCloseContext);
}

export interface ModalProps {
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
  tone?: UiTone | "surface";
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

const modalToneClasses: Record<UiTone | "surface", string> = {
  surface: "border-[var(--color-border)] bg-[var(--color-surface)]",
  neutral: "border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)]",
  accent: "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]",
  info: "border-[var(--color-info-border)] bg-[var(--color-info-subtle)]",
  success: "border-[var(--color-success-border)] bg-[var(--color-success-subtle)]",
  warning: "border-[var(--color-warning-border)] bg-[var(--color-warning-subtle)]",
  danger: "border-[var(--color-danger-border)] bg-[var(--color-danger-subtle)]",
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
  tone = "surface",
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
      className={cn("shadow-[var(--shadow-overlay)]", modalToneClasses[tone], className)}
    >
      <ModalCloseContext.Provider value={requestClose}>
        <div className="flex min-h-0 flex-1 flex-col">
          {presentation !== "dialog" ? (
            <div className="flex shrink-0 justify-center pb-1 pt-3 sm:hidden" aria-hidden="true">
              <div className="h-1 w-10 rounded-full bg-[var(--color-border-strong)]" />
            </div>
          ) : null}

          <header
            className={cn(
              "flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-5 py-3 sm:px-6 sm:py-4",
              headerClassName,
            )}
          >
            <div className="flex min-w-0 items-center gap-3">
              {icon ? (
                <div className="shrink-0 text-[var(--color-text-muted)]" aria-hidden="true">
                  {icon}
                </div>
              ) : null}
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-base font-bold tracking-tight text-[var(--color-text)] sm:text-lg">
                  {title}
                </h2>
                {subtitle ? (
                  <div id={subtitleId} className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
                    {subtitle}
                  </div>
                ) : null}
              </div>
            </div>
            <IconButton
              icon={<X size={20} />}
              label={closeLabel}
              onClick={requestClose}
              disabled={closeDisabled}
              className="-mr-1"
            />
          </header>

          <div className={cn("min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6", contentClassName)}>
            {children}
          </div>

          {footer ? (
            <footer
              className={cn(
                "shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:px-6 sm:pb-3",
                footerClassName,
              )}
            >
              {footer}
            </footer>
          ) : null}
        </div>
      </ModalCloseContext.Provider>
    </OverlaySurface>
  );
}
