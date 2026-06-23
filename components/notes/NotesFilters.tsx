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
  const visibleScopeOptions = SCOPE_OPTIONS.filter(
    (option) => option.id === "all" || noteScope === option.id || (scopeCounts[option.id] ?? 0) > 0,
  );
  // Only show tags that actually occur in the current view (plus the active one,
  // so it stays unselectable) — no dead "0"-count chips.
  const visibleTags = allTags.filter((tag) => (tagCounts.get(tag) ?? 0) > 0 || tagFilter === tag);

  return (
    <>
      <div className="glass p-3 sm:p-4">
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

        <div className="mt-4 grid gap-3 sm:hidden">
          <div className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              ref={searchRef}
              type="search"
              placeholder={privacyOn ? "Zoeken uit in privacymodus" : "Zoek in notities..."}
              value={privacyOn ? "" : search}
              onChange={(event) => setSearch(event.target.value)}
              disabled={privacyOn}
              className="min-w-0 flex-1 bg-transparent text-base sm:text-sm text-slate-200 outline-none placeholder:text-slate-600 disabled:opacity-60"
            />
            {search && !privacyOn && (
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

          <div className="grid grid-cols-3 gap-2">
            {VIEW_OPTIONS.map((option) => (
              <SegmentedButton key={option.id} active={viewMode === option.id} icon={option.icon} onClick={() => setViewMode(option.id)} className="w-full px-2">
                <span className="truncate">{option.id === "completed" ? "Klaar" : option.label}</span>
                <span className="text-xs opacity-70">
                  {option.id === "active" ? activeCount : option.id === "completed" ? completedCount : archivedCount}
                </span>
              </SegmentedButton>
            ))}
          </div>

          <details className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
            <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-300">
              <span>Filters en sortering</span>
              <span className="rounded-md bg-black/20 px-2 py-1 text-xs text-slate-500">
                {activeFilters > 0 ? `${activeFilters} actief` : "Opties"}
              </span>
            </summary>
            <div className="mt-3 grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <SegmentedButton active={boardMode === "board"} icon={Columns3} onClick={() => setBoardMode("board")} className="w-full">
                  Board
                </SegmentedButton>
                <SegmentedButton active={boardMode === "grid"} icon={LayoutGrid} onClick={() => setBoardMode("grid")} className="w-full">
                  Grid
                </SegmentedButton>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {visibleScopeOptions.map((option) => (
                  <SegmentedButton
                    key={option.id}
                    active={noteScope === option.id}
                    icon={option.icon}
                    onClick={() => setNoteScope(option.id)}
                    className="w-full"
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="text-xs opacity-60">{scopeCounts[option.id] ?? 0}</span>
                  </SegmentedButton>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {SORT_OPTIONS.map((option) => (
                  <SegmentedButton
                    key={option.id}
                    active={sortMode === option.id}
                    icon={option.icon}
                    onClick={() => setSortMode(option.id)}
                    className="w-full px-2"
                  >
                    <span className="truncate">{option.label}</span>
                  </SegmentedButton>
                ))}
              </div>

              {visibleTags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-slate-500">Tags</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTagFilter(null)}
                      className={cn(
                        "inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                        !tagFilter
                          ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                          : "border-[var(--color-border)] bg-black/10 text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
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
                          "inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors",
                          tagFilter === tag
                            ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                            : "border-[var(--color-border)] bg-black/10 text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
                        )}
                      >
                        <Tag size={13} />
                        <span className="truncate">{tagLabel(tag, index, privacyOn)}</span>
                        <span className="text-xs opacity-60">{tagCounts.get(tag) ?? 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </details>
        </div>

        <div className="mt-5 hidden gap-4 sm:grid">
          <div className="flex min-h-11 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              ref={searchRef}
              type="search"
              placeholder={privacyOn ? "Zoeken uit in privacymodus" : "Zoek in notities..."}
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
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-300"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {VIEW_OPTIONS.map((option) => (
              <SegmentedButton key={option.id} active={viewMode === option.id} icon={option.icon} onClick={() => setViewMode(option.id)} className="w-full px-2">
                <span className="truncate">{option.label}</span>
                <span className="text-xs opacity-70">
                  {option.id === "active" ? activeCount : option.id === "completed" ? completedCount : archivedCount}
                </span>
              </SegmentedButton>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SegmentedButton active={boardMode === "board"} icon={Columns3} onClick={() => setBoardMode("board")} className="w-full">
              Board
            </SegmentedButton>
            <SegmentedButton active={boardMode === "grid"} icon={LayoutGrid} onClick={() => setBoardMode("grid")} className="w-full">
              Grid
            </SegmentedButton>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {visibleScopeOptions.map((option) => (
              <SegmentedButton
                key={option.id}
                active={noteScope === option.id}
                icon={option.icon}
                onClick={() => setNoteScope(option.id)}
                className="shrink-0"
              >
                <span className="truncate">{option.label}</span>
                <span className="text-xs opacity-60">{scopeCounts[option.id] ?? 0}</span>
              </SegmentedButton>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {SORT_OPTIONS.map((option) => (
              <SegmentedButton
                key={option.id}
                active={sortMode === option.id}
                icon={option.icon}
                onClick={() => setSortMode(option.id)}
                className="w-full px-2"
              >
                <span className="truncate">{option.label}</span>
              </SegmentedButton>
            ))}
          </div>
        </div>
      </div>

      {visibleTags.length > 0 && (
        <section className="col-span-full hidden glass p-3 sm:block sm:p-4">
          <SectionTitle
            icon={Tag}
            title="Tags"
            subtitle={tagFilter ? `Filter actief: ${privacyOn ? "verborgen tag" : tagFilter}` : "Klik een tag om te filteren"}
          />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:flex sm:overflow-x-auto sm:pb-1 sm:scrollbar-none">
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={cn(
                "inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors sm:shrink-0",
                !tagFilter
                  ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                  : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
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
                  "inline-flex h-9 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors sm:shrink-0",
                  tagFilter === tag
                    ? "border-amber-500/35 bg-amber-500/15 text-amber-200"
                    : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-400 hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
                )}
              >
                <Tag size={13} />
                <span className="truncate">{tagLabel(tag, index, privacyOn)}</span>
                <span className="text-xs opacity-60">{tagCounts.get(tag) ?? 0}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
