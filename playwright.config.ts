import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import {
  clerkNonOwnerStateFile,
  clerkOwnerStateFile,
} from "./tests/e2e/support/clerk-state";
import {
  READ_ONLY_BACKEND_API_KEY,
  READ_ONLY_BACKEND_BASE_URL,
  READ_ONLY_BACKEND_ORIGIN,
  READ_ONLY_BACKEND_READY_PATH,
} from "./tests/e2e/support/read-only-backend.mjs";

const localEnvFile = resolve(process.cwd(), ".env.local");
if (!process.env.CI && existsSync(localEnvFile)) process.loadEnvFile(localEnvFile);

const e2eBaseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const useExternalServer = process.env.E2E_EXTERNAL_SERVER === "1";
const ownerUserId = process.env.HOMEAPP_OWNER_USER_ID?.trim() || "user_ci_owner";
const authenticatedSpecs = /(?:authenticated-navigation|enterprise-shell)\.e2e\.spec\.ts/;
const protectedBrowserPolicy = {
  serviceWorkers: "block",
  screenshot: "off",
  trace: "off",
  video: "off",
} as const;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: e2eBaseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "security-chromium",
      testMatch: /security\.e2e\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "clerk-owner-setup",
      testMatch: /[\\/]auth\.setup\.ts$/,
      teardown: "clerk-owner-teardown",
      use: {
        ...devices["Desktop Chrome"],
        ...protectedBrowserPolicy,
      },
    },
    {
      name: "clerk-owner-teardown",
      testMatch: /[\\/]auth\.teardown\.ts$/,
      use: protectedBrowserPolicy,
    },
    {
      name: "clerk-non-owner-setup",
      testMatch: /[\\/]non-owner-auth\.setup\.ts$/,
      teardown: "clerk-non-owner-teardown",
      use: {
        ...devices["Desktop Chrome"],
        ...protectedBrowserPolicy,
      },
    },
    {
      name: "clerk-non-owner-teardown",
      testMatch: /[\\/]non-owner-auth\.teardown\.ts$/,
      use: protectedBrowserPolicy,
    },
    {
      name: "auth-desktop",
      testMatch: authenticatedSpecs,
      dependencies: ["clerk-owner-setup"],
      use: {
        ...devices["Desktop Chrome"],
        ...protectedBrowserPolicy,
        storageState: clerkOwnerStateFile,
      },
    },
    {
      name: "auth-tablet",
      testMatch: authenticatedSpecs,
      dependencies: ["clerk-owner-setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 834, height: 1194 },
        ...protectedBrowserPolicy,
        storageState: clerkOwnerStateFile,
      },
    },
    {
      name: "auth-mobile",
      testMatch: authenticatedSpecs,
      dependencies: ["clerk-owner-setup"],
      use: {
        ...devices["Pixel 5"],
        ...protectedBrowserPolicy,
        storageState: clerkOwnerStateFile,
      },
    },
    {
      name: "auth-non-owner",
      testMatch: /non-owner-access\.e2e\.spec\.ts/,
      dependencies: ["clerk-non-owner-setup"],
      use: {
        ...devices["Desktop Chrome"],
        ...protectedBrowserPolicy,
        storageState: clerkNonOwnerStateFile,
      },
    },
  ],
  webServer: useExternalServer
    ? undefined
    : [
        {
          name: "Read-only backend",
          command: "node tests/e2e/support/read-only-backend.mjs",
          url: `${READ_ONLY_BACKEND_ORIGIN}${READ_ONLY_BACKEND_READY_PATH}`,
          env: {
            E2E_BACKEND_API_KEY: READ_ONLY_BACKEND_API_KEY,
            HOMEAPP_OWNER_USER_ID: ownerUserId,
          },
          reuseExistingServer: false,
          timeout: 120_000,
          stdout: "ignore",
          stderr: "pipe",
          gracefulShutdown: { signal: "SIGTERM", timeout: 1_000 },
        },
        {
          name: "Homeapp",
          command: process.env.CI ? "npm run start" : "npm run dev",
          url: `${e2eBaseURL}/sign-in`,
          env: {
            BACKEND_API_URL: READ_ONLY_BACKEND_BASE_URL,
            BACKEND_API_KEY: READ_ONLY_BACKEND_API_KEY,
            HOMEAPP_OWNER_USER_ID: ownerUserId,
          },
          reuseExistingServer: false,
          timeout: 120_000,
        },
      ],
});
