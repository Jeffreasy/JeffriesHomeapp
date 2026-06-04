"use client";

import { useState } from "react";
import { Wifi, Plus, Loader2 } from "lucide-react";
import { type Room } from "@/lib/api";
import { useCreateDevice } from "@/hooks/useDevices";
import { useToast } from "@/components/ui/Toast";

interface AddDeviceFormProps {
  rooms: Room[];
}

export function AddDeviceForm({ rooms }: AddDeviceFormProps) {
  const [open, setOpen] = useState(false);
  const [ip, setIp] = useState("");
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const { mutateAsync: createDevice, isPending } = useCreateDevice();
  const { success, error } = useToast();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ip || !name) return;
    try {
      await createDevice({ ip_address: ip, name, room_id: roomId || undefined });
      success(`'${name}' geregistreerd!`);
      setIp(""); setName(""); setRoomId(""); setOpen(false);
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : "Registreren mislukt");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] px-3 py-3 text-sm text-slate-500 transition-all hover:border-amber-500/30 hover:text-amber-400"
      >
        <Plus size={15} />
        Lamp registreren (IP-adres)
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="glass rounded-lg p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-200 flex items-center gap-2">
        <Wifi size={14} className="text-amber-400" />
        Nieuwe WiZ lamp registreren
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="device-ip" className="text-xs text-slate-500 mb-1 block">
            IP-adres *
          </label>
          <input
            id="device-ip"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="192.168.1.xxx"
            required
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label htmlFor="device-name" className="text-xs text-slate-500 mb-1 block">
            Naam *
          </label>
          <input
            id="device-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Woonkamer lamp 1"
            required
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
          />
        </div>
      </div>
      <div>
        <label htmlFor="device-room" className="text-xs text-slate-500 mb-1 block">
          Kamer (optioneel)
        </label>
        <select
          id="device-room"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-slate-300 outline-none"
        >
          <option value="">Geen kamer</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/25"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Registreren
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
