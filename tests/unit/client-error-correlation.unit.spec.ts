import { expect, test } from "@playwright/test";
import {
  correlateClientDigest,
  getServerBuildId,
} from "../../lib/server/client-error-correlation";

test("client digest correlation is deterministic but never logs the supplied token", () => {
  const supplied = "a1b2c3d4";
  const first = correlateClientDigest(supplied);

  expect(first).toMatch(/^[0-9a-f]{16}$/);
  expect(first).toBe(correlateClientDigest(supplied));
  expect(first).not.toBe(supplied);
  expect(correlateClientDigest("customer-123")).toBeUndefined();
});

test("release correlation only accepts the server build identifier", () => {
  expect(getServerBuildId("abcdef1234567")).toBe("abcdef1234567");
  expect(getServerBuildId("1721234567890")).toBe("1721234567890");
  expect(getServerBuildId("release with private text")).toBeUndefined();
});
