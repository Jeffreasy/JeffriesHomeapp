import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

type HeaderRule = {
  source: string;
  headers: Array<{ key: string; value: string }>;
};

const vercel = JSON.parse(
  readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"),
) as { headers: HeaderRule[] };

function headersFor(source: string) {
  const rule = vercel.headers.find((candidate) => candidate.source === source);
  expect(rule, `missing Vercel header rule for ${source}`).toBeTruthy();
  return new Map(rule?.headers.map(({ key, value }) => [key.toLowerCase(), value]));
}

test("production CSP keeps browser trust boundaries closed", () => {
  const value = headersFor("/(.*)").get("content-security-policy") ?? "";

  expect(value).not.toContain("unsafe-eval");
  expect(value).not.toContain("jeffriesbackend.onrender.com");
  expect(value).not.toContain("api.x.ai");
  expect(value).not.toContain("api.groq.com");
  expect(value).toContain("default-src 'self'");
  expect(value).toContain("frame-src 'self'");
  expect(value).toContain("object-src 'none'");
  expect(value).toContain("base-uri 'self'");
  expect(value).toContain("form-action 'self'");
  expect(value).toContain("frame-ancestors 'none'");
  expect(value).toContain("upgrade-insecure-requests");
});

test("global headers harden transport, isolation and indexing", () => {
  const headers = headersFor("/(.*)");

  expect(headers.get("strict-transport-security")).toBe(
    "max-age=63072000; includeSubDomains; preload",
  );
  expect(headers.get("x-content-type-options")).toBe("nosniff");
  expect(headers.get("x-frame-options")).toBe("DENY");
  expect(headers.get("x-xss-protection")).toBe("0");
  expect(headers.get("referrer-policy")).toBe("no-referrer");
  expect(headers.get("cross-origin-opener-policy")).toBe("same-origin-allow-popups");
  expect(headers.get("cross-origin-resource-policy")).toBe("same-origin");
  expect(headers.get("origin-agent-cluster")).toBe("?1");
  expect(headers.get("x-permitted-cross-domain-policies")).toBe("none");
  expect(headers.get("x-robots-tag")).toContain("noindex");
  expect(headers.get("x-robots-tag")).toContain("noarchive");

  const permissions = headers.get("permissions-policy") ?? "";
  for (const disabledCapability of [
    "camera=()",
    "geolocation=()",
    "microphone=()",
    "payment=()",
    "usb=()",
  ]) {
    expect(permissions).toContain(disabledCapability);
  }
});

test("API responses receive an explicit private no-store policy", () => {
  const headers = headersFor("/api/(.*)");

  expect(headers.get("cache-control")).toBe(
    "private, no-store, max-age=0, must-revalidate",
  );
  expect(headers.get("pragma")).toBe("no-cache");
});

test("only the owner-gated PDF endpoint can be embedded by the same origin", () => {
  const headers = headersFor("/api/laventecare/pdf/(.*)");

  expect(headers.get("x-frame-options")).toBe("SAMEORIGIN");
  expect(headers.get("content-security-policy")).toContain("frame-ancestors 'self'");
  expect(headers.get("content-security-policy")).toContain("default-src 'none'");
});

test("dynamic private document routes cannot bypass middleware through an asset suffix", () => {
  const proxySource = readFileSync(resolve(process.cwd(), "proxy.ts"), "utf8");

  expect(proxySource).toContain('"/laventecare/documenten/(.*)"');
  expect(proxySource).toContain('"/(api|trpc)(.*)"');
});
