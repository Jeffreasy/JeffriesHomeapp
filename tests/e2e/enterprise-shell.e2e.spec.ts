import { expect, test } from "@playwright/test";

const authState = process.env.E2E_AUTH_STATE;
const enterpriseShellProjects = new Set(["chromium", "mobile-chromium"]);
const representativeRoutes = ["/", "/lampen", "/agenda", "/laventecare"] as const;

if (authState) test.use({ storageState: authState });

test.describe("enterprise application shell", () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!authState, "Set E2E_AUTH_STATE to run authenticated shell checks.");
    test.skip(
      !enterpriseShellProjects.has(testInfo.project.name),
      "This contract targets the configured desktop and mobile Chromium viewports.",
    );
  });

  for (const route of representativeRoutes) {
    test(`${route} keeps the standard shell within the viewport`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("main#main")).toHaveCount(1);
      await expect(page.locator("[data-app-page]")).toBeVisible();

      await expect
        .poll(() =>
          page.evaluate(() => {
            const documentWidth = Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
            );
            return documentWidth - window.innerWidth;
          }),
        )
        .toBeLessThanOrEqual(1);
    });
  }

  test("the mobile More sheet restores focus and Lampen remains directly reachable", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "Mobile navigation only.");

    await page.goto("/", { waitUntil: "domcontentloaded" });

    const moreButton = page.getByRole("button", { name: "Meer", exact: true });
    await moreButton.focus();
    await moreButton.click();

    const moreSheet = page.getByRole("dialog", { name: "Meer onderdelen" });
    await expect(moreSheet).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(moreSheet).not.toBeVisible();
    await expect(moreButton).toBeFocused();

    await page.getByRole("link", { name: "Lampen", exact: true }).click();
    await expect(page).toHaveURL(/\/lampen\/?$/);
    await expect(page.getByRole("region", { name: "Individuele lampbediening" })).toBeVisible();
  });
});
