import { expect, test } from "@playwright/test";
import type { Device } from "../../lib/api";
import {
  LampCommandJournal,
  mergeRefreshedDevice,
  replaceDeviceInCollection,
} from "../../lib/lampCommandJournal";

function createDevice(id: string): Device {
  return {
    id,
    name: `Lamp ${id}`,
    device_type: "light",
    room_id: null,
    ip_address: null,
    current_state: {
      on: false,
      brightness: 20,
      color_temp: 2700,
      r: 0,
      g: 0,
      b: 0,
    },
    status: "online",
    last_seen: null,
    commissioned_at: "",
    manufacturer: "WiZ",
    model: null,
  };
}

test.describe("lamp command journal", () => {
  test("a failed device never rolls back a successful neighbour", () => {
    const journal = new LampCommandJournal();
    const first = createDevice("a");
    const second = createDevice("b");
    const firstOperation = journal.begin(first, { on: true });
    const secondOperation = journal.begin(second, { on: true });

    const failedProjection = journal.settle("a", firstOperation.token, "failed");
    const succeededProjection = journal.settle("b", secondOperation.token, "succeeded");
    let cache = [first, second];
    cache = replaceDeviceInCollection(cache, failedProjection!)!;
    cache = replaceDeviceInCollection(cache, succeededProjection!)!;

    expect(cache.find((device) => device.id === "a")?.current_state.on).toBe(false);
    expect(cache.find((device) => device.id === "b")?.current_state.on).toBe(true);
  });

  test("removes an older failed power command but preserves newer successful brightness", () => {
    const journal = new LampCommandJournal();
    const power = journal.begin(createDevice("a"), { on: true });
    const brightness = journal.begin(power.projectedDevice, { brightness: 80 });

    expect(journal.settle("a", brightness.token, "succeeded")?.current_state).toMatchObject({
      on: true,
      brightness: 80,
    });
    expect(journal.settle("a", power.token, "failed")?.current_state).toMatchObject({
      on: false,
      brightness: 80,
    });
  });

  test("a self-contained control update stays on when its predecessor fails", () => {
    const journal = new LampCommandJournal();
    const power = journal.begin(createDevice("a"), { on: true });
    const brightness = journal.begin(power.projectedDevice, {
      on: true,
      brightness: 80,
    });

    journal.settle("a", brightness.token, "succeeded");
    const projected = journal.settle("a", power.token, "failed");

    expect(projected?.current_state).toMatchObject({
      on: true,
      brightness: 80,
    });
  });

  test("a newer failure restores the still-pending older projection", () => {
    const journal = new LampCommandJournal();
    const power = journal.begin(createDevice("a"), { on: true });
    const brightness = journal.begin(power.projectedDevice, { brightness: 80 });

    expect(journal.settle("a", brightness.token, "failed")?.current_state).toMatchObject({
      on: true,
      brightness: 20,
    });
    expect(journal.settle("a", power.token, "succeeded")?.current_state).toMatchObject({
      on: true,
      brightness: 20,
    });
  });

  test("replays same-field commands in invocation order and stays immutable", () => {
    const journal = new LampCommandJournal();
    const source = createDevice("a");
    const first = journal.begin(source, { brightness: 40 });
    const second = journal.begin(first.projectedDevice, { brightness: 90 });

    journal.settle("a", second.token, "succeeded");
    const projected = journal.settle("a", first.token, "succeeded");

    expect(projected?.current_state.brightness).toBe(90);
    expect(source.current_state.brightness).toBe(20);
  });

  test("projects only state and preserves fresher server metadata", () => {
    const journal = new LampCommandJournal();
    const source = createDevice("a");
    const operation = journal.begin(source, { brightness: 75 });
    const freshServerDevice: Device = {
      ...source,
      name: "Nieuwe naam",
      room_id: "room-2",
      status: "offline",
      last_seen: "2026-07-17T12:00:00Z",
    };

    const cache = replaceDeviceInCollection(
      [freshServerDevice],
      operation.projectedDevice,
    );

    expect(cache?.[0]).toMatchObject({
      name: "Nieuwe naam",
      room_id: "room-2",
      status: "offline",
      last_seen: "2026-07-17T12:00:00Z",
      current_state: { brightness: 75 },
    });
  });

  test("a late refresh keeps optimistic state while accepting fresh metadata", () => {
    const current = {
      ...createDevice("a"),
      current_state: {
        ...createDevice("a").current_state,
        on: true,
        brightness: 85,
      },
    };
    const response = {
      ...createDevice("a"),
      name: "Servernaam",
      status: "offline" as const,
      current_state: {
        ...createDevice("a").current_state,
        brightness: 20,
      },
    };

    const merged = mergeRefreshedDevice(current, response, true);

    expect(merged.name).toBe("Servernaam");
    expect(merged.status).toBe("offline");
    expect(merged.current_state).toEqual(current.current_state);
  });
});
