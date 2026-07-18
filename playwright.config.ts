import { defineConfig, devices } from "@playwright/test";
import {
  clerkNonOwnerStateFile,
  clerkOwnerStateFile,
} from "./tests/e2e/support/clerk-state";

const e2eBaseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const useExternalServer = process.env.E2E_EXTERNAL_SERVER === "1";
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
    : {
        command: process.env.CI ? "npm run start" : "npm run dev",
        url: `${e2eBaseURL}/sign-in`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
