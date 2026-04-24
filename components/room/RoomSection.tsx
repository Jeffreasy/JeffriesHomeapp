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

const ROOM_SCENE_LIST = [...CUSTOM_SCENES, ...WIZ_SCENES];

interface RoomSectionProps {
  room: Room;
  devices: Device[];
  onSelect?: (device: Device) => void;
}

export function RoomSection({ room, devices, onSelect }: RoomSectionProps) {
  const { mutate: sendCommand } = useLampCommand();
  const { success } = useToast();
  const [showScenes, setShowScenes] = useState(false);

  const onlineDevices = devices.filter((device) => device.status === "online");
  const onlineCount = onlineDevices.length;
  const onCount = onlineDevices.filter((device) => device.current_state?.on).length;
  const allOn = onlineDevices.length > 0 && onlineDevices.every((device) => device.current_state?.on);
  const avgBrightness =
    onCount > 0
      ? Math.round(
          onlineDevices
            .filter((device) => device.current_state?.on)
            .reduce((total, device) => total + (device.current_state?.brightness ?? 0), 0) / onCount
        )
      : 0;

  const toggleAll = () => {
    onlineDevices.forEach((device) => sendCommand({ id: device.id, cmd: { on: !allOn } }));
  };

  const applyScene = (scene: ScenePreset) => {
    onlineDevices.forEach((device) => sendCommand({ id: device.id, cmd: scene.command }));
    success(`${scene.label} toegepast in ${room.name}`);
    setShowScenes(false);
  };

  const scenePanelId = `scene-panel-${room.id}`;
  const hasOnlineDevices = onlineDevices.length > 0;

  return (
    <section
      aria-label={`Kamer ${room.name}`}
      className="rounded-2xl border border-white/8 bg-white/[0.025] p-4 shadow-[0_16px_44px_rgba(0,0,0,0.18)]"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
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
                      : "bg-rose-400"
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
            disabled={!hasOnlineDevices}
            aria-expanded={showScenes}
            aria-controls={scenePanelId}
            aria-label={`Scènes voor ${room.name}`}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
              showScenes
                ? "border-amber-500/30 bg-amber-500/15 text-amber-200"
                : "border-white/10 bg-white/[0.035] text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
              !hasOnlineDevices && "cursor-not-allowed opacity-40"
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
            whileTap={{ scale: hasOnlineDevices ? 0.94 : 1 }}
            onClick={toggleAll}
            disabled={!hasOnlineDevices}
            aria-label={allOn ? `Alle lampen in ${room.name} uitschakelen` : `Alle lampen in ${room.name} aanzetten`}
            aria-pressed={allOn}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors",
              allOn
                ? "border-slate-500/30 bg-slate-500/15 text-slate-200 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300"
                : "border-amber-500/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
              !hasOnlineDevices && "cursor-not-allowed opacity-40"
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
              className="mt-4 flex gap-2 overflow-x-auto border-t border-white/6 pt-4 scrollbar-none md:flex-wrap"
              role="group"
              aria-label={`Scènes toepassen in ${room.name}`}
            >
              {ROOM_SCENE_LIST.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => applyScene(scene)}
                  disabled={!hasOnlineDevices}
                  aria-label={`${scene.label} scène toepassen in ${room.name}`}
                  className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-[background,border-color] duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
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
