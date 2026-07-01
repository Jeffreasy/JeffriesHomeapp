"use client";

import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Columns3, FolderOpen, LayoutGrid, Pencil, RotateCcw, Search, Settings2, SlidersHorizontal, Tag, Trash2, X } from "lucide-react";
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
  onRenameTag,
  onDeleteTag,
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
  /** M-J: hernoemt de tag in alle geladen notities (bevestiging bij de caller). */
  onRenameTag?: (tag: string, next: string, onProgress?: (index: number, total: number) => void) => Promise<boolean>;
  /** M-J: verwijdert de tag uit alle geladen notities (bevestiging bij de caller). */
  onDeleteTag?: (tag: string, onProgress?: (index: number, total: number) => void) => Promise<boolean>;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);

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
            placeholder={privacyOn ? "Zoeken staat uit in privacymodus" : "Zoeken in notities..."}
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
              {/* M-J: pragmatisch tagbeheer — hernoemen/verwijderen over alle
                  geladen notities, achter een kleine modal. */}
              {!privacyOn && (onRenameTag || onDeleteTag) && allTags.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowTagManager(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-slate-400 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
                >
                  <Settings2 size={14} />
                  Tags beheren
                </button>
              )}
              <button
                type="button"
                onClick={() => setTagFilter(null)}
                aria-pressed={!tagFilter}
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
                  aria-pressed={tagFilter === tag}
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

      {showTagManager && (
        <TagManagerModal
          tags={allTags}
          tagCounts={tagCounts}
          onClose={() => setShowTagManager(false)}
          onRenameTag={onRenameTag}
          onDeleteTag={onDeleteTag}
        />
      )}
    </div>
  );
}

// ─── M-J: Tagbeheer-modal ─────────────────────────────────────────────────────
// Klein en veilig: per tag "Hernoemen" (inline invoer) en "Verwijderen uit alle
// notities". De caller bevestigt via de gedeelde ConfirmDialog en draait de
// client-side loop; hier alleen UI + voortgang ("X van Y…").

function TagManagerModal({
  tags,
  tagCounts,
  onClose,
  onRenameTag,
  onDeleteTag,
}: {
  tags: string[];
  tagCounts: Map<string, number>;
  onClose: () => void;
  onRenameTag?: (tag: string, next: string, onProgress?: (index: number, total: number) => void) => Promise<boolean>;
  onDeleteTag?: (tag: string, onProgress?: (index: number, total: number) => void) => Promise<boolean>;
}) {
  const [renamingTag, setRenamingTag] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyTag, setBusyTag] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busyTag) return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
    };
    // Capture-fase zodat de pagina-shortcuts ("n") deze Escape niet zien.
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [busyTag, onClose]);

  const onProgress = (index: number, total: number) => setProgress(`${index} van ${total}…`);

  const runRename = async (tag: string) => {
    if (!onRenameTag || busyTag) return;
    setBusyTag(tag);
    setProgress("");
    try {
      await onRenameTag(tag, renameValue, onProgress);
      setRenamingTag(null);
      setRenameValue("");
    } finally {
      setBusyTag(null);
      setProgress("");
    }
  };

  const runDelete = async (tag: string) => {
    if (!onDeleteTag || busyTag) return;
    setBusyTag(tag);
    setProgress("");
    try {
      await onDeleteTag(tag, onProgress);
    } finally {
      setBusyTag(null);
      setProgress("");
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => { if (!busyTag) onClose(); }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tags beheren"
        className="relative flex max-h-[min(80dvh,560px)] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl sm:max-w-md sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-bold text-slate-200">Tags beheren</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(busyTag)}
            aria-label="Tagbeheer sluiten"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-200 disabled:opacity-45"
          >
            <X size={16} />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3">
          {tags.length === 0 && (
            <p className="px-1 py-4 text-center text-sm text-[var(--color-text-muted)]">
              Geen tags gevonden.
            </p>
          )}
          {tags.map((tag) => {
            const busy = busyTag === tag;
            return (
              <div
                key={tag}
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Tag size={13} className="shrink-0 text-amber-400/70" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">
                    {tag}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]">
                    {tagCounts.get(tag) ?? 0}
                  </span>
                  {onRenameTag && (
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingTag(renamingTag === tag ? null : tag);
                        setRenameValue(tag);
                      }}
                      disabled={Boolean(busyTag)}
                      aria-label={`Tag ${tag} hernoemen`}
                      title="Hernoemen"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-200 disabled:opacity-45"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {onDeleteTag && (
                    <button
                      type="button"
                      onClick={() => void runDelete(tag)}
                      disabled={Boolean(busyTag)}
                      aria-label={`Tag ${tag} verwijderen uit alle notities`}
                      title="Verwijderen uit alle notities"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-500/15 hover:text-red-300 disabled:opacity-45"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                {renamingTag === tag && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void runRename(tag);
                        }
                      }}
                      disabled={busy}
                      aria-label={`Nieuwe naam voor tag ${tag}`}
                      className="h-9 min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-amber-500/40"
                      placeholder="Nieuwe tagnaam"
                    />
                    <button
                      type="button"
                      onClick={() => void runRename(tag)}
                      disabled={busy || !renameValue.trim() || renameValue.trim() === tag}
                      className="h-9 shrink-0 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-xs font-bold text-amber-200 transition-colors hover:bg-amber-500/25 disabled:opacity-45"
                    >
                      Hernoemen
                    </button>
                  </div>
                )}
                {busy && (
                  <p className="mt-2 text-xs font-medium text-amber-300" role="status" aria-live="polite">
                    Bezig{progress ? `: ${progress}` : "…"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}
