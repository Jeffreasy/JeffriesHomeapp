import { test as teardown } from "@playwright/test";
import {
  cleanupClerkStateFile,
  clerkNonOwnerStateFile,
} from "./support/clerk-state";

teardown("remove the temporary non-owner state", async () => {
  await cleanupClerkStateFile(clerkNonOwnerStateFile);
});
