"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Power, Home, Sparkles, ChevronDown } from "lucide-react";
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
}

export function RoomSection({ room, devices }: RoomSectionProps) {
  const { mutate: sendCommand } = useLampCommand();
  const { success } = useToast();
  const [showScenes, setShowScenes] = useState(false);

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const onCount = devices.filter((d) => d.current_state?.on).length;
  const allOn = onCount === devices.length && devices.length > 0;

  const toggleAll = () => {
    devices.forEach((d) => sendCommand({ id: d.id, cmd: { on: !allOn } }));
  };

  const applyScene = (scene: ScenePreset) => {
    devices.forEach((d) => sendCommand({ id: d.id, cmd: scene.command }));
    success(`"${scene.label}" → ${room.name}`);
    setShowScenes(false);
  };

  const scenePanelId = `scene-panel-${room.id}`;

  return (
    <section aria-label={`Kamer ${room.name}`}>
      {/* Room header */}
      <div
        className="flex items-center justify-between mb-3 gap-2 sticky top-0 z-10 md:static py-2 -mx-1 px-1"
        style={{ background: "rgba(10,10,15,0.85)", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Home size={14} className="text-slate-500 flex-shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-200 truncate">{room.name}</h2>
          <span
            className="text-xs text-slate-600 flex-shrink-0"
            aria-label={`${onlineCount} van ${devices.length} online, ${onCount} aan`}
          >
            {onlineCount}/{devices.length} · {onCount} aan
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowScenes((v) => !v)}
            aria-expanded={showScenes}
            aria-controls={scenePanelId}
            aria-label={`Scènes voor ${room.name}`}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all",
              showScenes
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                : "bg-white/5 text-slate-500 border-white/10 hover:text-amber-400 hover:border-amber-500/20"
            )}
          >
            <Sparkles size={11} aria-hidden="true" />
            <span>Scène</span>
            <ChevronDown
              size={10}
              aria-hidden="true"
              style={{ transform: showScenes ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            />
          </button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={toggleAll}
            aria-label={allOn ? `Alle lampen in ${room.name} uitschakelen` : `Alle lampen in ${room.name} aanzetten`}
            aria-pressed={allOn}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-all",
              allOn
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
            )}
          >
            <Power size={12} aria-hidden="true" />
            {allOn ? "Uit" : "Aan"}
          </motion.button>
        </div>
      </div>

      {/* Scene picker */}
      <AnimatePresence>
        {showScenes && (
          <motion.div
            id={scenePanelId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div
              className="flex gap-1.5 overflow-x-auto scrollbar-none pb-2 md:flex-wrap"
              role="group"
              aria-label={`Scènes toepassen in ${room.name}`}
            >
              {ROOM_SCENE_LIST.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => applyScene(scene)}
                  aria-label={`${scene.label} scène toepassen in ${room.name}`}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-[background] duration-150 hover:brightness-110"
                  style={{
                    background: `${scene.color}12`,
                    borderColor: `${scene.color}30`,
                    color: scene.color,
                  }}
                >
                  {scene.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lamp grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {devices.map((device) => (
          <LampCard key={device.id} device={device} />
        ))}
      </div>
    </section>
  );
}
