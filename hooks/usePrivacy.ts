"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "jeffries-privacy-mode";

/**
 * Global privacy toggle — hides sensitive financial values.
 * Persisted in localStorage so it survives page reloads.
 */
export function usePrivacy() {
  const [hidden, setHidden] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") setHidden(true);
    } catch {}
  }, []);

  const toggle = useCallback(() => {
    setHidden((prev) => {
      const next = !prev;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  /** Mask a value when privacy mode is on */
  const mask = useCallback(
    (value: string) => (hidden ? "••••" : value),
    [hidden]
  );

  return { hidden, toggle, mask };
}
