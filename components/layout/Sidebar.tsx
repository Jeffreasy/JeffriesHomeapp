"use client";

import { motion } from "framer-motion";
import { Home, Settings, Zap, LogIn, Calendar, Landmark, Lightbulb, StickyNote } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/",             icon: Home,       label: "Dashboard"    },
  { href: "/lampen",      icon: Lightbulb,  label: "Lampen"       },
  { href: "/rooster",     icon: Calendar,   label: "Rooster"      },
  { href: "/finance",     icon: Landmark,   label: "Finance"      },
  { href: "/notities",   icon: StickyNote, label: "Notities"     },
  { href: "/automations", icon: Zap,        label: "Automatisch"  },
  { href: "/settings",    icon: Settings,   label: "Instellingen" },
];

/** Only render Clerk UserButton on desktop to prevent portal from leaking on mobile */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);
  return isDesktop;
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, isSignedIn, isLoaded } = useUser();
  const isDesktop = useIsDesktop();
  const [mounted, setMounted] = useState(false);

  // Wait for mount so isDesktop resolves correctly before rendering Clerk
  useEffect(() => setMounted(true), []);

  // On mobile: don't render at all (CSS hidden is insufficient for Clerk portals)
  if (!mounted || !isDesktop) return null;

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-full w-56 flex-col glass border-r border-white/5 z-40 isolate overflow-hidden">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Home size={16} className="text-amber-400" />
          </div>
          <span className="hidden md:block text-sm font-bold text-white tracking-tight">Homeapp</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}>
              <motion.div
                whileTap={{ scale: 0.96 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
                  active
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                )}
              >
                <Icon size={17} className="shrink-0" />
                <span className="hidden md:block font-medium">{label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* User account */}
      <div className="px-3 py-3 border-t border-white/5">
        {!isLoaded ? (
          /* Loading skeleton */
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/5 animate-pulse shrink-0" />
            <div className="hidden md:flex flex-col gap-1.5 flex-1">
              <div className="h-2.5 w-20 bg-white/5 rounded animate-pulse" />
              <div className="h-2 w-28 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
        ) : isSignedIn ? (
          <div className="flex items-center gap-3 min-w-0">
            {isDesktop && (
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 shrink-0",
                    userButtonPopoverCard: {
                      background: "#111118",
                      border: "1px solid rgba(255,255,255,0.1)",
                    },
                  },
                }}
              />
            )}
            <div className="hidden md:flex flex-col min-w-0">
              <span className="text-xs font-semibold text-slate-200 truncate">
                {user.firstName ?? user.username ?? "Gebruiker"}
              </span>
              <span className="text-[10px] text-slate-500 truncate">
                {user.primaryEmailAddress?.emailAddress ?? ""}
              </span>
            </div>
          </div>
        ) : (
          <SignInButton mode="redirect" >
            <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all text-sm border border-transparent hover:border-amber-500/20">
              <LogIn size={17} className="shrink-0" />
              <span className="hidden md:block font-medium">Inloggen</span>
            </button>
          </SignInButton>
        )}
      </div>
    </aside>
  );
}
