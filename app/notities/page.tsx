"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNotes, type NoteCreateData, type NoteRecord } from "@/hooks/useNotes";
import { usePrivacy } from "@/hooks/usePrivacy";
import { NoteEditor } from "@/components/notes/NoteEditor";
import { type ViewMode, type SortMode, SORT_OPTIONS, getChecklistInfo, getDisplayTitle } from "@/components/notes/NotesUtils";
import { NotesHeader } from "@/components/notes/NotesHeader";
import { NotesFilters } from "@/components/notes/NotesFilters";
import { NotesMetricsRow, NotesSignals } from "@/components/notes/NotesMetrics";
import { NotesList } from "@/components/notes/NotesList";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Search } from "lucide-react";

export default function NotitiesPage() {
  const {
    notes,
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

  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRecord | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateNow = () => setNowMs(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(interval);
  }, []);

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
        searchRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sourceNotes = viewMode === "active" ? notes : archived;

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

  const checklistStats = useMemo(() => {
    return notes.reduce(
      (total, note) => {
        const info = getChecklistInfo(note.inhoud);
        total.done += info.done;
        total.total += info.total;
        return total;
      },
      { done: 0, total: 0 }
    );
  }, [notes]);

  const deadlineStats = useMemo(() => {
    if (!nowMs) return { overdue: 0, soon: 0, next: null as NoteRecord | null };
    const week = nowMs + 7 * 24 * 60 * 60 * 1000;
    const withDeadline = notes
      .filter((note) => note.deadline)
      .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));

    return {
      overdue: withDeadline.filter((note) => new Date(note.deadline as string).getTime() < nowMs).length,
      soon: withDeadline.filter((note) => {
        const time = new Date(note.deadline as string).getTime();
        return time >= nowMs && time <= week;
      }).length,
      next: withDeadline.find((note) => new Date(note.deadline as string).getTime() >= nowMs) ?? null,
    };
  }, [notes, nowMs]);

  const highPriorityCount = notes.filter((note) => note.prioriteit === "hoog").length;
  const linkedCount = notes.filter((note) => note.linkedEventId).length;
  const totalCount = notes.length + archived.length;
  const activeFilters = [search.trim(), tagFilter, viewMode === "archived", sortMode !== "recent"].filter(Boolean).length;

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
      />

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
          <CollapsibleSection
            title="Geavanceerd Zoeken & Filters"
            subtitle={`${activeFilters} actieve filters`}
            icon={<Search size={18} />}
            theme="primary"
            defaultOpen={false}
            keepMounted={true}
          >
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
              activeCount={notes.length}
              archivedCount={archived.length}
              allTags={allTags}
              tagCounts={tagCounts}
              tagFilter={tagFilter}
              setTagFilter={setTagFilter}
              privacyOn={privacyOn}
            />
          </CollapsibleSection>

          <NotesSignals
            pinnedCount={pinned.length}
            overdueCount={deadlineStats.overdue}
            highPriorityCount={highPriorityCount}
          />
        </section>

        <NotesMetricsRow
          totalCount={totalCount}
          activeCount={notes.length}
          archivedCount={archived.length}
          checklistDone={checklistStats.done}
          checklistTotal={checklistStats.total}
          deadlineSoon={deadlineStats.soon}
          deadlineOverdue={deadlineStats.overdue}
          deadlineNext={deadlineStats.next}
          tagsCount={allTags.length}
          linkedCount={linkedCount}
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
      </main>

      <AnimatePresence>
        {editorOpen && (
          <NoteEditor
            note={editNote}
            onSave={handleSave}
            onClose={() => {
              setEditorOpen(false);
              setEditNote(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
