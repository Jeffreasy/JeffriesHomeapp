"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { useNotes, type NoteCreateData, type NoteRecord } from "@/hooks/useNotes";
import { formatDateRange, getTimeLabel, usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useSchedule } from "@/hooks/useSchedule";
import { NoteEditor } from "@/components/notes/NoteEditor";
import {
  type BoardMode,
  type NoteScope,
  type ViewMode,
  type SortMode,
  getChecklistInfo,
  getDeadlineState,
  getDisplayTitle,
  getScopeCounts,
  isAttentionNote,
  noteMatchesScope,
} from "@/components/notes/NotesUtils";
import { NotesHeader, type NotesTab } from "@/components/notes/NotesHeader";
import { NotesFilters } from "@/components/notes/NotesFilters";
import { NotesList } from "@/components/notes/NotesList";
import { NotesMetricsRow } from "@/components/notes/NotesMetrics";
import { WeekJournal, getMonday } from "@/components/notes/WeekJournal";
import { useConfirm } from "@/components/ui/ConfirmDialog";

export default function NotitiesPage() {
  const { user } = useUser();
  const {
    active,
    archived,
    completed,
    pinned,
    allTags,
    isLoading,
    count,
    create,
    update,
    togglePin,
    toggleComplete,
    archive,
    remove,
    revisions,
    restoreRevision,
  } = useNotes();
  const { hidden: privacyOn, toggle: togglePrivacy } = usePrivacy("notes");
  const { diensten } = useSchedule();
  const { events: agendaEvents, upcoming: upcomingAgendaEvents } = usePersonalEvents({ diensten });
  const { openConfirm } = useConfirm();

  // ── Tab state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<NotesTab>("collection");

  // ── Week Journal state ─────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  // ── Collection state ───────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [boardMode, setBoardMode] = useState<BoardMode>("board");
  const [noteScope, setNoteScope] = useState<NoteScope>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // ── Editor state ───────────────────────────────────────────
  const [editorOpen, setEditorOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRecord | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        setEditNote(null);
        setEditorOpen(true);
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        if (activeTab === "collection") {
          searchRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTab]);

  // ── Collection: filtered & sorted notes ────────────────────
  const sourceNotes = viewMode === "active" ? active : viewMode === "completed" ? completed : archived;
  const scopeCounts = useMemo(() => getScopeCounts(sourceNotes), [sourceNotes]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const note of sourceNotes) {
      for (const tag of note.tags ?? []) {
        map.set(tag, (map.get(tag) ?? 0) + 1);
      }
    }
    return map;
  }, [sourceNotes]);

  const displayed = useMemo(() => {
    let list = [...sourceNotes];

    if (noteScope !== "all") {
      list = list.filter((note) => noteMatchesScope(note, noteScope));
    }

    if (tagFilter) {
      list = list.filter((note) => (note.tags ?? []).includes(tagFilter));
    }

    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((note) => {
        const haystack = `${note.titel ?? ""} ${note.inhoud} ${(note.tags ?? []).join(" ")}`.toLowerCase();
        return haystack.includes(query);
      });
    }

    list.sort((a, b) => {
      if (viewMode === "active" && a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;

      switch (sortMode) {
        case "oldest":
          return a.gewijzigd.localeCompare(b.gewijzigd);
        case "title":
          return getDisplayTitle(a).localeCompare(getDisplayTitle(b), "nl");
        case "deadline": {
          const aDeadline = a.deadline ?? "";
          const bDeadline = b.deadline ?? "";
          if (aDeadline && !bDeadline) return -1;
          if (!aDeadline && bDeadline) return 1;
          if (aDeadline && bDeadline) return aDeadline.localeCompare(bDeadline);
          return b.gewijzigd.localeCompare(a.gewijzigd);
        }
        default:
          return b.gewijzigd.localeCompare(a.gewijzigd);
      }
    });

    return list;
  }, [noteScope, search, sortMode, sourceNotes, tagFilter, viewMode]);

  const boardStats = useMemo(() => {
    let checklistDone = 0;
    let checklistTotal = 0;
    let deadlineSoon = 0;
    let deadlineOverdue = 0;
    let linkedCount = 0;
    let attentionCount = 0;
    let deadlineNext: NoteRecord | null = null;
    let deadlineNextTime = Number.POSITIVE_INFINITY;

    for (const note of active) {
      const checklist = getChecklistInfo(note.inhoud);
      checklistDone += checklist.done;
      checklistTotal += checklist.total;

      if (note.linkedEventId || note.linked_event_id) linkedCount += 1;
      if (isAttentionNote(note)) attentionCount += 1;

      const deadline = getDeadlineState(note.deadline);
      if (deadline.hasDeadline) {
        if (deadline.overdue) deadlineOverdue += 1;
        if (deadline.soon || deadline.today) deadlineSoon += 1;
        if (!deadline.overdue && deadline.timestamp < deadlineNextTime) {
          deadlineNext = note;
          deadlineNextTime = deadline.timestamp;
        }
      }
    }

    return {
      checklistDone,
      checklistTotal,
      deadlineSoon,
      deadlineOverdue,
      deadlineNext,
      linkedCount,
      attentionCount,
    };
  }, [active]);

  const activeFilters = [
    search.trim(),
    tagFilter,
    viewMode !== "active",
    noteScope !== "all",
    sortMode !== "recent",
  ].filter(Boolean).length;
  const eventLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of agendaEvents) {
      map.set(event.eventId, formatEventLabel(event));
    }
    return map;
  }, [agendaEvents]);

  // ── Handlers ───────────────────────────────────────────────
  const handleEdit = (note: NoteRecord) => {
    setEditNote(note);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setEditNote(null);
    setEditorOpen(true);
  };

  const handleSave = async (data: NoteCreateData) => {
    if (editNote) {
      await update(editNote.id, data);
    } else {
      await create(data);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await openConfirm({
      title: "Notitie verwijderen?",
      message: "Deze notitie en de bijbehorende geschiedenis worden permanent verwijderd.",
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (confirmed) await remove(id);
  };

  const handleUpdateContent = async (id: string, inhoud: string) => {
    await update(id, { inhoud });
  };

  const handleNavigateToNote = (title: string) => {
    setActiveTab("collection");
    setViewMode("active");
    setTagFilter(null);
    setSearch(title);
    searchRef.current?.focus();
  };

  const clearFilters = () => {
    setSearch("");
    setTagFilter(null);
    setNoteScope("all");
    setSortMode("recent");
    setViewMode("active");
  };

  return (
    <div className="text-slate-100">
      <NotesHeader
        count={count}
        archivedCount={archived.length}
        completedCount={completed.length}
        pinnedCount={pinned.length}
        isLoading={isLoading}
        privacyOn={privacyOn}
        togglePrivacy={togglePrivacy}
        handleNew={handleNew}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Week Journal Tab ── */}
        {activeTab === "journal" && (
          <WeekJournal
            notes={[...active, ...completed]}
            diensten={diensten}
            agendaEvents={upcomingAgendaEvents}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            onEdit={handleEdit}
            onCreate={create}
            onToggleComplete={toggleComplete}
          />
        )}

        {/* ── Collection Tab ── */}
        {activeTab === "collection" && (
          <>
            <NotesMetricsRow
              totalCount={active.length + completed.length + archived.length}
              activeCount={active.length}
              completedCount={completed.length}
              archivedCount={archived.length}
              checklistDone={boardStats.checklistDone}
              checklistTotal={boardStats.checklistTotal}
              attentionCount={boardStats.attentionCount}
              deadlineSoon={boardStats.deadlineSoon}
              deadlineOverdue={boardStats.deadlineOverdue}
              deadlineNext={boardStats.deadlineNext}
              tagsCount={allTags.length}
              linkedCount={boardStats.linkedCount}
            />

            <NotesFilters
              activeFilters={activeFilters}
              search={search}
              setSearch={setSearch}
              searchRef={searchRef}
              clearFilters={clearFilters}
              viewMode={viewMode}
              setViewMode={setViewMode}
              boardMode={boardMode}
              setBoardMode={setBoardMode}
              noteScope={noteScope}
              setNoteScope={setNoteScope}
              scopeCounts={scopeCounts}
              sortMode={sortMode}
              setSortMode={setSortMode}
              activeCount={active.length}
              completedCount={completed.length}
              archivedCount={archived.length}
              allTags={allTags}
              tagCounts={tagCounts}
              tagFilter={tagFilter}
              setTagFilter={setTagFilter}
              privacyOn={privacyOn}
            />

            <NotesList
              displayed={displayed}
              isLoading={isLoading}
              viewMode={viewMode}
              boardMode={boardMode}
              sortMode={sortMode}
              search={search}
              tagFilter={tagFilter}
              privacyOn={privacyOn}
              handleNew={handleNew}
              clearFilters={clearFilters}
              handleEdit={handleEdit}
              togglePin={togglePin}
              toggleComplete={toggleComplete}
              archive={archive}
              handleDelete={handleDelete}
              handleUpdateContent={handleUpdateContent}
              handleNavigateToNote={handleNavigateToNote}
              eventLabelById={eventLabelById}
            />
          </>
        )}
      </main>

      <AnimatePresence>
        {editorOpen && (
          <NoteEditor
            key={editNote?.id ?? "new-note"}
            note={editNote}
            userId={user?.id}
            onSave={handleSave}
            onClose={() => {
              setEditorOpen(false);
              setEditNote(null);
            }}
            onDelete={remove}
            onArchive={archive}
            onTogglePin={togglePin}
            onToggleComplete={toggleComplete}
            onLoadRevisions={revisions}
            onRestoreRevision={restoreRevision}
            eventOptions={agendaEvents}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function formatEventLabel(event: PersonalEvent) {
  return `${formatDateRange(event)} · ${getTimeLabel(event)} · ${event.titel}`;
}
