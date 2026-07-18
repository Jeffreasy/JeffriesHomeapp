import { clerk, clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";
import {
  cleanupClerkStateFile,
  clerkNonOwnerStateFile,
  prepareClerkStateFile,
  requireClerkTestEmail,
  secureClerkStateFile,
} from "./support/clerk-state";

setup("create an authenticated non-owner state through Clerk", async ({ page }) => {
  await cleanupClerkStateFile(clerkNonOwnerStateFile);
  const nonOwnerEmail = requireClerkTestEmail("E2E_CLERK_NON_OWNER_EMAIL");
  const ownerEmail = process.env.E2E_CLERK_OWNER_EMAIL?.trim();

  if (ownerEmail?.toLowerCase() === nonOwnerEmail.toLowerCase()) {
    throw new Error(
      "E2E_CLERK_NON_OWNER_EMAIL must identify a different account from the owner.",
    );
  }

  await prepareClerkStateFile(clerkNonOwnerStateFile);

  try {
    await clerkSetup();
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    await clerk.signIn({ page, emailAddress: nonOwnerEmail });
    await page.context().storageState({ path: clerkNonOwnerStateFile });
    await secureClerkStateFile(clerkNonOwnerStateFile);
  } catch (error) {
    await cleanupClerkStateFile(clerkNonOwnerStateFile);
    throw error;
  }
});
