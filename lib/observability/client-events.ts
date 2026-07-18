export const CLIENT_ERROR_BOUNDARIES = ["route", "global", "component", "pwa"] as const;

export type ClientErrorBoundary = (typeof CLIENT_ERROR_BOUNDARIES)[number];

export type ClientErrorEvent = {
  kind: "client_error";
  boundary: ClientErrorBoundary;
  errorName: ClientErrorName;
  digest?: string;
  buildId?: string;
};

const CLIENT_ERROR_NAMES = [
  "Error",
  "TypeError",
  "ReferenceError",
  "RangeError",
  "SyntaxError",
  "AbortError",
  "TimeoutError",
  "ChunkLoadError",
] as const;

type ClientErrorName = (typeof CLIENT_ERROR_NAMES)[number];

const reportedEvents = new Set<string>();
const MAX_DEDUPE_KEYS = 128;

function safeErrorName(value: unknown): ClientErrorName {
  return typeof value === "string" &&
    CLIENT_ERROR_NAMES.includes(value as ClientErrorName)
    ? (value as ClientErrorName)
    : "Error";
}

function safeDigest(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{6,64}$/i.test(value)
    ? value
    : undefined;
}

function safeBuildId(value: unknown) {
  return typeof value === "string" && /^(?:[0-9a-f]{7,64}|[0-9]{10,16})$/i.test(value)
    ? value
    : undefined;
}

export function createClientErrorEvent(
  error: unknown,
  boundary: ClientErrorBoundary,
  digest?: string,
): ClientErrorEvent {
  const errorName = safeErrorName(error instanceof Error ? error.name : undefined);
  const safeErrorDigest = safeDigest(digest);
  const buildId = safeBuildId(process.env.NEXT_PUBLIC_BUILD_ID);

  return {
    kind: "client_error",
    boundary,
    errorName,
    ...(safeErrorDigest ? { digest: safeErrorDigest } : {}),
    ...(buildId ? { buildId } : {}),
  };
}

export function sanitizeClientErrorEvent(value: unknown): ClientErrorEvent | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.kind !== "client_error") return null;
  if (!CLIENT_ERROR_BOUNDARIES.includes(candidate.boundary as ClientErrorBoundary)) return null;

  const digest = safeDigest(candidate.digest);
  const buildId = safeBuildId(candidate.buildId);

  return {
    kind: "client_error",
    boundary: candidate.boundary as ClientErrorBoundary,
    errorName: safeErrorName(candidate.errorName),
    ...(digest ? { digest } : {}),
    ...(buildId ? { buildId } : {}),
  };
}

export function reportClientError(
  error: unknown,
  boundary: ClientErrorBoundary,
  digest?: string,
) {
  if (typeof window === "undefined") return;
  const event = createClientErrorEvent(error, boundary, digest);
  const dedupeKey = [event.buildId ?? "build", event.boundary, event.errorName, event.digest ?? "digest"].join(":");
  if (reportedEvents.has(dedupeKey)) return;
  if (reportedEvents.size >= MAX_DEDUPE_KEYS) reportedEvents.clear();
  reportedEvents.add(dedupeKey);

  const body = JSON.stringify(event);
  const endpoint = "/api/telemetry/client";

  if (
    navigator.sendBeacon?.(
      endpoint,
      new Blob([body], { type: "application/json" }),
    )
  ) {
    return;
  }

  void fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    cache: "no-store",
    keepalive: true,
  }).catch(() => {});
}
