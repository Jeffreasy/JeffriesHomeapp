"use client";

import { useEffect, useId, useSyncExternalStore, type RefObject } from "react";
import {
  getOverlayStackServerSnapshot,
  getOverlayStackSnapshot,
  registerOverlay,
  type OverlayPriority,
  subscribeToOverlayStack,
} from "@/lib/overlays/overlay-manager";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface OverlayLifecycleOptions {
  initialFocusRef?: RefObject<HTMLElement | null>;
  onEscape?: () => void;
  priority?: OverlayPriority;
  restoreFocus?: boolean;
  trapFocus?: boolean;
}

export function useOverlayLifecycle<T extends HTMLElement>(
  active: boolean,
  containerRef: RefObject<T | null>,
  {
    initialFocusRef,
    onEscape,
    priority = "standard",
    restoreFocus = true,
    trapFocus = true,
  }: OverlayLifecycleOptions = {},
) {
  const overlayId = useId();
  const stack = useSyncExternalStore(
    subscribeToOverlayStack,
    getOverlayStackSnapshot,
    getOverlayStackServerSnapshot,
  );

  useEffect(() => {
    if (!active) return;
    return registerOverlay(overlayId, priority);
  }, [active, overlayId, priority]);

  useEffect(() => {
    if (!active) return;
    const returnFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    return () => {
      if (!restoreFocus || !returnFocus) return;
      window.requestAnimationFrame(() => {
        if (!returnFocus.isConnected) return;
        if (returnFocus.closest("[inert], [aria-hidden='true']")) return;
        returnFocus.focus({ preventScroll: true });
      });
    };
  }, [active, restoreFocus]);

  const layerIndex = stack.indexOf(overlayId);
  const isTopMost = active && layerIndex >= 0 && layerIndex === stack.length - 1;

  useFocusTrap(isTopMost && trapFocus, containerRef, {
    initialFocusRef,
    restoreFocus: false,
  });

  useEffect(() => {
    if (!isTopMost || !onEscape) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onEscape();
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [isTopMost, onEscape]);

  return { isTopMost, layerIndex, overlayId };
}
