const PUBLIC_ROUTE_PREFIXES = ["/sign-in", "/access-denied"] as const;
const API_ROUTE_PREFIXES = ["/api", "/trpc"] as const;
const NON_RETURNABLE_ROUTE_PREFIXES = [...PUBLIC_ROUTE_PREFIXES, "/sign-up"] as const;

type ResourceKind = "api" | "page";

export type OwnerAccessDecision =
  | { outcome: "allow"; reason: "owner" | "public" }
  | { outcome: "unauthenticated"; resource: ResourceKind }
  | { outcome: "forbidden"; resource: ResourceKind };

function matchesRoutePrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicAccessPath(pathname: string): boolean {
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix));
}

export function isApiAccessPath(pathname: string): boolean {
  return API_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathname, prefix));
}

/**
 * Resolve access without coupling the policy to Clerk, Next.js or process.env.
 * The caller owns identity verification and passes a fail-closed owner result.
 */
export function decideOwnerAccess({
  pathname,
  userId,
  isOwner,
}: {
  pathname: string;
  userId: string | null | undefined;
  isOwner: boolean;
}): OwnerAccessDecision {
  if (isPublicAccessPath(pathname)) {
    return { outcome: "allow", reason: "public" };
  }

  const resource = isApiAccessPath(pathname) ? "api" : "page";
  if (!userId) return { outcome: "unauthenticated", resource };
  if (!isOwner) return { outcome: "forbidden", resource };
  return { outcome: "allow", reason: "owner" };
}

/** Keep post-login navigation same-origin and omit query/hash data. */
export function getSafePageReturnPath(pathname: string): string {
  const pathOnly = pathname.split(/[?#]/, 1)[0]?.trim() ?? "";
  if (
    !pathOnly.startsWith("/") ||
    pathOnly.startsWith("//") ||
    pathOnly.includes("\\") ||
    NON_RETURNABLE_ROUTE_PREFIXES.some((prefix) => matchesRoutePrefix(pathOnly, prefix))
  ) {
    return "/";
  }
  return pathOnly || "/";
}
