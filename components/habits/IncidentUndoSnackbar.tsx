"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

/**
 * IncidentUndoSnackbar — after logging an incident, offer a one-tap
 * "Ongedaan maken" (calls the DELETE-incident endpoint with the same datum)
 * so a misclick can't permanently kill a months-long streak (audit M5/H5).
 * Auto-dismisses after 8s; styled like the shared toast layer and lifted above
 * the mobile bottom nav + safe area.
 */
export function IncidentUndoSnackbar({
  incident,
  masked = false,
  onUndo,
  onDismiss,
}: {
  incident: { habitId: string; datum: string; naam: string } | null;
  masked?: boolean;
  onUndo: () => void | Promise<void>;
  onDismiss: () => void;
}) {
  const [busy, setBusy] = useState(false);

  // R10: key the auto-dismiss on the INCIDENT IDENTITY only. `onDismiss` is an
  // inline closure at the call site, so having it in the deps restarted the 8s
  // timer on every parent render — the snackbar could linger indefinitely.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const incidentKey = incident ? `${incident.habitId}-${incident.datum}` : null;
  useEffect(() => {
    if (!incidentKey) return;
    setBusy(false);
    const timeout = window.setTimeout(() => onDismissRef.current(), 8000);
    return () => window.clearTimeout(timeout);
  }, [incidentKey]);

  const handleUndo = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onUndo();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {incident && (
        <motion.div
          key={`${incident.habitId}-${incident.datum}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="glass fixed left-1/2 z-[70] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-center gap-3 rounded-xl border border-red-500/25 bg-[var(--color-surface)] px-4 py-3 shadow-xl backdrop-blur-md"
          style={{ bottom: "calc(96px + env(safe-area-inset-bottom, 0px))" }}
        >
          <AlertTriangle size={16} className="shrink-0 text-red-400" aria-hidden="true" />
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
            Incident gelogd{masked ? "" : ` voor ${incident.naam}`}
          </p>
          <button
            type="button"
            onClick={() => void handleUndo()}
            disabled={busy}
            className="shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Bezig..." : "Ongedaan maken"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Melding sluiten"
            className="-m-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-slate-200"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
