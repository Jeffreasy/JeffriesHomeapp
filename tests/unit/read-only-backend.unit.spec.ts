import { expect, test } from "@playwright/test";
import {
  READ_ONLY_BACKEND_API_KEY,
  evaluateReadOnlyBackendRequest,
  resolveReadOnlyBackendGet,
} from "../e2e/support/read-only-backend.mjs";

const ownerUserId = "user_e2e_owner";

type ReadOnlyBackendRequest = {
  method: string;
  pathname: string;
  apiKey: string | undefined;
  requestId: string | undefined;
  ownerUserId: string | null;
  hasLegacyOwnerQuery?: boolean;
  expectedApiKey: string;
  expectedOwnerUserId: string;
};
type RequestOverrides = Partial<ReadOnlyBackendRequest>;

function evaluate(overrides: RequestOverrides = {}) {
  return evaluateReadOnlyBackendRequest({
    method: "GET",
    pathname: "/api/v1/health",
    apiKey: READ_ONLY_BACKEND_API_KEY,
    requestId: "request-e2e-contract",
    ownerUserId,
    expectedApiKey: READ_ONLY_BACKEND_API_KEY,
    expectedOwnerUserId: ownerUserId,
    ...overrides,
  });
}

test("read-only backend exposes deterministic contracts for authenticated routes", () => {
  expect(resolveReadOnlyBackendGet("/api/v1/devices")).toMatchObject([
    { id: "e2e-lamp-living-room", name: "Woonkamer testlamp" },
  ]);
  expect(resolveReadOnlyBackendGet("/api/v1/rooms")).toMatchObject([
    { id: "e2e-room-living-room", name: "Woonkamer" },
  ]);
  expect(resolveReadOnlyBackendGet("/api/v1/settings/overview")).toMatchObject({
    devices: { total: 1, online: 1, on: 1 },
    bridge: { online: true, status: "online" },
  });
  expect(evaluate()).toEqual({ status: 200, body: { status: "ok" } });
});

test("read-only backend enforces the BFF credential and correlation contract", () => {
  expect(evaluate({ apiKey: "wrong-e2e-key" }).status).toBe(401);
  expect(evaluate({ requestId: undefined }).status).toBe(400);
});

test("read-only backend enforces canonical owner query normalization", () => {
  expect(evaluate({ ownerUserId: "user_not_owner" }).status).toBe(403);
  expect(evaluate({ hasLegacyOwnerQuery: true }).status).toBe(403);
});

test("read-only backend permits modeled reads and fails closed otherwise", () => {
  expect(evaluate({ method: "HEAD" })).toEqual({ status: 200, body: undefined });
  expect(evaluate({ method: "OPTIONS" })).toEqual({
    status: 204,
    body: undefined,
  });
  expect(evaluate({ method: "POST" }).status).toBe(405);
  expect(evaluate({ pathname: "/api/v1/unmodeled" }).status).toBe(501);
});
