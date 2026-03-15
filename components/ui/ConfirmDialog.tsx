"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "default";
}

interface ConfirmState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside ConfirmProvider");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const openConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, resolve });
    });
  }, []);

  const handleClose = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    setState(null);
  }, []);

  const isDanger = state?.variant === "danger";

  return (
    <ConfirmContext.Provider value={{ openConfirm }}>
      {children}
      <AnimatePresence>
        {state && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
              onClick={() => handleClose(false)}
            />
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.15 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              aria-describedby="confirm-message"
              className="fixed z-[101] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm glass rounded-2xl p-6 shadow-2xl"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <button
                onClick={() => handleClose(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Dialog sluiten"
              >
                <X size={16} />
              </button>

              <div className="flex items-start gap-3 mb-5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isDanger ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                  }}
                >
                  <AlertTriangle
                    size={17}
                    style={{ color: isDanger ? "#ef4444" : "#f59e0b" }}
                  />
                </div>
                <div>
                  {state.title && (
                    <p id="confirm-title" className="text-sm font-semibold text-white mb-1">
                      {state.title}
                    </p>
                  )}
                  <p id="confirm-message" className="text-sm text-slate-400">
                    {state.message}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => handleClose(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-300 border border-white/10 text-sm hover:bg-white/10 transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => handleClose(true)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    background: isDanger ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                    color: isDanger ? "#ef4444" : "#f59e0b",
                    border: `1px solid ${isDanger ? "rgba(239,68,68,0.30)" : "rgba(245,158,11,0.30)"}`,
                  }}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                >
                  {state.confirmLabel ?? "Bevestigen"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
