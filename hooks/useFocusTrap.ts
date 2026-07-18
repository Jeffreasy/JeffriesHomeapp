"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

interface FocusTrapOptions {
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocus?: boolean;
}

function isActuallyFocusable(element: HTMLElement) {
  if (
    element.hidden ||
    element.getAttribute("aria-hidden") === "true" ||
    element.getAttribute("aria-disabled") === "true" ||
    element.closest("[inert], [aria-hidden='true']")
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    element.getClientRects().length > 0
  );
}

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
  containerRef: RefObject<T | null>,
  { initialFocusRef, restoreFocus = true }: FocusTrapOptions = {},
) {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    previousFocus.current = document.activeElement as HTMLElement | null;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        isActuallyFocusable,
      );

    const focusFrame = window.requestAnimationFrame(() => {
      if (!container.isConnected || container.contains(document.activeElement)) return;
      const requestedTarget = initialFocusRef?.current;
      const target =
        requestedTarget && container.contains(requestedTarget) && isActuallyFocusable(requestedTarget)
          ? requestedTarget
          : getFocusable()[0] ?? container;
      target.focus({ preventScroll: true });
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const activeElement = document.activeElement;
      if (event.shiftKey) {
        if (activeElement === first || !container.contains(activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else if (activeElement === last || !container.contains(activeElement)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown, true);
      if (!restoreFocus) return;
      const target = previousFocus.current;
      window.requestAnimationFrame(() => {
        if (!target?.isConnected || target.closest("[inert], [aria-hidden='true']")) return;
        target.focus({ preventScroll: true });
      });
    };
  }, [active, containerRef, initialFocusRef, restoreFocus]);
}
