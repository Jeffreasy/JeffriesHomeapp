import { expect, test } from "@playwright/test";
import {
  getBackendApiKey,
  getBackendBaseUrl,
  getBackendProxyConfig,
  getBackendProxyTimeoutMs,
} from "../../lib/server/backend-config";

test("uses localhost and a bounded default timeout during development", () => {
  expect(getBackendBaseUrl({ NODE_ENV: "development" })).toBe(
    "http://127.0.0.1:8000/api/v1",
  );
  expect(getBackendProxyTimeoutMs({})).toBe(25_000);
});

test("requires an explicit production backend", () => {
  expect(() => getBackendBaseUrl({ NODE_ENV: "production" })).toThrow(/BACKEND_API_URL/);
});

test("normalizes explicit URLs and requires a production API key", () => {
  expect(getBackendBaseUrl({ NODE_ENV: "production", BACKEND_API_URL: "https://backend.example/api/v1///" })).toBe("https://backend.example/api/v1");
  expect(getBackendApiKey({ NODE_ENV: "production", BACKEND_API_KEY: " dedicated ", APP_SECRET_KEY: "fallback" })).toBe("dedicated");
  expect(() => getBackendApiKey({ NODE_ENV: "production" })).toThrow(/BACKEND_API_KEY/);
  expect(getBackendApiKey({ NODE_ENV: "development" })).toBe("");
});

test("rejects unsafe or ambiguous backend URLs", () => {
  const invalidUrls = [
    "ftp://backend.example/api/v1",
    "https://user:secret@backend.example/api/v1",
    "https://backend.example/api/v1#fragment",
    "https://backend.example/api/v1?tenant=other",
    "http://backend.example/api/v1",
  ];
  for (const BACKEND_API_URL of invalidUrls) {
    expect(() => getBackendBaseUrl({ NODE_ENV: "production", BACKEND_API_URL })).toThrow();
  }
  expect(getBackendBaseUrl({ NODE_ENV: "production", BACKEND_API_URL: "http://127.0.0.1:18080/api/v1" })).toBe("http://127.0.0.1:18080/api/v1");
});

test("clamps proxy deadlines and rejects non-numeric configuration", () => {
  expect(getBackendProxyTimeoutMs({ BACKEND_PROXY_TIMEOUT_MS: "50" })).toBe(1_000);
  expect(getBackendProxyTimeoutMs({ BACKEND_PROXY_TIMEOUT_MS: "90000" })).toBe(60_000);
  expect(getBackendProxyTimeoutMs({ BACKEND_PROXY_TIMEOUT_MS: "12500.8" })).toBe(12_500);
  expect(() => getBackendProxyTimeoutMs({ BACKEND_PROXY_TIMEOUT_MS: "soon" })).toThrow(/getal/);
});

test("resolves URL, credential and timeout as one fail-closed unit", () => {
  expect(() => getBackendProxyConfig({ NODE_ENV: "production", BACKEND_API_URL: "https://backend.example/api/v1" })).toThrow(/BACKEND_API_KEY/);
  expect(getBackendProxyConfig({ NODE_ENV: "production", BACKEND_API_URL: "https://backend.example/api/v1", BACKEND_API_KEY: "secret", BACKEND_PROXY_TIMEOUT_MS: "18000" })).toEqual({
    baseUrl: "https://backend.example/api/v1",
    apiKey: "secret",
    timeoutMs: 18_000,
  });
});
