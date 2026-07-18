import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { expect, test as setup } from "@playwright/test";
import {
  cleanupClerkStateFile,
  clerkOwnerStateFile,
  prepareClerkStateFile,
  requireClerkTestEmail,
  secureClerkStateFile,
} from "./support/clerk-state";

setup("create an authenticated owner state through Clerk", async ({ page }) => {
  await cleanupClerkStateFile(clerkOwnerStateFile);
  const ownerEmail = requireClerkTestEmail("E2E_CLERK_OWNER_EMAIL");
  await prepareClerkStateFile(clerkOwnerStateFile);

  try {
    // Clerk's testing token must be created inside a Playwright setup project.
    // A function-style globalSetup cannot reliably propagate these environment
    // values to Playwright workers.
    await clerkSetup();
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    await clerk.signIn({ page, emailAddress: ownerEmail });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("main#main")).toBeVisible();
    await expect(page.locator("[data-app-page]")).toBeVisible();

    await page.context().storageState({ path: clerkOwnerStateFile });
    await secureClerkStateFile(clerkOwnerStateFile);
  } catch (error) {
    await cleanupClerkStateFile(clerkOwnerStateFile);
    throw error;
  }
});
