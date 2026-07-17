import { expect, test } from "@playwright/test";

test("private pages redirect unauthenticated visitors to sign-in", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });

  expect([302, 303, 307, 308]).toContain(response.status());
  expect(response.headers().location).toContain("/sign-in");
});

test("the backend BFF returns JSON 401 instead of leaking or redirecting", async ({ request }) => {
  const response = await request.get("/api/backend/health", { maxRedirects: 0 });

  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toMatchObject({ detail: "Niet ingelogd." });
});
