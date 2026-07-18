"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lightbulb, Power, Sparkles, Wifi } from "lucide-react";
import { useLampCommand } from "@/hooks/useHomeapp";
import { type Room, type Device } from "@/lib/api";
import { LampCard } from "@/components/lamp/LampCard";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { CUSTOM_SCENES, WIZ_SCENES, type ScenePreset } from "@/lib/scenes";
import { getLightingSummary } from "@/lib/lighting";

const ROOM_SCENE_LIST = [...CUSTOM_SCENES, ...WIZ_SCENES];

interface RoomSectionProps {
  room: Room;
  devices: Device[];
  onSelect?: (device: Device) => void;
}

export function RoomSection({ room, devices, onSelect }: RoomSectionProps) {
  const { sendBatch, isPending } = useLampCommand();
  const { success } = useToast();
  const [showScenes, setShowScenes] = useState(false);

  const summary = getLightingSummary(devices);
  const { onlineDevices } = summary;
  const onlineCount = summary.online;
  const onCount = summary.on;
  const allOn = summary.allOnlineOn;
  const avgBrightness = summary.averageBrightness;

  const toggleAll = () => {
    if (isPending) return;
    void sendBatch(onlineDevices, { on: !allOn });
  };

  const applyScene = async (scene: ScenePreset) => {
    if (isPending) return;
    const result = await sendBatch(onlineDevices, scene.command);
    if (result.failed.length === 0) {
      success(`${scene.label} verstuurd naar ${room.name}`);
    } else if (result.succeeded > 0) {
      success(`${scene.label} verstuurd naar ${result.succeeded} van ${result.total} lampen in ${room.name}`);
    }
    setShowScenes(false);
  };

  const scenePanelId = `scene-panel-${room.id}`;
  const hasOnlineDevices = onlineDevices.length > 0;

  return (
    <section
      aria-label={`Kamer ${room.name}`}
      aria-busy={isPending}
      className="glass min-w-0 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
            {room.icon ? (
              <span className="text-lg" aria-hidden="true">
                {room.icon}
              </span>
            ) : (
              <Lightbulb size={18} className="text-amber-300" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-base font-bold text-white">{room.name}</h2>
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  onlineCount === devices.length && devices.length > 0
                    ? "bg-emerald-400"
                    : onlineCount > 0
                      ? "bg-amber-400"
                      : "bg-rose-400",
                )}
                aria-hidden="true"
              />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Wifi size={11} />
                {onlineCount}/{devices.length} online
              </span>
              <span>{onCount} aan</span>
              <span>{onCount > 0 ? `${avgBrightness}% gemiddeld` : "geen actief licht"}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowScenes((value) => !value)}
            disabled={!hasOnlineDevices || isPending}
            aria-expanded={showScenes}
            aria-controls={scenePanelId}
            aria-label={`Scènes voor ${room.name}`}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
              showScenes
                ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200",
              (!hasOnlineDevices || isPending) && "cursor-not-allowed opacity-40",
            )}
          >
            <Sparkles size={14} aria-hidden="true" />
            Scènes
            <ChevronDown
              size={13}
              aria-hidden="true"
              className={showScenes ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>

          <motion.button
            type="button"
            whileTap={{ scale: hasOnlineDevices && !isPending ? 0.94 : 1 }}
            onClick={toggleAll}
            disabled={!hasOnlineDevices || isPending}
            aria-label={
              allOn
                ? `Alle lampen in ${room.name} uitschakelen`
                : `Alle lampen in ${room.name} aanzetten`
            }
            aria-pressed={allOn}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
              allOn
                ? "border-slate-500/30 bg-slate-500/15 text-slate-200 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                : "border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
              (!hasOnlineDevices || isPending) && "cursor-not-allowed opacity-40",
            )}
          >
            <Power size={14} aria-hidden="true" />
            {allOn ? "Alles uit" : "Alles aan"}
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {showScenes && (
          <motion.div
            id={scenePanelId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className="mt-4 flex gap-2 overflow-x-auto border-t border-[var(--color-border)] pt-4 scrollbar-none md:flex-wrap"
              role="group"
              aria-label={`Scènes toepassen in ${room.name}`}
            >
              {ROOM_SCENE_LIST.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => void applyScene(scene)}
                  disabled={!hasOnlineDevices || isPending}
                  aria-label={`${scene.label} scène toepassen in ${room.name}`}
                  className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-[background,border-color] duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: `${scene.color}12`,
                    borderColor: `${scene.color}30`,
                    color: scene.color,
                  }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: scene.color }}
                    aria-hidden="true"
                  />
                  {scene.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((device, index) => (
          <motion.div
            key={device.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03, duration: 0.2, ease: "easeOut" }}
          >
            <LampCard device={device} onSelect={onSelect} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
