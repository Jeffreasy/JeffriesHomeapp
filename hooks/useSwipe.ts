"use client";

import { useCallback, useRef } from "react";

interface SwipeOptions {
  /** Minimum vertical distance (px) to register as swipe-down. Default: 80 */
  threshold?: number;
  onSwipeDown: () => void;
}

/**
 * Detects a downward swipe gesture on a ref'd element.
 * Attach the returned handlers to the draggable element.
 */
export function useSwipe({ threshold = 80, onSwipeDown }: SwipeOptions) {
  const startY = useRef<number>(0);
  const isDragging = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging.current) return;
      const delta = e.changedTouches[0].clientY - startY.current;
      if (delta > threshold) onSwipeDown();
      isDragging.current = false;
    },
    [threshold, onSwipeDown]
  );

  const onTouchCancel = useCallback(() => {
    isDragging.current = false;
  }, []);

  return { onTouchStart, onTouchEnd, onTouchCancel };
}
