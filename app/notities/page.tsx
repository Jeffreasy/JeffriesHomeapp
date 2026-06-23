"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useUser } from "@clerk/nextjs";
import { ArrowUpRight, Plus, StickyNote } from "lucide-react";
import { useNotes, type NoteCreateData, type NoteRecord } from "@/hooks/useNotes";
import { useLaventeCareBusinessContextOptions } from "@/hooks/useLaventeCareBusinessContexts";
import { formatDateRange, getTimeLabel, usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useSchedule } from "@/hooks/useSchedule";
import type { DienstRow } from "@/lib/schedule";
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
import { useToast } from "@/components/ui/Toast";
import { resolveLaventeCareBusinessContextFromText } from "@/lib/laventecare/business-context";
import { enrichNoteDraft, getPrimaryWorkspaceContext, parseHashTags } from "@/lib/workspace-context";

export default function NotitiesPage() {
  const { user } = useUser();
  const {
    active,
    archived,
    completed,
    pinned,
    allTags,
    isLoading,
    isError,
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
  const { error: toastError } = useToast();
  const { diensten } = useSchedule();
  const { events: agendaEvents, upcoming: upcomingAgendaEvents } = usePersonalEvents({ diensten });
  const { openConfirm } = useConfirm();
  const laventeCareContextOptions = useLaventeCareBusinessContextOptions();

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
  const [quickText, setQuickText] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      if ((event.key === "n" || event.key === "N") && activeTab === "collection") {
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
  // A non-empty search retrieves across ALL buckets (active+completed+archived)
  // so a note that's since been completed/archived stays findable; clearing the
  // search returns to the scoped view. (Privacy mode disables search entirely.)
  const sourceNotes = useMemo(
    () =>
      !privacyOn && search.trim()
        ? [...active, ...completed, ...archived]
        : viewMode === "active" ? active : viewMode === "completed" ? completed : archived,
    [privacyOn, search, viewMode, active, completed, archived],
  );
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

    // Privacy mode masks card content, so the content-derived filters (search +
    // tag) must NOT run — otherwise the "{n} zichtbaar" count varies by query and
    // becomes an oracle that reveals whether a masked note contains a given word.
    if (!privacyOn && tagFilter) {
      list = list.filter((note) => (note.tags ?? []).includes(tagFilter));
    }

    const query = privacyOn ? "" : search.trim().toLowerCase();
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
  }, [noteScope, search, sortMode, sourceNotes, tagFilter, viewMode, privacyOn]);

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
  const dienstEventOptions = useMemo(
    () => diensten.map(dienstToNoteEvent),
    [diensten],
  );
  const noteEventOptions = useMemo(
    () => mergeNoteEventOptions(agendaEvents, dienstEventOptions),
    [agendaEvents, dienstEventOptions],
  );
  const backlinksById = useMemo(
    () => buildBacklinksById([...active, ...completed, ...archived]),
    [active, completed, archived],
  );
  const eventLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const event of noteEventOptions) {
      map.set(event.eventId, formatEventLabel(event));
    }
    return map;
  }, [noteEventOptions]);

  // ── Handlers ───────────────────────────────────────────────
  const handleEdit = (note: NoteRecord) => {
    setEditNote(note);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setEditNote(null);
    setEditorOpen(true);
  };

  const handleQuickCreate = async () => {
    if (quickSaving) return;
    const { cleanText, extractedTags } = parseHashTags(quickText);
    if (!cleanText) return;

    setQuickSaving(true);
    try {
      const matchedBusinessContext = resolveLaventeCareBusinessContextFromText(cleanText, laventeCareContextOptions);
      const enriched = enrichNoteDraft({ title: cleanText, content: cleanText, tags: extractedTags, businessContext: matchedBusinessContext });
      // Code-point-safe truncation so a title can't split an emoji surrogate pair.
      const titleChars = Array.from(cleanText);
      await create({
        titel: titleChars.length > 80 ? `${titleChars.slice(0, 77).join("")}...` : cleanText,
        inhoud: cleanText,
        tags: enriched.tags.length > 0 ? enriched.tags : undefined,
        symbol: enriched.symbol,
        businessContextType: enriched.businessContext?.type ?? undefined,
        businessContextId: enriched.businessContext?.id ?? undefined,
        businessContextTitle: enriched.businessContext?.title ?? undefined,
      });
      setQuickText("");
    } catch {
      toastError("Notitie opslaan is mislukt — probeer opnieuw");
    } finally {
      setQuickSaving(false);
    }
  };

  const handleSave = async (data: NoteCreateData) => {
    if (editNote) {
      // Send the gewijzigd we opened with so a background change to this note is
      // not silently overwritten — the backend returns 409 and the editor keeps
      // the draft + shows an error instead of clobbering the other write.
      await update(editNote.id, { ...data, expectedGewijzigd: editNote.gewijzigd });
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
    // Open the linked note directly, wherever it lives (active/completed/archived)
    // — forcing the active view + a title search used to hide targets that were
    // completed/archived or filtered out by the current scope.
    const key = normalizeWikiTitle(title);
    const target = [...active, ...completed, ...archived].find(
      (note) => normalizeWikiTitle(getWikiTitle(note)) === key,
    );
    if (target) {
      handleEdit(target);
      return;
    }
    setActiveTab("collection");
    setViewMode("active");
    setNoteScope("all");
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

      <main className="mx-auto flex max-w-7xl flex-col gap-4 px-3 pb-28 pt-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
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
            <NotesCaptureCard
              value={quickText}
              saving={quickSaving}
              onChange={setQuickText}
              onSave={handleQuickCreate}
              onOpenEditor={handleNew}
            />

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
              onScope={(scope) => { setViewMode("active"); setNoteScope(scope); }}
              activeScope={viewMode === "active" ? noteScope : undefined}
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
              isError={isError}
              viewMode={viewMode}
              boardMode={boardMode}
              sortMode={sortMode}
              search={search}
              tagFilter={tagFilter}
              noteScope={noteScope}
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
              backlinksById={backlinksById}
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
            eventOptions={noteEventOptions}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function formatEventLabel(event: PersonalEvent) {
  return `${formatDateRange(event)} · ${getTimeLabel(event)} · ${event.titel}`;
}

function dienstToNoteEvent(dienst: DienstRow): PersonalEvent {
  const title = dienst.titel || dienst.shiftType || "Dienst";
  return {
    _id: dienst.eventId,
    userId: "",
    eventId: dienst.eventId,
    titel: title,
    startDatum: dienst.startDatum,
    startTijd: dienst.startTijd || undefined,
    eindDatum: dienst.eindDatum || dienst.startDatum,
    eindTijd: dienst.eindTijd || undefined,
    heledag: dienst.heledag,
    locatie: dienst.locatie || undefined,
    beschrijving: dienst.beschrijving || undefined,
    symbol: "schedule",
    status: dienst.status === "Gedraaid" ? "Voorbij" : dienst.status === "VERWIJDERD" ? "VERWIJDERD" : "Aankomend",
    kalender: "Rooster",
    shiftType: dienst.shiftType,
    team: dienst.team,
  };
}

function mergeNoteEventOptions(...groups: PersonalEvent[][]): PersonalEvent[] {
  const byKey = new Map<string, PersonalEvent>();
  for (const group of groups) {
    for (const event of group) {
      const key = `${event.kalender}:${event.eventId}`;
      if (!byKey.has(key)) byKey.set(key, event);
    }
  }
  return Array.from(byKey.values()).sort((a, b) => (
    `${a.startDatum || "9999-12-31"}T${a.startTijd || "00:00"}`.localeCompare(`${b.startDatum || "9999-12-31"}T${b.startTijd || "00:00"}`) ||
    a.titel.localeCompare(b.titel, "nl")
  ));
}

type LocalBacklink = { id: string; titel: string };

const WIKI_LINK_PATTERN = /\[\[([^\]\n]+)\]\]/g;

function buildBacklinksById(notes: NoteRecord[]): Map<string, LocalBacklink[]> {
  const byTitle = new Map<string, NoteRecord>();
  for (const note of notes) {
    const key = normalizeWikiTitle(getWikiTitle(note));
    if (key && !byTitle.has(key)) byTitle.set(key, note);
  }

  const backlinks = new Map<string, LocalBacklink[]>();
  for (const source of notes) {
    for (const rawTitle of extractWikiLinkTitles(source.inhoud)) {
      const target = byTitle.get(normalizeWikiTitle(rawTitle));
      if (!target || target.id === source.id) continue;
      const targetBacklinks = backlinks.get(target.id) ?? [];
      if (!targetBacklinks.some((link) => link.id === source.id)) {
        targetBacklinks.push({ id: source.id, titel: getDisplayTitle(source) });
      }
      backlinks.set(target.id, targetBacklinks);
    }
  }
  return backlinks;
}

function extractWikiLinkTitles(content: string): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const match of content.matchAll(WIKI_LINK_PATTERN)) {
    const title = match[1]?.trim();
    const key = normalizeWikiTitle(title);
    if (!title || seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
  }
  return titles;
}

function getWikiTitle(note: NoteRecord): string {
  const firstLine = note.inhoud.split("\n")[0] ?? "";
  return (note.titel || firstLine.slice(0, 50)).trim();
}

function normalizeWikiTitle(value?: string) {
  return (value ?? "").trim().toLocaleLowerCase("nl-NL");
}

function NotesCaptureCard({
  value,
  saving,
  onChange,
  onSave,
  onOpenEditor,
}: {
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void | Promise<void>;
  onOpenEditor: () => void;
}) {
  const parsed = parseHashTags(value);
  const quickContext = getPrimaryWorkspaceContext(value, parsed.extractedTags);
  const canSave = Boolean(parsed.cleanText);

  return (
    <section className="glass border-amber-500/20 bg-amber-500/[0.045] p-2">
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 focus-within:border-amber-500/45">
        <StickyNote size={16} className="shrink-0 text-amber-300/80" />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void onSave();
            }
          }}
          placeholder="Snel noteren... #tag voor labels"
          disabled={saving}
          aria-label="Snel noteren"
          className="min-w-0 flex-1 bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-600 disabled:opacity-50 sm:text-sm"
        />
        <button
          type="button"
          onClick={onOpenEditor}
          title="Open in editor"
          aria-label="Open in editor"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[var(--color-surface-hover)] hover:text-slate-200"
        >
          <ArrowUpRight size={16} />
        </button>
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={!canSave || saving}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-[var(--color-primary-foreground)] transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Snelle notitie opslaan"
        >
          <Plus size={16} />
        </button>
      </div>

      {(parsed.extractedTags.length > 0 || quickContext) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {parsed.extractedTags.map((tag) => (
            <span key={tag} className="rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-200">
              #{tag}
            </span>
          ))}
          {quickContext && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-200">
              {quickContext.label}
              <span className="text-cyan-300/70">#{quickContext.tag}</span>
            </span>
          )}
        </div>
      )}
    </section>
  );
}
