"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { useNotes, type NoteCreateData, type NoteRecord } from "@/hooks/useNotes";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useSchedule } from "@/hooks/useSchedule";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { type ViewMode, type SortMode, getDisplayTitle } from "@/components/notes/NotesUtils";
import { NotesHeader, type NotesTab } from "@/components/notes/NotesHeader";
import { NotesFilters } from "@/components/notes/NotesFilters";
import { NotesList } from "@/components/notes/NotesList";
import { WeekJournal, getMonday } from "@/components/notes/WeekJournal";

export default function NotitiesPage() {
  const { user } = useUser();
  const {
    active,
    archived,
    pinned,
    allTags,
    isLoading,
    count,
    create,
    update,
    togglePin,
    archive,
    remove,
  } = useNotes();
  const { hidden: privacyOn, toggle: togglePrivacy } = usePrivacy("notes");
  const { diensten } = useSchedule();

  // ── Tab state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<NotesTab>("journal");

  // ── Week Journal state ─────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  // ── Collection state ───────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("active");
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
  const sourceNotes = viewMode === "active" ? active : archived;

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
  }, [search, sortMode, sourceNotes, tagFilter, viewMode]);

  const activeFilters = [search.trim(), tagFilter, viewMode === "archived", sortMode !== "recent"].filter(Boolean).length;

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

  const handleDelete = (id: string) => {
    if (confirm("Notitie permanent verwijderen?")) {
      remove(id);
    }
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
    setSortMode("recent");
    setViewMode("active");
  };

  return (
    <div className="text-slate-100">
      <NotesHeader
        count={count}
        archivedCount={archived.length}
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
            notes={active}
            diensten={diensten}
            weekStart={weekStart}
            onWeekChange={setWeekStart}
            onEdit={handleEdit}
            onCreate={create}
          />
        )}

        {/* ── Collection Tab ── */}
        {activeTab === "collection" && (
          <>
            <NotesFilters
              activeFilters={activeFilters}
              search={search}
              setSearch={setSearch}
              searchRef={searchRef}
              clearFilters={clearFilters}
              viewMode={viewMode}
              setViewMode={setViewMode}
              sortMode={sortMode}
              setSortMode={setSortMode}
              activeCount={active.length}
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
              sortMode={sortMode}
              search={search}
              tagFilter={tagFilter}
              privacyOn={privacyOn}
              handleNew={handleNew}
              clearFilters={clearFilters}
              handleEdit={handleEdit}
              togglePin={togglePin}
              archive={archive}
              handleDelete={handleDelete}
              handleUpdateContent={handleUpdateContent}
              handleNavigateToNote={handleNavigateToNote}
            />
          </>
        )}
      </main>

      <AnimatePresence>
        {editorOpen && (
          <NoteEditor
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}
