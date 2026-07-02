"use client";

import { createContext, useContext, useCallback, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);
  // Per-toast dismiss timers, kept out of state so pausing/resuming on hover
  // doesn't re-render. `remaining` is the time left when a timer was paused.
  const timersRef = useRef(
    new Map<string, { handle: ReturnType<typeof setTimeout>; expiresAt: number; remaining: number }>()
  );

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer.handle);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const scheduleDismiss = useCallback(
    (id: string, delay: number) => {
      const handle = setTimeout(() => {
        timersRef.current.delete(id);
        removeToast(id);
      }, delay);
      timersRef.current.set(id, { handle, expiresAt: Date.now() + delay, remaining: delay });
    },
    [removeToast]
  );

  // Pause the auto-dismiss while the user is reading (hover) or has focus
  // inside the toast — a toast that vanishes mid-read is worse than none.
  const pauseDismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (!timer) return;
    clearTimeout(timer.handle);
    timer.remaining = Math.max(0, timer.expiresAt - Date.now());
  }, []);

  const resumeDismiss = useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id);
      if (!timer) return;
      clearTimeout(timer.handle);
      // Give at least a second after the pointer/focus leaves.
      scheduleDismiss(id, Math.max(1000, timer.remaining));
    },
    [scheduleDismiss]
  );

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = `toast-${++counterRef.current}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
      // Longer messages get more reading time (~40ms per character), capped
      // at 8s so a toast never lingers forever.
      scheduleDismiss(id, Math.min(8000, 3000 + message.length * 40));
    },
    [scheduleDismiss]
  );

  const success = useCallback((m: string) => toast(m, "success"), [toast]);
  const error = useCallback((m: string) => toast(m, "error"), [toast]);

  // Stable context value so every consumer doesn't re-render on show/hide.
  const contextValue = useMemo(() => ({ toast, success, error }), [toast, success, error]);

  const icons = { success: CheckCircle, error: AlertCircle, info: Info };
  const colors = {
    success: "border-green-500/30 bg-green-500/10 text-green-400",
    error: "border-red-500/30 bg-red-500/10 text-red-400",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast container — lifted above the mobile bottom nav and clear of the iOS
          safe area. z-[110] keeps toasts above Modal (100), ConfirmDialog (101) and
          the offline banner (100): save-error toasts must be readable while the
          failing form stays open (N1). */}
      <div className="fixed right-3 bottom-[calc(96px+env(safe-area-inset-bottom,0px))] z-[110] flex flex-col gap-2 pointer-events-none md:right-6 md:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = icons[t.type];
            return (
              <motion.div
                key={t.id}
                // Errors are announced assertively, success/info politely, so
                // screen-reader users hear mutation outcomes (the app's main
                // feedback channel).
                role={t.type === "error" ? "alert" : "status"}
                aria-live={t.type === "error" ? "assertive" : "polite"}
                initial={{ opacity: 0, x: 80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 80, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onMouseEnter={() => pauseDismiss(t.id)}
                onMouseLeave={() => resumeDismiss(t.id)}
                onFocusCapture={() => pauseDismiss(t.id)}
                onBlurCapture={() => resumeDismiss(t.id)}
                className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-xl max-w-sm glass bg-[var(--color-surface)] ${colors[t.type]}`}
              >
                <Icon size={16} className="flex-shrink-0" aria-hidden="true" />
                <p className="text-sm font-medium text-slate-200 flex-1">{t.message}</p>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  aria-label="Melding sluiten"
                  className="-m-1.5 ml-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-slate-200"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
