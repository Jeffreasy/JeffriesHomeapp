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

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);


function copyRequestHeaders(request: NextRequest, apiKey: string) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);

  if (apiKey) headers.set("X-API-Key", apiKey);

  return headers;
}

function copyResponseHeaders(headers: Headers) {
  const nextHeaders = new Headers();
  headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      nextHeaders.set(key, value);
    }
  });
  return nextHeaders;
}

async function proxyBackend(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const path = (params.path ?? []).map(encodeURIComponent).join("/");

  // Require an authenticated Clerk session for every backend call (defense in
  // depth on top of the Clerk middleware), and derive the user identity
  // server-side. The client may never choose its own userId.
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ detail: "Niet ingelogd." }, { status: 401 });
  }
  // Defense in depth: only the single owner may reach the backend, regardless of
  // who managed to obtain a valid Clerk session.
  if (!isOwnerUserId(userId)) {
    return Response.json({ detail: "Geen toegang." }, { status: 403 });
  }

  let target: URL;
  let requestHeaders: Headers;
  try {
    const { baseUrl, apiKey } = getBackendProxyConfig();
    target = new URL(`${baseUrl}/${path}`);
    requestHeaders = copyRequestHeaders(request, apiKey);
  } catch {
    return Response.json({ detail: "Backend proxy is niet geconfigureerd." }, { status: 503 });
  }
  target.search = request.nextUrl.search;
  // Override/strip any client-supplied userId with the session userId.
  enforceOwnerQuery(target.searchParams, userId);

  const method = request.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers: requestHeaders,
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type") ?? "";
    if (isJsonRequestContentType(contentType)) {
      try {
        const ownedBody = enforceOptionalOwnerJsonBody(await request.text(), userId);
        if (ownedBody !== undefined) init.body = ownedBody;
      } catch {
        return Response.json({ detail: "Ongeldige JSON-body." }, { status: 400 });
      }
    } else {
      const body = await request.arrayBuffer();
      // This proxy currently has no binary/form mutation contract. Reject any
      // non-empty non-JSON body so identity fields can never bypass rewriting.
      if (shouldRejectProxyMutationBody(contentType, body.byteLength)) {
        return Response.json(
          { detail: "Alleen JSON-bodies worden door deze proxy ondersteund." },
          { status: 415 },
        );
      }
    }
  }

  try {
    const response = await fetch(target, init);
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: copyResponseHeaders(response.headers),
    });
  } catch {
    return Response.json({ detail: "Backend proxy kon de API niet bereiken." }, { status: 502 });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204 });
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
