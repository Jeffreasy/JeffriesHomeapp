"use client";

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type RefObject,
} from "react";
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

const OVERLAY_EXIT_TIMEOUT_MS = 1_000;

function findOverlayLayer(overlayId: string): HTMLElement | null {
  return (
    Array.from(document.querySelectorAll<HTMLElement>("[data-overlay-layer]")).find(
      (layer) => layer.dataset.overlayLayer === overlayId,
    ) ?? null
  );
}

function scheduleAfterOverlayExit(overlayId: string, onExit: () => void) {
  const closingLayer = findOverlayLayer(overlayId);
  let stopped = false;
  let observer: MutationObserver | null = null;
  let timeoutId: number | null = null;

  const stop = () => {
    stopped = true;
    observer?.disconnect();
    if (timeoutId !== null) window.clearTimeout(timeoutId);
  };

  const finish = () => {
    if (stopped) return;
    stopped = true;
    observer?.disconnect();
    if (timeoutId !== null) window.clearTimeout(timeoutId);
    onExit();
  };

  if (!closingLayer?.isConnected || !closingLayer.parentNode) {
    timeoutId = window.setTimeout(finish, 0);
    return stop;
  }

  // Keep the closing overlay registered until AnimatePresence removes its
  // layer. Underlying traps therefore cannot win focus during the exit.
  observer = new MutationObserver(() => {
    if (!closingLayer.isConnected) finish();
  });
  observer.observe(closingLayer.parentNode, { childList: true });
  timeoutId = window.setTimeout(finish, OVERLAY_EXIT_TIMEOUT_MS);

  return stop;
}

function restoreReturnFocus(returnFocus: HTMLElement, isReopened: () => boolean) {
  const deadline = window.performance.now() + OVERLAY_EXIT_TIMEOUT_MS;

  const attemptRestore = () => {
    if (isReopened() || !returnFocus.isConnected) return;
    if (returnFocus.closest("[inert], [aria-hidden='true']")) {
      if (window.performance.now() < deadline) {
        window.requestAnimationFrame(attemptRestore);
      }
      return;
    }

    const currentFocus = document.activeElement;
    const parentOverlay = returnFocus.closest<HTMLElement>("[data-overlay-layer]");
    if (
      currentFocus instanceof HTMLElement &&
      currentFocus !== document.body &&
      currentFocus !== document.documentElement &&
      currentFocus !== returnFocus &&
      !parentOverlay?.contains(currentFocus)
    ) {
      return;
    }

    if (currentFocus !== returnFocus) {
      returnFocus.focus({ preventScroll: true });
    }
  };

  window.requestAnimationFrame(attemptRestore);
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
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const unregisterRef = useRef<(() => void) | null>(null);
  const registeredPriorityRef = useRef<OverlayPriority | null>(null);
  const cancelPendingExitRef = useRef<(() => void) | null>(null);

  const stack = useSyncExternalStore(
    subscribeToOverlayStack,
    getOverlayStackSnapshot,
    getOverlayStackServerSnapshot,
  );

  useEffect(() => {
    if (!active) return;

    cancelPendingExitRef.current?.();
    cancelPendingExitRef.current = null;

    if (!unregisterRef.current) {
      // Capture the opener before registration makes the background inert.
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      unregisterRef.current = registerOverlay(overlayId, priority);
      registeredPriorityRef.current = priority;
    } else if (registeredPriorityRef.current !== priority) {
      unregisterRef.current();
      unregisterRef.current = registerOverlay(overlayId, priority);
      registeredPriorityRef.current = priority;
    }

    return () => {
      const unregister = unregisterRef.current;
      if (!unregister) return;
      const shouldRestoreFocus = restoreFocus;

      cancelPendingExitRef.current?.();
      cancelPendingExitRef.current = scheduleAfterOverlayExit(overlayId, () => {
        if (unregisterRef.current !== unregister) return;

        const returnFocus = returnFocusRef.current;
        unregister();
        unregisterRef.current = null;
        registeredPriorityRef.current = null;
        returnFocusRef.current = null;
        cancelPendingExitRef.current = null;

        if (!shouldRestoreFocus || !returnFocus) return;
        restoreReturnFocus(returnFocus, () => unregisterRef.current !== null);
      });
    };
  }, [active, overlayId, priority, restoreFocus]);

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
