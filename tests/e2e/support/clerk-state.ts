import { chmod, mkdir, rm, rmdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const clerkStateDirectory = path.resolve(
  process.cwd(),
  "playwright",
  ".clerk",
);
export const clerkOwnerStateFile = path.join(clerkStateDirectory, "owner.json");
export const clerkNonOwnerStateFile = path.join(
  clerkStateDirectory,
  "non-owner.json",
);

type ClerkEmailVariable =
  | "E2E_CLERK_OWNER_EMAIL"
  | "E2E_CLERK_NON_OWNER_EMAIL";

const supportsOwnerOnlyModes = process.platform !== "win32";

function isIgnorableDirectoryRemovalError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) return false;
  return error.code === "ENOENT" || error.code === "ENOTEMPTY";
}

export function requireClerkTestEmail(variableName: ClerkEmailVariable): string {
  const value = process.env[variableName]?.trim();
  if (!value) {
    throw new Error(`${variableName} is required for this authenticated E2E project.`);
  }
  return value;
}

export async function prepareClerkStateFile(filePath: string): Promise<void> {
  await mkdir(clerkStateDirectory, { recursive: true, mode: 0o700 });
  if (supportsOwnerOnlyModes) {
    await chmod(clerkStateDirectory, 0o700);
  }

  await rm(filePath, { force: true });
  await writeFile(filePath, "", {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  await secureClerkStateFile(filePath);
}

export async function secureClerkStateFile(filePath: string): Promise<void> {
  if (supportsOwnerOnlyModes) {
    await chmod(filePath, 0o600);
  }
}

export async function cleanupClerkStateFile(filePath: string): Promise<void> {
  await rm(filePath, { force: true });

  try {
    await rmdir(clerkStateDirectory);
  } catch (error) {
    // Parallel owner/non-owner teardown leaves the directory non-empty until
    // both independent states have been removed.
    if (!isIgnorableDirectoryRemovalError(error)) throw error;
  }
}
