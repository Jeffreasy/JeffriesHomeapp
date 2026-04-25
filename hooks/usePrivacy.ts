"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const STORAGE_KEY = "jeffries-privacy-mode";
const STORAGE_EVENT = "jeffries-privacy-mode-change";
type PrivacyScope = "finance" | "habits" | "notes" | "email" | "account";

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
 */
export function usePrivacy(scope?: PrivacyScope) {
  const settings = useQuery(api.privacySettings.getForUser);
  const scopedKey = scope ? `${STORAGE_KEY}:${scope}` : STORAGE_KEY;
  const localOverride = useSyncExternalStore(
    subscribeToPrivacyChanges,
    () => readOverride(scopedKey),
    () => null
  );
  const remoteHidden = scope ? (settings?.[scope] ?? false) : false;
  const hidden = localOverride ?? remoteHidden;

  const toggle = useCallback(() => {
    const current = readOverride(scopedKey) ?? remoteHidden;
    try {
      window.localStorage.setItem(scopedKey, String(!current));
      window.dispatchEvent(new Event(STORAGE_EVENT));
    } catch {}
  }, [remoteHidden, scopedKey]);

  /** Mask a value when privacy mode is on */
  const mask = useCallback(
    (value: string) => (hidden ? "••••" : value),
    [hidden]
  );

  return { hidden, toggle, mask };
}
