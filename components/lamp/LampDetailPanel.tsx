"use client";

import { useEffect, useId, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, Loader2, Power, Wifi, WifiOff } from "lucide-react";
import { type Device } from "@/lib/api";
import { useLampCommand } from "@/hooks/useHomeapp";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { LampControl } from "./LampControl";
import { kelvinToHex, rgbToHex, cn } from "@/lib/utils";

interface LampDetailPanelProps {
  device: Device | null;
  onClose: () => void;
}

/**
 * Desktop slide-over panel for lamp detail/control.
 * Slides in from the right without disrupting the lamp grid.
 * Mobile uses BottomSheet instead (handled in LampCard).
 */
export function LampDetailPanel({ device, onClose }: LampDetailPanelProps) {
  const { mutate: sendCommand, isPending } = useLampCommand();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  // Focus trap (ronde-1 M22): Tab/Shift+Tab blijven binnen het paneel en de
  // focus keert terug naar de trigger bij sluiten — zelfde hook als
  // BottomSheet/AutomationForm.
  useFocusTrap(!!device, panelRef);

  useEffect(() => {
    if (!device) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeButtonRef.current?.focus(), 120);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
    };
  }, [device]);

  useEffect(() => {
    if (!device) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [device, onClose]);

  const isOn = device?.current_state?.on ?? false;
  const isOnline = device?.status === "online";
  const brightness = device?.current_state?.brightness ?? 100;
  const colorTemp = device?.current_state?.color_temp ?? 2700;
  const r = device?.current_state?.r ?? 0;
  const g = device?.current_state?.g ?? 0;
  const b = device?.current_state?.b ?? 0;

  const isRgbMode = (r > 0 || g > 0 || b > 0) && isOn;
  const glowColor = isRgbMode ? rgbToHex(r, g, b) : isOn ? kelvinToHex(colorTemp) : "#334155";

  const togglePower = () => {
    if (!device || !isOnline || isPending) return;
    sendCommand({ id: device.id, cmd: { on: !isOn } });
  };

  return (
    <AnimatePresence>
      {device && (
        <>
          <motion.button
            type="button"
            aria-label="Detailpaneel sluiten"
            className="fixed inset-0 z-[70] hidden bg-black/45 backdrop-blur-sm md:block"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
          />

          <motion.aside
            key={device.id}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed bottom-0 right-0 top-0 z-[71] hidden w-full max-w-[390px] flex-col border-l border-[var(--color-border)] bg-[var(--color-surface)] shadow-[-24px_0_70px_rgba(0,0,0,0.45)] md:flex"
          >
            {/* Panel header */}
            <div
              className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border)] p-4"
              style={{
                background: `linear-gradient(135deg, ${glowColor}18 0%, transparent 60%)`,
              }}
            >
              {/* Lamp icon */}
              <div
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: isOn ? `${glowColor}22` : "rgba(255,255,255,0.05)",
                  boxShadow: isOn ? `0 0 18px -4px ${glowColor}80` : "none",
                  transition: "all 0.4s",
                }}
              >
                <Lightbulb
                  size={18}
                  style={{ color: isOn ? glowColor : "#64748b", transition: "color 0.4s" }}
                />
              </div>

              {/* Name + status */}
              <div className="min-w-0 flex-1">
                <p id={titleId} className="truncate text-sm font-bold text-slate-100">{device.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {isOnline ? (
                    <Wifi size={10} className="text-green-400" />
                  ) : (
                    <WifiOff size={10} className="text-red-400" />
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    {/* RGB-modus: toon de kleur i.p.v. een stale kelvin-waarde */}
                    {isOnline && isOn && isRgbMode && (
                      <span
                        className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                        style={{ background: glowColor }}
                        aria-hidden="true"
                      />
                    )}
                    {isOnline
                      ? isOn
                        ? isRgbMode
                          ? `${brightness}% · ${glowColor.toUpperCase()}`
                          : `${brightness}% · ${colorTemp}K`
                        : "Uit"
                      : "Offline"}
                  </span>
                </div>
              </div>

              {/* Power button */}
              <button
                onClick={togglePower}
                disabled={!isOnline || isPending}
                aria-label={isOn ? `${device.name} uitschakelen` : `${device.name} aanzetten`}
                aria-pressed={isOn}
                className={cn(
                  "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                  isOn
                    ? "border border-amber-500/40 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 active:scale-90"
                    : "border border-[var(--color-border)] bg-[rgba(255,255,255,0.05)] text-slate-500 hover:bg-[rgba(255,255,255,0.1)] active:scale-90",
                  !isOnline && "cursor-not-allowed opacity-40",
                  isPending && "cursor-wait opacity-60"
                )}
              >
                {isPending ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Power size={14} aria-hidden="true" />
                )}
              </button>

              {/* Close */}
              <button
                ref={closeButtonRef}
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
                aria-label="Sluit detailpaneel"
              >
                <X size={15} />
              </button>
            </div>

            {/* Brightness bar */}
            {isOn && (
              <div className="shrink-0 px-4 pt-3">
                <div className="h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.05)]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${brightness}%`, background: glowColor }}
                  />
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {isOnline ? (
                <LampControl device={device} />
              ) : (
                <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
                  <WifiOff size={28} className="mb-3 text-slate-600" />
                  <p className="text-sm text-slate-500">Lamp is offline</p>
                  <p className="mt-1 text-xs font-mono text-slate-500">
                    IP: {device.ip_address ?? "onbekend"}
                  </p>
                  <p className="mt-2 max-w-xs text-xs leading-5 text-slate-600">
                    Controleer of de lamp stroom heeft en met hetzelfde wifi-netwerk is verbonden. Laatst bijgewerkt: {device.last_seen ? new Date(device.last_seen).toLocaleString("nl-NL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "onbekend"}.
                  </p>
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
