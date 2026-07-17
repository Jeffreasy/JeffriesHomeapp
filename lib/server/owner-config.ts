export type OwnerEnvironment = {
  NODE_ENV?: string;
  HOMEAPP_OWNER_USER_ID?: string;
};

// Local fallback for the single known owner. Production must configure the
// value explicitly so a copied deployment cannot silently inherit access.
const LOCAL_OWNER_USER_ID = "user_3Ax561ZvuSkGtWpKFooeY65HNtY";

export function getOwnerUserId(env: OwnerEnvironment = process.env): string {
  const configured = env.HOMEAPP_OWNER_USER_ID?.trim();
  if (configured) return configured;
  if (env.NODE_ENV === "production") {
    throw new Error("HOMEAPP_OWNER_USER_ID is verplicht in production.");
  }
  return LOCAL_OWNER_USER_ID;
}

/** Central fail-closed owner check for server-only routes and pages. */
export function isOwnerUserId(
  userId: string | null | undefined,
  env: OwnerEnvironment = process.env,
): boolean {
  if (!userId) return false;
  try {
    return userId === getOwnerUserId(env);
  } catch {
    return false;
  }
}