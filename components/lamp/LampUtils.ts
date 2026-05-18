import type { Device, Room } from "@/lib/api";

export type FilterMode = "all" | "on" | "off" | "offline";
export type Tone = "amber" | "blue" | "green" | "rose" | "slate";

export type RoomGroup = {
  room: Room;
  devices: Device[];
  onlineCount: number;
  onCount: number;
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

export function getAverageBrightness(devices: Device[]) {
  const onDevices = devices.filter((device) => device.current_state?.on);
  if (onDevices.length === 0) return 0;
  return Math.round(
    onDevices.reduce((total, device) => total + (device.current_state?.brightness ?? 0), 0) /
      onDevices.length
  );
}

export function buildRoomGroups(devices: Device[], rooms: Room[]) {
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const roomIds = new Set(devices.filter((device) => device.room_id).map((device) => device.room_id as string));

  return Array.from(roomIds)
    .map((roomId) => {
      const roomDevices = devices.filter((device) => device.room_id === roomId);
      const room = roomById.get(roomId) ?? createFallbackRoom(roomId);

      return {
        room,
        devices: roomDevices,
        onlineCount: roomDevices.filter((device) => device.status === "online").length,
        onCount: roomDevices.filter((device) => device.current_state?.on).length,
      };
    })
    .sort((a, b) => {
      const aKnown = roomById.has(a.room.id) ? 0 : 1;
      const bKnown = roomById.has(b.room.id) ? 0 : 1;
      return aKnown - bKnown || a.room.floor_number - b.room.floor_number || a.room.name.localeCompare(b.room.name);
    });
}
