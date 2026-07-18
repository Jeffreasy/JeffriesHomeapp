"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { uiMotion } from "@/lib/ui/motion";
import { NavigationIcon } from "@/components/layout/NavigationIcon";
import { FocusModeShortcut } from "@/components/layout/FocusModeControl";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
  const isPhone = useMediaQuery("(max-width: 767px)");

  return <BottomNavContent key={isPhone ? "phone" : "wide"} isPhone={isPhone} />;
}

function BottomNavContent({ isPhone }: { isPhone: boolean }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const activeItem = getActiveNavigationItem(pathname);
  const moreActive = MOBILE_MORE_ITEMS.some((item) => isNavigationItemActive(pathname, item.href));

  return (
    <>
      <nav
        aria-label="Mobiele hoofdnavigatie"
        className="app-bottom-nav fixed bottom-0 left-0 right-0 z-[var(--layer-navigation)] border-t border-[var(--color-border)] px-2 pt-2 backdrop-blur-xl md:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {MOBILE_PRIMARY_ITEMS.map((item) => (
            <BottomNavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setMoreOpen(false)} />
          ))}

          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen && isPhone}
            aria-haspopup="dialog"
            aria-current={moreActive ? "page" : undefined}
            className={cn(
              "relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-xl border px-1 transition-colors",
              moreActive || moreOpen
                ? "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]"
                : "border-transparent text-[var(--color-text-muted)] active:bg-[var(--color-surface-hover)]",
            )}
          >
            {(moreActive || moreOpen) && (
              <motion.span
                layoutId="mobile-nav-active"
                className="absolute inset-0 rounded-xl bg-[var(--color-primary-subtle)]"
                transition={uiMotion.spring.navigation}
              />
            )}
            <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-lg">
              <NavigationIcon name="more" tone={moreActive || moreOpen ? "accent" : "neutral"} size="md" />
            </span>
            <span className="relative z-10 max-w-full truncate text-xs font-bold leading-none">
              {moreActive && activeItem ? activeItem.shortLabel : "Meer"}
            </span>
          </button>
        </div>
      </nav>

      <BottomSheet
        open={moreOpen && isPhone}
        onClose={() => setMoreOpen(false)}
        title={moreActive && activeItem ? `Meer · ${activeItem.label}` : "Meer onderdelen"}
        closeLabel="Meer menu sluiten"
        className="mb-[var(--app-bottom-nav-clearance)] max-h-[min(70dvh,42rem)]"
        contentClassName="p-3"
      >
        <FocusModeShortcut variant="mobile" />
        <div className="grid grid-cols-2 gap-2">
          {MOBILE_MORE_ITEMS.map((item) => (
            <MoreNavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setMoreOpen(false)} />
          ))}
        </div>
      </BottomSheet>
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
    <Link
      href={item.href}
      prefetch={item.prefetch === "automatic" ? null : false}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      onClick={onNavigate}
    >
      <motion.div
        whileTap={uiMotion.press.navigation}
        className={cn(
          "relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-xl border px-1 transition-colors",
          active
            ? "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]"
            : "border-transparent text-[var(--color-text-muted)] active:bg-[var(--color-surface-hover)]",
        )}
      >
        {active && (
          <motion.span
            layoutId="mobile-nav-active"
            className="absolute inset-0 rounded-xl bg-[var(--color-primary-subtle)]"
            transition={uiMotion.spring.navigation}
          />
        )}
        <span className="relative z-10 flex h-7 w-7 items-center justify-center rounded-lg">
          <NavigationIcon name={item.icon} tone={active ? "accent" : "neutral"} size="md" />
        </span>
        <span className="relative z-10 max-w-full truncate text-xs font-bold leading-none">
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
  const router = useRouter();
  const active = isNavigationItemActive(pathname, item.href);

  return (
    <Link
      prefetch={item.prefetch === "automatic" ? null : false}
      onMouseEnter={() => item.prefetch === "intent" && router.prefetch(item.href)}
      onFocus={() => item.prefetch === "intent" && router.prefetch(item.href)}
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex min-h-16 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        active
          ? "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-hover)]",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
          active
            ? "border-[var(--color-primary-border)] bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)]"
            : "border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]",
        )}
      >
        <NavigationIcon name={item.icon} tone={active ? "accent" : "neutral"} size="md" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">{item.label}</span>
        <span className="mt-0.5 block truncate text-micro text-[var(--color-text-subtle)]">
          {item.description}
        </span>
      </span>
    </Link>
  );
}
