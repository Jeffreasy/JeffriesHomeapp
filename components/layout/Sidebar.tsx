"use client";

import { useEffect, useState } from "react";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Home, LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  NAVIGATION_ITEMS,
  NAVIGATION_SECTIONS,
  isNavigationItemActive,
} from "@/components/layout/navigation";

/** Only render Clerk UserButton on desktop to prevent portal leakage on mobile. */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    const initial = window.setTimeout(() => setIsDesktop(mq.matches), 0);

    mq.addEventListener("change", handleChange);
    return () => {
      window.clearTimeout(initial);
      mq.removeEventListener("change", handleChange);
    };
  }, []);

  return isDesktop;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, isSignedIn, isLoaded } = useUser();
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(initial);
  }, []);

  if (!mounted || !isDesktop) return null;

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col overflow-hidden border-r border-white/10 bg-[#080a0f]/95 backdrop-blur-xl md:flex">
      <Link
        href="/"
        className="group flex items-center gap-3 border-b border-white/[0.08] px-4 py-5 transition-colors hover:bg-white/[0.03]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/[0.12] text-amber-300 transition-colors group-hover:bg-amber-500/[0.18]">
          <Home size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">Jeffries Homeapp</p>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">Prive cockpit</p>
        </div>
      </Link>

      <nav aria-label="Hoofdnavigatie" className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {NAVIGATION_SECTIONS.map((section) => {
            const items = NAVIGATION_ITEMS.filter((item) => item.section === section.id);

            return (
              <section key={section.id} aria-labelledby={`nav-section-${section.id}`}>
                <h2
                  id={`nav-section-${section.id}`}
                  className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-600"
                >
                  {section.label}
                </h2>

                <div className="space-y-1">
                  {items.map(({ href, icon: Icon, label, description }) => {
                    const active = isNavigationItemActive(pathname, href);

                    return (
                      <Link key={href} href={href} aria-current={active ? "page" : undefined}>
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "relative flex min-h-12 items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5 transition-colors",
                            active
                              ? "border-amber-500/25 text-amber-100"
                              : "border-transparent text-slate-400 hover:border-white/[0.08] hover:bg-white/[0.04] hover:text-slate-100",
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="sidebar-active"
                              className="absolute inset-0 rounded-lg bg-amber-500/[0.12]"
                              transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            />
                          )}
                          <span
                            className={cn(
                              "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                              active
                                ? "border-amber-500/25 bg-amber-500/15 text-amber-300"
                                : "border-white/[0.08] bg-white/[0.03] text-slate-500",
                            )}
                          >
                            <Icon size={17} />
                          </span>
                          <span className="relative z-10 min-w-0">
                            <span className="block truncate text-sm font-semibold">{label}</span>
                            <span className={cn("mt-0.5 block truncate text-[11px]", active ? "text-amber-100/[0.55]" : "text-slate-600")}>
                              {description}
                            </span>
                          </span>
                        </motion.div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/[0.08] px-3 py-3">
        {!isLoaded ? (
          <div className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-white/[0.06]" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="h-2.5 w-24 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-2 w-32 animate-pulse rounded bg-white/[0.06]" />
            </div>
          </div>
        ) : isSignedIn ? (
          <div className="flex min-w-0 items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9 shrink-0",
                  userButtonPopoverCard: {
                    background: "#111118",
                    border: "1px solid rgba(255,255,255,0.1)",
                  },
                },
              }}
            />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-semibold text-slate-200">
                {user.firstName ?? user.username ?? "Gebruiker"}
              </span>
              <span className="truncate text-[10px] text-slate-500">
                {user.primaryEmailAddress?.emailAddress ?? ""}
              </span>
            </div>
          </div>
        ) : (
          <SignInButton mode="redirect">
            <button className="flex h-11 w-full items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-semibold text-slate-400 transition-colors hover:border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-300">
              <LogIn size={17} className="shrink-0" />
              Inloggen
            </button>
          </SignInButton>
        )}
      </div>
    </aside>
  );
}
