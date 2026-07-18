import type { Device } from "@/lib/api";

export interface LightingSummary {
  total: number;
  online: number;
  offline: number;
  on: number;
  allOnlineOn: boolean;
  averageBrightness: number;
  onlineDevices: Device[];
  offlineDevices: Device[];
  onDevices: Device[];
}

/**
 * Canonical lighting-state projection used by every lamp control surface.
 * Offline devices can contain a stale last-known `on` value, so they never
 * count as active or contribute to average brightness.
 */
export function getLightingSummary(devices: readonly Device[]): LightingSummary {
  const onlineDevices = devices.filter((device) => device.status === "online");
  const offlineDevices = devices.filter((device) => device.status !== "online");
  const onDevices = onlineDevices.filter((device) => device.current_state?.on);
  const averageBrightness =
    onDevices.length === 0
      ? 0
      : Math.round(
          onDevices.reduce(
            (total, device) => total + (device.current_state?.brightness ?? 0),
            0,
          ) / onDevices.length,
        );

  return {
    total: devices.length,
    online: onlineDevices.length,
    offline: offlineDevices.length,
    on: onDevices.length,
    allOnlineOn: onlineDevices.length > 0 && onDevices.length === onlineDevices.length,
    averageBrightness,
    onlineDevices,
    offlineDevices,
    onDevices,
  };
}

/** Keep the first occurrence and prevent accidental duplicate batch commands. */
export function uniqueDevicesById(devices: readonly Device[]): Device[] {
  const unique = new Map<string, Device>();
  for (const device of devices) {
    if (!unique.has(device.id)) unique.set(device.id, device);
  }
  return Array.from(unique.values());
}
