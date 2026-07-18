const EMPTY_STACK: readonly string[] = [];
export type OverlayPriority = "standard" | "critical";

type OverlayEntry = {
  id: string;
  priority: OverlayPriority;
  sequence: number;
};

type ElementState = {
  ariaHidden: string | null;
  inert: boolean;
};

type ScrollState = {
  bodyOverflow: string;
  bodyPaddingRight: string;
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
};

let overlayEntries: readonly OverlayEntry[] = [];
let overlayStack: readonly string[] = EMPTY_STACK;
let overlaySequence = 0;
let scrollState: ScrollState | null = null;
let bodyObserver: MutationObserver | null = null;
const listeners = new Set<() => void>();
const backgroundElements = new Map<HTMLElement, ElementState>();

function isOverlayHost(element: HTMLElement) {
  return (
    element.id === "app-overlay-root" ||
    element.id === "app-toast-root" ||
    element.hasAttribute("data-overlay-layer") ||
    element.hasAttribute("data-app-toast-root")
  );
}

function hideBackgroundElement(element: HTMLElement) {
  if (isOverlayHost(element) || backgroundElements.has(element)) return;
  backgroundElements.set(element, {
    ariaHidden: element.getAttribute("aria-hidden"),
    inert: element.inert,
  });
  element.inert = true;
  element.setAttribute("aria-hidden", "true");
}

function hideBackground() {
  for (const child of document.body.children) {
    if (child instanceof HTMLElement) hideBackgroundElement(child);
  }

  bodyObserver = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof HTMLElement) hideBackgroundElement(node);
      }
    }
  });
  bodyObserver.observe(document.body, { childList: true });
}

function restoreBackground() {
  bodyObserver?.disconnect();
  bodyObserver = null;

  for (const [element, state] of backgroundElements) {
    if (!element.isConnected) continue;
    element.inert = state.inert;
    if (state.ariaHidden === null) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", state.ariaHidden);
  }
  backgroundElements.clear();
}

function lockDocumentScroll() {
  if (scrollState) return;

  const html = document.documentElement;
  const body = document.body;
  scrollState = {
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
    htmlOverflow: html.style.overflow,
    htmlOverscrollBehavior: html.style.overscrollBehavior,
  };

  const scrollbarWidth = Math.max(0, window.innerWidth - html.clientWidth);
  if (scrollbarWidth > 0) {
    const currentPadding = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
  }
  body.style.overflow = "hidden";
  html.style.overflow = "hidden";
  html.style.overscrollBehavior = "none";
}

function unlockDocumentScroll() {
  if (!scrollState) return;
  const html = document.documentElement;
  const body = document.body;
  body.style.overflow = scrollState.bodyOverflow;
  body.style.paddingRight = scrollState.bodyPaddingRight;
  html.style.overflow = scrollState.htmlOverflow;
  html.style.overscrollBehavior = scrollState.htmlOverscrollBehavior;
  scrollState = null;
}

function syncDocumentState(hadOverlays: boolean) {
  const hasOverlays = overlayStack.length > 0;
  if (!hadOverlays && hasOverlays) {
    lockDocumentScroll();
    hideBackground();
  } else if (hadOverlays && !hasOverlays) {
    restoreBackground();
    unlockDocumentScroll();
  }
}

function publish(nextEntries: readonly OverlayEntry[]) {
  const hadOverlays = overlayStack.length > 0;
  overlayEntries = [...nextEntries].sort((first, second) => {
    const priorityDelta =
      (first.priority === "critical" ? 1 : 0) -
      (second.priority === "critical" ? 1 : 0);
    return priorityDelta || first.sequence - second.sequence;
  });
  overlayStack = overlayEntries.map((entry) => entry.id);
  if (typeof document !== "undefined") syncDocumentState(hadOverlays);
  listeners.forEach((listener) => listener());
}

export function registerOverlay(
  id: string,
  priority: OverlayPriority = "standard",
) {
  if (!overlayEntries.some((entry) => entry.id === id)) {
    overlaySequence += 1;
    publish([...overlayEntries, { id, priority, sequence: overlaySequence }]);
  }

  return () => {
    if (!overlayEntries.some((entry) => entry.id === id)) return;
    publish(overlayEntries.filter((entry) => entry.id !== id));
  };
}

export function subscribeToOverlayStack(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getOverlayStackSnapshot() {
  return overlayStack;
}

export function getOverlayStackServerSnapshot() {
  return EMPTY_STACK;
}

export function getToastPortalRoot() {
  return document.getElementById("app-toast-root") ?? document.body;
}

export function getOverlayPortalRoot() {
  return document.getElementById("app-overlay-root") ?? document.body;
}
