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
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-sm text-slate-500 transition-all hover:border-amber-500/30 hover:text-amber-400"
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
      <div className="grid gap-2 sm:grid-cols-2">
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
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
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
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/25"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Aanmaken
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-[var(--color-surface-hover)]"
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}
