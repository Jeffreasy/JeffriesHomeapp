"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Lightbulb, Power, Sparkles, Wifi } from "lucide-react";
import { useLampCommand } from "@/hooks/useHomeapp";
import { type Room, type Device } from "@/lib/api";
import { LampCard } from "@/components/lamp/LampCard";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { surfaceVariants } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { Badge } from "@/components/ui/Badge";
import { CUSTOM_SCENES, WIZ_SCENES, type ScenePreset } from "@/lib/scenes";
import { getLightingSummary } from "@/lib/lighting";
import { createLampAmbientStyle } from "@/lib/lampPresentation";
import { uiMotion } from "@/lib/ui/motion";

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
  const roomStatusTone =
    onlineCount === devices.length && devices.length > 0
      ? "success"
      : onlineCount > 0
        ? "warning"
        : "danger";

  return (
    <section
      aria-label={`Kamer ${room.name}`}
      aria-busy={isPending}
      className={surfaceVariants({ padding: "md" })}
    >
      <SurfaceHeader
        icon={
          room.icon ? (
            <span className="text-lg" aria-hidden="true">{room.icon}</span>
          ) : (
            <Lightbulb size={18} className="text-[var(--color-primary-hover)]" aria-hidden="true" />
          )
        }
        title={
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="truncate">{room.name}</span>
            <Badge tone={roomStatusTone} size="sm">{onlineCount}/{devices.length} online</Badge>
          </span>
        }
        meta={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1">
              <Wifi size={11} aria-hidden="true" />
              {onCount} aan
            </span>
            <span>{onCount > 0 ? `${avgBrightness}% gemiddeld` : "geen actief licht"}</span>
          </span>
        }
        action={
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowScenes((value) => !value)}
              disabled={!hasOnlineDevices || isPending}
              aria-expanded={showScenes}
              aria-controls={scenePanelId}
              aria-label={`Scènes voor ${room.name}`}
              variant={showScenes ? "primary" : "secondary"}
              size="sm"
            >
              <Sparkles size={14} aria-hidden="true" />
              Scènes
              <ChevronDown
                size={13}
                aria-hidden="true"
                className={showScenes ? "rotate-180 transition-transform" : "transition-transform"}
              />
            </Button>
            <Button
              onClick={toggleAll}
              disabled={!hasOnlineDevices || isPending}
              aria-label={
                allOn
                  ? `Alle lampen in ${room.name} uitschakelen`
                  : `Alle lampen in ${room.name} aanzetten`
              }
              aria-pressed={allOn}
              variant={allOn ? "secondary" : "primary"}
              size="sm"
            >
              <Power size={14} aria-hidden="true" />
              {allOn ? "Alles uit" : "Alles aan"}
            </Button>
          </div>
        }
        className="flex-col gap-4 lg:flex-row lg:items-start"
      />

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
                <Button
                  key={scene.id}
                  onClick={() => void applyScene(scene)}
                  disabled={!hasOnlineDevices || isPending}
                  aria-label={`${scene.label} scène toepassen in ${room.name}`}
                  variant="secondary"
                  size="sm"
                  className="shrink-0 border-[var(--lamp-ambient-border)] bg-[var(--lamp-ambient-soft)] text-[var(--lamp-text)] hover:brightness-110"
                  style={createLampAmbientStyle(scene.color, true)}
                >
                  <span
                    className="h-2 w-2 rounded-full bg-[var(--lamp-accent)]"
                    aria-hidden="true"
                  />
                  {scene.label}
                </Button>
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
            transition={{ delay: index * (uiMotion.durationSeconds.fast / 4), duration: uiMotion.durationSeconds.standard, ease: "easeOut" }}
          >
            <LampCard device={device} onSelect={onSelect} />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
