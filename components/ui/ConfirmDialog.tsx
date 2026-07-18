"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, X } from "lucide-react";
import { OverlaySurface } from "@/components/ui/OverlaySurface";
import { cn } from "@/lib/utils";

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
}

type ConfirmState = ConfirmOptions;

interface ConfirmContextValue {
  openConfirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used inside ConfirmProvider");
  return context;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const messageId = useId();

  const openConfirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      setState(options);
    });
  }, []);

  const handleClose = useCallback((confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setState(null);
  }, []);

  useEffect(() => {
    return () => {
      resolveRef.current?.(false);
      resolveRef.current = null;
    };
  }, []);

  const contextValue = useMemo(() => ({ openConfirm }), [openConfirm]);
  const isDanger = state?.variant === "danger";

  return (
    <ConfirmContext.Provider value={contextValue}>
      {children}
      <OverlaySurface
        open={Boolean(state)}
        onClose={() => handleClose(false)}
        role="alertdialog"
        presentation="dialog"
        maxWidth="sm"
        ariaLabelledBy={titleId}
        ariaDescribedBy={messageId}
        initialFocusRef={isDanger ? cancelRef : confirmRef}
        priority="critical"
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-2xl sm:p-6"
      >
        {state && (
          <>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
              aria-label="Bevestigingsvenster sluiten"
            >
              <X size={17} aria-hidden="true" />
            </button>

            <div className="mb-5 flex items-start gap-3 pr-8">
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                  isDanger ? "bg-rose-500/15 text-rose-400" : "bg-amber-500/15 text-amber-400",
                )}
              >
                <AlertTriangle size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id={titleId} className="mb-1 text-sm font-semibold text-white">
                  {state.title ?? "Bevestigen"}
                </h2>
                <p id={messageId} className="text-sm leading-5 text-slate-400">
                  {state.message}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => handleClose(false)}
                className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                {state.cancelLabel ?? "Annuleren"}
              </button>
              <button
                ref={confirmRef}
                type="button"
                onClick={() => handleClose(true)}
                className={cn(
                  "min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors",
                  isDanger
                    ? "border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25"
                    : "border-amber-500/30 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25",
                )}
              >
                {state.confirmLabel ?? "Bevestigen"}
              </button>
            </div>
          </>
        )}
      </OverlaySurface>
    </ConfirmContext.Provider>
  );
}
