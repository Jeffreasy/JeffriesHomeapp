"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { surfaceVariants } from "@/components/ui/Surface";
import { uiToneClasses } from "@/lib/ui/tones";
import { getToastPortalRoot } from "@/lib/overlays/overlay-manager";
import { cn } from "@/lib/utils";
import { reducedMotionTransition, uiMotion } from "@/lib/ui/motion";

export type ToastType = "success" | "error" | "info";

export interface ToastOptions {
  action?: {
    label: string;
    onClick: () => void;
  };
  durationMs?: number;
  persistent?: boolean;
  dedupeKey?: string;
}

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  options: ToastOptions;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const toneByType = {
  success: "success",
  error: "danger",
  info: "info",
} as const;

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);
  const dedupeRef = useRef(new Map<string, string>());
  const reduceMotion = useReducedMotion();
  const timersRef = useRef(
    new Map<string, { handle: ReturnType<typeof setTimeout>; expiresAt: number; remaining: number }>(),
  );

  const removeToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer.handle);
      timersRef.current.delete(id);
    }
    for (const [key, toastId] of dedupeRef.current) {
      if (toastId === id) dedupeRef.current.delete(key);
    }
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    const timers = timersRef.current;
    const dedupe = dedupeRef.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer.handle);
      timers.clear();
      dedupe.clear();
    };
  }, []);

  const scheduleDismiss = useCallback(
    (id: string, delay: number) => {
      const handle = setTimeout(() => {
        timersRef.current.delete(id);
        removeToast(id);
      }, delay);
      timersRef.current.set(id, {
        handle,
        expiresAt: Date.now() + delay,
        remaining: delay,
      });
    },
    [removeToast],
  );

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
      scheduleDismiss(id, Math.max(1000, timer.remaining));
    },
    [scheduleDismiss],
  );

  const toast = useCallback(
    (message: string, type: ToastType = "info", options: ToastOptions = {}) => {
      const id = "toast-" + String(++counterRef.current);
      const previousId = options.dedupeKey
        ? dedupeRef.current.get(options.dedupeKey)
        : undefined;

      if (previousId) {
        const timer = timersRef.current.get(previousId);
        if (timer) clearTimeout(timer.handle);
        timersRef.current.delete(previousId);
      }
      if (options.dedupeKey) dedupeRef.current.set(options.dedupeKey, id);

      setToasts((previous) => [
        ...previous.filter((item) => item.id !== previousId).slice(-4),
        { id, message, type, options },
      ]);

      const persistent = options.persistent ?? Boolean(options.action);
      if (!persistent) {
        const duration = options.durationMs ?? Math.min(8000, 3000 + message.length * 40);
        scheduleDismiss(id, duration);
      }
    },
    [scheduleDismiss],
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) => toast(message, "success", options),
    [toast],
  );
  const error = useCallback(
    (message: string, options?: ToastOptions) => toast(message, "error", options),
    [toast],
  );
  const contextValue = useMemo(() => ({ toast, success, error }), [toast, success, error]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {typeof document === "undefined"
        ? null
        : createPortal(
            <div className="pointer-events-none fixed bottom-[calc(var(--app-bottom-nav-clearance)+1rem)] right-3 z-[var(--layer-toast)] flex max-w-[calc(100vw-1.5rem)] flex-col gap-2 md:bottom-6 md:right-6">
              <AnimatePresence>
                {toasts.map((item) => {
                  const Icon = icons[item.type];
                  return (
                    <motion.div
                      key={item.id}
                      role={item.type === "error" ? "alert" : "status"}
                      aria-live={item.type === "error" ? "assertive" : "polite"}
                      aria-atomic="true"
                      initial={reduceMotion ? false : { opacity: 0, x: 40, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 40, scale: 0.98 }}
                      transition={reduceMotion ? reducedMotionTransition : { duration: uiMotion.durationSeconds.standard }}
                      onMouseEnter={() => pauseDismiss(item.id)}
                      onMouseLeave={() => resumeDismiss(item.id)}
                      onFocusCapture={() => pauseDismiss(item.id)}
                      onBlurCapture={() => resumeDismiss(item.id)}
                      className={cn(
                        surfaceVariants({ tone: toneByType[item.type], radius: "md", padding: "sm" }),
                        "pointer-events-auto flex w-full max-w-md items-center gap-3 backdrop-blur-md",
                      )}
                    >
                      <Icon size={18} className={cn("shrink-0", uiToneClasses[toneByType[item.type]].icon)} aria-hidden="true" />
                      <p className="min-w-0 flex-1 text-sm font-medium text-[var(--color-text)]">
                        {item.message}
                      </p>
                      {item.options.action ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            item.options.action?.onClick();
                            removeToast(item.id);
                          }}
                        >
                          {item.options.action.label}
                        </Button>
                      ) : null}
                      <IconButton
                        icon={<X size={16} />}
                        label="Melding sluiten"
                        onClick={() => removeToast(item.id)}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>,
            getToastPortalRoot(),
          )}
    </ToastContext.Provider>
  );
}
