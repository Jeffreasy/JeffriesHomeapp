"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import type { BridgeStatus } from "@/hooks/useDevices";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

interface BridgeStatusNoticeProps {
  bridge: BridgeStatus | null;
  isOffline: boolean;
  isLoading: boolean;
  isError: boolean;
  isStatusKnown: boolean;
  className?: string;
}

/** Shared trust notice for every control surface that uses light commands. */
export function BridgeStatusNotice({
  bridge,
  isOffline,
  isLoading,
  isError,
  isStatusKnown,
  className,
}: BridgeStatusNoticeProps) {
  const checking = isLoading && !isError && !isStatusKnown;
  const unavailable = isError || (!isLoading && !isStatusKnown);

  if (!checking && !unavailable && !isOffline) return null;

  const title = checking
    ? "Bridgestatus controleren…"
    : unavailable
      ? "Bridgestatus onbekend"
      : "Bridge offline — lampcommando's worden uitgesteld";

  return (
    <Surface
      role="status"
      aria-live="polite"
      aria-busy={checking}
      tone={checking ? "info" : "warning"}
      className={cn("flex items-start gap-3", className)}
    >
      {checking ? (
        <Loader2
          size={18}
          className="mt-0.5 shrink-0 animate-spin text-[var(--color-info)] motion-reduce:animate-none"
          aria-hidden="true"
        />
      ) : (
        <AlertTriangle
          size={18}
          className="mt-0.5 shrink-0 text-[var(--color-warning)]"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", checking ? "text-[var(--color-info)]" : "text-[var(--color-warning)]")}>
          {title}
        </p>
        <p className="mt-1 text-xs leading-5 text-[var(--color-text-muted)]">
          {checking
            ? "De lampen blijven bedienbaar terwijl de afleverroute wordt gecontroleerd."
            : unavailable
              ? "De statusbron reageert niet. Bediening blijft beschikbaar, maar aflevering kan niet worden bevestigd."
              : bridge?.lastSeenAt
                ? `Laatste heartbeat: ${new Date(bridge.lastSeenAt).toLocaleString("nl-NL", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}.`
                : "Nog geen heartbeat ontvangen."}
          {!checking && !unavailable && (bridge?.commandsPending ?? 0) > 0 &&
            ` ${bridge?.commandsPending} commando('s) in de wachtrij.`}
        </p>
      </div>
    </Surface>
  );
}
