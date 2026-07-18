import { expect, test } from "./fixtures/authenticated-test";

test("an authenticated owner reaches the isolated backend through the BFF", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-app-page]")).toBeVisible();
  await page.waitForFunction(async () => {
    const clerk = (
      window as typeof window & {
        Clerk?: {
          loaded?: boolean;
          session?: { getToken: () => Promise<string | null> };
        };
      }
    ).Clerk;

    if (!clerk?.loaded || !clerk.session) return false;
    return Boolean(await clerk.session.getToken());
  });

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

  const automationTrigger = page.getByRole("button", { name: /Nieuwe|Toevoegen/i }).first();
  await automationTrigger.focus();
  await automationTrigger.click();

  const builder = page.getByRole("dialog", { name: "Nieuwe automatisering" });
  const nameInput = builder.getByRole("textbox", { name: "Naam" });
  await expect(builder).toBeVisible();
  await nameInput.fill("Focusherstel controleren");
  await nameInput.focus();

  await page.keyboard.press("Escape");
  const discardDialog = page.getByRole("alertdialog", { name: "Wijzigingen verwerpen?" });
  await expect(discardDialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(discardDialog).not.toBeVisible();
  await expect(builder).toBeVisible();
  await expect(nameInput).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole("button", { name: "Verwerpen" }).click();
  await expect(discardDialog).not.toBeVisible();
  await expect(builder).not.toBeVisible();
  await expect(automationTrigger).toBeFocused();
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
