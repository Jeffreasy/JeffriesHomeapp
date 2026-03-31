"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Power, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useDevices, useRooms, useLampCommand } from "@/hooks/useHomeapp";
import { RoomSection } from "@/components/room/RoomSection";
import { LampCard } from "@/components/lamp/LampCard";
import { LampDetailPanel } from "@/components/lamp/LampDetailPanel";
import { SceneBar } from "@/components/scenes/SceneBar";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";
import { type Device } from "@/lib/api";

export default function LampenPage() {
  const { data: devices = [], isLoading: loadingDevices, error } = useDevices();
  const { data: rooms = [], isLoading: loadingRooms } = useRooms();
  const { mutate: sendCommand } = useLampCommand();

  // Selected device for desktop slide panel
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  const handleSelect = (device: Device) => {
    setSelectedDevice((prev) => (prev?.id === device.id ? null : device));
  };

  const onlineDevices = devices.filter((d) => d.status === "online");
  const onDevices = devices.filter((d) => d.current_state?.on);
  const allOn = onDevices.length === devices.length && devices.length > 0;

  const toggleAll = () =>
    devices.forEach((d) => sendCommand({ id: d.id, cmd: { on: !allOn } }));

  useGlobalShortcuts({ devices, allOn, sendCommand });

  const devicesByRoom = rooms.map((room) => ({
    room,
    devices: devices.filter((d) => d.room_id === room.id),
  }));
  const unassigned = devices.filter((d) => !d.room_id);

  return (
    // Outer flex: grid + slide panel side by side
    <div className="flex min-h-screen" style={{ background: "#0a0a0f" }}>
      {/* Main scrollable area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* ─── Header ──────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                <Lightbulb size={18} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Verlichting</h1>
                <p className="text-xs text-slate-500">
                  {onlineDevices.length}/{devices.length} online · {onDevices.length} aan
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Master toggle */}
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={toggleAll}
                title="Alle lampen aan/uit (Spatiebalk)"
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  allOn
                    ? "bg-slate-500/15 text-slate-300 border-slate-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30"
                    : "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                }`}
              >
                <Power size={13} />
                <span className="hidden sm:inline">{allOn ? "Zet uit" : "Zet aan"}</span>
              </motion.button>
            </div>
          </div>
        </header>

        {/* ─── Scene bar ───────────────────────────────────────────────────── */}
        <div className="px-6 pt-4 pb-0 flex-shrink-0">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Scènes</p>
          <SceneBar />
        </div>

        {/* ─── Main content (scrollable) ────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-6 py-5 pb-32 space-y-8 max-w-5xl">
          {/* Error */}
          {error && (
            <div className="glass rounded-2xl border border-red-500/20 p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-300">Verbinding mislukt</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {error instanceof Error ? error.message : "Kan geen verbinding maken met de backend."}
                </p>
              </div>
            </div>
          )}

          {loadingDevices || loadingRooms ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2 items-start">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="glass rounded-2xl h-20 animate-pulse"
                  style={{ animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          ) : (
            <>
              {/* Rooms with devices */}
              {devicesByRoom
                .filter(({ devices }) => devices.length > 0)
                .map(({ room, devices }) => (
                  <RoomSection
                    key={room.id}
                    room={room}
                    devices={devices}
                    onSelect={handleSelect}
                  />
                ))}

              {/* Unassigned lamps */}
              {unassigned.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb size={14} className="text-slate-500" />
                    <h2 className="text-sm font-semibold text-slate-400">
                      Alle lampen ({unassigned.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
                    {unassigned.map((d) => (
                      <LampCard key={d.id} device={d} onSelect={handleSelect} />
                    ))}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {devices.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                    <Lightbulb size={28} className="text-slate-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-300">Geen lampen gevonden</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Ga naar{" "}
                    <Link href="/settings" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors">
                      Instellingen
                    </Link>{" "}
                    om een lamp te registreren.
                  </p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ─── Desktop slide panel ─────────────────────────────────────────────── */}
      {selectedDevice && (
        <LampDetailPanel
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
        />
      )}
    </div>
  );
}
