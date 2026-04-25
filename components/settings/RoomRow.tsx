"use client";

import { useState } from "react";
import { Check, Loader2, Pencil, Router, Trash2, X } from "lucide-react";
import { useUpdateRoom } from "@/hooks/useRooms";
import { useToast } from "@/components/ui/Toast";
import type { Device, Room } from "@/lib/api";

export function RoomRow({
  room,
  devices,
  deleting,
  onDelete,
}: {
  room: Room;
  devices: Device[];
  deleting: boolean;
  onDelete: (room: Room) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(room.name);
  const [floor, setFloor] = useState(String(room.floor_number));
  const { mutate: updateRoom, isPending } = useUpdateRoom();
  const { success, error } = useToast();

  const reset = () => {
    setName(room.name);
    setFloor(String(room.floor_number));
    setEditing(false);
  };

  const save = () => {
    const floorNumber = Number.parseInt(floor, 10);
    updateRoom(
      {
        id: room.id,
        name: name.trim(),
        floor_number: Number.isNaN(floorNumber) ? 0 : floorNumber,
      },
      {
        onSuccess: () => {
          success("Kamer bijgewerkt");
          setEditing(false);
        },
        onError: (err) => error(err instanceof Error ? err.message : "Bijwerken mislukt"),
      },
    );
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
        <Router size={16} className="text-amber-300" />
      </div>

      {editing ? (
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_96px]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && save()}
            className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
            aria-label="Kamernaam"
          />
          <input
            value={floor}
            onChange={(event) => setFloor(event.target.value)}
            type="number"
            className="min-w-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
            aria-label="Verdieping"
          />
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-200">{room.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {devices.length} lamp(en) - verdieping {room.floor_number}
          </p>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        {editing ? (
          <>
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              aria-label="Kamer opslaan"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              type="button"
              onClick={reset}
              aria-label="Kamer bewerken annuleren"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-500 transition-colors hover:text-slate-300"
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={`Kamer ${room.name} bewerken`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-500 transition-colors hover:border-amber-500/30 hover:text-amber-300"
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(room)}
              disabled={deleting}
              aria-label={`Kamer ${room.name} verwijderen`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-500 transition-colors hover:border-rose-500/30 hover:text-rose-300 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
