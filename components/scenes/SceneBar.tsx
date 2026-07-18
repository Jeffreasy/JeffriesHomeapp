"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, Sunset, Popcorn, Zap, Coffee,
  ChevronDown, Sparkles, Palette, X, Send,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { CUSTOM_SCENES, WIZ_SCENES, OFF_SCENE, detectActiveScene, type ScenePreset } from "@/lib/scenes";
import { cn, hexToRgb } from "@/lib/utils";
import type { Device, DeviceCommand } from "@/lib/api";
import type { LampBatchResult } from "@/lib/deviceCommands";

const LazyHexColorPicker = dynamic(
  () => import("react-colorful").then((module) => module.HexColorPicker),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[130px] w-full animate-pulse rounded-xl bg-white/[0.04]"
        aria-hidden="true"
      />
    ),
  },
);

type SendLampBatch = (
  targets: readonly Device[],
  command: DeviceCommand,
) => Promise<LampBatchResult>;

interface SceneBarProps {
  devices: Device[];
  sendBatch: SendLampBatch;
  isPending: boolean;
}

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

function ColorPill({
  devices,
  sendBatch,
  isPending,
}: SceneBarProps) {
  const [open, setOpen] = useState(false);
  const [hex, setHex]   = useState("#ff8800");
  const { success } = useToast();

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Popover-hygiëne: Escape + klik-buiten sluiten, en focus verplaatst naar de
  // popover bij openen en terug naar de trigger bij sluiten.
  useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const apply = async () => {
    if (devices.length === 0 || isPending) return;
    const { r, g, b } = hexToRgb(hex);
    const result = await sendBatch(devices, { r, g, b, on: true });
    if (result.failed.length === 0) {
      success("Kleur verstuurd naar alle lampen");
    } else if (result.succeeded > 0) {
      success(`Kleur verstuurd naar ${result.succeeded} van ${result.total} lampen`);
    }
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      <motion.button
        ref={triggerRef}
        whileTap={{ scale: 0.93 }}
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={devices.length === 0 || isPending}
        className={cn(
          "flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40",
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
                ref={closeBtnRef}
                onClick={() => setOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-300"
                type="button"
                aria-label="Sluiten"
              >
                <X size={13} />
              </button>
            </div>
            <LazyHexColorPicker
              color={hex}
              onChange={setHex}
              className="!h-[130px] !w-full"
            />
            <div
              className="w-full h-6 rounded-lg mt-2 border border-[var(--color-border)]"
              style={{ background: hex, transition: "background 0.1s" }}
            />
            <p className="text-center text-[10px] font-mono text-slate-500 mt-1">{hex.toUpperCase()}</p>
            <button
              type="button"
              onClick={() => void apply()}
              disabled={devices.length === 0 || isPending}
              className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
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

export function SceneBar({ devices, sendBatch, isPending }: SceneBarProps) {
  const { success } = useToast();
  const [showWiz, setShowWiz] = useState(false);

  const onlineDevices = devices.filter((d) => d.status === "online");
  const activeScene = detectActiveScene(devices);

  const applyScene = async (scene: ScenePreset) => {
    if (onlineDevices.length === 0 || isPending) return;
    const result = await sendBatch(onlineDevices, scene.command);
    if (result.failed.length === 0) {
      success(`Scène "${scene.label}" verstuurd`);
    } else if (result.succeeded > 0) {
      success(`Scène "${scene.label}" verstuurd naar ${result.succeeded} van ${result.total} lampen`);
    }
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
        onClick={() => void applyScene(scene)}
        disabled={onlineDevices.length === 0 || isPending}
        aria-pressed={active}
        type="button"
        aria-label={`Scène ${scene.label} toepassen`}
        className={cn(
          "flex flex-shrink-0 items-center gap-1.5 rounded-xl border font-medium transition-[background,border-color,box-shadow] duration-200 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40",
          small ? "min-h-11 px-2.5 py-1.5 text-[11px]" : "min-h-11 px-3 py-2 text-xs",
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
        <ColorPill
          devices={onlineDevices}
          sendBatch={sendBatch}
          isPending={isPending}
        />
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
