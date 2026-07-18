"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEventHandler,
  type MouseEventHandler,
  type ReactNode,
  type RefCallback,
  type RefObject,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { getOverlayPortalRoot } from "@/lib/overlays/overlay-manager";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { IconButton } from "@/components/ui/IconButton";
import { surfaceVariants } from "@/components/ui/Surface";
import { SurfaceHeader } from "@/components/ui/SurfaceHeader";
import { cn } from "@/lib/utils";
import { reducedMotionTransition, uiMotion } from "@/lib/ui/motion";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type PopoverRole = "dialog" | "menu" | "listbox";
type PopoverAlign = "start" | "end";

export interface PopoverTriggerProps {
  ref: RefCallback<HTMLButtonElement>;
  id: string;
  type: "button";
  onClick: MouseEventHandler<HTMLButtonElement>;
  "aria-controls": string;
  "aria-expanded": boolean;
  "aria-haspopup": PopoverRole;
}

export interface PopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (props: PopoverTriggerProps) => ReactNode;
  children: ReactNode;
  title: string;
  ariaLabel?: string;
  closeLabel?: string;
  role?: PopoverRole;
  align?: PopoverAlign;
  showDesktopHeader?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onContentKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  rootClassName?: string;
  className?: string;
  mobileClassName?: string;
}

interface PopoverPosition {
  left: number;
  top: number;
}

/**
 * Shared non-modal popover boundary. Desktop content is portalled so scroll and
 * overflow containers cannot clip it; phone content composes the canonical sheet.
 */
export function Popover({
  open,
  onOpenChange,
  trigger,
  children,
  title,
  ariaLabel = title,
  closeLabel = "Popover sluiten",
  role = "dialog",
  align = "start",
  showDesktopHeader = role === "dialog",
  initialFocusRef,
  onContentKeyDown,
  rootClassName,
  className,
  mobileClassName,
}: PopoverProps) {
  const triggerId = useId();
  const contentId = useId();
  const isPhone = useMediaQuery("(max-width: 767px)");
  const reduceMotion = useReducedMotion();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const desktopContentRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef(true);
  const [position, setPosition] = useState<PopoverPosition | null>(null);

  const setTriggerRef = useCallback<RefCallback<HTMLButtonElement>>((node) => {
    triggerRef.current = node;
  }, []);

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    const contentElement = desktopContentRef.current;
    if (!triggerElement || !contentElement) return;

    const viewportPadding = 8;
    const offset = 8;
    const triggerRect = triggerElement.getBoundingClientRect();
    const contentRect = contentElement.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight;
    const contentWidth = Math.min(contentRect.width, viewportWidth - viewportPadding * 2);
    const contentHeight = Math.min(contentRect.height, viewportHeight - viewportPadding * 2);
    const preferredLeft = align === "end"
      ? triggerRect.right - contentWidth
      : triggerRect.left;
    const left = Math.min(
      Math.max(viewportPadding, preferredLeft),
      Math.max(viewportPadding, viewportWidth - contentWidth - viewportPadding),
    );
    const spaceBelow = viewportHeight - triggerRect.bottom - offset - viewportPadding;
    const spaceAbove = triggerRect.top - offset - viewportPadding;
    const preferredTop = contentHeight > spaceBelow && spaceAbove > spaceBelow
      ? triggerRect.top - contentHeight - offset
      : triggerRect.bottom + offset;
    const top = Math.min(
      Math.max(viewportPadding, preferredTop),
      Math.max(viewportPadding, viewportHeight - contentHeight - viewportPadding),
    );

    setPosition((current) => current?.left === left && current.top === top
      ? current
      : { left, top });
  }, [align]);

  useLayoutEffect(() => {
    if (!open || isPhone) return;

    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    const resizeObserver = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(updatePosition);
    if (triggerRef.current) resizeObserver?.observe(triggerRef.current);
    if (desktopContentRef.current) resizeObserver?.observe(desktopContentRef.current);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isPhone, open, updatePosition]);

  useEffect(() => {
    if (!open || isPhone) return;
    restoreFocusRef.current = true;
    const frame = window.requestAnimationFrame(() => {
      const contentElement = desktopContentRef.current;
      if (!contentElement) return;
      const requestedTarget = initialFocusRef?.current;
      const target = requestedTarget && contentElement.contains(requestedTarget)
        ? requestedTarget
        : !isPhone && showDesktopHeader && closeButtonRef.current
          ? closeButtonRef.current
          : contentElement.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ?? contentElement;
      target.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialFocusRef, isPhone, open, showDesktopHeader]);

  useEffect(() => {
    if (!open || isPhone) return;
    const openedContent = desktopContentRef.current;

    return () => {
      if (!restoreFocusRef.current) return;
      const activeElement = document.activeElement;
      if (
        activeElement !== document.body &&
        (!openedContent || !openedContent.contains(activeElement))
      ) {
        return;
      }
      window.requestAnimationFrame(() => {
        if (!triggerRef.current?.isConnected) return;
        triggerRef.current.focus({ preventScroll: true });
      });
    };
  }, [isPhone, open]);

  useEffect(() => {
    if (!open || isPhone) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (desktopContentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      restoreFocusRef.current = false;
      onOpenChange(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      restoreFocusRef.current = true;
      onOpenChange(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isPhone, onOpenChange, open]);

  const handleTriggerClick: MouseEventHandler<HTMLButtonElement> = () => {
    restoreFocusRef.current = !open;
    if (!open) setPosition(null);
    onOpenChange(!open);
  };

  const handleContentKeyDown: KeyboardEventHandler<HTMLDivElement> = (event) => {
    onContentKeyDown?.(event);
    if (event.defaultPrevented || isPhone || event.key !== "Tab") return;
    window.requestAnimationFrame(() => {
      if (desktopContentRef.current?.contains(document.activeElement)) return;
      restoreFocusRef.current = false;
      onOpenChange(false);
    });
  };


  const desktopPopover = typeof document === "undefined"
    ? null
    : createPortal(
        <AnimatePresence>
          {open && !isPhone ? (
            <motion.div
              ref={desktopContentRef}
              key={contentId}
              id={contentId}
              role={role}
              aria-label={ariaLabel}
              tabIndex={-1}
              onKeyDown={handleContentKeyDown}
              initial={{ opacity: 0, scale: 0.96, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 6 }}
              transition={reduceMotion ? reducedMotionTransition : { duration: uiMotion.durationSeconds.fast }}
              style={position ? { left: position.left, top: position.top } : undefined}
              className={cn(
                surfaceVariants({ tone: "elevated", radius: "md", padding: "sm" }),
                "fixed z-[var(--layer-popover)] max-h-[calc(100dvh-1rem)] overflow-y-auto outline-none",
                position ? "visible" : "invisible",
                className,
              )}
            >
              {showDesktopHeader ? (
                <SurfaceHeader
                  title={title}
                  headingLevel={3}
                  compact
                  action={
                    <IconButton
                      ref={closeButtonRef}
                      onClick={() => onOpenChange(false)}
                      label={closeLabel}
                      icon={<X size={13} />}
                    />
                  }
                />
              ) : null}
              {children}
            </motion.div>
          ) : null}
        </AnimatePresence>,
        getOverlayPortalRoot(),
      );

  return (
    <>
      <div className={cn("relative", rootClassName)}>
        {trigger({
          ref: setTriggerRef,
          id: triggerId,
          type: "button",
          onClick: handleTriggerClick,
          "aria-controls": contentId,
          "aria-expanded": open,
          "aria-haspopup": role,
        })}
      </div>

      <BottomSheet
        open={open && isPhone}
        onClose={() => onOpenChange(false)}
        title={title}
        ariaLabel={ariaLabel}
        closeLabel={closeLabel}
        contentClassName="p-0"
        initialFocusRef={initialFocusRef}
      >
        {isPhone ? (
          <div
            id={contentId}
            role={role === "dialog" ? undefined : role}
            aria-label={role === "dialog" ? undefined : ariaLabel}
            tabIndex={-1}
            onKeyDown={handleContentKeyDown}
            className={cn("min-h-0 p-4", mobileClassName)}
          >
            {children}
          </div>
        ) : null}
      </BottomSheet>

      {desktopPopover}
    </>
  );
}
