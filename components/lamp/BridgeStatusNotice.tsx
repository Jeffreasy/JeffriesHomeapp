"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import type { BridgeStatus } from "@/hooks/useDevices";
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
    <div
      role="status"
      aria-live="polite"
      aria-busy={checking}
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4",
        checking
          ? "border-blue-500/25 bg-blue-500/10"
          : "border-amber-500/30 bg-amber-500/10",
        className,
      )}
    >
      {checking ? (
        <Loader2
          size={18}
          className="mt-0.5 shrink-0 animate-spin text-blue-300"
          aria-hidden="true"
        />
      ) : (
        <AlertTriangle
          size={18}
          className="mt-0.5 shrink-0 text-amber-300"
          aria-hidden="true"
        />
      )}
      <div className="min-w-0">
        <p className={cn("text-sm font-semibold", checking ? "text-blue-200" : "text-amber-200")}>
          {title}
        </p>
        <p className="mt-1 text-xs leading-5 text-slate-400">
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
    </div>
  );
}
