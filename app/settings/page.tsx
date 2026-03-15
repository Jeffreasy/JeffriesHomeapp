"use client";

import { useState } from "react";
import { Home, Zap, Lightbulb, Plus, Trash2 } from "lucide-react";
import { useDevices } from "@/hooks/useDevices";
import { useRooms, useDeleteRoom } from "@/hooks/useRooms";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { DeviceRow } from "@/components/settings/DeviceRow";
import { AddDeviceForm } from "@/components/settings/AddDeviceForm";
import { AddRoomForm } from "@/components/settings/AddRoomForm";

export default function SettingsPage() {
  const { data: devices = [], isLoading } = useDevices();
  const { data: rooms = [] } = useRooms();
  const { mutate: deleteRoom } = useDeleteRoom();
  const { openConfirm } = useConfirm();
  const { success, error } = useToast();

  const handleDeleteRoom = async (room: { id: string; name: string }) => {
    const lampenCount = devices.filter((d) => d.room_id === room.id).length;
    const confirmed = await openConfirm({
      title: "Kamer verwijderen",
      message: `Kamer '${room.name}' verwijderen?${lampenCount > 0 ? ` (${lampenCount} lamp(en) worden ontkoppeld)` : ""}`,
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!confirmed) return;
    deleteRoom(room.id, {
      onSuccess: () => success(`Kamer '${room.name}' verwijderd`),
      onError: () => error("Verwijderen mislukt"),
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md px-6 py-4">
        <h1 className="text-xl font-bold text-white">Instellingen</h1>
        <p className="text-sm text-slate-500 mt-0.5">Beheer lampen, kamers en je installatie</p>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto space-y-8">
        {/* Devices */}
        <ErrorBoundary>
          <section>
            <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Lightbulb size={14} />
              Lampen ({devices.length})
            </h2>
            <div className="space-y-2">
              {isLoading
                ? [...Array(3)].map((_, i) => (
                    <div key={i} className="glass rounded-xl h-16 animate-pulse" />
                  ))
                : devices.map((d) => (
                    <DeviceRow key={d.id} device={d} rooms={rooms} />
                  ))}
              <AddDeviceForm rooms={rooms} />
            </div>
          </section>
        </ErrorBoundary>

        {/* Rooms */}
        <ErrorBoundary>
          <section>
            <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <Home size={14} />
              Kamers ({rooms.length})
            </h2>
            <div className="space-y-2">
              {rooms.map((r) => (
                <div key={r.id} className="glass rounded-xl p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">{r.name}</p>
                    <p className="text-xs text-slate-500">
                      {devices.filter((d) => d.room_id === r.id).length} lamp(en) · Verdieping{" "}
                      {r.floor_number}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteRoom(r)}
                    aria-label={`Kamer ${r.name} verwijderen`}
                    className="w-8 h-8 rounded-lg bg-white/5 text-slate-500 border border-white/10 flex items-center justify-center hover:text-red-400 hover:border-red-500/30 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              <AddRoomForm />
            </div>
          </section>
        </ErrorBoundary>

        {/* API Info */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Zap size={14} />
            API
          </h2>
          <div className="glass rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Backend</span>
              <code className="text-amber-400 text-xs">
                {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1"}
              </code>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Swagger</span>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-blue-400 hover:underline"
              >
                localhost:8000/docs ↗
              </a>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">Sneltoets</span>
              <code className="text-xs text-slate-400">Spatiebalk = alles aan/uit</code>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
