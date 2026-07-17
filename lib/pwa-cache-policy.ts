export type RuntimeRequestShape = {
  sameOrigin: boolean;
  pathname: string;
  mode: string;
  destination: string;
  hasRscQuery: boolean;
  isRscRequest: boolean;
};

/** Private JSON, HTML and RSC payloads must never enter runtime Cache Storage. */
export function mustUseNetworkOnly(request: RuntimeRequestShape): boolean {
  if (!request.sameOrigin) return false;
  return (
    request.pathname.startsWith("/api/") ||
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.hasRscQuery ||
    request.isRscRequest
  );
}
