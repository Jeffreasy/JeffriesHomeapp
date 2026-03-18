"use client";

import { motion } from "framer-motion";
import { Lightbulb, Power, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useDevices, useRooms, useLampCommand } from "@/hooks/useHomeapp";
import { RoomSection } from "@/components/room/RoomSection";
import { LampCard } from "@/components/lamp/LampCard";
import { SceneBar } from "@/components/scenes/SceneBar";
import { GlobalColorPicker } from "@/components/scenes/GlobalColorPicker";
import { NextShiftCard } from "@/components/schedule/NextShiftCard";
import { useSchedule } from "@/hooks/useSchedule";
import { useGlobalShortcuts } from "@/hooks/useGlobalShortcuts";

export default function DashboardPage() {
  const { data: devices = [], isLoading: loadingDevices, error: devicesError } = useDevices();
  const { data: rooms = [], isLoading: loadingRooms } = useRooms();
  const { mutate: sendCommand } = useLampCommand();
  const { nextDienst } = useSchedule();

  const onlineDevices = devices.filter((d) => d.status === "online");
  const onDevices = devices.filter((d) => d.current_state?.on);
  const allOn = onDevices.length === devices.length && devices.length > 0;

  const toggleAll = () => {
    devices.forEach((d) => sendCommand({ id: d.id, cmd: { on: !allOn } }));
  };

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useGlobalShortcuts({ devices, allOn, sendCommand });

  // Group devices by room
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
        {/* ─── Error state ───────────────────────────────────────────────────── */}
        {devicesError && (
          <div className="glass rounded-2xl border border-red-500/20 p-4 flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-red-300">Verbinding mislukt</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {devicesError instanceof Error
                  ? devicesError.message
                  : "Kan geen verbinding maken met de backend. Controleer of de server online is."}
              </p>
            </div>
          </div>
        )}

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
                <RoomSection
                  key={room.id}
                  room={room}
                  devices={devices}
                />
              ))}

            {/* Geen kamer — lampen zonder room_id */}
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

            {/* ─── Empty state ────────────────────────────────────────────── */}
            {devices.length === 0 && !devicesError && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Lightbulb size={28} className="text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-300">Geen lampen gevonden</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Ga naar{" "}
                  <Link
                    href="/settings"
                    className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                  >
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
  );
}
