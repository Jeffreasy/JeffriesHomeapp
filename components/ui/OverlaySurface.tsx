"use client";

import {
  useRef,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { useOverlayLifecycle } from "@/hooks/useOverlayLifecycle";
import {
  getOverlayPortalRoot,
  type OverlayPriority,
} from "@/lib/overlays/overlay-manager";
import { cn } from "@/lib/utils";

export type OverlayPresentation = "dialog" | "responsive" | "sheet" | "drawer";

interface OverlaySurfaceProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  role?: "dialog" | "alertdialog";
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  presentation?: OverlayPresentation;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl";
  className?: string;
  style?: CSSProperties;
  containerClassName?: string;
  backdropClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  trapFocus?: boolean;
  priority?: OverlayPriority;
  dataAppModal?: string;
  ariaBusy?: boolean;
}

const maxWidthClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  "2xl": "sm:max-w-2xl",
  "3xl": "sm:max-w-3xl",
  "4xl": "sm:max-w-4xl",
  "5xl": "sm:max-w-5xl",
};

const layerClasses = [
  "z-[100]",
  "z-[102]",
  "z-[104]",
  "z-[106]",
  "z-[108]",
  "z-[110]",
  "z-[112]",
  "z-[114]",
];

const containerClasses: Record<OverlayPresentation, string> = {
  dialog: "items-center justify-center p-3 sm:p-6",
  responsive: "items-end justify-center pt-[env(safe-area-inset-top)] sm:items-center sm:p-6",
  sheet: "items-end justify-center pt-[env(safe-area-inset-top)]",
  drawer: "items-stretch justify-end",
};

const panelClasses: Record<OverlayPresentation, string> = {
  dialog: "max-h-[calc(100dvh-1.5rem)] rounded-2xl sm:max-h-[calc(100dvh-3rem)]",
  responsive: "max-h-[calc(100dvh-env(safe-area-inset-top))] rounded-t-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl",
  sheet: "max-h-[min(88dvh,720px)] rounded-t-2xl",
  drawer: "h-dvh max-h-dvh sm:max-w-md",
};

export function OverlaySurface({
  open,
  onClose,
  children,
  role = "dialog",
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
  presentation = "responsive",
  maxWidth = "2xl",
  className,
  style,
  containerClassName,
  backdropClassName,
  closeOnBackdrop = true,
  closeOnEscape = true,
  initialFocusRef,
  trapFocus = true,
  priority = "standard",
  dataAppModal,
  ariaBusy,
}: OverlaySurfaceProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const { isTopMost, layerIndex, overlayId } = useOverlayLifecycle(open, panelRef, {
    initialFocusRef,
    onEscape: closeOnEscape ? onClose : undefined,
    trapFocus,
    priority,
  });
  const layerClass = priority === "critical"
    ? "z-[130]"
    : layerClasses[Math.min(Math.max(layerIndex, 0), layerClasses.length - 1)];

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key={overlayId}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          data-overlay-layer={overlayId}
          data-app-modal={dataAppModal}
          aria-hidden={isTopMost ? undefined : true}
          inert={isTopMost ? undefined : true}
          className={cn(
            "fixed inset-0 flex min-h-0",
            layerClass,
            !isTopMost && "pointer-events-none",
            containerClasses[presentation],
            containerClassName,
          )}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            onClick={closeOnBackdrop && isTopMost ? onClose : undefined}
            className={cn(
              "absolute inset-0 cursor-default bg-black/65 backdrop-blur-sm",
              closeOnBackdrop && "cursor-pointer",
              backdropClassName,
            )}
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role={role}
            aria-modal="true"
            aria-label={ariaLabel}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            aria-busy={ariaBusy || undefined}
            data-app-modal={dataAppModal}
            style={style}
            initial={presentation === "drawer" ? { x: 32, opacity: 0 } : presentation === "sheet" || presentation === "responsive" ? { y: 24, opacity: 0 } : { y: 8, scale: 0.98, opacity: 0 }}
            animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            exit={presentation === "drawer" ? { x: 32, opacity: 0 } : presentation === "sheet" || presentation === "responsive" ? { y: 24, opacity: 0 } : { y: 8, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.24 }}
            className={cn(
              "relative flex min-h-0 w-full flex-col overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl focus:outline-none",
              panelClasses[presentation],
              presentation !== "drawer" && maxWidthClasses[maxWidth],
              className,
            )}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    getOverlayPortalRoot(),
  );
}
