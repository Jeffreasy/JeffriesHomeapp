"use client";

import { HexColorPicker } from "react-colorful";
import { useState, useEffect, useCallback } from "react";
import { Thermometer, Sun, Palette, RefreshCw } from "lucide-react";
import { type Device } from "@/lib/api";
import { useLampCommand } from "@/hooks/useHomeapp";
import { useDebouncedCallback } from "@/hooks/useDebounce";
import { hexToRgb, rgbToHex } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { devicesApi } from "@/lib/api";

interface LampControlProps {
  device: Device;
}

type Mode = "white" | "color";

const COLOR_PRESETS = [
  { hex: "#ff4500", label: "Rood" },
  { hex: "#ff8800", label: "Oranje" },
  { hex: "#ffcc00", label: "Geel" },
  { hex: "#00e5ff", label: "Cyaan" },
  { hex: "#00c2a0", label: "Teal" },
  { hex: "#3b82f6", label: "Blauw" },
  { hex: "#8b5cf6", label: "Indigo" },
  { hex: "#ff69b4", label: "Roze" },
];

export function LampControl({ device }: LampControlProps) {
  const { mutate: sendCommand } = useLampCommand();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const state = device.current_state;

  const refresh = async () => {
    setRefreshing(true);
    try {
      const fresh = await devicesApi.get(device.id.toString());
      queryClient.setQueryData(["devices"], (old: Device[] | undefined) =>
        old?.map((d) => (d.id === device.id ? fresh : d))
      );
    } finally {
      setRefreshing(false);
    }
  };

  const [mode, setMode] = useState<Mode>(
    state?.r > 0 || state?.g > 0 || state?.b > 0 ? "color" : "white"
  );

  // Local color state — UI updates immediately, API gets debounced
  const [localHex, setLocalHex] = useState(
    rgbToHex(state?.r ?? 255, state?.g ?? 200, state?.b ?? 100)
  );
  const [localBrightness, setLocalBrightness] = useState(state?.brightness ?? 100);
  const [localMireds, setLocalMireds] = useState(
    Math.round(1_000_000 / (state?.color_temp ?? 2700))
  );

  // Sync local state when device state changes from outside (e.g. another user)
  useEffect(() => {
    setLocalBrightness(state?.brightness ?? 100);
    setLocalMireds(Math.round(1_000_000 / (state?.color_temp ?? 2700)));

    // Sync color + mode when RGB changes externally
    const r = state?.r ?? 0;
    const g = state?.g ?? 0;
    const b = state?.b ?? 0;
    if (r > 0 || g > 0 || b > 0) {
      setLocalHex(rgbToHex(r, g, b));
      setMode("color");
    } else {
      setMode("white");
    }
  }, [state?.brightness, state?.color_temp, state?.r, state?.g, state?.b]);

  // ─── Debounced API callers (200ms) ─────────────────────────────────────────

  const sendBrightness = useDebouncedCallback((v: number) => {
    sendCommand({ id: device.id, cmd: { brightness: v } });
  }, 200);

  const sendColorTemp = useDebouncedCallback((mireds: number) => {
    sendCommand({ id: device.id, cmd: { color_temp_mireds: mireds } });
  }, 200);

  const sendColor = useDebouncedCallback((hex: string) => {
    const { r, g, b } = hexToRgb(hex);
    sendCommand({ id: device.id, cmd: { r, g, b } });
  }, 120);

  // ─── Handlers (local state + debounced API) ────────────────────────────────

  const handleBrightness = (v: number) => {
    setLocalBrightness(v);
    sendBrightness(v);
  };

  const handleColorTemp = (mireds: number) => {
    setLocalMireds(mireds);
    sendColorTemp(mireds);
  };

  const handleColor = (hex: string) => {
    // Only update local — does NOT call setQueryData on every move
    setLocalHex(hex);
    sendColor(hex);
  };

  const kelvin = localMireds > 0 ? Math.round(1_000_000 / localMireds) : 2700;

  return (
    <div className="p-4 space-y-5" onClick={(e) => e.stopPropagation()}>
      {/* Helderheid + Refresh */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Sun size={13} />
            <span>Helderheid</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-400 font-mono">{localBrightness}%</span>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="text-slate-600 hover:text-slate-400 transition-colors"
              title="Staat verversen van lamp"
            >
              <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
        <input
          type="range"
          min={10}
          max={100}
          value={localBrightness}
          onChange={(e) => handleBrightness(+e.target.value)}
          style={{
            background: `linear-gradient(to right, #f59e0b ${localBrightness}%, rgba(255,255,255,0.1) ${localBrightness}%)`,
          }}
        />
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 rounded-xl p-1 bg-white/5">
        {(["white", "color"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-all ${
              mode === m
                ? "bg-white/10 text-white font-medium"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {m === "white" ? <Thermometer size={12} /> : <Palette size={12} />}
            {m === "white" ? "Wit licht" : "Kleur"}
          </button>
        ))}
      </div>

      {/* Color temp */}
      {mode === "white" && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Thermometer size={13} />
              <span>Kleurtemperatuur</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{kelvin}K</span>
          </div>
          <input
            type="range"
            min={153}
            max={455}
            value={localMireds}
            onChange={(e) => handleColorTemp(+e.target.value)}
            style={{
              // Mireds schaal: laag = koel (6500K), hoog = warm (2200K)
              // Slider gaat links (koel/blauw) → rechts (warm/oranje)
              background: "linear-gradient(to right, #cce4ff, #fff4e6, #ff9329)",
            }}
          />
          <div className="flex justify-between mt-1 text-[10px] text-slate-600">
            <span>Koel 6500K</span>
            <span>Warm 2200K</span>
          </div>
        </div>
      )}

      {/* Color picker */}
      {mode === "color" && (
        <div className="space-y-3">
          {/* Preset swatches */}
          <div className="grid grid-cols-8 gap-1.5">
            {COLOR_PRESETS.map(({ hex, label }) => (
              <button
                key={hex}
                onClick={() => handleColor(hex)}
                aria-label={label}
                title={label}
                className="w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 active:scale-95"
                style={{
                  background: hex,
                  borderColor: localHex.toLowerCase() === hex ? "white" : "transparent",
                }}
              />
            ))}
          </div>

          {/* Full color picker */}
          <HexColorPicker
            color={localHex}
            onChange={handleColor}
            style={{ width: "100%", height: 130 }}
          />
          <div
            className="w-full h-7 rounded-xl border border-white/10"
            style={{ background: localHex, transition: "background 0.1s" }}
          />
          <p className="text-center text-xs font-mono text-slate-500">{localHex.toUpperCase()}</p>
        </div>
      )}
    </div>
  );
}
