"use client";

import { useState, type RefObject } from "react";
import { Columns3, FolderOpen, LayoutGrid, Pencil, RotateCcw, Settings2, SlidersHorizontal, Tag, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { ModalCancelButton } from "@/components/ui/ModalCancelButton";
import { SearchField } from "@/components/ui/SearchField";
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
    <div className={cn(surfaceVariants({ padding: "xs" }), "p-2")}>
      {/* Compact primary toolbar: search + view + a single Filters disclosure.
          Everything else lives behind "Filters" so the note list stays near the
          top of the screen. On phones it wraps to two rows (search, then view +
          Filters) so the view labels stay readable without overflowing. */}
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          ref={searchRef}
          label="Zoeken in notities"
          placeholder={privacyOn ? "Zoeken staat uit in privacymodus" : "Zoeken in notities…"}
          value={privacyOn ? "" : search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={!privacyOn ? () => setSearch("") : undefined}
          disabled={privacyOn}
          wrapperClassName="w-full sm:w-auto sm:flex-1"
          className="text-base sm:text-sm"
        />
        {/* View switch — icon-only on phone, labels from md up */}
        <div className="flex min-h-[var(--touch-target)] shrink-0 items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-0.5">
          {VIEW_OPTIONS.map((option) => {
            const count = option.id === "active" ? activeCount : option.id === "completed" ? completedCount : archivedCount;
            const active = viewMode === option.id;
            return (
              <SegmentedButton
                key={option.id}
                active={active}
                icon={option.icon}
                onClick={() => setViewMode(option.id)}
                aria-pressed={active}
                className="px-2.5"
              >
                <span>{option.id === "completed" ? "Klaar" : option.label}</span>
                <span className="text-xs tabular-nums opacity-70">{count}</span>
              </SegmentedButton>
            );
          })}
        </div>

        {/* Filters disclosure */}
        <Button
          variant={activeFilters > 0 || showAdvanced ? "primary" : "secondary"}
          size="sm"
          onClick={() => setShowAdvanced((value) => !value)}
          aria-label={activeFilters > 0 ? `Filters, ${activeFilters} actief` : "Filters"}
          aria-expanded={showAdvanced}
          title="Sorteren, filters en tags"
          className="min-w-[var(--touch-target)] shrink-0 gap-1.5 px-2.5 sm:px-3"
        >
          <SlidersHorizontal size={15} className="shrink-0" />
          <span className="hidden sm:inline">Filters</span>
          {activeFilters > 0 && (
            <Badge tone="accent" size="sm" className="tabular-nums">
              {activeFilters}
            </Badge>
          )}
        </Button>
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
              <Button
                variant="secondary"
                size="sm"
                onClick={clearFilters}
                className="ml-auto"
              >
                <RotateCcw size={14} />
                Reset
              </Button>
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowTagManager(true)}
                >
                  <Settings2 size={14} />
                  Tags beheren
                </Button>
              )}
              <Button
                variant={!tagFilter ? "primary" : "secondary"}
                size="sm"
                onClick={() => setTagFilter(null)}
                aria-pressed={!tagFilter}
                className="gap-1.5 px-3"
              >
                <FolderOpen size={14} />
                Alle
              </Button>
              {visibleTags.map((tag, index) => (
                <Button
                  key={tag}
                  variant={tagFilter === tag ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  aria-pressed={tagFilter === tag}
                  className="min-w-0 gap-1.5 px-3"
                >
                  <Tag size={13} />
                  <span className="max-w-[8rem] truncate">{tagLabel(tag, index, privacyOn)}</span>
                  <span className="text-xs tabular-nums opacity-60">{tagCounts.get(tag) ?? 0}</span>
                </Button>
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

const TAG_MANAGER_FORM_ID = "notes-tag-manager-rename-form";

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

  return (
    <Modal
      isOpen
      onClose={() => { if (!busyTag) onClose(); }}
      title="Tags beheren"
      maxWidth="md"
      tone="surface"
      closeDisabled={Boolean(busyTag)}
      ariaBusy={Boolean(busyTag)}
      dataAppModal="note-tag-manager"
      className="max-h-[min(80dvh,560px)]"
      contentClassName="space-y-1.5 p-3"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <ModalCancelButton
            onFallback={onClose}
            disabled={Boolean(busyTag)}
            className="w-full sm:w-auto"
          >
            Sluiten
          </ModalCancelButton>
          {renamingTag ? (
            <Button
              type="submit"
              form={TAG_MANAGER_FORM_ID}
              variant="primary"
              loading={busyTag === renamingTag}
              loadingLabel="Hernoemen..."
              disabled={Boolean(busyTag) || !renameValue.trim() || renameValue.trim() === renamingTag}
              className="w-full sm:w-auto"
            >
              Hernoemen
            </Button>
          ) : null}
        </div>
      }
    >
      <form
        id={TAG_MANAGER_FORM_ID}
        onSubmit={(event) => {
          event.preventDefault();
          if (renamingTag) void runRename(renamingTag);
        }}
        className="space-y-1.5"
      >
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
                  <Tag size={13} className="shrink-0 text-[var(--color-primary)]" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--color-text)]">
                    {tag}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--color-text-muted)]">
                    {tagCounts.get(tag) ?? 0}
                  </span>
                  {onRenameTag && (
                    <IconButton
                      label={`Tag ${tag} hernoemen`}
                      title="Hernoemen"
                      icon={<Pencil size={14} />}
                      onClick={() => {
                        setRenamingTag(renamingTag === tag ? null : tag);
                        setRenameValue(tag);
                      }}
                      disabled={Boolean(busyTag)}
                    />
                  )}
                  {onDeleteTag && (
                    <IconButton
                      label={`Tag ${tag} verwijderen uit alle notities`}
                      title="Verwijderen uit alle notities"
                      icon={<Trash2 size={14} />}
                      onClick={() => void runDelete(tag)}
                      disabled={Boolean(busyTag)}
                    />
                  )}
                </div>
                {renamingTag === tag && (
                  <div className="mt-2 flex items-center gap-2">
                    <Input
                      type="text"
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      disabled={busy}
                      aria-label={`Nieuwe naam voor tag ${tag}`}
                      className="min-w-0 flex-1"
                      placeholder="Nieuwe tagnaam"
                    />
                  </div>
                )}
                {busy && (
                  <p className="mt-2 text-xs font-medium text-[var(--color-warning)]" role="status" aria-live="polite">
                    Bezig{progress ? `: ${progress}` : "…"}
                  </p>
                )}
              </div>
            );
          })}
      </form>
    </Modal>
  );
}
