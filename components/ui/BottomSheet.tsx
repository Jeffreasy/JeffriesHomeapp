"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useSwipe } from "@/hooks/useSwipe";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * Mobile-first BottomSheet.
 * - Slides up from the bottom of the screen.
 * - Swipe-down to dismiss.
 * - focus-trapped while open.
 * - Respects iOS safe-area-inset-bottom.
 */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);

  const { onTouchStart, onTouchEnd, onTouchCancel } = useSwipe({
    onSwipeDown: onClose,
    threshold: 80,
  });

  // Focus trap: move focus into sheet when opened
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const focusable = sheetRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Prevent body scroll while sheet is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={title ?? "Lampbediening"}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[81] flex flex-col"
            style={{
              background: "#12121a",
              borderTop: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "20px 20px 0 0",
              maxHeight: "85vh",
              paddingBottom: "env(safe-area-inset-bottom, 16px)",
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchCancel}
          >
            {/* Drag handle + header */}
            <div className="flex-shrink-0">
              {/* Drag pill */}
              <div className="flex justify-center pt-3 pb-2">
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                  aria-hidden="true"
                />
              </div>

              {/* Title bar */}
              {title && (
                <div
                  className="flex items-center justify-between px-5 pb-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <h2 className="text-base font-semibold text-white">{title}</h2>
                  <button
                    onClick={onClose}
                    aria-label="Sheet sluiten"
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-300 transition-colors"
                    style={{ background: "rgba(255,255,255,0.05)" }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
