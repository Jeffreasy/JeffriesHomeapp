"use client";

import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { useUpdateDevice, useDeleteDevice } from "@/hooks/useDevices";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { type Device, type Room } from "@/lib/api";
import { Surface } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

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
    <Surface tone="subtle" radius="sm" padding="sm" className="flex items-start gap-3 sm:items-center">
      <Badge tone={device.status === "online" ? "success" : "danger"} size="sm" className="shrink-0">
        {device.status === "online" ? "Online" : "Offline"}
      </Badge>

      {editing ? (
        <div className="flex-1 flex flex-col gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Naam"
            aria-label="Lamp naam"
            density="compact"
            autoFocus
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="IP-adres"
              aria-label="IP-adres"
              density="compact" className="min-w-0 flex-1 font-mono"
            />
            <Select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              aria-label="Kamer toewijzen"
              density="compact" className="min-w-0 flex-1"
            >
              <option value="">Geen kamer</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </Select>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text)] truncate">{device.name}</p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {device.ip_address} · {rooms.find((r) => r.id === device.room_id)?.name ?? "Geen kamer"}
          </p>
        </div>
      )}

      <div className="flex flex-shrink-0 items-center gap-1.5">
        {editing ? (
          <>
            <IconButton
              onClick={save}
              label="Opslaan"
              variant="success"
              loading={updating}
              icon={<Check size={14} />}
            />
            <IconButton
              onClick={() => {
                setEditing(false);
                setName(device.name);
                setRoomId(device.room_id ?? "");
                setIp(device.ip_address ?? "");
              }}
              label="Annuleren"
              variant="secondary"
              icon={<X size={14} />}
            />
          </>
        ) : (
          <>
            <IconButton
              onClick={() => setEditing(true)}
              label={`${device.name} bewerken`}
              variant="secondary"
              icon={<Pencil size={14} />}
            />
            <IconButton
              onClick={remove}
              label={`${device.name} verwijderen`}
              variant="danger"
              loading={deleting}
              icon={<Trash2 size={14} />}
            />
          </>
        )}
      </div>
    </Surface>
  );
}
