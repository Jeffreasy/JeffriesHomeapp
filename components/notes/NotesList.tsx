"use client";

import { AlertTriangle, Archive, CalendarClock, CheckCircle2, Inbox, Link2, NotebookPen, Pin, Plus, RotateCcw, Sparkles } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { NoteCard } from "./NoteCard";
import { SectionTitle } from "./NotesPrimitives";
import type { NoteRecord } from "@/hooks/useNotes";
import type { BoardMode, ViewMode, SortMode } from "./NotesUtils";
import { getDeadlineState, isAttentionNote, SORT_OPTIONS } from "./NotesUtils";
import type { LucideIcon } from "lucide-react";

export function NotesList({
  displayed,
  isLoading,
  viewMode,
  boardMode,
  sortMode,
  search,
  tagFilter,
  privacyOn,
  handleNew,
  clearFilters,
  handleEdit,
  togglePin,
  toggleComplete,
  archive,
  handleDelete,
  handleUpdateContent,
  handleNavigateToNote,
  eventLabelById,
}: {
  displayed: NoteRecord[];
  isLoading: boolean;
  viewMode: ViewMode;
  boardMode: BoardMode;
  sortMode: SortMode;
  search: string;
  tagFilter: string | null;
  privacyOn: boolean;
  handleNew: () => void;
  clearFilters: () => void;
  handleEdit: (note: NoteRecord) => void;
  togglePin: (id: string) => void | Promise<void>;
  toggleComplete: (id: string) => void | Promise<void>;
  archive: (id: string) => void | Promise<void>;
  handleDelete: (id: string) => void | Promise<void>;
  handleUpdateContent: (id: string, inhoud: string) => void | Promise<void>;
  handleNavigateToNote: (title: string) => void;
  eventLabelById?: Map<string, string>;
}) {
  const activeSort = SORT_OPTIONS.find((option) => option.id === sortMode) ?? SORT_OPTIONS[0];
  const boardGroups = buildBoardGroups(displayed, viewMode);
  const mobileBoardGroups = boardGroups.filter((group) => group.notes.length > 0);

  return (
    <section className="min-w-0 space-y-4">
      <div className="glass p-3 sm:p-4">
        <SectionTitle
          icon={NotebookPen}
          title={viewMode === "active" ? "Notitie-board" : viewMode === "completed" ? "Afgeronde notities" : "Archief"}
          subtitle={
            isLoading
              ? "Laden..."
              : `${displayed.length} zichtbaar - ${boardMode === "board" ? "board" : "grid"} - ${activeSort.label.toLowerCase()}`
          }
          action={
            <button
              type="button"
              onClick={handleNew}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/20 sm:w-auto"
            >
              <Plus size={16} />
              Nieuwe notitie
            </button>
          }
        />
      </div>

      {isLoading ? (
        <div className="glass flex min-h-[260px] items-center justify-center p-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="glass flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-12 text-center">
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
      ) : boardMode === "board" ? (
        <>
          <div className="space-y-3 md:hidden">
            {mobileBoardGroups.map((group) => (
              <section
                key={group.id}
                className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3"
              >
                <BoardGroupHeader group={group} />
                <div className="mt-3 space-y-2.5">
                  <AnimatePresence mode="popLayout">
                    {group.notes.map((note) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        density="compact"
                        onEdit={handleEdit}
                        onTogglePin={togglePin}
                        onToggleComplete={toggleComplete}
                        onArchive={archive}
                        onDelete={handleDelete}
                        onUpdateContent={handleUpdateContent}
                        onNavigateToNote={handleNavigateToNote}
                        linkedEventLabel={getLinkedEventLabel(note, eventLabelById)}
                        masked={privacyOn}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>

          <div className="hidden grid-cols-1 gap-3 md:grid md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {boardGroups.map((group) => (
              <section
                key={group.id}
                className="min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3"
              >
                <BoardGroupHeader group={group} />

                <div className="mt-3 space-y-3">
                  <AnimatePresence mode="popLayout">
                    {group.notes.length > 0 ? (
                      group.notes.map((note) => (
                        <NoteCard
                          key={note.id}
                          note={note}
                          density="compact"
                          onEdit={handleEdit}
                          onTogglePin={togglePin}
                          onToggleComplete={toggleComplete}
                          onArchive={archive}
                          onDelete={handleDelete}
                          onUpdateContent={handleUpdateContent}
                          onNavigateToNote={handleNavigateToNote}
                          linkedEventLabel={getLinkedEventLabel(note, eventLabelById)}
                          masked={privacyOn}
                        />
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed border-[var(--color-border)] px-3 py-6 text-center text-xs text-slate-600">
                        Geen notities in deze kolom.
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {displayed.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                onEdit={handleEdit}
                onTogglePin={togglePin}
                onToggleComplete={toggleComplete}
                onArchive={archive}
                onDelete={handleDelete}
                onUpdateContent={handleUpdateContent}
                onNavigateToNote={handleNavigateToNote}
                linkedEventLabel={getLinkedEventLabel(note, eventLabelById)}
                masked={privacyOn}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

function BoardGroupHeader({ group }: { group: BoardGroup }) {
  return (
    <div className="flex min-h-[38px] items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${group.surface}`}>
          <group.icon size={15} className={group.iconClass} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-bold text-slate-100">{group.title}</h3>
          <p className="truncate text-xs text-slate-500">{group.subtitle}</p>
        </div>
      </div>
      <span className="rounded-md bg-black/15 px-2 py-1 text-xs font-semibold tabular-nums text-slate-400">
        {group.notes.length}
      </span>
    </div>
  );
}

function getLinkedEventLabel(note: NoteRecord, eventLabelById?: Map<string, string>) {
  const linkedId = note.linkedEventId ?? note.linked_event_id;
  return linkedId ? eventLabelById?.get(linkedId) : undefined;
}

type BoardGroup = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconClass: string;
  surface: string;
  notes: NoteRecord[];
};

function buildBoardGroups(notes: NoteRecord[], viewMode: ViewMode): BoardGroup[] {
  if (viewMode === "archived") {
    return [{
      id: "archive",
      title: "Archief",
      subtitle: "Bewaard buiten actief",
      icon: Archive,
      iconClass: "text-slate-300",
      surface: "bg-slate-500/10",
      notes,
    }];
  }

  if (viewMode === "completed") {
    return [{
      id: "completed",
      title: "Afgerond",
      subtitle: "Klaar, maar vindbaar",
      icon: CheckCircle2,
      iconClass: "text-emerald-300",
      surface: "bg-emerald-500/10",
      notes,
    }];
  }

  const groups: BoardGroup[] = [
    {
      id: "pinned",
      title: "Vastgezet",
      subtitle: "Blijft bovenaan",
      icon: Pin,
      iconClass: "text-amber-300",
      surface: "bg-amber-500/10",
      notes: [],
    },
    {
      id: "attention",
      title: "Aandacht",
      subtitle: "Hoog, vandaag of verlopen",
      icon: AlertTriangle,
      iconClass: "text-rose-300",
      surface: "bg-rose-500/10",
      notes: [],
    },
    {
      id: "planned",
      title: "Gepland",
      subtitle: "Met deadline",
      icon: CalendarClock,
      iconClass: "text-sky-300",
      surface: "bg-sky-500/10",
      notes: [],
    },
    {
      id: "linked",
      title: "Agenda",
      subtitle: "Gekoppelde afspraken",
      icon: Link2,
      iconClass: "text-cyan-300",
      surface: "bg-cyan-500/10",
      notes: [],
    },
    {
      id: "other",
      title: "Overig",
      subtitle: "Vrije notities",
      icon: Inbox,
      iconClass: "text-slate-300",
      surface: "bg-slate-500/10",
      notes: [],
    },
  ];

  const byId = new Map(groups.map((group) => [group.id, group]));
  for (const note of notes) {
    if (note.isPinned || note.is_pinned) {
      byId.get("pinned")?.notes.push(note);
    } else if (isAttentionNote(note)) {
      byId.get("attention")?.notes.push(note);
    } else if (getDeadlineState(note.deadline).hasDeadline) {
      byId.get("planned")?.notes.push(note);
    } else if (note.linkedEventId || note.linked_event_id) {
      byId.get("linked")?.notes.push(note);
    } else {
      byId.get("other")?.notes.push(note);
    }
  }

  return groups;
}
