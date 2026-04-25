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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-white/15 text-slate-500 text-sm hover:border-amber-500/30 hover:text-amber-400 transition-all"
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
      <div className="grid grid-cols-2 gap-2">
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
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
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
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
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
          className="w-full bg-[#1a1a26] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none"
        >
          <option value="">Geen kamer</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 text-sm font-medium hover:bg-amber-500/25 transition-colors"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Registreren
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
