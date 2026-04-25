"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
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

  useEffect(() => {
    if (!moreOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [moreOpen]);

  return (
    <>
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
              role="dialog"
              aria-modal="true"
              aria-label="Meer navigatie"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-x-3 z-[59] rounded-2xl border border-white/10 bg-[#0f1219]/95 p-3 shadow-2xl shadow-black/40 backdrop-blur-xl md:hidden"
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 transition-colors active:scale-95"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {MOBILE_MORE_ITEMS.map((item) => (
                  <MoreNavLink key={item.href} item={item} pathname={pathname} onNavigate={() => setMoreOpen(false)} />
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        aria-label="Mobiele hoofdnavigatie"
        className="fixed bottom-0 left-0 right-0 z-[60] border-t border-white/10 bg-[#080a0f]/[0.92] px-2 pt-2 backdrop-blur-xl md:hidden"
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
                : "border-transparent text-slate-500 active:bg-white/[0.05]",
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
              <MoreHorizontal size={20} />
            </span>
            <span className="relative z-10 max-w-full truncate text-[10px] font-bold leading-none">
              {moreActive && activeItem ? activeItem.shortLabel : "Meer"}
            </span>
          </button>
        </div>
      </nav>
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
  const Icon = item.icon;

  return (
    <Link href={item.href} aria-current={active ? "page" : undefined} onClick={onNavigate}>
      <motion.div
        whileTap={{ scale: 0.92 }}
        className={cn(
          "relative flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-xl border px-1 transition-colors",
          active
            ? "border-amber-500/25 bg-amber-500/[0.12] text-amber-300"
            : "border-transparent text-slate-500 active:bg-white/[0.05]",
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
          <Icon size={19} />
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
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex min-h-16 items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
        active
          ? "border-amber-500/25 bg-amber-500/[0.12] text-amber-100"
          : "border-white/[0.08] bg-white/[0.03] text-slate-300 active:bg-white/[0.06]",
      )}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
          active
            ? "border-amber-500/25 bg-amber-500/15 text-amber-300"
            : "border-white/[0.08] bg-white/[0.03] text-slate-500",
        )}
      >
        <Icon size={18} />
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
