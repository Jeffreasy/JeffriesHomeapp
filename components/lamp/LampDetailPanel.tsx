"use client";

import dynamic from "next/dynamic";
import { Lightbulb, Loader2, Power, Wifi, WifiOff, X } from "lucide-react";
import { useId, useRef } from "react";
import type { Device } from "@/lib/api";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { OverlaySurface } from "@/components/ui/OverlaySurface";
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

interface LampDetailPanelProps {
  device: Device | null;
  onClose: () => void;
}

/** Desktop detail drawer. Mobile details stay in the canonical LampCard sheet. */
export function LampDetailPanel({ device, onClose }: LampDetailPanelProps) {
  const { mutate: sendCommand, isPending } = useLampCommand(device?.id);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const presentation = device
    ? deriveLampPresentation(device, { pending: isPending })
    : null;


  if (!device || !presentation) return null;

  const { isOn, isOnline, mode, detailLabel, ambientStyle } = presentation;

  const togglePower = () => {
    if (!isOnline || isPending) return;
    sendCommand({ id: device.id, cmd: { on: !isOn } });
  };

  return (
    <OverlaySurface
      open={isDesktop}
      onClose={onClose}
      presentation="drawer"
      ariaLabelledBy={titleId}
      initialFocusRef={closeButtonRef}
      dataAppModal="lamp-detail"
      backdropClassName="bg-[var(--color-overlay)]"
      className="max-w-md border-l border-[var(--lamp-ambient-border)] bg-[linear-gradient(160deg,var(--lamp-ambient-soft),var(--color-surface)_28%)] shadow-[var(--shadow-overlay)] sm:max-w-md"
      style={ambientStyle}
    >
            <div className="flex shrink-0 items-center gap-3 border-b border-[var(--lamp-ambient-border)] bg-[linear-gradient(135deg,var(--lamp-ambient-soft),transparent_68%)] p-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-medium)] text-[var(--lamp-accent)] shadow-[0_0_22px_-8px_var(--lamp-ambient-shadow)]"
                aria-hidden="true"
              >
                <Lightbulb size={19} />
              </span>

              <div className="min-w-0 flex-1">
                <p id={titleId} className="truncate text-sm font-bold text-[var(--color-text)]">
                  {device.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
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
                  <span className="truncate text-xs text-[var(--color-text-muted)]" aria-live="polite">
                    {detailLabel}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={togglePower}
                disabled={!isOnline || isPending}
                aria-label={isOn ? `${device.name} uitschakelen` : `${device.name} aanzetten`}
                aria-pressed={isOn}
                aria-busy={isPending}
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-[background,border-color,color,opacity,transform] active:scale-90 motion-reduce:transform-none",
                  isOn
                    ? "border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-medium)] text-[var(--lamp-accent)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]",
                  (!isOnline || isPending) && "cursor-not-allowed opacity-50",
                )}
              >
                {isPending ? (
                  <Loader2 size={15} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                ) : (
                  <Power size={15} aria-hidden="true" />
                )}
              </button>

              <IconButton
                ref={closeButtonRef}
                onClick={onClose}
                label="Sluit detailpaneel"
                icon={<X size={17} />}
                className="focus-visible:ring-[var(--lamp-ambient-ring)]"
              />
            </div>

            {isOn && (
              <div className="shrink-0 px-4 pt-3">
                <div className="h-1 overflow-hidden rounded-full bg-[var(--color-surface-muted)]">
                  <div
                    className="h-full w-[var(--lamp-brightness)] rounded-full bg-[var(--lamp-accent)] transition-[width,background] duration-[var(--motion-slow)]"
                    aria-hidden="true"
                  />
                </div>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {isOnline ? (
                <LazyLampControl device={device} />
              ) : (
                <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
                  <WifiOff size={30} className="mb-3 text-[var(--color-text-subtle)]" aria-hidden="true" />
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
    </OverlaySurface>
  );
}
