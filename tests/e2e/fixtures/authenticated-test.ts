import {
  expect,
  test as base,
  type Page,
  type Request,
  type Route,
} from "@playwright/test";

type SafeErrorType =
  | "Error"
  | "TypeError"
  | "ReferenceError"
  | "RangeError"
  | "SyntaxError";

type RuntimeIssue =
  | { kind: "application-console" }
  | { kind: "page-error"; errorType: SafeErrorType }
  | { kind: "first-party-5xx"; method: string; status: number; resourceType: string }
  | { kind: "first-party-request-failed"; method: string; resourceType: string }
  | { kind: "backend-read-settle-timeout" }
  | { kind: "backend-mutation-blocked"; method: string };

type AuthenticatedFixtures = {
  waitForReadOnlyPage: () => Promise<void>;
};

const pendingBackendRequestsByPage = new WeakMap<Page, Set<Request>>();

if (process.env.E2E_EXTERNAL_SERVER === "1") {
  throw new Error(
    "Authenticated E2E requires Playwright's managed read-only backend.",
  );
}

async function guardReadOnlyBackendRequest(route: Route, issues: RuntimeIssue[]) {
  const method = route.request().method().toUpperCase();

  if (method === "OPTIONS") {
    await route.fulfill({ status: 204, body: "" });
    return;
  }

  if (method === "GET" || method === "HEAD") {
    await route.continue();
    return;
  }

  issues.push({ kind: "backend-mutation-blocked", method });
  await route.fulfill({
    status: 405,
    contentType: "application/json",
    body: JSON.stringify({ detail: "Read-only E2E blocked a backend mutation." }),
  });
}

function safeErrorType(name: string): SafeErrorType {
  if (
    name === "TypeError" ||
    name === "ReferenceError" ||
    name === "RangeError" ||
    name === "SyntaxError"
  ) {
    return name;
  }
  return "Error";
}
function isReadOnlyBackendRequest(request: Request, firstPartyOrigin: string): boolean {
  const method = request.method().toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;

  try {
    const url = new URL(request.url());
    return url.origin === firstPartyOrigin && url.pathname.startsWith("/api/backend/");
  } catch {
    return false;
  }
}

async function waitForBackendRequestsToSettle(
  pendingRequests: ReadonlySet<Request>,
  timeoutMs = 5_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  let quietSince = pendingRequests.size === 0 ? Date.now() : 0;

  while (Date.now() < deadline) {
    if (pendingRequests.size === 0) {
      if (quietSince === 0) quietSince = Date.now();
      if (Date.now() - quietSince >= 100) return true;
    } else {
      quietSince = 0;
    }

    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return false;
}

export const test = base.extend<AuthenticatedFixtures>({
  page: async ({ page }, providePage, testInfo) => {
    const issues: RuntimeIssue[] = [];
    const firstPartyOrigin = new URL(
      process.env.E2E_BASE_URL ?? "http://localhost:3000",
    ).origin;
    const pendingBackendRequests = new Set<Request>();
    pendingBackendRequestsByPage.set(page, pendingBackendRequests);

    await page.route("**/api/backend/**", (route) =>
      guardReadOnlyBackendRequest(route, issues),
    );

    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const location = message.location().url;
      if (location) {
        try {
          if (new URL(location).origin !== firstPartyOrigin) return;
        } catch {
          return;
        }
      }
      issues.push({ kind: "application-console" });
    });

    page.on("pageerror", (error) => {
      issues.push({ kind: "page-error", errorType: safeErrorType(error.name) });
    });

    page.on("request", (request) => {
      if (isReadOnlyBackendRequest(request, firstPartyOrigin)) {
        pendingBackendRequests.add(request);
      }
    });

    page.on("requestfinished", (request) => {
      pendingBackendRequests.delete(request);
    });

    page.on("response", (response) => {
      if (response.status() < 500) return;
      try {
        if (new URL(response.url()).origin !== firstPartyOrigin) return;
      } catch {
        return;
      }
      issues.push({
        kind: "first-party-5xx",
        method: response.request().method(),
        status: response.status(),
        resourceType: response.request().resourceType(),
      });
    });

    page.on("requestfailed", (request) => {
      pendingBackendRequests.delete(request);
      try {
        if (new URL(request.url()).origin !== firstPartyOrigin) return;
      } catch {
        return;
      }
      if (request.failure()?.errorText.includes("ERR_ABORTED")) return;
      issues.push({
        kind: "first-party-request-failed",
        method: request.method(),
        resourceType: request.resourceType(),
      });
    });

    await providePage(page);

    if (!(await waitForBackendRequestsToSettle(pendingBackendRequests))) {
      issues.push({ kind: "backend-read-settle-timeout" });
    }
    if (issues.length > 0 || testInfo.status !== testInfo.expectedStatus) {
      await testInfo.attach("sanitized-runtime-evidence", {
        body: Buffer.from(
          JSON.stringify({ schemaVersion: 1, issueCount: issues.length, issues }),
          "utf8",
        ),
        contentType: "application/json",
      });
    }

    expect(
      issues,
      "Authenticated E2E must stay read-only and free of first-party runtime errors.",
    ).toEqual([]);
  },
  waitForReadOnlyPage: async ({ page }, provideWaiter) => {
    await provideWaiter(async () => {
      const pendingRequests = pendingBackendRequestsByPage.get(page);
      if (!pendingRequests) {
        throw new Error("Authenticated runtime guard is not initialized.");
      }
      if (!(await waitForBackendRequestsToSettle(pendingRequests))) {
        throw new Error("Read-only backend requests did not settle before assertion.");
      }
    });
  },
});

export { expect };
