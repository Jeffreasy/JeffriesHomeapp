"use client";

import { Power, Lightbulb, Wifi, WifiOff } from "lucide-react";
import { useState, useEffect } from "react";
import { type Device } from "@/lib/api";
import { useLampCommand } from "@/hooks/useHomeapp";
import { cn, kelvinToHex, rgbToHex } from "@/lib/utils";
import { LampControl } from "./LampControl";
import { BottomSheet } from "@/components/ui/BottomSheet";

interface LampCardProps {
  device: Device;
  /** Desktop: called when card is clicked to open the slide panel. */
  onSelect?: (device: Device) => void;
}

/** Returns true on mobile viewports (< 768px) — evaluated client-side only. */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export function LampCard({ device, onSelect }: LampCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { mutate: sendCommand, isPending } = useLampCommand();
  const isMobile = useIsMobile();

  const isOn = device.current_state?.on ?? false;
  const isOnline = device.status === "online";
  const brightness = device.current_state?.brightness ?? 100;
  const colorTemp = device.current_state?.color_temp ?? 2700;
  const r = device.current_state?.r ?? 0;
  const g = device.current_state?.g ?? 0;
  const b = device.current_state?.b ?? 0;

  const isRgbMode = (r > 0 || g > 0 || b > 0) && isOn;
  const glowColor = isRgbMode ? rgbToHex(r, g, b) : isOn ? kelvinToHex(colorTemp) : "transparent";

  const togglePower = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isOnline || isPending) return;
    sendCommand({ id: device.id, cmd: { on: !isOn } });
  };

  const handleCardClick = () => {
    if (!isOnline) return;
    if (isMobile) {
      setSheetOpen(true);
    } else {
      onSelect?.(device);
    }
  };

  return (
    <>
      {/* Card */}
      <div
        data-testid={`lamp-card-${device.id}`}
        className={cn(
          "glass rounded-2xl overflow-hidden select-none transition-all duration-200",
          isOnline && "cursor-pointer hover:bg-white/[0.06] hover:border-white/14",
          !isOnline && "opacity-60"
        )}
        style={{
          boxShadow: isOn
            ? `0 0 40px -10px ${glowColor}55, 0 4px 24px rgba(0,0,0,0.4)`
            : "0 4px 24px rgba(0,0,0,0.4)",
          transition: "box-shadow 0.5s ease, opacity 0.2s",
        }}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        aria-label={`${device.name} — ${isOn ? "aan" : "uit"}, details bekijken`}
        onKeyDown={(e) => e.key === "Enter" && handleCardClick()}
      >
        {/* Card header */}
        <div className="p-4 flex items-center gap-3">
          {/* Lamp icon with glow */}
          <div
            className="relative flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center"
            style={{
              background: isOn ? `${glowColor}22` : "rgba(255,255,255,0.05)",
              boxShadow: isOn ? `0 0 20px -4px ${glowColor}` : "none",
              transition: "background 0.4s, box-shadow 0.4s",
              ...(isRgbMode && {
                outline: `2px solid ${glowColor}80`,
                outlineOffset: "2px",
              }),
            }}
          >
            <Lightbulb
              size={20}
              style={{ color: isOn ? glowColor : "#64748b", transition: "color 0.4s" }}
            />
          </div>

          {/* Device info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-100 truncate">{device.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isOnline ? (
                <Wifi size={11} className="text-green-400" aria-hidden="true" />
              ) : (
                <WifiOff size={11} className="text-red-400" aria-hidden="true" />
              )}
              <span className="text-xs text-slate-500">
                {isOnline ? (isOn ? `${brightness}% · ${colorTemp}K` : "Uit") : "Offline"}
              </span>
            </div>
          </div>

          {/* Power toggle */}
          <button
            onClick={togglePower}
            disabled={!isOnline || isPending}
            aria-label={isOn ? `${device.name} uitschakelen` : `${device.name} aanzetten`}
            aria-pressed={isOn}
            className={cn(
              "w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0",
              isOn
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 active:scale-90"
                : "bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10 active:scale-90",
              !isOnline && "opacity-40 cursor-not-allowed"
            )}
          >
            <Power size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Brightness bar — always shown when on */}
        {isOn && (
          <div className="px-4 pb-3">
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${brightness}%`,
                  background: glowColor,
                  transition: "width 0.3s ease, background 0.4s ease",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mobile BottomSheet */}
      {isMobile && (
        <BottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={device.name}
        >
          <LampControl device={device} />
        </BottomSheet>
      )}
    </>
  );
}
