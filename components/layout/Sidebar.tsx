"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/ui/AppIcon";
import { FocusModeShortcut } from "@/components/layout/FocusModeControl";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  NAVIGATION_ITEMS,
  NAVIGATION_SECTIONS,
  isNavigationItemActive,
} from "@/components/layout/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const { user, isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const hasPersistentNavigation = useMediaQuery("(min-width: 768px)");
  // The CSS rail renders immediately; only Clerk's client portal waits for hydration.
  const showUserButton = hasPersistentNavigation;

  return (
    <aside className="app-sidebar fixed left-0 top-0 z-40 h-dvh flex-col overflow-hidden border-r border-[var(--color-border)] backdrop-blur-xl">
      <Link
        href="/"
        prefetch
        aria-label="Dashboard"
        className="app-sidebar-brand group flex items-center gap-3 border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-surface-hover)]"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/[0.12] text-amber-300 transition-colors group-hover:bg-amber-500/[0.18]">
          <AppIcon name="home" tone="amber" size="md" />
        </div>
        <div className="app-sidebar-copy min-w-0">
          <p className="truncate text-sm font-bold text-white">Jeffries Homeapp</p>
          <p className="mt-0.5 truncate text-xs font-medium text-[var(--color-text-muted)]">Prive cockpit</p>
        </div>
      </Link>

      <nav aria-label="Hoofdnavigatie" className="app-sidebar-nav min-h-0 flex-1 overflow-y-auto">
        <div className="app-sidebar-sections">
          {NAVIGATION_SECTIONS.map((section) => {
            const items = NAVIGATION_ITEMS.filter((item) => item.section === section.id);

            return (
              <section key={section.id} aria-label={section.label}>
                <h2
                  aria-hidden="true"
                  className="app-sidebar-copy px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-subtle)]"
                >
                  {section.label}
                </h2>

                <div className="space-y-1">
                  {items.map(({ href, icon, label, description, prefetch }) => {
                    const active = isNavigationItemActive(pathname, href);

                    return (
                      <Link
                        key={href}
                        href={href}
                        prefetch={prefetch === "automatic" ? null : false}
                        aria-current={active ? "page" : undefined}
                        aria-label={label}
                        title={label}
                        onMouseEnter={() => prefetch === "intent" && router.prefetch(href)}
                        onFocus={() => prefetch === "intent" && router.prefetch(href)}
                      >
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          className={cn(
                            "app-sidebar-nav-item relative flex min-h-12 items-center gap-3 overflow-hidden rounded-lg border px-3 py-2.5 transition-colors",
                            active
                              ? "border-amber-500/25 text-amber-100"
                              : "border-transparent text-slate-400 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-surface-hover)] hover:text-slate-100",
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
                                : "border-[var(--color-border)] bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]",
                            )}
                          >
                            <AppIcon name={icon} tone={active ? "amber" : "slate"} size="sm" />
                          </span>
                          <span className="app-sidebar-copy relative z-10 min-w-0">
                            <span className="block truncate text-sm font-semibold">{label}</span>
                            <span className={cn("mt-0.5 block truncate text-[11px]", active ? "text-amber-100/[0.55]" : "text-[var(--color-text-subtle)]")}>
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

      <div className="app-sidebar-footer border-t border-[var(--color-border)]">
        <div className="app-sidebar-copy">
          <FocusModeShortcut />
        </div>
        <Link
          href="/focus"
          prefetch={false}
          aria-label="Focus mode openen"
          title="Focus mode"
          className="app-sidebar-rail-only min-h-11 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-200 transition-colors hover:bg-amber-500/15"
        >
          <AppIcon name="radar" tone="amber" size="md" />
        </Link>

        {!isLoaded ? (
          <div className="app-sidebar-account flex items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[var(--color-border)]" />
            <div className="app-sidebar-copy app-sidebar-account-copy min-w-0 flex-1 gap-1.5">
              <div className="h-2.5 w-24 animate-pulse rounded bg-[var(--color-border)]" />
              <div className="h-2 w-32 animate-pulse rounded bg-[var(--color-border)]" />
            </div>
          </div>
        ) : isSignedIn ? (
          <div className="app-sidebar-account flex min-w-0 items-center gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5">
            {showUserButton ? (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9 shrink-0",
                    userButtonPopoverCard: {
                      background: "var(--color-surface-elevated)",
                      border: "1px solid var(--color-border)",
                    },
                  },
                }}
              />
            ) : (
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-[var(--color-border)]" />
            )}
            <div className="app-sidebar-copy app-sidebar-account-copy min-w-0">
              <span className="truncate text-xs font-semibold text-slate-200">
                {user.firstName ?? user.username ?? "Gebruiker"}
              </span>
              <span className="truncate text-[10px] text-[var(--color-text-muted)]">
                {user.primaryEmailAddress?.emailAddress ?? ""}
              </span>
            </div>
          </div>
        ) : (
          <SignInButton mode="redirect">
            <button
              type="button"
              className="app-sidebar-sign-in flex h-11 w-full items-center gap-3 rounded-lg border border-transparent px-3 text-sm font-semibold text-slate-400 transition-colors hover:border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-300"
            >
              <AppIcon name="login" tone="amber" size="sm" />
              <span className="app-sidebar-copy">Inloggen</span>
            </button>
          </SignInButton>
        )}
      </div>
    </aside>
  );
}
