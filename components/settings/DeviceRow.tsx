"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { useUpdateDevice, useDeleteDevice } from "@/hooks/useDevices";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { type Device, type Room } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DeviceRowProps {
  device: Device;
  rooms: Room[];
}

export function DeviceRow({ device, rooms }: DeviceRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(device.name);
  const [roomId, setRoomId] = useState(device.room_id ?? "");
  const [ip, setIp] = useState(device.ip_address ?? "");
  const { mutate: updateDevice, isPending: updating } = useUpdateDevice();
  const { mutate: deleteDevice, isPending: deleting } = useDeleteDevice();
  const { openConfirm } = useConfirm();
  const { success, error } = useToast();

  const save = () => {
    updateDevice(
      {
        id: device.id,
        data: {
          name,
          room_id: roomId || null,
          ...(ip !== device.ip_address ? { ip_address: ip } : {}),
        },
      },
      {
        onSuccess: () => { success("Lamp bijgewerkt"); setEditing(false); },
        onError: (err: Error) => error(err.message ?? "Bijwerken mislukt"),
      }
    );
  };

  const remove = async () => {
    const confirmed = await openConfirm({
      title: "Lamp verwijderen",
      message: `'${device.name}' permanent verwijderen?`,
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!confirmed) return;
    deleteDevice(device.id, {
      onSuccess: () => success("Lamp verwijderd"),
      onError: () => error("Verwijderen mislukt"),
    });
  };

  return (
    <div className="glass rounded-xl p-4 flex items-center gap-3">
      <div
        className={cn(
          "w-2 h-2 rounded-full flex-shrink-0",
          device.status === "online" ? "bg-green-400" : "bg-red-400"
        )}
        aria-label={device.status === "online" ? "Online" : "Offline"}
      />

      {editing ? (
        <div className="flex-1 flex flex-col gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Naam"
            aria-label="Lamp naam"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500/50"
            autoFocus
          />
          <div className="flex gap-2">
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="IP-adres"
              aria-label="IP-adres"
              className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500/50 font-mono"
            />
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              aria-label="Kamer toewijzen"
              className="flex-1 min-w-0 bg-[#1a1a26] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 outline-none"
            >
              <option value="">Geen kamer</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{device.name}</p>
          <p className="text-xs text-slate-500">
            {device.ip_address} · {rooms.find((r) => r.id === device.room_id)?.name ?? "Geen kamer"}
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-shrink-0">
        {editing ? (
          <>
            <button
              onClick={save}
              disabled={updating}
              aria-label="Opslaan"
              className="w-8 h-8 rounded-lg bg-green-500/15 text-green-400 border border-green-500/30 flex items-center justify-center hover:bg-green-500/25 transition-colors"
            >
              {updating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button
              onClick={() => { setEditing(false); setName(device.name); }}
              aria-label="Annuleren"
              className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              aria-label={`${device.name} bewerken`}
              className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 border border-white/10 flex items-center justify-center hover:text-amber-400 hover:border-amber-500/30 transition-colors"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={remove}
              disabled={deleting}
              aria-label={`${device.name} verwijderen`}
              className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 border border-white/10 flex items-center justify-center hover:text-red-400 hover:border-red-500/30 transition-colors"
            >
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
