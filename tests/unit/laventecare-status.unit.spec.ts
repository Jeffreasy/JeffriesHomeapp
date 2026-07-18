import { expect, test } from "@playwright/test";
import { isClosedLaventeCareStatus } from "../../lib/laventecare/status";

test("recognizes the shared terminal LaventeCare statuses", () => {
  for (const status of [
    "afgerond",
    "gewonnen",
    "verloren",
    "omgezet_project",
    "  GESLOTEN  ",
  ]) {
    expect(isClosedLaventeCareStatus(status)).toBe(true);
  }
});

test("keeps missing and active statuses open", () => {
  expect([undefined, null, "", "actief", "in_uitvoering"].map(isClosedLaventeCareStatus)).toEqual([false, false, false, false, false]);
});
