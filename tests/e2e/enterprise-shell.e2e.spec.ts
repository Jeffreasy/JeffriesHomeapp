import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
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

async function waitForLoadedFrames(page: Page) {
  await page.waitForLoadState("load");
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => resolve());
        });
      }),
  );
}

async function findUndersizedRenderedTouchTargets(page: Page) {
  return page.evaluate(() => {
    const selector = [
      "button",
      "a[href]",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "summary",
      "[role='button']",
      "[role='switch']",
      "[role='tab']",
      "[role='menuitem']",
    ].join(",");
    const candidates = new Set<HTMLElement>();

    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      if (element instanceof HTMLAnchorElement && window.getComputedStyle(element).display === "inline") {
        continue;
      }

      if (
        element instanceof HTMLInputElement &&
        (element.type === "checkbox" || element.type === "radio" || element.type === "file")
      ) {
        const labels = Array.from(element.labels ?? []);
        if (labels.length > 0) {
          labels.forEach((label) => candidates.add(label));
          continue;
        }
      }
      candidates.add(element);
    }

    const isRendered = (element: HTMLElement) => {
      const style = window.getComputedStyle(element);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse" ||
        element.getAttribute("aria-hidden") === "true" ||
        element.getClientRects().length === 0
      ) {
        return false;
      }

      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    return Array.from(candidates).flatMap((element, index) => {
      if (!isRendered(element)) return [];

      const rect = element.getBoundingClientRect();
      if (rect.width >= 44 && rect.height >= 44) return [];

      const tag = element.tagName.toLowerCase();
      const role = element.getAttribute("role");
      const type = element instanceof HTMLInputElement ? element.type : null;
      const kind = role
        ? tag + "[role=" + role + "]"
        : type
          ? tag + "[type=" + type + "]"
          : tag;

      return [
        {
          target: kind + "#" + String(index),
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        },
      ];
    });
  });
}

function sanitizeAxeViolations(
  violations: Array<{
    id: string;
    impact?: string | null;
    nodes: readonly unknown[];
  }>,
) {
  return violations.map(({ id, impact, nodes }) => ({
    id,
    impact: impact ?? "unknown",
    nodeCount: nodes.length,
  }));
}

test.describe("enterprise application shell", () => {
  for (const route of mainRoutes) {
    test(route + " keeps the standard shell within the viewport", async ({ page }, testInfo) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });

      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("main#main")).toHaveCount(1);
      await expect(page.locator("[data-app-page]")).toBeVisible();
      await waitForLoadedFrames(page);

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

      if (testInfo.project.name === "auth-mobile") {
        const undersized = await findUndersizedRenderedTouchTargets(page);
        expect(undersized, route + " contains touch targets below 44 by 44 pixels").toEqual([]);
      }
    });
  }

  for (const route of mainRoutes) {
    test(route + " has no WCAG A/AA axe violations", async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("[data-app-page]")).toBeVisible();
      await waitForLoadedFrames(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      expect(sanitizeAxeViolations(results.violations)).toEqual([]);
    });
  }

  test("responsive navigation stays professional and touch-safe", async ({ page }, testInfo) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-app-page]")).toBeVisible();
    await waitForLoadedFrames(page);

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

  test("feature overlays remain touch-safe on mobile", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "auth-mobile", "Mobile interaction contract");

    await page.goto("/automations", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-app-page]")).toBeVisible();
    await page.getByRole("button", { name: "Nieuwe automatisering toevoegen" }).click();

    const automationDialog = page.getByRole("dialog", { name: "Nieuwe automatisering" });
    await expect(automationDialog).toBeVisible();
    expect(
      await findUndersizedRenderedTouchTargets(page),
      "The automation dialog contains touch targets below 44 by 44 pixels",
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(automationDialog).not.toBeVisible();

    await page.goto("/lampen", { waitUntil: "domcontentloaded" });
    await expect(page.locator("[data-app-page]")).toBeVisible();
    const lampDetails = page.getByRole("button", { name: / details openen$/ }).first();
    await expect(lampDetails).toBeVisible();
    await lampDetails.click();

    const lampDialog = page.getByRole("dialog").last();
    await expect(lampDialog).toBeVisible();
    expect(
      await findUndersizedRenderedTouchTargets(page),
      "The lamp detail sheet contains touch targets below 44 by 44 pixels",
    ).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(lampDialog).not.toBeVisible();
  });
});
