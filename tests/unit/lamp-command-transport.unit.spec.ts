import { expect, test } from "@playwright/test";
import {
  LampCommandTimeoutError,
  LampCommandTransport,
  isLampCommandSupersededError,
  runWithAbortTimeout,
} from "../../lib/lampCommandTransport";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

test.describe("lamp command transport", () => {
  test("runs at most one request per device and preserves reservation order", async () => {
    const transport = new LampCommandTransport();
    const firstGate = deferred();
    const started: string[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const firstReservation = transport.reserve("lamp-a", { kind: "barrier" });
    const secondReservation = transport.reserve("lamp-a", { kind: "barrier" });
    const first = transport.execute(firstReservation, async () => {
      started.push("first");
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await firstGate.promise;
      inFlight -= 1;
    });
    const second = transport.execute(secondReservation, async () => {
      started.push("second");
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      inFlight -= 1;
    });

    await flushMicrotasks();
    expect(started).toEqual(["first"]);
    firstGate.resolve();
    await Promise.all([first, second]);

    expect(started).toEqual(["first", "second"]);
    expect(maxInFlight).toBe(1);
  });

  test("does not let one device block another", async () => {
    const transport = new LampCommandTransport();
    const gate = deferred();
    const started: string[] = [];
    const reservationA = transport.reserve("lamp-a", { kind: "barrier" });
    const reservationB = transport.reserve("lamp-b", { kind: "barrier" });

    const commandA = transport.execute(reservationA, async () => {
      started.push("a");
      await gate.promise;
    });
    const commandB = transport.execute(reservationB, async () => {
      started.push("b");
      await gate.promise;
    });

    await flushMicrotasks();
    expect(started.sort()).toEqual(["a", "b"]);
    gate.resolve();
    await Promise.all([commandA, commandB]);
  });

  test("coalesces a queued continuous value to the latest intent", async () => {
    const transport = new LampCommandTransport();
    const firstGate = deferred();
    const sent: number[] = [];
    const firstReservation = transport.reserve("lamp-a", {
      kind: "continuous",
      coalesceKey: "brightness",
    });
    const first = transport.execute(firstReservation, async () => {
      sent.push(10);
      await firstGate.promise;
    });

    const obsoleteReservation = transport.reserve("lamp-a", {
      kind: "continuous",
      coalesceKey: "brightness",
    });
    const obsolete = transport.execute(obsoleteReservation, async () => {
      sent.push(40);
    });
    const latestReservation = transport.reserve("lamp-a", {
      kind: "continuous",
      coalesceKey: "brightness",
    });
    const latest = transport.execute(latestReservation, async () => {
      sent.push(90);
    });

    const obsoleteError = await obsolete.then(
      () => null,
      (error: unknown) => error,
    );
    expect(isLampCommandSupersededError(obsoleteError)).toBe(true);
    firstGate.resolve();
    await Promise.all([first, latest]);
    expect(sent).toEqual([10, 90]);
  });

  test("a discrete barrier cancels older drafts but waits for an active request", async () => {
    const transport = new LampCommandTransport();
    const activeGate = deferred();
    const sent: string[] = [];
    let barrierNotifications = 0;
    const unsubscribe = transport.subscribeToBarriers("lamp-a", () => {
      barrierNotifications += 1;
    });
    const activeReservation = transport.reserve("lamp-a", {
      kind: "continuous",
      coalesceKey: "color",
    });
    const active = transport.execute(activeReservation, async () => {
      sent.push("active-color");
      await activeGate.promise;
    });
    const draftReservation = transport.reserve("lamp-a", {
      kind: "continuous",
      coalesceKey: "brightness",
    });
    const draft = transport.execute(draftReservation, async () => {
      sent.push("stale-brightness");
    });

    const powerReservation = transport.reserve("lamp-a", { kind: "barrier" });
    const power = transport.execute(powerReservation, async () => {
      sent.push("power-off");
    });
    const draftError = await draft.then(
      () => null,
      (error: unknown) => error,
    );
    expect(isLampCommandSupersededError(draftError)).toBe(true);
    expect(barrierNotifications).toBe(1);
    unsubscribe();
    await flushMicrotasks();
    expect(sent).toEqual(["active-color"]);

    activeGate.resolve();
    await Promise.all([active, power]);
    expect(sent).toEqual(["active-color", "power-off"]);
  });

  test("aborts the physical request when its deadline expires", async () => {
    let aborted = false;
    const result = await runWithAbortTimeout(
      (signal) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              aborted = true;
              reject(new Error("aborted"));
            },
            { once: true },
          );
        }),
      5,
    ).then(
      () => null,
      (error: unknown) => error,
    );

    expect(aborted).toBe(true);
    expect(result).toBeInstanceOf(LampCommandTimeoutError);
  });

  test("the deadline also expires while a command waits in the device queue", async () => {
    const transport = new LampCommandTransport();
    const activeGate = deferred();
    const sent: string[] = [];
    const activeReservation = transport.reserve("lamp-a", { kind: "barrier" });
    const active = transport.execute(activeReservation, async () => {
      sent.push("active");
      await activeGate.promise;
    });
    const queuedReservation = transport.reserve("lamp-a", { kind: "barrier" });

    const queuedResult = await runWithAbortTimeout(
      (signal) =>
        transport.execute(
          queuedReservation,
          async () => {
            sent.push("expired");
          },
          signal,
        ),
      25,
    ).then(
      () => null,
      (error: unknown) => error,
    );

    expect(queuedResult).toBeInstanceOf(LampCommandTimeoutError);
    expect(sent).toEqual(["active"]);

    activeGate.resolve();
    await active;
  });

  test("an already expired deadline never starts fetch and releases its queue slot", async () => {
    const transport = new LampCommandTransport();
    const sent: string[] = [];
    const expiredReservation = transport.reserve("lamp-a", { kind: "barrier" });

    const expiredResult = await runWithAbortTimeout(
      (signal) =>
        transport.execute(
          expiredReservation,
          async () => {
            sent.push("expired");
          },
          signal,
        ),
      0,
      15_000,
    ).then(
      () => null,
      (error: unknown) => error,
    );

    expect(expiredResult).toBeInstanceOf(LampCommandTimeoutError);
    expect((expiredResult as Error).message).toContain("15000ms");
    expect(sent).toEqual([]);

    const nextReservation = transport.reserve("lamp-a", { kind: "barrier" });
    await transport.execute(nextReservation, async () => {
      sent.push("next");
    });
    expect(sent).toEqual(["next"]);
  });
});
