import { expect, test } from "@playwright/test";
import { queryRetryDelay, shouldRetryQuery } from "../../lib/query-retry";

test("query retries are limited to network and transient HTTP failures", () => {
  expect(shouldRetryQuery(0, new TypeError("network unavailable"))).toBe(true);
  expect(shouldRetryQuery(0, Object.assign(new Error("busy"), { status: 503 }))).toBe(true);
  expect(shouldRetryQuery(0, Object.assign(new Error("rate limited"), { status: 429 }))).toBe(true);

  for (const status of [400, 401, 403, 404, 409, 422]) {
    expect(shouldRetryQuery(0, Object.assign(new Error("permanent"), { status }))).toBe(false);
  }
  expect(shouldRetryQuery(2, new TypeError("still offline"))).toBe(false);
});

test("query retry backoff is bounded", () => {
  expect(queryRetryDelay(0)).toBe(500);
  expect(queryRetryDelay(3)).toBe(4_000);
  expect(queryRetryDelay(20)).toBe(4_000);
});
