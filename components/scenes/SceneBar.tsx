"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, Sunset, Popcorn, Zap, Coffee,
  ChevronDown, Sparkles, Palette, Send,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Popover } from "@/components/ui/Popover";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { CUSTOM_SCENES, WIZ_SCENES, OFF_SCENE, detectActiveScene, type ScenePreset } from "@/lib/scenes";
import { cn, hexToRgb } from "@/lib/utils";

import type { Device, DeviceCommand } from "@/lib/api";
import type { LampBatchResult } from "@/lib/deviceCommands";
import { createLampAmbientStyle } from "@/lib/lampPresentation";
import { uiMotion } from "@/lib/ui/motion";

const LazyHexColorPicker = dynamic(
  () => import("react-colorful").then((module) => module.HexColorPicker),
  {
    ssr: false,
    loading: () => (
      <Skeleton className="h-[130px] w-full" />
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
  const ambientStyle = createLampAmbientStyle(hex, true);


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
    <Popover
      open={open}
      onOpenChange={setOpen}
      title="Kleur instellen"
      ariaLabel="Kleur instellen voor alle lampen"
      closeLabel="Kleurkiezer sluiten"
      rootClassName="shrink-0"
      className="w-56"
      trigger={(triggerProps) => (
        <motion.button
          {...triggerProps}
          type="button"
          whileTap={uiMotion.press.control}
          disabled={devices.length === 0 || isPending}
          className={cn(
            buttonVariants({ variant: "secondary", size: "sm" }),
            "shrink-0 border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-soft)] text-[var(--lamp-text)] hover:border-[var(--lamp-ambient-ring)] hover:bg-[var(--lamp-ambient-medium)]",
          )}
          style={ambientStyle}
          aria-label="Kleur instellen voor alle lampen"
        >
          <Palette size={13} aria-hidden="true" />
          Kleur
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-[var(--lamp-ambient-border)] bg-[var(--lamp-accent)]"
            aria-hidden="true"
          />
        </motion.button>
      )}
    >
      <div className="mt-3" style={ambientStyle}>
        <LazyHexColorPicker
          color={hex}
          onChange={setHex}
          className="!h-[130px] !w-full"
        />
        <div
          className="mt-2 h-6 w-full rounded-lg border border-[var(--lamp-ambient-border)] bg-[var(--lamp-accent)] transition-colors duration-[var(--motion-fast)]"
          // The selected lamp color is runtime data and intentionally stays physical.
        />
        <p className="mt-1 text-center font-mono text-micro text-[var(--color-text-subtle)]">{hex.toUpperCase()}</p>
        <Button
          onClick={() => void apply()}
          disabled={devices.length === 0}
          loading={isPending}
          loadingLabel="Kleur toepassen…"
          variant="primary"
          size="sm"
          fullWidth
          className="mt-3"
        >
          <Send size={12} aria-hidden="true" />
          Toepassen op {devices.length} lampen
        </Button>
      </div>
    </Popover>
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
        whileTap={uiMotion.press.control}
        onClick={() => void applyScene(scene)}
        disabled={onlineDevices.length === 0 || isPending}
        aria-pressed={active}
        type="button"
        aria-label={`Scène ${scene.label} toepassen`}
        className={cn(
          buttonVariants({ variant: "secondary", size: "sm" }),
          "shrink-0 border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-soft)] text-[var(--lamp-text)] hover:border-[var(--lamp-ambient-ring)] hover:bg-[var(--lamp-ambient-medium)]",
          small && "px-2.5 text-micro",
          active && "ring-1 ring-[var(--lamp-ambient-ring)] shadow-[0_0_12px_-2px_var(--lamp-ambient-shadow)]",
        )}
        // Scene colors are device data and communicate the actual light output.
        style={createLampAmbientStyle(scene.color, active)}
      >
        {Icon && <Icon size={small ? 10 : 13} aria-hidden="true" />}
        {!Icon && <Sparkles size={small ? 10 : 13} aria-hidden="true" />}
        {scene.label}
        {active && (
          <span
            className="ml-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--lamp-accent)]"
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
        <Button
          onClick={() => setShowWiz((value) => !value)}
          aria-expanded={showWiz}
          aria-controls="wiz-scenes-panel"
          aria-label="WiZ ingebouwde scènes tonen"
          variant={showWiz ? "primary" : "secondary"}
          size="sm"
          className="shrink-0"
        >
          <Sparkles size={12} aria-hidden="true" />
          WiZ
          <ChevronDown
            size={10}
            aria-hidden="true"
            className={showWiz ? "rotate-180 transition-transform" : "transition-transform"}
          />
        </Button>

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
              <p className="w-full text-micro text-[var(--color-text-subtle)] mb-0.5" aria-hidden="true">
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
