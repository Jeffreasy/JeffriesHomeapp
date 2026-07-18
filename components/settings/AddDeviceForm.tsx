"use client";

import { useState } from "react";
import { Wifi, Plus } from "lucide-react";
import { type Room } from "@/lib/api";
import { useCreateDevice } from "@/hooks/useDevices";
import { useToast } from "@/components/ui/Toast";
import { surfaceVariants } from "@/components/ui/Surface";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";

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
    // Instant client-side IPv4 check (the backend additionally requires a private
    // LAN address) so a typo gets feedback without a round-trip.
    const octets = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!octets || octets.slice(1).some((o) => Number(o) > 255)) {
      error("Voer een geldig IPv4-adres in (bijv. 192.168.1.50)");
      return;
    }
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
      <Button
        variant="secondary"
        fullWidth
        onClick={() => setOpen(true)}
        className="border-dashed py-3 text-[var(--color-text-muted)] hover:border-[var(--color-warning-border)] hover:text-[var(--color-warning)]"
      >
        <Plus size={15} />
        Lamp registreren (IP-adres)
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className={`${surfaceVariants({ padding: "sm", radius: "sm" })} space-y-3`}>
      <SurfaceHeader
        icon={<Wifi size={14} className="text-[var(--color-warning)]" />}
        title="Nieuwe WiZ lamp registreren"
        headingLevel={3}
        compact
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <FormField id="device-ip" label="IP-adres">
          {(controlProps) => (
            <Input
              {...controlProps}
              value={ip}
              onChange={(event) => setIp(event.target.value)}
              placeholder="192.168.1.xxx"
              required
            />
          )}
        </FormField>
        <FormField id="device-name" label="Naam">
          {(controlProps) => (
            <Input
              {...controlProps}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Woonkamer lamp 1"
              required
            />
          )}
        </FormField>
      </div>
      <FormField id="device-room" label="Kamer" optional>
        {(controlProps) => (
          <Select
            {...controlProps}
            value={roomId}
            onChange={(event) => setRoomId(event.target.value)}
          >
            <option value="">Geen kamer</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>{room.name}</option>
            ))}
          </Select>
        )}
      </FormField>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="submit"
          variant="primary"
          loading={isPending}
          loadingLabel="Registreren…"
          className="flex-1"
        >
          <Plus size={14} />
          Registreren
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
