import { expect, test } from "./fixtures/authenticated-test";

test("an authenticated owner reaches the isolated backend through the BFF", async ({
  page,
}) => {
  const response = await page.request.get(
    "/api/backend/health?userId=untrusted-e2e&user_id=untrusted-e2e",
    { maxRedirects: 0 },
  );

  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("private");
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["server-timing"]).toMatch(/^backend;dur=\d+$/);
  expect(response.headers()["x-request-id"]).toBeTruthy();
  expect(await response.json()).toEqual({ status: "ok" });
});

test("an authenticated owner can open the automation builder without mutating data", async ({
  page,
  waitForReadOnlyPage,
}) => {
  await page.goto("/automations");
  await expect(page.getByRole("heading", { name: "Automatisering", exact: true })).toBeVisible();
  await waitForReadOnlyPage();

  await page.getByRole("button", { name: /Nieuwe|Toevoegen/i }).first().click();
  const builder = page.getByRole("dialog", { name: "Nieuwe automatisering" });
  await expect(builder).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(builder).not.toBeVisible();
});

test("lamp details use the shared responsive overlay without sending commands", async ({
  page,
  waitForReadOnlyPage,
}) => {
  await page.goto("/lampen", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Individuele lampbediening" })).toBeVisible();
  await waitForReadOnlyPage();

  const detailsButton = page.getByRole("button", {
    name: "Woonkamer testlamp details openen",
  });
  await detailsButton.focus();
  await detailsButton.click();

  const panel = page.getByRole("dialog", { name: "Woonkamer testlamp" });
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).not.toBeVisible();
  await expect(detailsButton).toBeFocused();
});
