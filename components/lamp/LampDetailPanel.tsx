"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Lightbulb, Power, Wifi, WifiOff } from "lucide-react";
import { type Device } from "@/lib/api";
import { useLampCommand } from "@/hooks/useHomeapp";
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

  if (!device) return null;

  const isOn = device.current_state?.on ?? false;
  const isOnline = device.status === "online";
  const brightness = device.current_state?.brightness ?? 100;
  const colorTemp = device.current_state?.color_temp ?? 2700;
  const r = device.current_state?.r ?? 0;
  const g = device.current_state?.g ?? 0;
  const b = device.current_state?.b ?? 0;

  const isRgbMode = (r > 0 || g > 0 || b > 0) && isOn;
  const glowColor = isRgbMode ? rgbToHex(r, g, b) : isOn ? kelvinToHex(colorTemp) : "#334155";

  const togglePower = () => {
    if (!isOnline || isPending) return;
    sendCommand({ id: device.id, cmd: { on: !isOn } });
  };

  return (
    <AnimatePresence>
      <motion.div
        key={device.id}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="hidden md:flex flex-col w-80 flex-shrink-0 glass border-l border-white/5 h-full overflow-y-auto"
        style={{ minHeight: 0 }}
      >
        {/* Panel header */}
        <div
          className="p-4 border-b border-white/5 flex items-center gap-3"
          style={{
            background: `linear-gradient(135deg, ${glowColor}18 0%, transparent 60%)`,
          }}
        >
          {/* Lamp icon */}
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-100 truncate">{device.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isOnline ? (
                <Wifi size={10} className="text-green-400" />
              ) : (
                <WifiOff size={10} className="text-red-400" />
              )}
              <span className="text-xs text-slate-500">
                {isOnline ? (isOn ? `${brightness}% · ${colorTemp}K` : "Uit") : "Offline"}
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
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0",
              isOn
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30 active:scale-90"
                : "bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10 active:scale-90",
              !isOnline && "opacity-40 cursor-not-allowed"
            )}
          >
            <Power size={14} />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            aria-label="Sluit detail paneel"
          >
            <X size={14} />
          </button>
        </div>

        {/* Brightness bar */}
        {isOn && (
          <div className="px-4 pt-3">
            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${brightness}%`, background: glowColor }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex-1 overflow-y-auto">
          {isOnline ? (
            <LampControl device={device} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <WifiOff size={28} className="text-slate-600 mb-3" />
              <p className="text-sm text-slate-500">Lamp is offline</p>
              <p className="text-xs text-slate-600 mt-1">Controleer de netwerkverbinding</p>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
