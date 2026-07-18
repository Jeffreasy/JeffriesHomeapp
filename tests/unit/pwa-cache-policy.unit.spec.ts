import { expect, test } from "@playwright/test";
import { mustUseNetworkOnly } from "../../lib/pwa-cache-policy";

const base = {
  sameOrigin: true,
  pathname: "/_next/static/app.js",
  mode: "no-cors",
  destination: "script",
  hasRscQuery: false,
  isRscRequest: false,
};

test("keeps all private API, navigation and RSC responses out of runtime caches", () => {
  expect(mustUseNetworkOnly({ ...base, pathname: "/api/laventecare/pdf/key" })).toBe(true);
  expect(mustUseNetworkOnly({ ...base, pathname: "/laventecare/documenten/key", mode: "navigate" })).toBe(true);
  expect(mustUseNetworkOnly({ ...base, pathname: "/focus", hasRscQuery: true })).toBe(true);
  expect(mustUseNetworkOnly({ ...base, pathname: "/focus", isRscRequest: true })).toBe(true);
});

test("allows only static assets to reach the default runtime cache", () => {
  expect(mustUseNetworkOnly(base)).toBe(false);
  expect(mustUseNetworkOnly({ ...base, sameOrigin: false, mode: "navigate" })).toBe(false);
});
