import { expect, test } from "@playwright/test";
import {
  fetchWithTimeout,
  isRequestTimeoutError,
  RequestTimeoutError,
} from "../../lib/request-timeout";

test("fetchWithTimeout converts its own deadline into a typed error", async () => {
  const stalledFetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    })) as typeof fetch;

  await expect(
    fetchWithTimeout("https://example.invalid", {}, 5, stalledFetch),
  ).rejects.toBeInstanceOf(RequestTimeoutError);
});

test("fetchWithTimeout preserves a caller abort instead of calling it a timeout", async () => {
  const controller = new AbortController();
  const stalledFetch = ((_input: RequestInfo | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    })) as typeof fetch;

  const request = fetchWithTimeout(
    "https://example.invalid",
    { signal: controller.signal },
    1_000,
    stalledFetch,
  );
  controller.abort(new Error("caller cancelled"));

  const error = await request.catch((reason: unknown) => reason);
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe("caller cancelled");
  expect(isRequestTimeoutError(error)).toBe(false);
});

test("a body-stream TimeoutError is recognized after response headers arrived", () => {
  expect(isRequestTimeoutError(new DOMException("signal timed out", "TimeoutError"))).toBe(true);
  expect(isRequestTimeoutError(new DOMException("caller aborted", "AbortError"))).toBe(false);
});
