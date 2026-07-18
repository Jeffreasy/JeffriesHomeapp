import { expect, test } from "@playwright/test";
import { decideControllerChange } from "../../lib/pwa-update";

test("the first service-worker controller claim does not show an update prompt", () => {
  expect(decideControllerChange(false)).toEqual({
    hadController: true,
    promptForUpdate: false,
  });
});

test("replacing an existing service-worker controller does show an update prompt", () => {
  expect(decideControllerChange(true)).toEqual({
    hadController: true,
    promptForUpdate: true,
  });
});
