"use client";

import { useState } from "react";
import { Router, Plus, Loader2 } from "lucide-react";
import { useCreateRoom } from "@/hooks/useRooms";
import { useToast } from "@/components/ui/Toast";

export function AddRoomForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [floor, setFloor] = useState("0");
  const { mutate: createRoom, isPending } = useCreateRoom();
  const { success, error } = useToast();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    const floorNumber = Number.parseInt(floor, 10);
    createRoom(
      { name, icon: "room", floor_number: Number.isNaN(floorNumber) ? 0 : floorNumber },
      {
        onSuccess: () => {
          success(`Kamer '${name}' aangemaakt`);
          setName(""); setFloor("0"); setOpen(false);
        },
        onError: () => error("Aanmaken mislukt"),
      }
    );
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-white/15 text-slate-500 text-sm hover:border-amber-500/30 hover:text-amber-400 transition-all"
      >
        <Plus size={15} />
        Kamer toevoegen
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="glass rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <Router size={14} className="text-amber-400" />
        Nieuwe kamer
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="room-name" className="text-xs text-slate-500 mb-1 block">
            Naam *
          </label>
          <input
            id="room-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Woonkamer"
            required
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label htmlFor="room-floor" className="text-xs text-slate-500 mb-1 block">
            Verdieping
          </label>
          <input
            id="room-floor"
            type="number"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            min={0}
            max={10}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/25 transition-colors"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Aanmaken
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg bg-white/5 text-slate-400 border border-white/10 text-sm hover:bg-white/10 transition-colors"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
