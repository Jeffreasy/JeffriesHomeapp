"use client";

import { useState } from "react";
import { Router, Plus } from "lucide-react";
import { useCreateRoom } from "@/hooks/useRooms";
import { useToast } from "@/components/ui/Toast";
import { surfaceVariants } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";

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
      <Button
        variant="secondary"
        fullWidth
        onClick={() => setOpen(true)}
        className="border-dashed py-3 text-[var(--color-text-muted)] hover:border-[var(--color-warning-border)] hover:text-[var(--color-warning)]"
      >
        <Plus size={15} />
        Kamer toevoegen
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className={`${surfaceVariants({ padding: "sm", radius: "sm" })} space-y-3`}>
      <SurfaceHeader
        icon={<Router size={14} className="text-[var(--color-warning)]" />}
        title="Nieuwe kamer"
        headingLevel={3}
        compact
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <FormField id="room-name" label="Naam">
          {(controlProps) => (
            <Input
              {...controlProps}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Woonkamer"
              required
            />
          )}
        </FormField>
        <FormField id="room-floor" label="Verdieping">
          {(controlProps) => (
            <Input
              {...controlProps}
              type="number"
              value={floor}
              onChange={(event) => setFloor(event.target.value)}
              min={0}
              max={10}
            />
          )}
        </FormField>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="submit"
          variant="primary"
          loading={isPending}
          loadingLabel="Aanmaken…"
          className="flex-1"
        >
          <Plus size={14} />
          Aanmaken
        </Button>
        <Button
          variant="secondary"
          onClick={() => setOpen(false)}
        >
          Annuleren
        </Button>
      </div>
    </form>
  );
}
