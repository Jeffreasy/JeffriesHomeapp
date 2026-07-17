import { expect, test } from "@playwright/test";
import type { Device } from "../../lib/api";
import { applyCommandToDevice } from "../../lib/deviceCommands";

function createDevice(): Device {
  return {
    id: "lamp-1",
    name: "Lamp",
    device_type: "light",
    room_id: null,
    ip_address: null,
    current_state: {
      on: false,
      brightness: 35,
      color_temp: 2700,
      r: 10,
      g: 20,
      b: 30,
      scene_id: 4,
    } as Device["current_state"],
    status: "online",
    last_seen: null,
    commissioned_at: "",
    manufacturer: "WiZ",
    model: null,
  };
}

test.describe("optimistic device command projection", () => {
  test("keeps unrelated state and never turns on for brightness implicitly", () => {
    const source = createDevice();
    const result = applyCommandToDevice(source, { brightness: 80 });

    expect(result.current_state.on).toBe(false);
    expect(result.current_state.brightness).toBe(80);
    expect(result.current_state.color_temp).toBe(2700);
    expect(source.current_state.brightness).toBe(35);
  });

  test("converts mireds to Kelvin and switches cleanly to white mode", () => {
    const result = applyCommandToDevice(createDevice(), { color_temp_mireds: 250 });
    const state = result.current_state as Device["current_state"] & { scene_id?: number };

    expect(state.color_temp).toBe(4000);
    expect({ r: state.r, g: state.g, b: state.b }).toEqual({ r: 0, g: 0, b: 0 });
    expect(state.scene_id).toBe(0);
  });

  test("RGB leaves a native scene without mutating the source", () => {
    const source = createDevice();
    const result = applyCommandToDevice(source, { r: 200, g: 100, b: 50, on: true });
    const state = result.current_state as Device["current_state"] & { scene_id?: number };

    expect(state).toMatchObject({ on: true, r: 200, g: 100, b: 50, scene_id: 0 });
    expect(source.current_state).toMatchObject({ on: false, r: 10, g: 20, b: 30 });
  });
});
