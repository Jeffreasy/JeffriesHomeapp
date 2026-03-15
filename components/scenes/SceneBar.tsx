"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sun, Moon, Sunset, Popcorn, Zap, Coffee,
  Power, ChevronDown, Sparkles,
} from "lucide-react";
import { useDevices, useLampCommand } from "@/hooks/useHomeapp";
import { useToast } from "@/components/ui/Toast";
import { CUSTOM_SCENES, WIZ_SCENES, OFF_SCENE, detectActiveScene, type ScenePreset } from "@/lib/scenes";
import { cn } from "@/lib/utils";

const CUSTOM_ICONS = [Sun, Sunset, Moon, Popcorn, Zap, Coffee];

export function SceneBar() {
  const { data: devices = [] } = useDevices();
  const { mutate: sendCommand } = useLampCommand();
  const { success } = useToast();
  const [showWiz, setShowWiz] = useState(false);

  const activeScene = detectActiveScene(devices);

  const applyScene = (scene: ScenePreset) => {
    // ScenePreset["command"] is a strict superset of DeviceCommand (adds scene_id)
    // DeviceCommand now includes scene_id so no cast needed
    devices.forEach((d) => sendCommand({ id: d.id, cmd: scene.command }));
    success(`Scène "${scene.label}" toegepast`);
    setShowWiz(false);
  };

  const isActive = (id: string) => activeScene === id;

  return (
    <div className="space-y-2">
      {/* Row 1: custom presets + Meer + Uit — horizontal scroll on mobile */}
      <div
        className="flex gap-1.5 items-center overflow-x-auto scrollbar-none md:flex-wrap"
        role="group"
        aria-label="Scènes"
      >
        {CUSTOM_SCENES.map((scene, i) => {
          const Icon = CUSTOM_ICONS[i];
          const active = isActive(scene.id);
          return (
            <motion.button
              key={scene.id}
              whileTap={{ scale: 0.93 }}
              onClick={() => applyScene(scene)}
              aria-pressed={active}
              aria-label={`Scène ${scene.label} toepassen`}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium flex-shrink-0",
                "min-h-[44px] transition-[background,border-color,box-shadow] duration-200",
                "hover:brightness-110",
                active && "ring-1"
              )}
              style={{
                "--scene-color": scene.color,
                background: active ? `${scene.color}28` : `${scene.color}12`,
                borderColor: active ? scene.color : `${scene.color}30`,
                color: scene.color,
                ...(active && { boxShadow: `0 0 12px -2px ${scene.color}60` }),
              } as React.CSSProperties}
            >
              <Icon size={13} aria-hidden="true" />
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
        })}

        {/* WiZ toggle */}
        <button
          onClick={() => setShowWiz((v) => !v)}
          aria-expanded={showWiz}
          aria-controls="wiz-scenes-panel"
          aria-label="WiZ ingebouwde scènes tonen"
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
            showWiz
              ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
              : "bg-white/5 text-slate-500 border-white/10 hover:text-amber-400 hover:border-amber-500/20"
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

        <div className="w-px h-5 bg-white/10 mx-0.5" aria-hidden="true" />

        {/* Alles uit */}
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={() => applyScene(OFF_SCENE)}
          aria-pressed={isActive("uit")}
          aria-label="Alle lampen uitschakelen"
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all",
            isActive("uit")
              ? "bg-slate-500/20 text-slate-300 border-slate-500/50"
              : "bg-white/5 text-slate-500 border-white/10 hover:text-slate-300 hover:border-white/30"
          )}
        >
          <Power size={12} aria-hidden="true" />
          Uit
          {isActive("uit") && (
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" aria-hidden="true" />
          )}
        </motion.button>
      </div>

      {/* Row 2: WiZ native scenes */}
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
              <p className="w-full text-[10px] text-slate-600 mb-1" aria-hidden="true">
                WiZ ingebouwde effecten
              </p>
              {WIZ_SCENES.map((scene) => (
                <motion.button
                  key={scene.id}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => applyScene(scene)}
                  aria-label={`WiZ scène ${scene.label} toepassen`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-[background] duration-150 hover:brightness-110"
                  style={{
                    background: `${scene.color}10`,
                    borderColor: `${scene.color}25`,
                    color: scene.color,
                  }}
                >
                  <Sparkles size={10} aria-hidden="true" />
                  {scene.label}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
