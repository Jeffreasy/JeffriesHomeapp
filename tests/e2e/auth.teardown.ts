import { test as teardown } from "@playwright/test";
import { cleanupClerkStateFile, clerkOwnerStateFile } from "./support/clerk-state";

teardown("remove the temporary owner state", async () => {
  await cleanupClerkStateFile(clerkOwnerStateFile);
});
