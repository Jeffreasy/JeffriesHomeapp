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
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { OverlaySurface } from "@/components/ui/OverlaySurface";

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "default";
}

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
  const [state, setState] = useState<ConfirmOptions | null>(null);
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
        className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-overlay)] sm:p-6"
      >
        {state ? (
          <>
            <IconButton
              icon={<X size={17} />}
              label="Bevestigingsvenster sluiten"
              onClick={() => handleClose(false)}
              className="absolute right-2 top-2"
            />

            <div className="mb-5 flex items-start gap-3 pr-10">
              <div
                className={
                  isDanger
                    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-danger-subtle)] text-[var(--color-danger)]"
                    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-warning-subtle)] text-[var(--color-warning)]"
                }
              >
                <AlertTriangle size={18} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2 id={titleId} className="mb-1 text-sm font-semibold text-[var(--color-text)]">
                  {state.title ?? "Bevestigen"}
                </h2>
                <p id={messageId} className="text-sm leading-5 text-[var(--color-text-muted)]">
                  {state.message}
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                ref={cancelRef}
                variant="secondary"
                onClick={() => handleClose(false)}
              >
                {state.cancelLabel ?? "Annuleren"}
              </Button>
              <Button
                ref={confirmRef}
                variant={isDanger ? "danger" : "primary"}
                onClick={() => handleClose(true)}
              >
                {state.confirmLabel ?? "Bevestigen"}
              </Button>
            </div>
          </>
        ) : null}
      </OverlaySurface>
    </ConfirmContext.Provider>
  );
}
