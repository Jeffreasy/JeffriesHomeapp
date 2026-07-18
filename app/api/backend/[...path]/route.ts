import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getBackendProxyConfig } from "@/lib/server/backend-config";
import {
  enforceOptionalOwnerJsonBody,
  enforceOwnerQuery,
  isJsonRequestContentType,
  shouldRejectProxyMutationBody,
} from "@/lib/server/proxy-owner";
import { isOwnerUserId } from "@/lib/server/owner-config";
import { fetchWithTimeout, isRequestTimeoutError } from "@/lib/request-timeout";
import {
  readBoundedResponseBody,
  ResponseTooLargeError,
} from "@/lib/server/bounded-response";
import { getErrorKind, getRequestId, logServerEvent } from "@/lib/server/telemetry";
import {
  readBoundedRequestBody,
  RequestBodyTimeoutError,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const ROUTE = "/api/backend/[...path]";
const RESPONSE_HEADER_ALLOWLIST = new Set([
  "content-disposition",
  "content-language",
  "content-type",
  "etag",
  "last-modified",
  "retry-after",
]);

function copyRequestHeaders(request: NextRequest, apiKey: string, requestId: string) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);
  if (apiKey) headers.set("X-API-Key", apiKey);
  headers.set("X-Request-ID", requestId);

  return headers;
}

function privateResponseHeaders(requestId: string, durationMs?: number) {
  const headers = new Headers({
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    Pragma: "no-cache",
    Vary: "Cookie",
    "X-Request-ID": requestId,
  });
  if (typeof durationMs === "number") {
    headers.set("Server-Timing", `backend;dur=${Math.max(0, Math.round(durationMs))}`);
  }
  return headers;
}

function copyResponseHeaders(upstream: Headers, requestId: string, durationMs: number) {
  const headers = privateResponseHeaders(requestId, durationMs);
  upstream.forEach((value, key) => {
    if (RESPONSE_HEADER_ALLOWLIST.has(key.toLowerCase())) headers.set(key, value);
  });
  return headers;
}

function jsonError(detail: string, status: number, requestId: string, code?: string) {
  return Response.json(
    { detail, requestId, ...(code ? { code } : {}) },
    { status, headers: privateResponseHeaders(requestId) },
  );
}

function operationName(path: string[]) {
  const candidate = path[0] ?? "root";
  return /^[a-z][a-z0-9-]{0,63}$/i.test(candidate) ? candidate : "other";
}

async function proxyBackend(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();
  const requestId = getRequestId();
  const params = await context.params;
  const pathSegments = params.path ?? [];
  const path = pathSegments.map(encodeURIComponent).join("/");
  const method = request.method.toUpperCase();
  const operation = operationName(pathSegments);

  logServerEvent({
    level: "info",
    message: "backend_proxy_started",
    route: ROUTE,
    requestId,
    method,
    operation,
  });

  const { userId } = await auth();
  if (!userId) {
    logServerEvent({
      level: "warn",
      message: "backend_proxy_unauthenticated",
      route: ROUTE,
      requestId,
      method,
      operation,
      status: 401,
      durationMs: Date.now() - startedAt,
    });
    return jsonError("Niet ingelogd.", 401, requestId, "UNAUTHORIZED");
  }
  if (!isOwnerUserId(userId)) {
    logServerEvent({
      level: "warn",
      message: "backend_proxy_forbidden",
      route: ROUTE,
      requestId,
      method,
      operation,
      status: 403,
      durationMs: Date.now() - startedAt,
    });
    return jsonError("Geen toegang.", 403, requestId, "FORBIDDEN");
  }

  let target: URL;
  let requestHeaders: Headers;
  let timeoutMs: number;
  try {
    const config = getBackendProxyConfig();
    target = new URL(`${config.baseUrl}/${path}`);
    requestHeaders = copyRequestHeaders(request, config.apiKey, requestId);
    timeoutMs = config.timeoutMs;
  } catch (error) {
    logServerEvent({
      level: "error",
      message: "backend_proxy_misconfigured",
      route: ROUTE,
      requestId,
      method,
      operation,
      status: 503,
      durationMs: Date.now() - startedAt,
      errorKind: getErrorKind(error),
    });
    return jsonError("Backend proxy is niet geconfigureerd.", 503, requestId);
  }

  target.search = request.nextUrl.search;
  enforceOwnerQuery(target.searchParams, userId);

  const init: RequestInit = {
    method,
    headers: requestHeaders,
    cache: "no-store",
    signal: request.signal,
    redirect: "error",
  };

  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type") ?? "";
    try {
      const body = await readBoundedRequestBody(request);
      if (isJsonRequestContentType(contentType)) {
        const rawBody = new TextDecoder("utf-8", { fatal: true }).decode(body);
        const ownedBody = enforceOptionalOwnerJsonBody(rawBody, userId);
        if (ownedBody !== undefined) init.body = ownedBody;
      } else if (shouldRejectProxyMutationBody(contentType, body.byteLength)) {
        return jsonError("Alleen JSON-bodies worden door deze proxy ondersteund.", 415, requestId);
      }
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return jsonError(
          "Requestbody overschrijdt de veilige limiet.",
          413,
          requestId,
          "REQUEST_BODY_TOO_LARGE",
        );
      }
      if (error instanceof RequestBodyTimeoutError) {
        return jsonError("Requestbody kwam niet op tijd binnen.", 408, requestId, "REQUEST_TIMEOUT");
      }
      return jsonError("Ongeldige JSON-body.", 400, requestId);
    }
  }

  try {
    const response = await fetchWithTimeout(target, init, timeoutMs);

    // Clerk auth already succeeded. An upstream 401 therefore means the
    // server-to-server credential failed and must never start a re-login loop.
    if (response.status === 401) {
      if (response.body) await response.body.cancel().catch(() => {});
      logServerEvent({
        level: "error",
        message: "backend_proxy_upstream_auth_failed",
        route: ROUTE,
        requestId,
        method,
        operation,
        status: 502,
        durationMs: Date.now() - startedAt,
      });
      return jsonError(
        "Backend proxy kon de API niet veilig authenticeren.",
        502,
        requestId,
        "BACKEND_AUTH_FAILED",
      );
    }

    // Buffer inside the same hard deadline. This prevents a header-only 200
    // from hiding a stalled or unbounded response stream.
    const body = await readBoundedResponseBody(response);
    const durationMs = Date.now() - startedAt;
    logServerEvent({
      level: response.ok ? "info" : "warn",
      message: "backend_proxy_completed",
      route: ROUTE,
      requestId,
      method,
      operation,
      status: response.status,
      durationMs,
    });
    return new Response(body, {
      status: response.status,
      statusText: response.statusText,
      headers: copyResponseHeaders(response.headers, requestId, durationMs),
    });
  } catch (error) {
    const timedOut = isRequestTimeoutError(error);
    const tooLarge = error instanceof ResponseTooLargeError;
    const status = timedOut ? 504 : 502;
    logServerEvent({
      level: "error",
      message: timedOut
        ? "backend_proxy_timed_out"
        : tooLarge
          ? "backend_proxy_response_too_large"
          : "backend_proxy_failed",
      route: ROUTE,
      requestId,
      method,
      operation,
      status,
      durationMs: Date.now() - startedAt,
      errorKind: getErrorKind(error),
    });
    return jsonError(
      timedOut
        ? "Backend reageerde niet op tijd."
        : tooLarge
          ? "Backendantwoord overschrijdt de veilige limiet."
          : "Backend proxy kon de API niet bereiken.",
      status,
      requestId,
      tooLarge ? "BACKEND_RESPONSE_TOO_LARGE" : undefined,
    );
  }
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: privateResponseHeaders(getRequestId()),
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyBackend(request, context);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return proxyBackend(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyBackend(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyBackend(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyBackend(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyBackend(request, context);
}
