/**
 * deviceCommands.ts — gedeelde command-simulatie voor optimistic updates.
 *
 * Eén plek waar een DeviceCommand op een Device-state wordt "voorgespeeld",
 * zodat SceneBar, RoomSection en useLampCommand exact dezelfde optimistic
 * cache-patch gebruiken.
 */

import { type Device, type DeviceCommand } from "@/lib/api";

/** Device-state incl. optioneel WiZ scene_id (niet in het basistype, wel in runtime-payloads). */
type SimulatedState = Device["current_state"] & { scene_id?: number };

/**
 * Simuleer het effect van een command op een device — gebruikt voor
 * optimistic cache updates (rollback gebeurt via snapshot in de mutation).
 */
export function applyCommandToDevice(device: Device, cmd: DeviceCommand): Device {
  const prev: SimulatedState =
    device.current_state ?? { on: false, brightness: 100, color_temp: 4000, r: 0, g: 0, b: 0 };
  const next: SimulatedState = { ...prev };

  if (cmd.on !== undefined)         next.on         = cmd.on;
  if (cmd.brightness !== undefined) next.brightness = cmd.brightness;

  if (cmd.color_temp_mireds !== undefined) {
    next.color_temp = Math.round(1_000_000 / cmd.color_temp_mireds);
    next.r = 0; next.g = 0; next.b = 0; // white mode clears RGB
    next.scene_id = 0;                  // …and leaves any WiZ effect
  }
  if (cmd.r !== undefined) next.r = cmd.r;
  if (cmd.g !== undefined) next.g = cmd.g;
  if (cmd.b !== undefined) next.b = cmd.b;
  if (cmd.r !== undefined || cmd.g !== undefined || cmd.b !== undefined) next.scene_id = 0;
  if (cmd.scene_id !== undefined) next.scene_id = cmd.scene_id;
  if (cmd.on === false) next.on = false;

  return { ...device, current_state: next };
}
