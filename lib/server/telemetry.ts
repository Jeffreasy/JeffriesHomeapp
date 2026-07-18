const SERVER_EVENT_NAMES = new Set([
  "backend_proxy_started",
  "backend_proxy_unauthenticated",
  "backend_proxy_forbidden",
  "backend_proxy_misconfigured",
  "backend_proxy_upstream_auth_failed",
  "backend_proxy_completed",
  "backend_proxy_timed_out",
  "backend_proxy_response_too_large",
  "backend_proxy_failed",
  "client_error_reported",
]);

const SERVER_OPERATIONS = new Set([
  "ai",
  "automations",
  "contacts",
  "devices",
  "emails",
  "focus",
  "habits",
  "health",
  "laventecare",
  "loonstroken",
  "notes",
  "personal-events",
  "privacy",
  "rooms",
  "salary",
  "scenes",
  "schedule",
  "settings",
  "sync",
  "system",
  "transactions",
  "route",
  "global",
  "component",
  "pwa",
  "other",
]);

const ERROR_KINDS = new Set([
  "Error",
  "TypeError",
  "ReferenceError",
  "RangeError",
  "SyntaxError",
  "AbortError",
  "TimeoutError",
  "RequestTimeoutError",
  "ChunkLoadError",
  "ResponseTooLargeError",
  "OtherError",
]);

type ServerEvent = {
  level: "info" | "warn" | "error";
  message: string;
  route: string;
  requestId: string;
  method?: string;
  operation?: string;
  status?: number;
  durationMs?: number;
  errorKind?: string;
  errorDigest?: string;
  buildId?: string;
};

function safeDigest(value: string | null | undefined) {
  return value && /^[0-9a-f]{6,64}$/i.test(value) ? value : null;
}

function safeBuildId(value: string | null | undefined) {
  return value && /^(?:[0-9a-f]{7,64}|[0-9]{10,16})$/i.test(value) ? value : null;
}

function safeErrorKind(value: string | undefined) {
  return value && ERROR_KINDS.has(value) ? value : "OtherError";
}

export function getRequestId(): string {
  // Incoming headers are client-controllable and may contain a syntactically
  // valid user/customer identifier. Generate the trust-boundary ID here.
  return crypto.randomUUID();
}

export function getErrorKind(error: unknown): string {
  return error instanceof Error ? safeErrorKind(error.name) : "OtherError";
}

/** Emit a fixed semantic schema; URLs, bodies, identities and raw errors are forbidden. */
export function logServerEvent(event: ServerEvent) {
  const message = SERVER_EVENT_NAMES.has(event.message) ? event.message : "backend_proxy_failed";
  const operation = event.operation
    ? SERVER_OPERATIONS.has(event.operation)
      ? event.operation
      : "other"
    : undefined;
  const errorKind = event.errorKind ? safeErrorKind(event.errorKind) : undefined;
  const errorDigest = safeDigest(event.errorDigest);
  const buildId = safeBuildId(event.buildId);

  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level: event.level,
    message,
    route:
      event.route === "/api/telemetry/client"
        ? "/api/telemetry/client"
        : "/api/backend/[...path]",
    requestId: event.requestId,
    ...(event.method && ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(event.method)
      ? { method: event.method }
      : {}),
    ...(operation ? { operation } : {}),
    ...(typeof event.status === "number" ? { status: event.status } : {}),
    ...(typeof event.durationMs === "number"
      ? { durationMs: Math.max(0, Math.round(event.durationMs)) }
      : {}),
    ...(errorKind ? { errorKind } : {}),
    ...(errorDigest ? { errorDigest } : {}),
    ...(buildId ? { buildId } : {}),
  });

  if (event.level === "error") console.error(payload);
  else if (event.level === "warn") console.warn(payload);
  else console.info(payload);
}
