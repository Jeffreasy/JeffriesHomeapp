import { expect, test } from "@playwright/test";
import {
  classifyRuntimeMessage,
  inferRuntimeSource,
  sanitizeRuntimeDiagnostic,
} from "../e2e/support/runtime-evidence";

const firstPartyOrigin = "http://localhost:3000";

test("runtime diagnostics retain only explicit safe categories", () => {
  const password = "short-password";
  const accessToken = "short-access-token";
  const email = "owner@example.test";
  const diagnostic = sanitizeRuntimeDiagnostic({
    message: `TypeError for {"password":"${password}","access_token":"${accessToken}","email":"${email}"}`,
    sourceUrl: `${firstPartyOrigin}/api/users/${encodeURIComponent(email)}?token=${accessToken}`,
    stack: [
      "TypeError: private runtime data",
      `at owner (${firstPartyOrigin}/_next/chunk.js?token=${accessToken})`,
      "at clerk (https://tenant.clerk.accounts.dev/npm.js)",
    ].join("\n"),
    firstPartyOrigin,
  });
  const serialized = JSON.stringify(diagnostic);

  expect(diagnostic).toEqual({
    messageCategory: "type-error",
    source: { scope: "first-party", area: "api" },
    stack: {
      frameCount: 3,
      firstPartyFrameCount: 1,
      dependencyProviders: ["clerk"],
    },
  });
  for (const privateValue of [password, accessToken, email, encodeURIComponent(email)]) {
    expect(serialized).not.toContain(privateValue);
  }
});

test("runtime sources expose only first-party areas or dependency categories", () => {
  expect(inferRuntimeSource(`${firstPartyOrigin}/_next/static/chunk.js?token=hidden`, firstPartyOrigin)).toEqual({
    scope: "first-party",
    area: "next",
  });
  expect(inferRuntimeSource(`${firstPartyOrigin}/api/private/user_123`, firstPartyOrigin)).toEqual({
    scope: "first-party",
    area: "api",
  });
  expect(inferRuntimeSource(`${firstPartyOrigin}/sw.js`, firstPartyOrigin)).toEqual({
    scope: "first-party",
    area: "service-worker",
  });
  expect(inferRuntimeSource(`${firstPartyOrigin}/lampen`, firstPartyOrigin)).toEqual({
    scope: "first-party",
    area: "page",
  });
  expect(inferRuntimeSource("https://tenant.clerk.accounts.dev/npm.js", firstPartyOrigin)).toEqual({
    scope: "dependency",
    provider: "clerk",
  });
  expect(inferRuntimeSource(undefined, firstPartyOrigin)).toEqual({ scope: "unknown" });
});

test("runtime message and stack inspection are bounded to safe summaries", () => {
  expect(classifyRuntimeMessage("ChunkLoadError: Loading chunk 42 failed")).toBe("chunk-load");
  expect(classifyRuntimeMessage("TypeError: Failed to fetch")).toBe("network");
  expect(classifyRuntimeMessage("Hydration mismatch in React")).toBe("react");
  expect(classifyRuntimeMessage(`${"x".repeat(5_000)} TypeError`)).toBe("other");

  const diagnostic = sanitizeRuntimeDiagnostic({
    message: "Network request failed",
    stack: Array.from(
      { length: 40 },
      (_, index) => `at frame${index} (${firstPartyOrigin}/_next/chunk.js?private=${index})`,
    ).join("\n"),
    firstPartyOrigin,
  });

  expect(diagnostic.messageCategory).toBe("network");
  expect(diagnostic.stack).toEqual({
    frameCount: 24,
    firstPartyFrameCount: 24,
    dependencyProviders: [],
  });
  expect(JSON.stringify(diagnostic)).not.toContain("chunk.js");
});
