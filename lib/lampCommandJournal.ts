import type { Device, DeviceCommand } from "@/lib/api";
import { applyCommandToDevice } from "@/lib/deviceCommands";

type OperationStatus = "pending" | "succeeded";

interface LampOperation {
  token: number;
  command: DeviceCommand;
  status: OperationStatus;
}

interface DeviceJournal {
  baseDevice: Device;
  operations: LampOperation[];
}

export type LampOperationOutcome = "succeeded" | "failed";

export interface StartedLampOperation {
  token: number;
  projectedDevice: Device;
}

/** Replace one device without mutating the React Query cache array. */
export function replaceDeviceInCollection(
  devices: Device[] | undefined,
  replacement: Device,
): Device[] | undefined {
  if (!devices?.some((device) => device.id === replacement.id)) return devices;
  // Optimistic projections own only current_state. Preserve fresher metadata
  // (name, room, reachability and last_seen) from an intervening server read.
  return devices.map((device) =>
    device.id === replacement.id
      ? { ...device, current_state: replacement.current_state }
      : device,
  );
}

/**
 * Apply a manual refresh without allowing a response that started earlier to
 * overwrite a newer optimistic command state.
 */
export function mergeRefreshedDevice(
  current: Device,
  fresh: Device,
  preserveCurrentState: boolean,
): Device {
  return preserveCurrentState
    ? { ...fresh, current_state: current.current_state }
    : fresh;
}

/**
 * Per-QueryClient operation journal for overlapping optimistic commands.
 *
 * Commands are replayed in invocation order. A failed command is removed,
 * while successful neighbours remain projected. This avoids both full-cache
 * rollback and the lost-partial-update problem of a simple generation check.
 */
export class LampCommandJournal {
  private nextToken = 1;
  private readonly journals = new Map<string, DeviceJournal>();

  begin(device: Device, command: DeviceCommand): StartedLampOperation {
    const journal = this.journals.get(device.id) ?? {
      baseDevice: device,
      operations: [],
    };
    const token = this.nextToken++;
    journal.operations.push({ token, command, status: "pending" });
    this.journals.set(device.id, journal);

    return { token, projectedDevice: this.project(journal) };
  }

  getProjectedDevice(deviceId: string): Device | null {
    const journal = this.journals.get(deviceId);
    return journal ? this.project(journal) : null;
  }

  settle(deviceId: string, token: number, outcome: LampOperationOutcome): Device | null {
    const journal = this.journals.get(deviceId);
    if (!journal) return null;

    const operationIndex = journal.operations.findIndex((operation) => operation.token === token);
    if (operationIndex === -1) return this.project(journal);

    if (outcome === "failed") {
      journal.operations.splice(operationIndex, 1);
    } else {
      journal.operations[operationIndex].status = "succeeded";
    }

    // Commit only the successful prefix. Later successful operations must wait
    // until every earlier command has a known outcome to preserve user order.
    while (journal.operations[0]?.status === "succeeded") {
      const [operation] = journal.operations.splice(0, 1);
      journal.baseDevice = applyCommandToDevice(journal.baseDevice, operation.command);
    }

    const projectedDevice = this.project(journal);
    if (journal.operations.length === 0) this.journals.delete(deviceId);
    return projectedDevice;
  }

  private project(journal: DeviceJournal): Device {
    return journal.operations.reduce(
      (device, operation) => applyCommandToDevice(device, operation.command),
      journal.baseDevice,
    );
  }
}
