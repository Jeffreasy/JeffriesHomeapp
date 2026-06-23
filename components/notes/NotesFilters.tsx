"use client";

import { useState, type RefObject } from "react";
import { Columns3, FolderOpen, LayoutGrid, RotateCcw, Search, SlidersHorizontal, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type BoardMode,
  type NoteScope,
  type ViewMode,
  type SortMode,
  SCOPE_OPTIONS,
  SORT_OPTIONS,
  VIEW_OPTIONS,
  tagLabel,
} from "./NotesUtils";
import { SegmentedButton } from "./NotesPrimitives";

export function NotesFilters({
  activeFilters,
  search,
  setSearch,
  searchRef,
  clearFilters,
  viewMode,
  setViewMode,
  boardMode,
  setBoardMode,
  noteScope,
  setNoteScope,
  scopeCounts,
  sortMode,
  setSortMode,
  activeCount,
  completedCount,
  archivedCount,
  allTags,
  tagCounts,
  tagFilter,
  setTagFilter,
  privacyOn,
}: {
  activeFilters: number;
  search: string;
  setSearch: (search: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  clearFilters: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  boardMode: BoardMode;
  setBoardMode: (mode: BoardMode) => void;
  noteScope: NoteScope;
  setNoteScope: (scope: NoteScope) => void;
  scopeCounts: Record<NoteScope, number>;
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  activeCount: number;
  completedCount: number;
  archivedCount: number;
  allTags: string[];
  tagCounts: Map<string, number>;
  tagFilter: string | null;
  setTagFilter: (tag: string | null) => void;
  privacyOn: boolean;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const visibleScopeOptions = SCOPE_OPTIONS.filter(
    (option) => option.id === "all" || noteScope === option.id || (scopeCounts[option.id] ?? 0) > 0,
  );
  // Only show tags that occur in the current view (plus the active one) — no dead "0" chips.
  const visibleTags = allTags.filter((tag) => (tagCounts.get(tag) ?? 0) > 0 || tagFilter === tag);

  return (
    <div className="glass p-2">
      {/* Compact primary toolbar: search + view + a single Filters disclosure.
          Everything else lives behind "Filters" so the note list stays near the
          top of the screen. On phones it wraps to two rows (search, then view +
          Filters) so the view labels stay readable without overflowing. */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:w-auto sm:flex-1">
          <Search size={15} className="shrink-0 text-slate-500" />
          <input
            ref={searchRef}
            type="search"
            placeholder={privacyOn ? "Zoeken uit in privacymodus" : "Zoeken in notities..."}
            value={privacyOn ? "" : search}
            onChange={(event) => setSearch(event.target.value)}
            disabled={privacyOn}
            className="min-w-0 flex-1 bg-transparent text-base text-slate-200 outline-none placeholder:text-slate-600 disabled:opacity-60 sm:text-sm"
          />
          {search && !privacyOn && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Zoekterm wissen"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* View switch — icon-only on phone, labels from md up */}
        <div className="flex h-10 shrink-0 items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
          {VIEW_OPTIONS.map((option) => {
            const count = option.id === "active" ? activeCount : option.id === "completed" ? completedCount : archivedCount;
            const active = viewMode === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setViewMode(option.id)}
                aria-pressed={active}
                title={option.label}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/60",
                  active ? "bg-amber-500/15 text-amber-200" : "text-slate-400 hover:text-slate-200",
                )}
              >
                <option.icon size={15} className="shrink-0" />
                <span>{option.id === "completed" ? "Klaar" : option.label}</span>
                <span className="text-xs tabular-nums opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters disclosure */}
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          aria-expanded={showAdvanced}
          title="Sorteren, filters en tags"
          className={cn(
            "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-amber-400/60 sm:px-3",
            activeFilters > 0 || showAdvanced
              ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
              : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:text-slate-200",
          )}
        >
          <SlidersHorizontal size={15} className="shrink-0" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilters > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-xs font-bold tabular-nums text-[var(--color-primary-foreground)]">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Advanced controls — collapsed by default */}
      {showAdvanced && (
        <div className="mt-2 space-y-3 border-t border-[var(--color-border)] pt-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="flex gap-1">
              <SegmentedButton active={boardMode === "board"} icon={Columns3} onClick={() => setBoardMode("board")} className="px-2.5">Board</SegmentedButton>
              <SegmentedButton active={boardMode === "grid"} icon={LayoutGrid} onClick={() => setBoardMode("grid")} className="px-2.5">Grid</SegmentedButton>
            </div>
            <div className="flex flex-wrap gap-1">
              {SORT_OPTIONS.map((option) => (
                <SegmentedButton key={option.id} active={sortMode === option.id} icon={option.icon} onClick={() => setSortMode(option.id)} className="px-2.5">
                  {option.label}
                </SegmentedButton>
              ))}
            </div>
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            )}
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {visibleScopeOptions.map((option) => (
              <SegmentedButton key={option.id} active={noteScope === option.id} icon={option.icon} onClick={() => setNoteScope(option.id)} className="shrink-0">
                <span className="truncate">{option.label}</span>
                <span className="text-xs tabular-nums opacity-60">{scopeCounts[option.id] ?? 0}</span>
              </SegmentedButton>
            ))}
          </div>

          {visibleTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors",
                  !tagFilter
                    ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200",
                )}
              >
                <FolderOpen size={14} />
                Alle
              </button>
              {visibleTags.map((tag, index) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={cn(
                    "inline-flex h-9 min-w-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors",
                    tagFilter === tag
                      ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200",
                  )}
                >
                  <Tag size={13} />
                  <span className="max-w-[8rem] truncate">{tagLabel(tag, index, privacyOn)}</span>
                  <span className="text-xs tabular-nums opacity-60">{tagCounts.get(tag) ?? 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
