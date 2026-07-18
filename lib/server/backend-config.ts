export type BackendEnvironment = {
  NODE_ENV?: string;
  BACKEND_API_URL?: string;
  BACKEND_API_KEY?: string;
  APP_SECRET_KEY?: string;
  BACKEND_PROXY_TIMEOUT_MS?: string;
};

const LOCAL_BACKEND_API_URL = "http://127.0.0.1:8000/api/v1";
const DEFAULT_BACKEND_PROXY_TIMEOUT_MS = 25_000;
const MIN_BACKEND_PROXY_TIMEOUT_MS = 1_000;
const MAX_BACKEND_PROXY_TIMEOUT_MS = 60_000;
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function normalizeBackendUrl(configured: string, environment: string | undefined): string {
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("BACKEND_API_URL moet een geldige absolute URL zijn.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("BACKEND_API_URL moet http of https gebruiken.");
  }
  if (url.username || url.password) {
    throw new Error("BACKEND_API_URL mag geen credentials bevatten.");
  }
  if (url.hash) {
    throw new Error("BACKEND_API_URL mag geen fragment bevatten.");
  }
  if (url.search) {
    throw new Error("BACKEND_API_URL mag geen queryparameters bevatten.");
  }
  if (
    environment === "production" &&
    url.protocol !== "https:" &&
    !LOOPBACK_HOSTS.has(url.hostname)
  ) {
    throw new Error("BACKEND_API_URL moet in production https gebruiken.");
  }

  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\/$/, "");
}

export function getBackendBaseUrl(env: BackendEnvironment = process.env): string {
  const configured = env.BACKEND_API_URL?.trim();
  if (configured) return normalizeBackendUrl(configured, env.NODE_ENV);
  if (env.NODE_ENV === "production") {
    throw new Error("BACKEND_API_URL is verplicht in production.");
  }
  return LOCAL_BACKEND_API_URL;
}

export function getBackendApiKey(env: BackendEnvironment = process.env): string {
  const apiKey = env.BACKEND_API_KEY?.trim() || env.APP_SECRET_KEY?.trim();
  if (apiKey) return apiKey;
  if (env.NODE_ENV === "production") {
    throw new Error("BACKEND_API_KEY of APP_SECRET_KEY is verplicht in production.");
  }
  return "";
}

export function getBackendProxyTimeoutMs(env: BackendEnvironment = process.env): number {
  const configured = env.BACKEND_PROXY_TIMEOUT_MS?.trim();
  if (!configured) return DEFAULT_BACKEND_PROXY_TIMEOUT_MS;

  const parsed = Number(configured);
  if (!Number.isFinite(parsed)) {
    throw new Error("BACKEND_PROXY_TIMEOUT_MS moet een getal zijn.");
  }

  return Math.min(
    MAX_BACKEND_PROXY_TIMEOUT_MS,
    Math.max(MIN_BACKEND_PROXY_TIMEOUT_MS, Math.floor(parsed)),
  );
}

/** Resolve all proxy configuration as one fail-closed unit. */
export function getBackendProxyConfig(env: BackendEnvironment = process.env) {
  return {
    baseUrl: getBackendBaseUrl(env),
    apiKey: getBackendApiKey(env),
    timeoutMs: getBackendProxyTimeoutMs(env),
  } as const;
}
