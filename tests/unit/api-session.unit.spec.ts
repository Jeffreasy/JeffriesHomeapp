import { expect, test } from "@playwright/test";
import {
  ApiError,
  apiFetchWithStatus,
  registerSessionExpiredHandler,
} from "../../lib/api";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("only a coded Homeapp 401 activates and replays one-shot session recovery", async () => {
  const originalFetch = globalThis.fetch;
  let sessionExpiredEvents = 0;
  let unregister = () => {};

  try {
    globalThis.fetch = async () =>
      jsonResponse(401, {
        detail: "Backend auth failed.",
        code: "BACKEND_AUTH_FAILED",
      });

    await expect(apiFetchWithStatus("/health")).rejects.toMatchObject({
      status: 401,
      body: { code: "BACKEND_AUTH_FAILED" },
    } satisfies Partial<ApiError>);

    globalThis.fetch = async () =>
      jsonResponse(401, {
        detail: "Niet ingelogd.",
        code: "UNAUTHORIZED",
      });

    // The 401 may beat the provider effect during hydration.
    await expect(apiFetchWithStatus("/health")).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<ApiError>);
    expect(sessionExpiredEvents).toBe(0);

    unregister = registerSessionExpiredHandler(() => {
      sessionExpiredEvents += 1;
    });
    expect(sessionExpiredEvents).toBe(1);

    await expect(apiFetchWithStatus("/health")).rejects.toMatchObject({
      status: 401,
    } satisfies Partial<ApiError>);
    expect(sessionExpiredEvents).toBe(1);
  } finally {
    unregister();
    globalThis.fetch = originalFetch;
  }
});
