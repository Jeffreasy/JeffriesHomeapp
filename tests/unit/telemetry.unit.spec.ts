import { expect, test } from "@playwright/test";
import { getErrorKind, getRequestId, logServerEvent } from "../../lib/server/telemetry";

test("request IDs are generated at the server trust boundary", () => {
  const first = getRequestId();
  const second = getRequestId();

  expect(first).toMatch(/^[0-9a-f-]{36}$/);
  expect(second).toMatch(/^[0-9a-f-]{36}$/);
  expect(first).not.toBe(second);
  expect(first).not.toContain("privateIdentifier");
});

test("error telemetry uses a fixed semantic class allowlist", () => {
  expect(getErrorKind(new TypeError("secret URL https://backend.invalid"))).toBe("TypeError");
  expect(getErrorKind(Object.assign(new Error("private body"), { name: "customer_123" }))).toBe(
    "OtherError",
  );
  expect(getErrorKind({ message: "private body" })).toBe("OtherError");
});

test("structured logs keep safe release correlation and normalize untrusted fields", () => {
  const originalInfo = console.info;
  let captured = "";
  console.info = (value?: unknown) => {
    captured = String(value ?? "");
  };

  try {
    logServerEvent({
      level: "info",
      message: "client_error_reported",
      route: "/api/telemetry/client",
      requestId: "9a73a1ca-9547-4ec4-9fcb-d249eda6f6cf",
      operation: "component",
      errorKind: "user_2privateIdentifier",
      errorDigest: "a1b2c3d4",
      buildId: "abcdef1234567",
    });
  } finally {
    console.info = originalInfo;
  }

  const payload = JSON.parse(captured) as Record<string, unknown>;
  expect(payload).toMatchObject({
    message: "client_error_reported",
    route: "/api/telemetry/client",
    operation: "component",
    errorKind: "OtherError",
    errorDigest: "a1b2c3d4",
    buildId: "abcdef1234567",
  });
  expect(captured).not.toContain("user_2privateIdentifier");
});
