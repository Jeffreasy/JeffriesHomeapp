"use client";

import dynamic from "next/dynamic";
import { Lightbulb, Loader2, Power, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import type { Device } from "@/lib/api";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { useLampCommand } from "@/hooks/useHomeapp";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { deriveLampPresentation } from "@/lib/lampPresentation";
import { cn } from "@/lib/utils";

const LazyLampControl = dynamic(
  () => import("./LampControl").then((module) => module.LampControl),
  {
    ssr: false,
    loading: () => (
      <div className="m-4" role="status" aria-label="Lampbediening laden">
        <Skeleton className="h-48 border border-[var(--color-border)]" />
      </div>
    ),
  },
);

interface LampCardProps {
  device: Device;
  /** Dashboard uses the same canonical card with a denser information layout. */
  compact?: boolean;
  /** Desktop: called when the details button opens the shared side panel. */
  onSelect?: (device: Device) => void;
}

export function LampCard({ device, compact = false, onSelect }: LampCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { mutate: sendCommand, isPending } = useLampCommand(device.id);
  const isMobile = useMediaQuery("(max-width: 767px)");
  const presentation = deriveLampPresentation(device, { pending: isPending });
  const {
    isOn,
    isOnline,
    mode,
    statusLabel,
    detailLabel,
    ambientStyle,
  } = presentation;

  const togglePower = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isOnline || isPending) return;
    sendCommand({ id: device.id, cmd: { on: !isOn } });
  };

  const handleDetailsOpen = () => {
    if (isMobile) {
      setSheetOpen(true);
      return;
    }
    onSelect?.(device);
  };

  return (
    <>
      <article
        data-testid={`lamp-card-${device.id}`}
        className={cn(
          "relative select-none overflow-hidden rounded-2xl border border-[var(--lamp-ambient-border)] bg-[linear-gradient(135deg,var(--lamp-ambient-soft),var(--color-surface-muted)_58%)] shadow-[0_18px_46px_-34px_var(--lamp-ambient-shadow)] transition-[border-color,background,box-shadow,opacity] duration-[var(--motion-slow)]",
          isOnline && "hover:border-[var(--lamp-ambient-ring)] hover:bg-[linear-gradient(135deg,var(--lamp-ambient-medium),var(--color-surface-hover)_58%)]",
          !isOnline && "opacity-65",
        )}
        style={ambientStyle}
      >
        <div className={cn("flex items-center gap-3", compact ? "p-3" : "p-4")}>
          <button
            type="button"
            onClick={handleDetailsOpen}
            className="group flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-[var(--lamp-ambient-ring)]"
            aria-label={`${device.name} details openen`}
          >
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl border border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-medium)] text-[var(--lamp-accent)] shadow-[0_0_20px_-8px_var(--lamp-ambient-shadow)] transition-transform group-hover:scale-[1.03] motion-reduce:transform-none",
                compact ? "h-10 w-10" : "h-11 w-11",
              )}
              aria-hidden="true"
            >
              <Lightbulb size={compact ? 18 : 20} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[var(--color-text)]">
                {device.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5">
                {isOnline ? (
                  <Wifi size={11} className="shrink-0 text-[var(--color-success)]" aria-hidden="true" />
                ) : (
                  <WifiOff size={11} className="shrink-0 text-[var(--color-danger)]" aria-hidden="true" />
                )}
                {isOnline && isOn && mode === "color" && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--color-border-strong)] bg-[var(--lamp-accent)]"
                    aria-hidden="true"
                  />
                )}
                <span
                  aria-live="polite"
                  className={cn(
                    "truncate text-xs",
                    isPending ? "text-[var(--lamp-text)]" : "text-[var(--color-text-muted)]",
                  )}
                >
                  {statusLabel}
                </span>
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={togglePower}
            disabled={!isOnline || isPending}
            aria-label={isOn ? `${device.name} uitschakelen` : `${device.name} aanzetten`}
            aria-pressed={isOn}
            aria-busy={isPending}
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-[background,border-color,color,transform,opacity] duration-[var(--motion-standard)] active:scale-90 motion-reduce:transform-none",
              isOn
                ? "border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-medium)] text-[var(--lamp-accent)] hover:border-[var(--lamp-ambient-ring)]"
                : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)]",
              (!isOnline || isPending) && "cursor-not-allowed opacity-50",
            )}
          >
            {isPending ? (
              <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Power size={16} aria-hidden="true" />
            )}
          </button>
        </div>

        {isOn && (
          <div className={cn("px-3", compact ? "pb-2.5" : "pb-3")}>
            <div className="h-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
              <div
                className="h-full w-[var(--lamp-brightness)] rounded-full bg-[var(--lamp-accent)] transition-[width,background] duration-[var(--motion-slow)]"
                aria-hidden="true"
              />
            </div>
          </div>
        )}
      </article>

      {isMobile && (
        <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title={device.name}>
          <div style={ambientStyle}>
            {isOnline ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-[var(--lamp-ambient-border)] bg-[linear-gradient(135deg,var(--lamp-ambient-soft),transparent_65%)] px-4 py-3">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <Wifi size={11} className="shrink-0 text-[var(--color-success)]" aria-hidden="true" />
                    {isOn && mode === "color" && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--color-border-strong)] bg-[var(--lamp-accent)]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="truncate text-xs text-[var(--color-text-muted)]" aria-live="polite">
                      {detailLabel}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={togglePower}
                    disabled={isPending}
                    aria-label={isOn ? `${device.name} uitschakelen` : `${device.name} aanzetten`}
                    aria-pressed={isOn}
                    aria-busy={isPending}
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors",
                      isOn
                        ? "border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-medium)] text-[var(--lamp-accent)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
                      isPending && "cursor-wait opacity-60",
                    )}
                  >
                    {isPending ? (
                      <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                    ) : (
                      <Power size={15} aria-hidden="true" />
                    )}
                  </button>
                </div>
                <LazyLampControl device={device} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                <WifiOff size={28} className="mb-3 text-[var(--color-text-subtle)]" aria-hidden="true" />
                <p className="text-sm font-medium text-[var(--color-text-muted)]">Lamp is offline</p>
                <p className="mt-1 font-mono text-xs text-[var(--color-text-muted)]">
                  IP: {device.ip_address ?? "onbekend"}
                </p>
                <p className="mt-2 max-w-xs text-xs leading-5 text-[var(--color-text-subtle)]">
                  Controleer de stroom en wifi-verbinding. Laatste contact:{" "}
                  {device.last_seen
                    ? new Date(device.last_seen).toLocaleString("nl-NL", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "onbekend"}.
                </p>
              </div>
            )}
          </div>
        </BottomSheet>
      )}
    </>
  );
}
