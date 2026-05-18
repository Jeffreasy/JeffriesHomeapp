"use client";

import { NotebookPen, Plus, RotateCcw, Sparkles } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { NoteCard } from "./NoteCard";
import { SectionTitle } from "./NotesPrimitives";
import type { NoteRecord } from "@/hooks/useNotes";
import type { ViewMode, SortMode } from "./NotesUtils";
import { SORT_OPTIONS } from "./NotesUtils";

export function NotesList({
  displayed,
  isLoading,
  viewMode,
  sortMode,
  search,
  tagFilter,
  privacyOn,
  handleNew,
  clearFilters,
  handleEdit,
  togglePin,
  archive,
  handleDelete,
  handleUpdateContent,
  handleNavigateToNote,
}: {
  displayed: NoteRecord[];
  isLoading: boolean;
  viewMode: ViewMode;
  sortMode: SortMode;
  search: string;
  tagFilter: string | null;
  privacyOn: boolean;
  handleNew: () => void;
  clearFilters: () => void;
  handleEdit: (note: NoteRecord) => void;
  togglePin: (id: string) => void;
  archive: (id: string) => void;
  handleDelete: (id: string) => void;
  handleUpdateContent: (id: string, inhoud: string) => void;
  handleNavigateToNote: (title: string) => void;
}) {
  const activeSort = SORT_OPTIONS.find((option) => option.id === sortMode) ?? SORT_OPTIONS[0];

  return (
    <section className="glass min-w-0 p-4">
      <SectionTitle
        icon={NotebookPen}
        title={viewMode === "active" ? "Actieve notities" : "Archief"}
        subtitle={
          isLoading
            ? "Laden..."
            : `${displayed.length} zichtbaar - sortering: ${activeSort.label.toLowerCase()}`
        }
        action={
          <button
            type="button"
            onClick={handleNew}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
          >
            <Plus size={16} />
            Nieuwe notitie
          </button>
        }
      />

      {isLoading ? (
        <div className="flex min-h-[260px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="mt-5 flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-12 text-center">
          <Sparkles size={34} className="text-slate-700" />
          <p className="mt-4 font-semibold text-slate-200">
            {search || tagFilter ? "Geen notities gevonden" : "Nog geen notities"}
          </p>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            {search || tagFilter
              ? "Pas je zoekterm of tagfilter aan om meer notities te zien."
              : "Maak je eerste notitie en leg losse gedachten meteen vast."}
          </p>
          {search || tagFilter ? (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-[var(--color-surface-hover)]"
            >
              <RotateCcw size={14} />
              Filters wissen
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNew}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20"
            >
              <Plus size={14} />
              Eerste notitie maken
            </button>
          )}
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {displayed.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onTogglePin={togglePin}
                onArchive={archive}
                onDelete={handleDelete}
                onUpdateContent={handleUpdateContent}
                onNavigateToNote={handleNavigateToNote}
                masked={privacyOn}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
