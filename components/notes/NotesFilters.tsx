"use client";

import type { RefObject } from "react";
import { Columns3, FolderOpen, LayoutGrid, RotateCcw, Search, Tag, X } from "lucide-react";
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
import { SectionTitle, SegmentedButton } from "./NotesPrimitives";

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
  return (
    <>
      <div className="glass p-4">
        <SectionTitle
          icon={Search}
          title="Zoeken en ordenen"
          subtitle={
            activeFilters > 0
              ? `${activeFilters} actieve instelling(en)`
              : "Weergave, slimme filters, tags en sortering"
          }
          action={
            activeFilters > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
              >
                <RotateCcw size={14} />
                Reset
              </button>
            ) : null
          }
        />

        <div className="mt-5 grid gap-4">
          <div className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              ref={searchRef}
              type="search"
              placeholder="Zoek in notities..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base sm:text-sm text-slate-200 outline-none placeholder:text-slate-600"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Zoekterm wissen"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-300"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {VIEW_OPTIONS.map((option) => (
              <SegmentedButton key={option.id} active={viewMode === option.id} icon={option.icon} onClick={() => setViewMode(option.id)}>
                {option.label}
                <span className="text-xs opacity-70">
                  {option.id === "active" ? activeCount : option.id === "completed" ? completedCount : archivedCount}
                </span>
              </SegmentedButton>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <SegmentedButton active={boardMode === "board"} icon={Columns3} onClick={() => setBoardMode("board")}>
              Board
            </SegmentedButton>
            <SegmentedButton active={boardMode === "grid"} icon={LayoutGrid} onClick={() => setBoardMode("grid")}>
              Grid
            </SegmentedButton>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SCOPE_OPTIONS.map((option) => (
              <SegmentedButton
                key={option.id}
                active={noteScope === option.id}
                icon={option.icon}
                onClick={() => setNoteScope(option.id)}
              >
                {option.label}
                <span className="text-xs opacity-60">{scopeCounts[option.id] ?? 0}</span>
              </SegmentedButton>
            ))}
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {SORT_OPTIONS.map((option) => (
              <SegmentedButton
                key={option.id}
                active={sortMode === option.id}
                icon={option.icon}
                onClick={() => setSortMode(option.id)}
              >
                {option.label}
              </SegmentedButton>
            ))}
          </div>
        </div>
      </div>

      {allTags.length > 0 && (
        <section className="col-span-full glass p-4">
          <SectionTitle
            icon={Tag}
            title="Tags"
            subtitle={tagFilter ? `Filter actief: ${privacyOn ? "verborgen tag" : tagFilter}` : "Klik een tag om te filteren"}
            action={
              tagFilter ? (
                <button
                  type="button"
                  onClick={() => setTagFilter(null)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
                >
                  <X size={14} />
                  Wissen
                </button>
              ) : null
            }
          />
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                !tagFilter
                  ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
              )}
            >
              <FolderOpen size={14} />
              Alle
            </button>
            {allTags.map((tag, index) => (
              <button
                key={tag}
                type="button"
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                  tagFilter === tag
                    ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
                )}
              >
                <Tag size={13} />
                {tagLabel(tag, index, privacyOn)}
                <span className="text-xs opacity-60">{tagCounts.get(tag) ?? 0}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
