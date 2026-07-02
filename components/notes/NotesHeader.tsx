"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/components/ui/AppIcon";
import type { AppIconName } from "@/lib/symbols";

export type NotesTab = "journal" | "collection";

export function NotesHeader({
  count,
  archivedCount,
  completedCount,
  pinnedCount,
  isLoading,
  privacyOn,
  togglePrivacy,
  handleNew,
  activeTab,
  onTabChange,
}: {
  count: number;
  archivedCount: number;
  completedCount: number;
  pinnedCount: number;
  isLoading: boolean;
  privacyOn: boolean;
  togglePrivacy: () => void;
  handleNew: () => void;
  activeTab: NotesTab;
  onTabChange: (tab: NotesTab) => void;
}) {
  const tabs: { id: NotesTab; label: string; icon: AppIconName }[] = [
    { id: "journal", label: "Weekjournaal", icon: "book" },
    { id: "collection", label: "Collectie", icon: "list" },
  ];

  // Roving tabindex + pijltjes/Home/End (low) — zelfde mechanics als de
  // gedeelde schedule-TabBar, inline gehouden zodat de underline-styling van
  // deze header intact blijft.
  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
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
    onTabChange(nextTab.id);
    document.getElementById(`notes-tab-${nextTab.id}`)?.focus();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white">Notities</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {isLoading
                ? "Laden…"
                : `${count} actief · ${completedCount} afgerond · ${archivedCount} archief · ${pinnedCount} vastgezet`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={togglePrivacy}
              title={privacyOn ? "Notities tonen" : "Notities verbergen"}
              aria-label={privacyOn ? "Notities tonen" : "Notities verbergen"}
              aria-pressed={privacyOn}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors cursor-pointer",
                privacyOn
                  ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
              )}
            >
              <AppIcon name={privacyOn ? "hide" : "show"} tone={privacyOn ? "indigo" : "slate"} size="sm" />
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={handleNew}
              title="Nieuwe notitie (toets n)"
              aria-keyshortcuts="n"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 cursor-pointer"
            >
              <AppIcon name="add" tone="amber" size="sm" />
              <span className="hidden sm:inline">Nieuw</span>
            </motion.button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 -mb-px" role="tablist" aria-label="Notitie-weergave">
          {tabs.map(({ id, label, icon }) => (
            <button
              key={id}
              id={`notes-tab-${id}`}
              role="tab"
              aria-selected={activeTab === id}
              aria-current={activeTab === id ? "page" : undefined}
              tabIndex={activeTab === id ? 0 : -1}
              onClick={() => onTabChange(id)}
              onKeyDown={handleTabKeyDown}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                activeTab === id
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              )}
            >
              <AppIcon name={icon} tone={activeTab === id ? "amber" : "slate"} size="sm" />
              {label}
              {activeTab === id && (
                <motion.div
                  layoutId="notes-tab-indicator"
                  className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-amber-500"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
