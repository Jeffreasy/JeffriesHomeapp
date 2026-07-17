import { expect, test } from "@playwright/test";

const authState = process.env.E2E_AUTH_STATE;
if (authState) test.use({ storageState: authState });

test("an authenticated owner can open the automation builder without mutating data", async ({ page }) => {
  test.skip(!authState, "Set E2E_AUTH_STATE to run owner-only browser flows.");

  await page.goto("/automations");
  await expect(page.getByRole("heading", { name: "Automatiseringen" })).toBeVisible();

  await page.getByRole("button", { name: /Nieuwe|Toevoegen/i }).first().click();
  await expect(page.getByRole("heading", { name: "Nieuwe automatisering" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Nieuwe automatisering" })).not.toBeVisible();
});
