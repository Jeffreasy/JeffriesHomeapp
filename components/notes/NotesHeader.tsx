"use client";

import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  AppPageHeader,
  PageToolbar,
} from "@/components/layout/AppPageShell";
import { AppIcon } from "@/components/ui/AppIcon";
import type { AppIconName } from "@/lib/symbols";
import { cn } from "@/lib/utils";

export type NotesTab = "journal" | "collection";

const NOTES_TABS: ReadonlyArray<{
  id: NotesTab;
  label: string;
  icon: AppIconName;
}> = [
  { id: "journal", label: "Weekjournaal", icon: "book" },
  { id: "collection", label: "Collectie", icon: "list" },
];

interface NotesHeaderProps {
  count: number;
  archivedCount: number;
  completedCount: number;
  pinnedCount: number;
  isLoading: boolean;
  privacyOn: boolean;
  isPrivacyUnknown: boolean;
  togglePrivacy: () => void;
  handleNew: () => void;
  activeTab: NotesTab;
  onTabChange: (tab: NotesTab) => void;
}

export function NotesHeader({
  count,
  archivedCount,
  completedCount,
  pinnedCount,
  isLoading,
  privacyOn,
  isPrivacyUnknown,
  togglePrivacy,
  handleNew,
  activeTab,
  onTabChange,
}: NotesHeaderProps) {
  const handleTabKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const currentIndex = NOTES_TABS.findIndex((tab) => tab.id === activeTab);
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % NOTES_TABS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + NOTES_TABS.length) % NOTES_TABS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = NOTES_TABS.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = NOTES_TABS[nextIndex];
    onTabChange(nextTab.id);
    document.getElementById(`notes-tab-${nextTab.id}`)?.focus();
  };

  return (
    <>
      <AppPageHeader
        className="!flex-row !items-start !justify-between gap-3"
        leading={<AppIcon name="notes" tone="amber" size="md" framed active />}
        title="Notities"
        description={
          isLoading
            ? "Werkruimte laden…"
            : `${count} actief · ${completedCount} afgerond · ${archivedCount} archief${
                pinnedCount > 0 ? ` · ${pinnedCount} vastgezet` : ""
              }`
        }
        actions={
          <>
            <button
              type="button"
              onClick={togglePrivacy}
              disabled={isPrivacyUnknown}
              title={isPrivacyUnknown ? "Privacyvoorkeur wordt veilig geladen" : privacyOn ? "Notities tonen" : "Notities verbergen"}
              aria-label={isPrivacyUnknown ? "Privacyvoorkeur wordt geladen" : privacyOn ? "Notities tonen" : "Notities verbergen"}
              aria-pressed={privacyOn}
              aria-busy={isPrivacyUnknown}
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 disabled:cursor-wait disabled:opacity-60",
                privacyOn
                  ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-200"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-300 hover:bg-[var(--color-surface-hover)]",
              )}
            >
              <AppIcon name={isPrivacyUnknown ? "activity" : privacyOn ? "hide" : "show"} tone={isPrivacyUnknown ? "slate" : privacyOn ? "indigo" : "slate"} size="sm" />
              <span className="hidden sm:inline">{isPrivacyUnknown ? "Laden" : privacyOn ? "Verborgen" : "Zichtbaar"}</span>
            </button>
            <button
              type="button"
              onClick={handleNew}
              title="Nieuwe notitie (toets n)"
              aria-label="Nieuwe notitie"
              aria-keyshortcuts="n"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
            >
              <AppIcon name="add" tone="amber" size="sm" />
              <span>Nieuw</span>
            </button>
          </>
        }
      />

      <PageToolbar label="Notitie-weergave" className="mt-4">
        <div
          className="grid w-full grid-cols-2 gap-1"
          role="tablist"
          aria-label="Notitie-weergave"
        >
          {NOTES_TABS.map(({ id, label, icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                id={`notes-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`notes-tabpanel-${id}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onTabChange(id)}
                onKeyDown={handleTabKeyDown}
                className={cn(
                  "inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
                  isActive
                    ? "bg-amber-500/15 text-amber-200"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]",
                )}
              >
                <AppIcon name={icon} tone={isActive ? "amber" : "slate"} size="sm" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      </PageToolbar>
    </>
  );
}
