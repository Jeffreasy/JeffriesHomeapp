import { expect, test } from "@playwright/test";

test("a valid non-owner is denied by both page and API boundaries", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/access-denied\/?$/);
  await expect(
    page.getByRole("heading", { name: "Dit account heeft geen toegang" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Uitloggen en ander account kiezen",
    }),
  ).toBeVisible();

  const response = await page.request.get("/api/backend/health", {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(403);
  expect(response.headers()["content-type"]).toContain("application/json");
  await expect(response.json()).resolves.toMatchObject({
    detail: "Geen toegang.",
    code: "FORBIDDEN",
  });
});
