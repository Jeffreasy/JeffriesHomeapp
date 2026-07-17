import { expect, test } from "@playwright/test";
import {
  getBackendApiKey,
  getBackendBaseUrl,
  getBackendProxyConfig,
} from "../../lib/server/backend-config";

test("uses localhost when developing without an explicit backend", () => {
  expect(getBackendBaseUrl({ NODE_ENV: "development" })).toBe(
    "http://127.0.0.1:8000/api/v1",
  );
});

test("requires an explicit production backend", () => {
  expect(() => getBackendBaseUrl({ NODE_ENV: "production" })).toThrow(
    /BACKEND_API_URL/,
  );
});

test("normalizes explicit URLs and requires a production API key", () => {
  expect(
    getBackendBaseUrl({ NODE_ENV: "production", BACKEND_API_URL: "https://backend.example/api/v1///" }),
  ).toBe("https://backend.example/api/v1");
  expect(
    getBackendApiKey({ NODE_ENV: "production", BACKEND_API_KEY: " dedicated ", APP_SECRET_KEY: "fallback" }),
  ).toBe("dedicated");
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

  expect(
    getBackendBaseUrl({
      NODE_ENV: "production",
      BACKEND_API_URL: "http://127.0.0.1:18080/api/v1",
    }),
  ).toBe("http://127.0.0.1:18080/api/v1");
});

test("resolves URL and credential together so production cannot proxy partially configured", () => {
  expect(() =>
    getBackendProxyConfig({
      NODE_ENV: "production",
      BACKEND_API_URL: "https://backend.example/api/v1",
    }),
  ).toThrow(/BACKEND_API_KEY/);

  expect(
    getBackendProxyConfig({
      NODE_ENV: "production",
      BACKEND_API_URL: "https://backend.example/api/v1",
      BACKEND_API_KEY: "secret",
    }),
  ).toEqual({
    baseUrl: "https://backend.example/api/v1",
    apiKey: "secret",
  });
});
