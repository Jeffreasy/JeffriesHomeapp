import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

test("production CSP excludes direct backend, AI-provider and eval access", () => {
  const vercel = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8")) as {
    headers: Array<{ headers: Array<{ key: string; value: string }> }>;
  };
  const value = vercel.headers[0].headers.find((header) => header.key === "Content-Security-Policy")?.value ?? "";
  expect(value).not.toContain("unsafe-eval");
  expect(value).not.toContain("jeffriesbackend.onrender.com");
  expect(value).not.toContain("api.x.ai");
  expect(value).not.toContain("api.groq.com");
  expect(value).toContain("object-src 'none'");
  expect(value).toContain("frame-ancestors 'none'");
});
