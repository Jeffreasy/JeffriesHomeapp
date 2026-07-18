import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures/authenticated-test";

const mainRoutes = [
  "/",
  "/lampen",
  "/rooster",
  "/agenda",
  "/automations",
  "/finance",
  "/notities",
  "/habits",
  "/contacten",
  "/laventecare",
  "/settings",
] as const;

const accessibilityRoutes = ["/", "/lampen", "/automations", "/laventecare"] as const;

test.describe("enterprise application shell", () => {
  for (const route of mainRoutes) {
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

  for (const route of accessibilityRoutes) {
    test(`${route} has no WCAG A/AA axe violations`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-app-page]")).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      const sanitizedViolations = results.violations.map(({ id, impact, nodes }) => ({
        id,
        impact: impact ?? "unknown",
        nodeCount: nodes.length,
      }));

      expect(sanitizedViolations).toEqual([]);
    });
  }

  test("responsive navigation stays professional and touch-safe", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });

    const isMobile = testInfo.project.name === "auth-mobile";
    const bottomNavigation = page.getByRole("navigation", {
      name: "Mobiele hoofdnavigatie",
    });
    const sidebarNavigation = page.getByRole("navigation", { name: "Hoofdnavigatie" });

    if (isMobile) {
      await expect(bottomNavigation).toBeVisible();
      await expect(sidebarNavigation).toBeHidden();

      const touchTargets = bottomNavigation.locator("a, button");
      for (let index = 0; index < (await touchTargets.count()); index += 1) {
        const box = await touchTargets.nth(index).boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }

      const moreButton = page.getByRole("button", { name: "Meer", exact: true });
      await moreButton.focus();
      await moreButton.click();
      const moreSheet = page.getByRole("dialog", { name: "Meer onderdelen" });
      await expect(moreSheet).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(moreSheet).not.toBeVisible();
      await expect(moreButton).toBeFocused();
    } else {
      await expect(sidebarNavigation).toBeVisible();
      await expect(bottomNavigation).toBeHidden();
      await expect(sidebarNavigation.getByRole("link")).toHaveCount(11);
    }
  });
});
