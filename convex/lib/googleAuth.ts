"use node";

/**
 * convex/lib/googleAuth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gedeelde Google OAuth2 client factory voor alle Convex Actions die de
 * Google Calendar API gebruiken.
 *
 * Gebruik: import { createOAuthClient } from "../lib/googleAuth";
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { google } from "googleapis";

export function createOAuthClient() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Google OAuth credentials ontbreken: " +
      "GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET en GOOGLE_REFRESH_TOKEN moeten in Convex env vars staan."
    );
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });
  return auth;
}
