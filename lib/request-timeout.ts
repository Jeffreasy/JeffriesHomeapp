export class RequestTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "RequestTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

type FetchImplementation = typeof fetch;

/** Match both our typed connection timeout and a later AbortSignal.timeout body abort. */
export function isRequestTimeoutError(error: unknown): boolean {
  return (
    error instanceof RequestTimeoutError ||
    (error instanceof Error && error.name === "TimeoutError")
  );
}

/**
 * Apply a hard deadline without discarding a caller-provided abort signal.
 * The timeout signal remains attached to the response body, so callers must
 * consume the body inside their try/catch to classify a stalled stream.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 30_000,
  fetchImplementation: FetchImplementation = fetch,
) {
  const boundedTimeoutMs = Math.max(1, Math.floor(timeoutMs));
  const timeoutSignal = AbortSignal.timeout(boundedTimeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, timeoutSignal])
    : timeoutSignal;

  try {
    return await fetchImplementation(input, { ...init, signal });
  } catch (error) {
    if (timeoutSignal.aborted && !init.signal?.aborted) {
      throw new RequestTimeoutError(boundedTimeoutMs);
    }
    throw error;
  }
}
