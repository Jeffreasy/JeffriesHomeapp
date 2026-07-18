import type { Device, Room } from "@/lib/api";
import { getLightingSummary } from "@/lib/lighting";

export type FilterMode = "all" | "on" | "off" | "offline";

export type RoomGroup = {
  room: Room;
  devices: Device[];
  onlineCount: number;
  onCount: number;
};

export interface BuildRoomGroupsOptions {
  /**
   * Kamernamen zijn nog niet beschikbaar. Toon de lampen direct in één
   * neutrale groep in plaats van tijdelijke technische kamer-ID's.
   */
  metadataLoading?: boolean;
}

const METADATA_LOADING_ROOM: Room = {
  id: "__loading-room-metadata__",
  name: "Lampen",
  icon: "",
  floor_number: 0,
  created_at: "",
};

export const FILTERS: Array<{ id: FilterMode; label: string }> = [
  { id: "all", label: "Alle" },
  { id: "on", label: "Aan" },
  { id: "off", label: "Uit" },
  { id: "offline", label: "Offline" },
];

export function createFallbackRoom(roomId: string): Room {
  return {
    id: roomId,
    name: `Kamer ${roomId.slice(-5)}`,
    icon: "",
    floor_number: 0,
    created_at: "",
  };
}

export function matchesFilter(device: Device, filter: FilterMode) {
  const isOn = device.current_state?.on ?? false;
  if (filter === "on") return device.status === "online" && isOn;
  if (filter === "off") return device.status === "online" && !isOn;
  if (filter === "offline") return device.status !== "online";
  return true;
}

export function buildRoomGroups(
  devices: Device[],
  rooms: Room[],
  options: BuildRoomGroupsOptions = {},
) {
  if (options.metadataLoading && rooms.length === 0 && devices.length > 0) {
    const summary = getLightingSummary(devices);

    return [
      {
        room: METADATA_LOADING_ROOM,
        devices,
        onlineCount: summary.online,
        onCount: summary.on,
      },
    ];
  }

  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const roomIds = new Set(
    devices
      .filter((device) => device.room_id)
      .map((device) => device.room_id as string),
  );

  return Array.from(roomIds)
    .map((roomId) => {
      const roomDevices = devices.filter((device) => device.room_id === roomId);
      const room = roomById.get(roomId) ?? createFallbackRoom(roomId);
      const summary = getLightingSummary(roomDevices);

      return {
        room,
        devices: roomDevices,
        onlineCount: summary.online,
        onCount: summary.on,
      };
    })
    .sort((a, b) => {
      const aKnown = roomById.has(a.room.id) ? 0 : 1;
      const bKnown = roomById.has(b.room.id) ? 0 : 1;
      return (
        aKnown - bKnown ||
        a.room.floor_number - b.room.floor_number ||
        a.room.name.localeCompare(b.room.name)
      );
    });
}
