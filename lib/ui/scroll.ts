function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function preferredScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}

export function scrollElementIntoView(
  element: Element | null | undefined,
  options: Omit<ScrollIntoViewOptions, "behavior"> = {},
) {
  element?.scrollIntoView({
    ...options,
    behavior: preferredScrollBehavior(),
  });
}

export function scrollWindowTo(
  options: Omit<ScrollToOptions, "behavior">,
) {
  if (typeof window === "undefined") return;
  window.scrollTo({
    ...options,
    behavior: preferredScrollBehavior(),
  });
}
