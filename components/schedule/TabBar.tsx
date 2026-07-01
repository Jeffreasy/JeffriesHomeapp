"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TabBarItem<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  /** Optional count badge (e.g. agenda view-tabs). */
  count?: number;
}

export function tabBarTabId(idPrefix: string, id: string) {
  return `${idPrefix}-tab-${id}`;
}

export function tabBarPanelId(idPrefix: string, id: string) {
  return `${idPrefix}-panel-${id}`;
}

const TONES = {
  amber: {
    active: "border-amber-500/30 bg-amber-500/12 text-amber-200",
    // focus-visible i.p.v. focus: geen blijvende ring na een muisklik (audit L12).
    ring: "focus-visible:ring-amber-400/40",
    badgeActive: "bg-amber-400/12 text-amber-100",
  },
  sky: {
    active: "border-sky-500/35 bg-sky-500/12 text-sky-200",
    ring: "focus-visible:ring-sky-400/40",
    badgeActive: "bg-sky-400/12 text-sky-100",
  },
} as const;

/**
 * Shared WAI-ARIA tab bar (roving tabindex, arrow/Home/End keys, aria-controls)
 * — extracted from the rooster page so the agenda view-tabs get the same
 * mechanics. Panels should carry role="tabpanel" with the matching
 * tabBarPanelId/aria-labelledby ids.
 *
 * The row scrolls horizontally on narrow phones; an edge fade signals that
 * more tabs are clipped off-screen.
 */
export function TabBar<T extends string>({
  tabs,
  active,
  onChange,
  idPrefix,
  ariaLabel,
  tone = "amber",
  className,
}: {
  tabs: ReadonlyArray<TabBarItem<T>>;
  active: T;
  onChange: (tab: T) => void;
  idPrefix: string;
  ariaLabel: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  const toneClasses = TONES[tone];
  // Linker fade alleen tonen zodra er daadwerkelijk naar rechts is gescrold
  // (audit L12) — anders lijkt de eerste tab afgekapt.
  const [showLeftFade, setShowLeftFade] = useState(false);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabs.findIndex((t) => t.id === active);
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    onChange(nextTab.id);
    document.getElementById(tabBarTabId(idPrefix, nextTab.id))?.focus();
  };

  return (
    <div className={cn("relative min-w-0", className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        onScroll={(event) => setShowLeftFade(event.currentTarget.scrollLeft > 4)}
        className="flex gap-1 overflow-x-auto scrollbar-none pr-6"
      >
        {tabs.map(({ id, label, count, icon: Icon }) => {
          const selected = active === id;
          return (
            <button
              key={id}
              id={tabBarTabId(idPrefix, id)}
              type="button"
              role="tab"
              aria-selected={selected}
              // Alleen het actieve tab-panel is gemount — aria-controls op de
              // overige tabs zou naar een niet-bestaand id wijzen (audit L12).
              aria-controls={selected ? tabBarPanelId(idPrefix, id) : undefined}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(id)}
              onKeyDown={handleKeyDown}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 cursor-pointer",
                toneClasses.ring,
                selected
                  ? toneClasses.active
                  : "border-transparent text-slate-500 hover:bg-white/[0.05] hover:text-slate-300",
              )}
            >
              <Icon size={14} aria-hidden="true" />
              <span>{label}</span>
              {typeof count === "number" && (
                <span
                  className={cn(
                    "rounded-md px-1.5 py-0.5 text-[11px] tabular-nums",
                    selected ? toneClasses.badgeActive : "bg-white/[0.04] text-slate-500",
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Edge fades — signal horizontally clipped tabs on narrow phones. The
          left fade only appears once the row is actually scrolled (audit L12). */}
      {showLeftFade && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#0a0a0f] to-transparent sm:hidden"
        />
      )}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[#0a0a0f] to-transparent sm:hidden"
      />
    </div>
  );
}
