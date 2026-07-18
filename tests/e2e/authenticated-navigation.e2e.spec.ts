import { expect, test } from "./fixtures/authenticated-test";

test("an authenticated owner can open the automation builder without mutating data", async ({ page }) => {
  await page.goto("/automations");
  await expect(page.getByRole("heading", { name: "Automatisering" })).toBeVisible();

  await page.getByRole("button", { name: /Nieuwe|Toevoegen/i }).first().click();
  const builder = page.getByRole("dialog", { name: "Nieuwe automatisering" });
  await expect(builder).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(builder).not.toBeVisible();
});

test("lamp details use the shared responsive overlay without sending commands", async ({
  page,
}) => {
  await page.goto("/lampen", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("region", { name: "Individuele lampbediening" })).toBeVisible();

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
