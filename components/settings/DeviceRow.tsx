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
    <div className="glass flex min-w-0 items-start gap-3 rounded-lg p-4 sm:items-center">
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
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500/50"
            autoFocus
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="IP-adres"
              aria-label="IP-adres"
              className="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-amber-500/50 font-mono"
            />
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              aria-label="Kamer toewijzen"
              className="flex-1 min-w-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-slate-300 outline-none"
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

      <div className="flex flex-shrink-0 items-center gap-1.5">
        {editing ? (
          <>
            <button
              onClick={save}
              disabled={updating}
              aria-label="Opslaan"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-green-500/30 bg-green-500/15 text-green-400 transition-colors hover:bg-green-500/25"
            >
              {updating ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setName(device.name);
                setRoomId(device.room_id ?? "");
                setIp(device.ip_address ?? "");
              }}
              aria-label="Annuleren"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <X size={13} />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              aria-label={`${device.name} bewerken`}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 transition-colors hover:border-amber-500/30 hover:text-amber-400"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={remove}
              disabled={deleting}
              aria-label={`${device.name} verwijderen`}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 transition-colors hover:border-red-500/30 hover:text-red-400"
            >
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
