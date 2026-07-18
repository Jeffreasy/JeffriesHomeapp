"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toast";

/** Routes the reversible incident action through the shared toast layer. */
export function IncidentUndoToast({
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
  const { toast } = useToast();
  const onUndoRef = useRef(onUndo);
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onUndoRef.current = onUndo;
    onDismissRef.current = onDismiss;
  }, [onDismiss, onUndo]);

  const incidentKey = incident ? `${incident.habitId}-${incident.datum}` : null;

  useEffect(() => {
    if (!incidentKey || !incident) return;

    toast(masked ? "Incident gelogd" : `Incident gelogd voor ${incident.naam}`, "info", {
      action: {
        label: "Ongedaan maken",
        onClick: () => void onUndoRef.current(),
      },
      dedupeKey: "habit-incident-undo",
      durationMs: 8000,
      persistent: false,
    });

    const timeout = window.setTimeout(() => onDismissRef.current(), 8000);
    return () => window.clearTimeout(timeout);
  }, [incident, incidentKey, masked, toast]);

  return null;
}
