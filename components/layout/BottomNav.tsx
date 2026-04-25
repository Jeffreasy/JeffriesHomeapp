"use client";

import { motion } from "framer-motion";
import { Home, Settings, Calendar, CalendarClock, Landmark, StickyNote, Lightbulb, Target } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/",             icon: Home,       label: "Dashboard"    },
  { href: "/lampen",      icon: Lightbulb,  label: "Lampen"       },
  { href: "/rooster",     icon: Calendar,   label: "Rooster"      },
  { href: "/agenda",      icon: CalendarClock, label: "Agenda"    },
  { href: "/finance",     icon: Landmark,   label: "Finance"      },
  { href: "/notities",   icon: StickyNote, label: "Notities"     },
  { href: "/habits",      icon: Target,     label: "Habits"       },
  { href: "/settings",    icon: Settings,   label: "Instellingen" },
];

/**
 * Mobile-only bottom navigation bar.
 * Renders only on screens < md (768px). Hidden on md+.
 *
 * Thumb zone: primary action at bottom of screen.
 * Touch target: 56px minimum height.
 * Safe area: respects iOS home bar with env(safe-area-inset-bottom).
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(10, 10, 15, 0.92)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex items-stretch">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex-1"
              aria-current={active ? "page" : undefined}
            >
              <motion.div
                whileTap={{ scale: 0.88 }}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-all duration-150",
                  active ? "text-amber-400" : "text-slate-500"
                )}
              >
                {/* Active indicator dot above icon */}
                <div
                  className="w-1 h-1 rounded-full mb-0.5 transition-all duration-200"
                  style={{ background: active ? "#f59e0b" : "transparent" }}
                  aria-hidden="true"
                />

                {/* Icon with active glow */}
                <div
                  className="relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200"
                  style={
                    active
                      ? {
                          background: "rgba(245, 158, 11, 0.12)",
                          border: "1px solid rgba(245, 158, 11, 0.25)",
                        }
                      : {
                          background: "transparent",
                          border: "1px solid transparent",
                        }
                  }
                >
                  <Icon
                    size={20}
                    aria-hidden="true"
                    style={active ? { filter: "drop-shadow(0 0 8px rgba(245,158,11,0.6))" } : {}}
                  />
                </div>

                {/* Label — always visible on mobile */}
                <span
                  className="text-[9px] font-semibold leading-none tracking-wide"
                  style={{ color: active ? "#f59e0b" : "#64748b" }}
                >
                  {label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
