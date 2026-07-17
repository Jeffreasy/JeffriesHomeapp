import { expect, test } from "@playwright/test";
import type { Device, Room } from "../../lib/api";
import { buildRoomGroups, matchesFilter } from "../../components/lamp/LampUtils";

function createDevice(
  id: string,
  roomId: string | null,
  options: { status?: Device["status"]; on?: boolean } = {},
): Device {
  return {
    id,
    name: `Lamp ${id}`,
    device_type: "light",
    room_id: roomId,
    ip_address: null,
    current_state: {
      on: options.on ?? false,
      brightness: 50,
      color_temp: 2700,
      r: 0,
      g: 0,
      b: 0,
    },
    status: options.status ?? "online",
    last_seen: null,
    commissioned_at: "",
    manufacturer: "WiZ",
    model: null,
  };
}

const rooms: Room[] = [
  {
    id: "known",
    name: "Woonkamer",
    icon: "",
    floor_number: 0,
    created_at: "",
  },
];

test("room groups use canonical online-on semantics", () => {
  const groups = buildRoomGroups(
    [
      createDevice("online-on", "known", { on: true }),
      createDevice("offline-on", "known", { status: "offline", on: true }),
    ],
    rooms,
  );

  expect(groups[0]).toMatchObject({
    onlineCount: 1,
    onCount: 1,
  });
});

test("known rooms sort before fallback rooms without blocking device rendering", () => {
  const groups = buildRoomGroups(
    [
      createDevice("fallback", "missing"),
      createDevice("known", "known"),
    ],
    rooms,
  );

  expect(groups.map((group) => group.room.name)).toEqual([
    "Woonkamer",
    "Kamer ssing",
  ]);
  expect(groups[1].devices[0].id).toBe("fallback");
});

test("room metadata loading renders every device in one neutral group", () => {
  const groups = buildRoomGroups(
    [
      createDevice("assigned", "technical-room-id", { on: true }),
      createDevice("unassigned", null),
      createDevice("offline", "other-room", { status: "offline", on: true }),
    ],
    [],
    { metadataLoading: true },
  );

  expect(groups).toHaveLength(1);
  expect(groups[0]).toMatchObject({
    room: { name: "Lampen" },
    onlineCount: 2,
    onCount: 1,
  });
  expect(groups[0].devices.map((device) => device.id)).toEqual([
    "assigned",
    "unassigned",
    "offline",
  ]);
});

test("status filters never present offline stale-on state as active", () => {
  const offlineOn = createDevice("offline", null, {
    status: "offline",
    on: true,
  });

  expect(matchesFilter(offlineOn, "on")).toBe(false);
  expect(matchesFilter(offlineOn, "off")).toBe(false);
  expect(matchesFilter(offlineOn, "offline")).toBe(true);
});
