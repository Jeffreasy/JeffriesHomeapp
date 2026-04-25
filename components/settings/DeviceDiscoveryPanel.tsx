"use client";

import { useMemo, useState } from "react";
import { Loader2, Radar, Wifi } from "lucide-react";
import { devicesApi, type Device } from "@/lib/api";
import { useCreateDevice } from "@/hooks/useDevices";
import { useToast } from "@/components/ui/Toast";

export function DeviceDiscoveryPanel({ existingDevices }: { existingDevices: Device[] }) {
  const [found, setFound] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const { mutateAsync: createDevice, isPending } = useCreateDevice();
  const { success, error } = useToast();

  const existingIps = useMemo(
    () => new Set(existingDevices.map((device) => device.ip_address).filter(Boolean)),
    [existingDevices],
  );
  const candidates = found.filter((device) => device.ip_address && !existingIps.has(device.ip_address));

  const scan = async () => {
    setScanning(true);
    try {
      const devices = await devicesApi.list();
      setFound(devices);
      success(`${devices.length} lokale device(s) gevonden`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Lokale scan mislukt");
    } finally {
      setScanning(false);
    }
  };

  const importDevice = async (device: Device) => {
    if (!device.ip_address) return;
    try {
      await createDevice({
        name: device.name || `Lamp ${device.ip_address}`,
        ip_address: device.ip_address,
        room_id: device.room_id,
      });
      success(`${device.name} toegevoegd`);
    } catch (err) {
      error(err instanceof Error ? err.message : "Import mislukt");
    }
  };

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">Device discovery</p>
          <p className="mt-1 text-xs text-slate-500">Leest de lokale WiZ API en toont ontbrekende lampen.</p>
        </div>
        <button
          type="button"
          onClick={scan}
          disabled={scanning}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-sky-500/25 bg-sky-500/10 px-3 text-sm font-semibold text-sky-200 transition-colors hover:bg-sky-500/15 disabled:opacity-50"
        >
          {scanning ? <Loader2 size={15} className="animate-spin" /> : <Radar size={15} />}
          Scan
        </button>
      </div>

      {found.length > 0 && (
        <div className="mt-3 space-y-2">
          {candidates.length === 0 ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Alle lokaal gevonden lampen staan al in Convex.
            </div>
          ) : (
            candidates.map((device) => (
              <div key={`${device.id}-${device.ip_address}`} className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/10 px-3 py-3">
                <Wifi size={15} className="shrink-0 text-sky-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-200">{device.name}</p>
                  <p className="truncate text-xs text-slate-500">{device.ip_address}</p>
                </div>
                <button
                  type="button"
                  onClick={() => importDevice(device)}
                  disabled={isPending}
                  className="h-8 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-500/15 disabled:opacity-50"
                >
                  Toevoegen
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
