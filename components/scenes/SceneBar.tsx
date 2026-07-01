"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, Sunset, Popcorn, Zap, Coffee,
  Power, ChevronDown, Sparkles, Palette, X, Send,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { useDevices, useLampCommand } from "@/hooks/useHomeapp";
import { useToast } from "@/components/ui/Toast";
import { CUSTOM_SCENES, WIZ_SCENES, OFF_SCENE, detectActiveScene, type ScenePreset } from "@/lib/scenes";
import { cn, hexToRgb } from "@/lib/utils";
import { type Device } from "@/lib/api";

// ─── Icon map — by scene ID, not fragile index ────────────────────────────────

const SCENE_ICONS: Record<string, React.ElementType> = {
  helder:  Sun,
  avond:   Sunset,
  nacht:   Moon,
  film:    Popcorn,
  focus:   Zap,
  ochtend: Coffee,
};

// ─── Inline color picker pill (replaces GlobalColorPicker in header) ──────────

function ColorPill({ devices }: { devices: Device[] }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex]   = useState("#ff8800");
  // sendBatch patcht de cache optimistic per lamp (applyCommandToDevice in
  // lib/deviceCommands) en invalideert één keer aan het eind.
  const { sendBatch } = useLampCommand();
  const { success } = useToast();

  const apply = () => {
    const { r, g, b } = hexToRgb(hex);
    sendBatch(devices, { r, g, b, on: true });
    success("Kleur toegepast op alle lampen");
    setOpen(false);
  };

  return (
    <div className="relative flex-shrink-0">
      <motion.button
        whileTap={{ scale: 0.93 }}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all min-h-[44px]",
          open
            ? "bg-[var(--color-surface-hover)] text-white border-[var(--color-border-hover)]"
            : "bg-[var(--color-surface)] text-slate-400 border-[var(--color-border)] hover:text-slate-200 hover:border-[var(--color-border-hover)]"
        )}
        aria-expanded={open}
        aria-label="Kleur instellen voor alle lampen"
      >
        <Palette size={13} aria-hidden="true" />
        Kleur
        <div
          className="w-3 h-3 rounded-full border border-[var(--color-border)] flex-shrink-0"
          style={{ background: hex }}
        />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.13 }}
            className="absolute left-0 top-full mt-2 z-50 glass rounded-2xl p-4 shadow-2xl w-56"
            style={{ border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-300">Kleur instellen</p>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                aria-label="Sluiten"
              >
                <X size={13} />
              </button>
            </div>
            <HexColorPicker color={hex} onChange={setHex} style={{ width: "100%", height: 130 }} />
            <div
              className="w-full h-6 rounded-lg mt-2 border border-[var(--color-border)]"
              style={{ background: hex, transition: "background 0.1s" }}
            />
            <p className="text-center text-[10px] font-mono text-slate-500 mt-1">{hex.toUpperCase()}</p>
            <button
              onClick={apply}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-medium hover:bg-amber-500/25 transition-colors"
            >
              <Send size={12} />
              Toepassen op {devices.length} lampen
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SceneBar ─────────────────────────────────────────────────────────────────

export function SceneBar() {
  const { data: devices = [] } = useDevices();
  const { sendBatch } = useLampCommand();
  const { success } = useToast();
  const [showWiz, setShowWiz] = useState(false);

  const onlineDevices = devices.filter((d) => d.status === "online");
  const activeScene = detectActiveScene(devices);

  const applyScene = (scene: ScenePreset) => {
    // sendBatch doet de optimistic cache-patch per lamp (instant feedback)
    // en invalideert de devices-query één keer aan het eind.
    sendBatch(onlineDevices, scene.command);
    success(`Scène "${scene.label}" toegepast`);
    setShowWiz(false);
  };

  const isActive = (id: string) => activeScene === id;

  const renderSceneBtn = (scene: ScenePreset, small = false) => {
    const Icon = SCENE_ICONS[scene.id];
    const active = isActive(scene.id);
    return (
      <motion.button
        key={scene.id}
        whileTap={{ scale: 0.93 }}
        onClick={() => applyScene(scene)}
        aria-pressed={active}
        aria-label={`Scène ${scene.label} toepassen`}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border font-medium flex-shrink-0 transition-[background,border-color,box-shadow] duration-200 hover:brightness-110",
          small ? "px-2.5 py-1.5 text-[11px] min-h-[36px]" : "px-3 py-2 text-xs min-h-[44px]",
          active && "ring-1"
        )}
        style={{
          background:   active ? `${scene.color}28` : `${scene.color}12`,
          borderColor:  active ? scene.color : `${scene.color}30`,
          color:        scene.color,
          ...(active && { boxShadow: `0 0 12px -2px ${scene.color}60` }),
        }}
      >
        {Icon && <Icon size={small ? 10 : 13} aria-hidden="true" />}
        {!Icon && <Sparkles size={small ? 10 : 13} aria-hidden="true" />}
        {scene.label}
        {active && (
          <span
            className="ml-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: scene.color }}
            aria-hidden="true"
          />
        )}
      </motion.button>
    );
  };

  return (
    <div className="space-y-2">
      {/* ─── Main row ─────────────────────────────────────────────────────── */}
      <div
        className="flex gap-1.5 items-center overflow-x-auto scrollbar-none md:flex-wrap"
        role="group"
        aria-label="Scènes"
      >
        {/* Custom scene presets */}
        {CUSTOM_SCENES.map((s) => renderSceneBtn(s))}

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border)] mx-0.5 flex-shrink-0" aria-hidden="true" />

        {/* WiZ toggle */}
        <button
          onClick={() => setShowWiz((v) => !v)}
          aria-expanded={showWiz}
          aria-controls="wiz-scenes-panel"
          aria-label="WiZ ingebouwde scènes tonen"
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all min-h-[44px] flex-shrink-0",
            showWiz
              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "bg-[var(--color-surface)] text-slate-500 border-[var(--color-border)] hover:text-amber-400 hover:border-amber-500/20"
          )}
        >
          <Sparkles size={12} aria-hidden="true" />
          WiZ
          <ChevronDown
            size={10}
            aria-hidden="true"
            style={{ transform: showWiz ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          />
        </button>

        {/* Off */}
        {renderSceneBtn(OFF_SCENE)}

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border)] mx-0.5 flex-shrink-0" aria-hidden="true" />

        {/* Color picker pill — replaces GlobalColorPicker from header */}
        <ColorPill devices={onlineDevices} />
      </div>

      {/* ─── WiZ native scenes ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWiz && (
          <motion.div
            id="wiz-scenes-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="flex gap-1.5 overflow-x-auto scrollbar-none pt-1 md:flex-wrap"
              role="group"
              aria-label="WiZ ingebouwde effecten"
            >
              <p className="w-full text-[10px] text-slate-600 mb-0.5" aria-hidden="true">
                WiZ ingebouwde effecten
              </p>
              {WIZ_SCENES.map((s) => renderSceneBtn(s, true))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
