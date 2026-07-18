import { expect, test } from "@playwright/test";
import {
  createClientErrorEvent,
  sanitizeClientErrorEvent,
} from "../../lib/observability/client-events";

test("client error events never include messages, stacks, routes or arbitrary fields", () => {
  const event = createClientErrorEvent(
    new TypeError("customer@example.test at https://private.invalid"),
    "route",
    "a1b2c3d4",
  );

  expect(event).toMatchObject({
    kind: "client_error",
    boundary: "route",
    errorName: "TypeError",
    digest: "a1b2c3d4",
  });
  expect(JSON.stringify(event)).not.toContain("customer@example.test");
  expect(JSON.stringify(event)).not.toContain("private.invalid");
});

test("server sanitizer maps client-controlled names and tokens to a semantic allowlist", () => {
  expect(
    sanitizeClientErrorEvent({
      kind: "client_error",
      boundary: "component",
      errorName: "user_2privateIdentifier",
      digest: "customer-123",
      buildId: "release with private text",
      message: "ignored raw detail",
    }),
  ).toEqual({ kind: "client_error", boundary: "component", errorName: "Error" });

  expect(
    sanitizeClientErrorEvent({
      kind: "client_error",
      boundary: "route",
      errorName: "ChunkLoadError",
      digest: "123456789",
      buildId: "abcdef1234567",
    }),
  ).toEqual({
    kind: "client_error",
    boundary: "route",
    errorName: "ChunkLoadError",
    digest: "123456789",
    buildId: "abcdef1234567",
  });

  expect(
    sanitizeClientErrorEvent({
      kind: "client_error",
      boundary: "other",
      errorName: "Error",
    }),
  ).toBeNull();
});
