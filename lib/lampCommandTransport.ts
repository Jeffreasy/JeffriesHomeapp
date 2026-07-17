export type LampCommandTransportKind = "barrier" | "continuous";

export interface LampCommandTransportOptions {
  kind: LampCommandTransportKind;
  /** Only continuous commands with the same key may replace each other. */
  coalesceKey?: string;
}

export interface LampCommandReservation {
  readonly deviceId: string;
  readonly token: number;
}

interface QueuedCommand {
  reservation: LampCommandReservation;
  options: LampCommandTransportOptions;
  task?: () => Promise<unknown>;
  resolve?: (value: unknown) => void;
  reject?: (reason: unknown) => void;
  abortCleanup?: () => void;
}

interface DeviceQueue {
  active: QueuedCommand | null;
  waiting: QueuedCommand[];
}

/** A superseded slider/color draft is expected control flow, not a user error. */
export class LampCommandSupersededError extends Error {
  constructor() {
    super("Lamp command superseded by a newer intent");
    this.name = "LampCommandSupersededError";
  }
}

export class LampCommandTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Lamp command timed out after ${timeoutMs}ms`);
    this.name = "LampCommandTimeoutError";
  }
}

export function isLampCommandSupersededError(
  error: unknown,
): error is LampCommandSupersededError {
  return error instanceof LampCommandSupersededError;
}

/**
 * Per-device transport coordinator.
 *
 * Reservations are made before React Query's async onMutate work. This keeps
 * physical request order equal to interaction order even when query
 * cancellation takes a different amount of time in concurrent hook instances.
 * Different device queues never block each other.
 */
export class LampCommandTransport {
  private nextToken = 1;
  private readonly queues = new Map<string, DeviceQueue>();
  private readonly commands = new Map<number, QueuedCommand>();
  private readonly canceled = new Map<number, LampCommandSupersededError>();
  private readonly barrierListeners = new Map<string, Set<() => void>>();

  reserve(
    deviceId: string,
    options: LampCommandTransportOptions,
  ): LampCommandReservation {
    const queue = this.getQueue(deviceId);

    if (options.kind === "barrier") {
      // A discrete intent (power, mode, scene) makes every not-yet-sent
      // continuous draft before it obsolete.
      for (const command of [...queue.waiting]) {
        if (command.options.kind === "continuous") this.cancelQueued(queue, command);
      }
      for (const listener of this.barrierListeners.get(deviceId) ?? []) {
        try {
          listener();
        } catch {
          // A view-level debounce listener must never break command transport.
        }
      }
    } else if (options.coalesceKey) {
      // Coalesce only within the latest barrier segment and append the new
      // value at the end so cross-control ordering remains intact.
      for (let index = queue.waiting.length - 1; index >= 0; index -= 1) {
        const command = queue.waiting[index];
        if (command.options.kind === "barrier") break;
        if (
          command.options.kind === "continuous" &&
          command.options.coalesceKey === options.coalesceKey
        ) {
          this.cancelQueued(queue, command);
        }
      }
    }

    const reservation = Object.freeze({ deviceId, token: this.nextToken++ });
    const command: QueuedCommand = { reservation, options };
    queue.waiting.push(command);
    this.commands.set(reservation.token, command);
    return reservation;
  }

  execute<T>(
    reservation: LampCommandReservation,
    task: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const canceled = this.canceled.get(reservation.token);
    if (canceled) {
      this.canceled.delete(reservation.token);
      return Promise.reject(canceled);
    }

    const command = this.commands.get(reservation.token);
    if (!command || command.reservation.deviceId !== reservation.deviceId || command.task) {
      return Promise.reject(new Error("Invalid or already executed lamp command reservation"));
    }

    command.task = task;
    const promise = new Promise<T>((resolve, reject) => {
      command.resolve = resolve as (value: unknown) => void;
      command.reject = reject;
    });

    if (signal) {
      const abortWhileQueued = () => {
        const queue = this.queues.get(reservation.deviceId);
        if (!queue || queue.active === command) return;
        const index = queue.waiting.indexOf(command);
        if (index === -1) return;

        queue.waiting.splice(index, 1);
        this.commands.delete(reservation.token);
        command.abortCleanup?.();
        command.reject?.(
          signal.reason ?? new Error("Lamp command aborted while queued"),
        );

        if (!queue.active && queue.waiting.length === 0) {
          this.queues.delete(reservation.deviceId);
        } else if (!queue.active) {
          this.pump(reservation.deviceId);
        }
      };
      signal.addEventListener("abort", abortWhileQueued, { once: true });
      command.abortCleanup = () => signal.removeEventListener("abort", abortWhileQueued);
      if (signal.aborted) abortWhileQueued();
    }

    this.pump(reservation.deviceId);
    return promise;
  }

  subscribeToBarriers(deviceId: string, listener: () => void): () => void {
    const listeners = this.barrierListeners.get(deviceId) ?? new Set<() => void>();
    listeners.add(listener);
    this.barrierListeners.set(deviceId, listeners);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) this.barrierListeners.delete(deviceId);
    };
  }

  private getQueue(deviceId: string): DeviceQueue {
    const current = this.queues.get(deviceId);
    if (current) return current;
    const created: DeviceQueue = { active: null, waiting: [] };
    this.queues.set(deviceId, created);
    return created;
  }

  private cancelQueued(queue: DeviceQueue, command: QueuedCommand) {
    const index = queue.waiting.indexOf(command);
    if (index >= 0) queue.waiting.splice(index, 1);
    this.commands.delete(command.reservation.token);
    command.abortCleanup?.();
    const error = new LampCommandSupersededError();
    if (command.reject) command.reject(error);
    else this.canceled.set(command.reservation.token, error);
  }

  private pump(deviceId: string) {
    const queue = this.queues.get(deviceId);
    if (!queue || queue.active) return;
    const next = queue.waiting[0];
    // A reservation deliberately blocks later commands until React Query has
    // completed its optimistic onMutate phase and activates it.
    if (!next?.task) return;

    queue.waiting.shift();
    queue.active = next;
    void Promise.resolve()
      .then(next.task)
      .then(next.resolve, next.reject)
      .finally(() => {
        next.abortCleanup?.();
        this.commands.delete(next.reservation.token);
        queue.active = null;
        if (queue.waiting.length === 0) this.queues.delete(deviceId);
        else this.pump(deviceId);
      });
  }
}

/** Abort the underlying fetch as well as rejecting the caller on timeout. */
export async function runWithAbortTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  reportedTimeoutMs = timeoutMs,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = timeoutMs <= 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (timedOut) {
    // Execute still receives the pre-aborted signal so a queued transport
    // reservation is removed without ever starting its physical request.
    controller.abort();
  } else {
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  try {
    return await task(controller.signal);
  } catch (error) {
    if (timedOut) throw new LampCommandTimeoutError(reportedTimeoutMs);
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
