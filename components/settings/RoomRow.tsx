"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useUpdateRoom } from "@/hooks/useRooms";
import { useToast } from "@/components/ui/Toast";
import type { Device, Room } from "@/lib/api";
import { IconButton } from "@/components/ui/IconButton";
import { Surface } from "@/components/ui/Surface";
import { AppIcon } from "@/components/ui/AppIcon";
import { Input } from "@/components/ui/Input";

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
    <Surface tone="subtle" radius="sm" padding="sm" className="flex items-start gap-3 sm:items-center">
      <AppIcon name="router" tone="info" size="md" framed />

      {editing ? (
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_96px]">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && save()}
            className="min-w-0"
            aria-label="Kamernaam"
          />
          <Input
            value={floor}
            onChange={(event) => setFloor(event.target.value)}
            type="number"
            className="min-w-0"
            aria-label="Verdieping"
          />
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--color-text)]">{room.name}</p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
            {devices.length} lamp(en) - verdieping {room.floor_number}
          </p>
        </div>
      )}

      <div className="flex shrink-0 items-center gap-1.5">
        {editing ? (
          <>
            <IconButton
              onClick={save}
              disabled={isPending}
              loading={isPending}
              label="Kamer opslaan"
              variant="success"
              icon={<Check size={14} />}
            />
            <IconButton
              onClick={reset}
              label="Kamer bewerken annuleren"
              variant="secondary"
              icon={<X size={14} />}
            />
          </>
        ) : (
          <>
            <IconButton
              onClick={() => setEditing(true)}
              label={`Kamer ${room.name} bewerken`}
              variant="secondary"
              icon={<Pencil size={14} />}
              className="hover:border-[var(--color-warning-border)] hover:text-[var(--color-warning)]"
            />
            <IconButton
              onClick={() => onDelete(room)}
              disabled={deleting}
              loading={deleting}
              label={`Kamer ${room.name} verwijderen`}
              variant="danger"
              icon={<Trash2 size={14} />}
            />
          </>
        )}
      </div>
    </Surface>
  );
}
