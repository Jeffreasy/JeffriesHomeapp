import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const providersSource = readFileSync(resolve(process.cwd(), "app/providers.tsx"), "utf8");
const pwaSource = readFileSync(
  resolve(process.cwd(), "components/pwa/PwaRegistry.tsx"),
  "utf8",
);

test.describe("provider architecture", () => {
  test("creates a query client per authenticated identity without persistence", () => {
    expect(providersSource).toContain("new QueryClient");
    expect(providersSource).toMatch(/key=\{identity/);
    expect(providersSource).not.toMatch(/persistQueryClient|PersistQueryClientProvider|idb-keyval/);
  });

  test("keeps the service worker registry outside the identity-keyed provider tree", () => {
    const providersExport = providersSource.indexOf("export function Providers");
    const pwaRegistry = providersSource.lastIndexOf("<PwaRegistry");

    expect(providersExport).toBeGreaterThan(-1);
    expect(pwaRegistry).toBeGreaterThan(providersExport);
    expect(providersSource.slice(0, providersExport)).not.toContain("<PwaRegistry");
  });

  test("hydrates connectivity and service-worker state defensively", () => {
    expect(pwaSource).toContain("useState(false)");
    expect(pwaSource).toContain("setIsOffline(!window.navigator.onLine)");
    expect(pwaSource).toContain("const registerServiceWorker = async () => {");
    expect(pwaSource).toContain('await navigator.serviceWorker.register("/sw.js")');
    expect(pwaSource).toContain("if (cancelled || !nextRegistration) return;");
  });
});
