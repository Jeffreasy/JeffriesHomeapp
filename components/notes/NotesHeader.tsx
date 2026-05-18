"use client";

import { Eye, EyeOff, Plus, StickyNote } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function NotesHeader({
  count,
  archivedCount,
  pinnedCount,
  isLoading,
  privacyOn,
  togglePrivacy,
  handleNew,
}: {
  count: number;
  archivedCount: number;
  pinnedCount: number;
  isLoading: boolean;
  privacyOn: boolean;
  togglePrivacy: () => void;
  handleNew: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10">
            <StickyNote size={20} className="text-amber-300" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-slate-500">Knowledge base</p>
            <h1 className="mt-1 truncate text-2xl font-bold text-white">Notities</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isLoading
                ? "Notities laden"
                : `${count} actief - ${archivedCount} archief - ${pinnedCount} vastgezet`}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={togglePrivacy}
            title={privacyOn ? "Notities tonen" : "Notities verbergen"}
            aria-label={privacyOn ? "Notities tonen" : "Notities verbergen"}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
              privacyOn
                ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-300 hover:bg-[var(--color-surface-hover)]"
            )}
          >
            {privacyOn ? <EyeOff size={16} /> : <Eye size={16} />}
            <span className="hidden sm:inline">{privacyOn ? "Verborgen" : "Zichtbaar"}</span>
          </button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={handleNew}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nieuw</span>
          </motion.button>
        </div>
      </div>
    </header>
  );
}
