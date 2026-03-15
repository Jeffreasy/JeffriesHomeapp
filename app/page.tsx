"use client";

import { motion } from "framer-motion";
import { Lightbulb, Power } from "lucide-react";
import { useDevices, useRooms, useLampCommand } from "@/hooks/useHomeapp";
import { RoomSection } from "@/components/room/RoomSection";
import { LampCard } from "@/components/lamp/LampCard";
import { SceneBar } from "@/components/scenes/SceneBar";
import { GlobalColorPicker } from "@/components/scenes/GlobalColorPicker";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { useSchedule } from "@/hooks/useSchedule";
import { useEffect } from "react";

export default function DashboardPage() {
  const { data: devices = [], isLoading: loadingDevices } = useDevices();
  const { data: rooms = [], isLoading: loadingRooms } = useRooms();
  const { mutate: sendCommand } = useLampCommand();
  const { nextDienst } = useSchedule();

  const onlineDevices = devices.filter((d) => d.status === "online");
  const onDevices = devices.filter((d) => d.current_state?.on);
  const allOn = onDevices.length === devices.length && devices.length > 0;

  const toggleAll = () => {
    devices.forEach((d) => sendCommand({ id: d.id, cmd: { on: !allOn } }));
  };

  // ─── Keyboard shortcut: Space = toggle all ───────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      e.preventDefault();
      devices.forEach((d) => sendCommand({ id: d.id, cmd: { on: !allOn } }));
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [devices, allOn, sendCommand]);

  // Group devices by room (stable)
  const devicesByRoom = rooms.map((room) => ({
    room,
    devices: devices.filter((d) => d.room_id === room.id),
  }));
  const unassigned = devices.filter((d) => !d.room_id);

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#0a0a0f" }}>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md px-6 py-4">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {onlineDevices.length}/{devices.length} online · {onDevices.length} aan
            </p>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Stats */}
            <div className="hidden sm:flex items-center gap-3 mr-1">
              <div className="text-center">
                <p className="text-base font-bold text-amber-400">{onDevices.length}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Aan</p>
              </div>
              <div className="w-px h-7 bg-white/10" />
              <div className="text-center">
                <p className="text-base font-bold text-green-400">{onlineDevices.length}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Online</p>
              </div>
            </div>

            {/* Global color picker */}
            <GlobalColorPicker />

            {/* Master on/off */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={toggleAll}
              title="Alles aan/uit (Spatiebalk)"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                allOn
                  ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                  : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
              }`}
            >
              <Power size={13} />
              <span className="hidden sm:inline">{allOn ? "Alles uit" : "Alles aan"}</span>
            </motion.button>
          </div>
        </div>
      </header>

      {/* Scene bar */}
      <div className="px-6 pt-4 pb-0">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Scènes</p>
        <SceneBar />
      </div>

      {/* Compact next shift — only when schedule has data */}
      {nextDienst && (
        <div className="px-6 pt-3">
          <NextShiftCard dienst={nextDienst} compact />
        </div>
      )}

      <main className="px-6 py-5 space-y-8 max-w-5xl mx-auto">
        {loadingDevices || loadingRooms ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="glass rounded-2xl h-24 animate-pulse"
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))}
          </div>
        ) : (
          <>
            {/* Rooms */}
            {devicesByRoom
              .filter(({ devices }) => devices.length > 0)
              .map(({ room, devices }) => (
                <RoomSection key={room.id} room={room} devices={devices} />
              ))}

            {/* Unassigned */}
            {unassigned.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb size={14} className="text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-400">
                    Geen kamer ({unassigned.length})
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {unassigned.map((d) => (
                    <LampCard key={d.id} device={d} />
                  ))}
                </div>
              </section>
            )}

            {devices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Lightbulb size={28} className="text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-300">Geen lampen gevonden</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ga naar <span className="text-amber-400">Instellingen</span> om een lamp te registreren.
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
