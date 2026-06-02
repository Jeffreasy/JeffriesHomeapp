"use client";

import { Eye, EyeOff, Plus, BookOpen, Grid3X3 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type NotesTab = "journal" | "collection";

export function NotesHeader({
  count,
  archivedCount,
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
  pinnedCount: number;
  isLoading: boolean;
  privacyOn: boolean;
  togglePrivacy: () => void;
  handleNew: () => void;
  activeTab: NotesTab;
  onTabChange: (tab: NotesTab) => void;
}) {
  const tabs: { id: NotesTab; label: string; icon: typeof BookOpen }[] = [
    { id: "journal", label: "Week Journal", icon: BookOpen },
    { id: "collection", label: "Collectie", icon: Grid3X3 },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Top row */}
        <div className="flex items-center justify-between gap-3 py-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-white">Notities</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {isLoading
                ? "Laden..."
                : `${count} actief · ${archivedCount} archief · ${pinnedCount} vastgezet`}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={togglePrivacy}
              title={privacyOn ? "Notities tonen" : "Notities verbergen"}
              aria-label={privacyOn ? "Notities tonen" : "Notities verbergen"}
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors cursor-pointer",
                privacyOn
                  ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
              )}
            >
              {privacyOn ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={handleNew}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 cursor-pointer"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Nieuw</span>
            </motion.button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 -mb-px">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={cn(
                "relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                activeTab === id
                  ? "text-[var(--color-text)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              )}
            >
              <Icon size={15} />
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
