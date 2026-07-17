import { expect, test } from "@playwright/test";
import type { Device } from "../../lib/api";
import { getLightingSummary, uniqueDevicesById } from "../../lib/lighting";

function createDevice(
  id: string,
  options: { status?: Device["status"]; on?: boolean; brightness?: number } = {},
): Device {
  return {
    id,
    name: `Lamp ${id}`,
    device_type: "light",
    room_id: null,
    ip_address: null,
    current_state: {
      on: options.on ?? false,
      brightness: options.brightness ?? 50,
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

test.describe("canonical lighting summary", () => {
  test("excludes stale offline-on state from active counts and brightness", () => {
    const devices = [
      createDevice("online-on", { on: true, brightness: 80 }),
      createDevice("online-off", { on: false, brightness: 10 }),
      createDevice("offline-on", { status: "offline", on: true, brightness: 100 }),
    ];

    const summary = getLightingSummary(devices);

    expect(summary.total).toBe(3);
    expect(summary.online).toBe(2);
    expect(summary.offline).toBe(1);
    expect(summary.on).toBe(1);
    expect(summary.averageBrightness).toBe(80);
    expect(summary.onDevices.map((device) => device.id)).toEqual(["online-on"]);
  });

  test("allOnlineOn is false when no online devices exist", () => {
    const summary = getLightingSummary([
      createDevice("offline", { status: "offline", on: true }),
    ]);

    expect(summary.allOnlineOn).toBe(false);
    expect(summary.on).toBe(0);
    expect(summary.averageBrightness).toBe(0);
  });

  test("does not mutate input and deduplicates batches by device id", () => {
    const first = createDevice("a");
    const duplicate = { ...first, name: "Tweede object" };
    const second = createDevice("b");
    const input = [first, duplicate, second];

    getLightingSummary(input);
    const unique = uniqueDevicesById(input);

    expect(input).toEqual([first, duplicate, second]);
    expect(unique).toEqual([first, second]);
  });
});
