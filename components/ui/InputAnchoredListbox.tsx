"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { getOverlayPortalRoot } from "@/lib/overlays/overlay-manager";
import { surfaceVariants } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";

const VIEWPORT_PADDING = 8;
const ANCHOR_OFFSET = 6;
const MAX_LISTBOX_HEIGHT = 256;
const MIN_LISTBOX_WIDTH = 280;

interface ListboxPosition {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
}

export interface InputAnchoredListboxProps
  extends Omit<ComponentPropsWithoutRef<"div">, "role" | "style"> {
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
}

/**
 * Portalled listbox for combobox inputs. Positioning and viewport collision
 * handling live here; the owning domain retains filtering and keyboard state.
 */
export function InputAnchoredListbox({
  anchorRef,
  label,
  className,
  children,
  ...props
}: InputAnchoredListboxProps) {
  const listboxRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<ListboxPosition | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const listbox = listboxRef.current;
    if (!anchor || !listbox) return;

    const anchorRect = anchor.getBoundingClientRect();
    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportWidth = visualViewport?.width ?? document.documentElement.clientWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;
    const availableWidth = Math.max(0, viewportWidth - VIEWPORT_PADDING * 2);
    const width = Math.min(
      Math.max(anchorRect.width, MIN_LISTBOX_WIDTH),
      availableWidth,
    );
    const leftBoundary = viewportLeft + VIEWPORT_PADDING;
    const topBoundary = viewportTop + VIEWPORT_PADDING;
    const left = Math.min(
      Math.max(leftBoundary, anchorRect.left),
      Math.max(leftBoundary, viewportRight - width - VIEWPORT_PADDING),
    );
    const spaceBelow = Math.max(
      0,
      viewportBottom - anchorRect.bottom - ANCHOR_OFFSET - VIEWPORT_PADDING,
    );
    const spaceAbove = Math.max(
      0,
      anchorRect.top - ANCHOR_OFFSET - topBoundary,
    );
    const desiredHeight = Math.min(listbox.scrollHeight, MAX_LISTBOX_HEIGHT);
    const placeAbove = desiredHeight > spaceBelow && spaceAbove > spaceBelow;
    const maxHeight = Math.min(
      MAX_LISTBOX_HEIGHT,
      placeAbove ? spaceAbove : spaceBelow,
    );
    const renderedHeight = Math.min(listbox.scrollHeight, maxHeight);
    const top = placeAbove
      ? Math.max(topBoundary, anchorRect.top - ANCHOR_OFFSET - renderedHeight)
      : Math.min(
          anchorRect.bottom + ANCHOR_OFFSET,
          viewportBottom - VIEWPORT_PADDING - renderedHeight,
        );
    const next = { left, top, width, maxHeight };

    setPosition((current) =>
      current &&
      current.left === next.left &&
      current.top === next.top &&
      current.width === next.width &&
      current.maxHeight === next.maxHeight
        ? current
        : next,
    );
  }, [anchorRef]);

  useLayoutEffect(() => {
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updatePosition);
    if (anchorRef.current) resizeObserver?.observe(anchorRef.current);
    if (listboxRef.current) resizeObserver?.observe(listboxRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [anchorRef, updatePosition]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      {...props}
      ref={listboxRef}
      role="listbox"
      aria-label={label}
      style={position ?? undefined}
      className={cn(
        surfaceVariants({ tone: "elevated", radius: "md", padding: "none" }),
        "fixed z-[var(--layer-popover)] overflow-y-auto p-1.5",
        position ? "visible" : "invisible",
        className,
      )}
    >
      {children}
    </div>,
    getOverlayPortalRoot(),
  );
}