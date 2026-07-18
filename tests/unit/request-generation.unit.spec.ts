import { expect, test } from "@playwright/test";
import { createRequestGenerationGate } from "../../lib/request-generation";

test("an old pagination response cannot write into a newly filtered result", async () => {
  const gate = createRequestGenerationGate();
  gate.begin();
  const oldPageGeneration = gate.current();

  let releaseOldPage!: (rows: string[]) => void;
  const oldPage = new Promise<string[]>((resolve) => {
    releaseOldPage = resolve;
  }).then((rows) => (gate.isCurrent(oldPageGeneration) ? rows : []));

  const newFilterGeneration = gate.begin();
  releaseOldPage(["stale-row"]);

  await expect(oldPage).resolves.toEqual([]);
  expect(gate.isCurrent(newFilterGeneration)).toBe(true);
});

test("cleanup invalidation rejects a response from an unmounted request", () => {
  const gate = createRequestGenerationGate();
  const generation = gate.begin();
  gate.invalidate();
  expect(gate.isCurrent(generation)).toBe(false);
});