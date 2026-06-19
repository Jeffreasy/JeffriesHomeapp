"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * useFocusTrap — accessibility helper for dialogs/drawers (Modal, ConfirmDialog,
 * BottomSheet). While `active`:
 *  - moves focus into the container (first focusable, or the container itself),
 *  - keeps Tab / Shift+Tab cycling within the container,
 *  - restores focus to the previously-focused element when it deactivates.
 *
 * The container element should be focusable as a fallback (tabIndex={-1}).
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  containerRef: RefObject<T | null>
) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    previousFocus.current = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    // Move focus into the dialog on open — unless something inside is already
    // focused (e.g. an element with autoFocus), which we leave as-is.
    if (!container.contains(document.activeElement)) {
      const initial = getFocusable();
      (initial[0] ?? container).focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey) {
        if (activeEl === first || !container.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      // Restore focus to whatever was focused before the dialog opened.
      previousFocus.current?.focus?.();
    };
  }, [active, containerRef]);
}
