"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import { privacyApi } from "@/lib/api";
import { resolvePrivacyHidden } from "@/lib/privacy";

const STORAGE_KEY = "jeffries-privacy-mode";
const STORAGE_EVENT = "jeffries-privacy-mode-change";
type PrivacyScope = "finance" | "habits" | "notes" | "email" | "account";

export { STORAGE_EVENT as PRIVACY_STORAGE_EVENT };

/**
 * Shared react-query key for the server privacy settings (M23). The settings
 * page and every usePrivacy() consumer read the SAME cache entry, so an
 * invalidation after a settings save propagates to all mounted pages.
 */
export function privacyQueryKey(userId: string) {
  return ["privacy-settings", userId || undefined] as const;
}

/** Notify all mounted usePrivacy() hooks (same tab) that privacy state changed. */
export function notifyPrivacyChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

/**
 * Clear the local eye-toggle override for a scope (M23). Called when the
 * SERVER value for that scope is changed via Settings — otherwise a stale
 * localStorage override would keep shadowing the new server value forever.
 */
export function clearPrivacyOverride(scope: PrivacyScope) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(`${STORAGE_KEY}:${scope}`);
  } catch {}
  notifyPrivacyChange();
}

function readOverride(key: string): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {}
  return null;
}

function subscribeToPrivacyChanges(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const handleStorage = (event: StorageEvent) => {
    if (!event.key || event.key.startsWith(STORAGE_KEY)) callback();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

/**
 * Global privacy toggle — hides sensitive financial values.
 * Persisted in localStorage so it survives page reloads.
 * Server-side settings are fetched via react-query on the shared
 * `privacyQueryKey`, so a change saved on the settings page immediately
 * reaches every mounted consumer (M23).
 */
export function usePrivacy(scope?: PrivacyScope) {
  const { user, isLoaded: isUserLoaded } = useUser();
  const userId = user?.id ?? "";

  const {
    data: settings,
    isError: isServerError,
    isPending: isSettingsPending,
    error: serverError,
  } = useQuery({
    queryKey: privacyQueryKey(userId),
    queryFn: () => privacyApi.get(userId),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (isServerError) {
      // Masking remains active; keep the failure visible for diagnostics
      // without exposing sensitive data.
      console.warn("Privacy-instellingen ophalen mislukt; waarden blijven afgeschermd.", serverError);
    }
  }, [isServerError, serverError]);

  const scopedKey = scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY;
  const localOverride = useSyncExternalStore(
    subscribeToPrivacyChanges,
    () => readOverride(scopedKey),
    () => null
  );
  // Keep sensitive values masked until identity and the persisted preference
  // are both known. Startup latency and endpoint failures must never reveal
  // information that may be configured as private.
  const isServerUnknown =
    !isUserLoaded || (Boolean(userId) && (isSettingsPending || isServerError));
  const remoteHidden = scope ? (settings?.[scope] ?? false) : false;
  const hidden = resolvePrivacyHidden({
    isServerUnknown,
    localOverride,
    remoteHidden,
  });

  const toggle = useCallback(() => {
    if (isServerUnknown) return;
    const current = readOverride(scopedKey) ?? remoteHidden;
    try {
      window.localStorage.setItem(scopedKey, String(!current));
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch {}
  }, [isServerUnknown, remoteHidden, scopedKey]);

  /** Mask a value when privacy mode is on */
  const mask = useCallback(
    (value: string) => (hidden ? "••••" : value),
    [hidden]
  );

  return { hidden, toggle, mask, isServerUnknown };
}
