"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/ui/AppIcon";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { FocusModeShortcut } from "@/components/layout/FocusModeControl";
import {
  MOBILE_MORE_ITEMS,
  MOBILE_PRIMARY_ITEMS,
  getActiveNavigationItem,
  isNavigationItemActive,
  type NavigationItem,
} from "@/components/layout/navigation";

/**
 * Mobile bottom navigation.
 * Four thumb-zone primary tabs plus a More sheet keeps every route reachable
 * without squeezing labels into tiny targets.
 */
export function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const activeItem = useMemo(() => getActiveNavigationItem(pathname), [pathname]);
  const moreActive = MOBILE_MORE_ITEMS.some((item) => isNavigationItemActive(pathname, item.href));

  // Focus trap for the More sheet (M7): keeps Tab cycling inside the dialog
  // and restores focus to the Meer button when it closes.
  const sheetRef = useRef<HTMLDivElement>(null);
  useFocusTrap(moreOpen, sheetRef);

  useEffect(() => {
    if (!moreOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [moreOpen]);

  return (
    <>
      <nav
        aria-label="Mobiele hoofdnavigatie"
        className="fixed bottom-0 left-0 right-0 z-[60] border-t border-[var(--color-border)] bg-[#0a0a0f]/[0.92] px-2 pt-2 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="grid grid-cols-5 gap-1">
          {MOBILE_PRIMARY_ITEMS.map((item) => (
            <BottomNavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setMoreOpen(false)} />
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-controls="mobile-nav-more"
            aria-expanded={moreOpen}
            aria-current={moreActive ? "page" : undefined}
            className={cn(
              "relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-xl border px-1 transition-colors",
              moreActive || moreOpen
                ? "border-amber-500/25 bg-amber-500/[0.12] text-amber-300"
                : "border-transparent text-slate-500 active:bg-[var(--color-surface-hover)]",
            )}
          >
            {(moreActive || moreOpen) && (
              <motion.span
                layoutId="mobile-nav-active"
                className="absolute inset-0 rounded-xl bg-amber-500/[0.08]"
                transition={{ type: "spring", stiffness: 440, damping: 36 }}
              />
            )}
            <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-lg">
              <AppIcon name="more" tone={moreActive || moreOpen ? "amber" : "slate"} size="md" />
            </span>
            <span className="relative z-10 max-w-full truncate text-[10px] font-bold leading-none">
              {moreActive && activeItem ? activeItem.shortLabel : "Meer"}
            </span>
          </button>
        </div>
      </nav>

      {/* More sheet AFTER the nav in the DOM (M7): Tab from the Meer button
          lands inside the sheet instead of jumping past it. */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              key="mobile-nav-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[58] bg-black/[0.55] backdrop-blur-sm md:hidden"
              onClick={() => setMoreOpen(false)}
            />

            <motion.div
              key="mobile-nav-more"
              id="mobile-nav-more"
              ref={sheetRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Meer navigatie"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-x-3 z-[59] glass p-3 shadow-2xl shadow-black/40 md:hidden"
              style={{ bottom: "calc(88px + env(safe-area-inset-bottom, 0px))" }}
            >
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Meer</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-slate-200">
                    {moreActive && activeItem ? activeItem.label : "Alle onderdelen"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  aria-label="Meer menu sluiten"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 transition-colors active:scale-95 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
                >
                  <AppIcon name="close" tone="slate" size="sm" />
                </button>
              </div>

              <FocusModeShortcut variant="mobile" />

              <div className="grid grid-cols-2 gap-2">
                {MOBILE_MORE_ITEMS.map((item) => (
                  <MoreNavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setMoreOpen(false)} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function BottomNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isNavigationItemActive(pathname, item.href);

  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate}>
      <motion.div
        whileTap={{ scale: 0.92 }}
        className={cn(
          "relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-xl border px-1 transition-colors",
          active
            ? "border-amber-500/25 bg-amber-500/[0.12] text-amber-300"
            : "border-transparent text-slate-500 active:bg-[var(--color-surface-hover)]",
        )}
      >
        {active && (
          <motion.span
            layoutId="mobile-nav-active"
            className="absolute inset-0 rounded-xl bg-amber-500/[0.08]"
            transition={{ type: "spring", stiffness: 440, damping: 36 }}
          />
        )}
        <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-lg">
          <AppIcon name={item.icon} tone={active ? "amber" : "slate"} size="md" />
        </span>
        <span className="relative z-10 max-w-full truncate text-[10px] font-bold leading-none">
          {item.shortLabel}
        </span>
      </motion.div>
    </Link>
  );
}

function MoreNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = isNavigationItemActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex min-h-16 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        active
          ? "border-amber-500/25 bg-amber-500/[0.12] text-amber-100"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-300 hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-hover)]",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
          active
            ? "border-amber-500/25 bg-amber-500/15 text-amber-300"
            : "border-[var(--color-border)] bg-[var(--color-surface-hover)] text-slate-500",
        )}
      >
        <AppIcon name={item.icon} tone={active ? "amber" : "slate"} size="md" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{item.label}</span>
        <span className={cn("mt-0.5 block truncate text-[11px]", active ? "text-amber-100/[0.55]" : "text-slate-600")}>
          {item.description}
        </span>
      </span>
    </Link>
  );
}
