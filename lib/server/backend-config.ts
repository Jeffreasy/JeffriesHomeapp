export type BackendEnvironment = {
  NODE_ENV?: string;
  BACKEND_API_URL?: string;
  BACKEND_API_KEY?: string;
  APP_SECRET_KEY?: string;
};

const LOCAL_BACKEND_API_URL = "http://127.0.0.1:8000/api/v1";
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

/** Resolve the proxy URL and credential as one fail-closed configuration unit. */
export function getBackendProxyConfig(env: BackendEnvironment = process.env) {
  return {
    baseUrl: getBackendBaseUrl(env),
    apiKey: getBackendApiKey(env),
  } as const;
}
