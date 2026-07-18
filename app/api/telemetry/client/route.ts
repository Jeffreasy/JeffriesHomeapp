import { auth } from "@clerk/nextjs/server";
import { isOwnerUserId } from "@/lib/server/owner-config";
import { sanitizeClientErrorEvent } from "@/lib/observability/client-events";
import { getRequestId, logServerEvent } from "@/lib/server/telemetry";
import {
  readBoundedRequestBody,
  RequestBodyTimeoutError,
  RequestBodyTooLargeError,
} from "@/lib/server/bounded-request";
import {
  correlateClientDigest,
  getServerBuildId,
} from "@/lib/server/client-error-correlation";

const MAX_EVENT_BYTES = 4_096;
const MAX_EVENTS_PER_WINDOW = 20;
const RATE_WINDOW_MS = 60_000;

let rateWindowStartedAt = 0;
let rateWindowEvents = 0;

function consumeRateLimit(now = Date.now()) {
  if (now - rateWindowStartedAt >= RATE_WINDOW_MS) {
    rateWindowStartedAt = now;
    rateWindowEvents = 0;
  }
  if (rateWindowEvents >= MAX_EVENTS_PER_WINDOW) return false;
  rateWindowEvents += 1;
  return true;
}

function response(status: number, requestId: string) {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      "X-Request-ID": requestId,
      ...(status === 429 ? { "Retry-After": "60" } : {}),
    },
  });
}

export async function POST(request: Request) {
  const requestId = getRequestId();
  const { userId } = await auth();
  if (!userId) return response(401, requestId);
  if (!isOwnerUserId(userId)) return response(403, requestId);

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) return response(415, requestId);

  let raw: string;
  try {
    const body = await readBoundedRequestBody(request, MAX_EVENT_BYTES, 5_000);
    raw = new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return response(413, requestId);
    if (error instanceof RequestBodyTimeoutError) return response(408, requestId);
    return response(400, requestId);
  }

  let event;
  try {
    event = sanitizeClientErrorEvent(JSON.parse(raw));
  } catch {
    return response(400, requestId);
  }
  if (!event) return response(422, requestId);
  if (!consumeRateLimit()) return response(429, requestId);

  logServerEvent({
    level: "error",
    message: "client_error_reported",
    route: "/api/telemetry/client",
    requestId,
    operation: event.boundary,
    status: 202,
    errorKind: event.errorName,
    errorDigest: correlateClientDigest(event.digest),
    buildId: getServerBuildId(),
  });
  return response(202, requestId);
}
