"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/hooks/useFocusTrap";

/**
 * Guarded close, exposed to modal children (R11). "Annuleren"-knoppen in de
 * modal-body moeten dezelfde dirty-guard doorlopen als Escape/backdrop/X in
 * plaats van onClose direct aan te roepen.
 */
const ModalCloseContext = createContext<(() => void) | null>(null);

export function useModalRequestClose() {
  return useContext(ModalCloseContext);
}

/**
 * Drop-in vervanging voor de losse "Annuleren"-knoppen in modals: routeert
 * door de dirty-guard van de omringende Modal. `onFallback` dekt gebruik
 * buiten een Modal (zou niet moeten voorkomen).
 */
export function ModalCancelButton({
  className,
  children = "Annuleren",
  onFallback,
}: {
  className?: string;
  children?: React.ReactNode;
  onFallback?: () => void;
}) {
  const requestClose = useContext(ModalCloseContext);
  return (
    <button type="button" onClick={requestClose ?? onFallback} className={className}>
      {children}
    </button>
  );
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  className?: string;
  theme?: "primary" | "sky" | "emerald" | "rose" | "violet" | "slate" | "amber";
  /**
   * When true, an accidental close (Escape, backdrop click, X) first asks
   * "Wijzigingen verwerpen?" before calling onClose. Default (undefined/false)
   * keeps the original close-immediately behavior.
   */
  dirty?: boolean;
  /** Override for the discard-confirmation question. */
  dirtyMessage?: string;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

const themeClasses = {
  primary: "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)]",
  sky: "border-sky-500/20 bg-sky-500/10",
  emerald: "border-emerald-500/20 bg-emerald-500/10",
  rose: "border-rose-500/20 bg-rose-500/10",
  violet: "border-violet-500/20 bg-violet-500/10",
  slate: "border-slate-500/20 bg-slate-500/10",
  amber: "border-amber-500/20 bg-amber-500/10",
};

export function Modal({
  isOpen,
  onClose,
  title,
  icon,
  children,
  maxWidth = "2xl",
  className,
  theme = "primary",
  dirty = false,
  // De overlay-titel stelt de vraag al ("Wijzigingen verwerpen?"); de
  // standaardtekst herhaalt die niet (diff-review low).
  dirtyMessage = "Niet-opgeslagen invoer gaat verloren.",
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  useFocusTrap(isOpen, contentRef);

  // Reset a pending discard-confirm when the modal opens/closes (render-time
  // state adjustment instead of an effect, per react-hooks/set-state-in-effect).
  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (prevOpen !== isOpen) {
    setPrevOpen(isOpen);
    setConfirmingDiscard(false);
  }

  // Dirty-guarded close: ask for confirmation before discarding typed input.
  const requestClose = useCallback(() => {
    if (dirty) {
      setConfirmingDiscard(true);
      return;
    }
    onClose();
  }, [dirty, onClose]);

  // Prevent scrolling when modal is open. Save and restore the PREVIOUS value
  // (mirroring BottomNav) so a Modal opened above a BottomSheet/More-sheet
  // doesn't unlock body scroll while that sheet is still open (R3).
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (confirmingDiscard) {
        // Escape in the confirm step = keep editing.
        setConfirmingDiscard(false);
        return;
      }
      requestClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, requestClose, confirmingDiscard]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto p-3 pt-6 sm:items-center sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={requestClose}
          />

          {/* Modal content */}
          <motion.div
            ref={contentRef}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className={cn(
              "relative flex max-h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden rounded-2xl shadow-2xl glass focus:outline-none sm:max-h-[calc(100dvh-3rem)]",
              maxWidthClasses[maxWidth],
              themeClasses[theme],
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/5 px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                {icon && <div className="text-white/80">{icon}</div>}
                <h2 id="modal-title" className="text-lg font-bold text-white tracking-tight">
                  {title}
                </h2>
              </div>
              <button
                onClick={requestClose}
                className="p-1.5 -mr-1.5 text-white/50 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                aria-label="Sluiten"
              >
                <X size={20} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 custom-scrollbar sm:p-6">
              <ModalCloseContext.Provider value={requestClose}>
                {children}
              </ModalCloseContext.Provider>
            </div>

            {/* Discard-confirmation overlay (only reachable when dirty) */}
            {confirmingDiscard && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
                <div
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="modal-discard-title"
                  className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.97)] p-5 shadow-2xl"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                      <AlertTriangle size={17} className="text-amber-400" />
                    </div>
                    <div className="min-w-0">
                      <p id="modal-discard-title" className="text-sm font-semibold text-white">
                        Wijzigingen verwerpen?
                      </p>
                      <p className="mt-1 text-sm text-slate-400">{dirtyMessage}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmingDiscard(false)}
                      autoFocus
                      className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
                    >
                      Verder bewerken
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDiscard(false);
                        onClose();
                      }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 transition-colors hover:bg-rose-500/25"
                    >
                      Verwerpen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
