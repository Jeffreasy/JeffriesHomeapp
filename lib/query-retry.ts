export const TRANSIENT_QUERY_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

type StatusError = Error & { status?: number };

/** Queries retry only transport failures and explicitly transient HTTP responses. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof TypeError) return true;

  const status = (error as StatusError | null)?.status;
  return typeof status === "number" && TRANSIENT_QUERY_STATUSES.has(status);
}

export function queryRetryDelay(attemptIndex: number): number {
  return Math.min(500 * 2 ** attemptIndex, 4_000);
}
