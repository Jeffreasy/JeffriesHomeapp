import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

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

const DEFAULT_BACKEND_API_URL = "https://jeffriesbackend.onrender.com/api/v1";

function backendBaseUrl() {
  return (process.env.BACKEND_API_URL ?? DEFAULT_BACKEND_API_URL).replace(/\/+$/, "");
}

function backendApiKey() {
  // Server-only names only. Never read NEXT_PUBLIC_* here — those are inlined
  // into the client bundle and would publish the backend secret to every browser.
  return process.env.BACKEND_API_KEY ?? process.env.APP_SECRET_KEY ?? "";
}

function copyRequestHeaders(request: NextRequest) {
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");

  if (contentType) headers.set("content-type", contentType);
  if (accept) headers.set("accept", accept);

  const apiKey = backendApiKey();
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

  const target = new URL(`${backendBaseUrl()}/${path}`);
  target.search = request.nextUrl.search;
  // Override/strip any client-supplied userId with the session userId.
  target.searchParams.set("userId", userId);

  const method = request.method.toUpperCase();
  const init: RequestInit = {
    method,
    headers: copyRequestHeaders(request),
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.arrayBuffer();
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
