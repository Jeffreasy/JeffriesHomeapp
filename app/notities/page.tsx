"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { ArrowUpRight, Plus, StickyNote, UserRound, X } from "lucide-react";
import { useNotes, type NoteCreateData, type NoteRecord } from "@/hooks/useNotes";
import { useContacten } from "@/hooks/useContacten";
import { useLaventeCareBusinessContextOptions } from "@/hooks/useLaventeCareBusinessContexts";
import { formatDateRange, getTimeLabel, usePersonalEvents, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { usePrivacy } from "@/hooks/usePrivacy";
import { useSchedule } from "@/hooks/useSchedule";
import type { DienstRow } from "@/lib/schedule";
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
  noteHasAnyLink,
} from "@/components/notes/NotesUtils";
import { NotesHeader, type NotesTab } from "@/components/notes/NotesHeader";
import { AppPageShell } from "@/components/layout/AppPageShell";
import { NotesFilters } from "@/components/notes/NotesFilters";
import { NotesList } from "@/components/notes/NotesList";
import { NotesMetricsRow } from "@/components/notes/NotesMetrics";
import { WeekJournal, getMonday, amsterdamToday } from "@/components/notes/WeekJournal";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { resolveLaventeCareBusinessContextFromText } from "@/lib/laventecare/business-context";
import { enrichNoteDraft, getPrimaryWorkspaceContext, parseHashTags, type BusinessContextValue } from "@/lib/workspace-context";
import { ApiError } from "@/lib/api";
import { NoteConflictError } from "@/lib/noteConflict";
import {
  ContactMentionMenu,
  useContactMention,
} from "@/components/notes/ContactMentionMenu";
import type { Contact } from "@/lib/api";

const LazyNoteEditor = dynamic(
  () => import("@/components/notes/NoteEditor").then((module) => module.NoteEditor),
  { ssr: false },
);

type EditorSeed = {
  titel: string;
  tags: string[];
  businessContext?: BusinessContextValue | null;
};

export default function NotitiesPage() {
  const { user, isLoaded: userLoaded } = useUser();
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
    refetch,
  } = useNotes();
  const { hidden: privacyOn, toggle: togglePrivacy, isServerUnknown: isPrivacyUnknown } = usePrivacy("notes");
  const { diensten } = useSchedule();
  const { events: agendaEvents, upcoming: upcomingAgendaEvents } = usePersonalEvents({ diensten });
  const { openConfirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();
  const { options: laventeCareContextOptions } = useLaventeCareBusinessContextOptions();
  const {
    contacts: allContacts,
    isLoading: contactsLoading,
    isError: contactsError,
  } = useContacten({ includeArchived: true });
  const quickContacts = useMemo(() => allContacts.filter((contact) => !contact.archived), [allContacts]);

  // ── Tab state ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<NotesTab>("collection");

  // ── Week Journal state ─────────────────────────────────────
  // Amsterdam-gepind "vandaag" zodat de startweek klopt in elke device-TZ.
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(amsterdamToday()));

  // ── Collection state ───────────────────────────────────────
  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [boardMode, setBoardMode] = useState<BoardMode>("board");
  const [noteScope, setNoteScope] = useState<NoteScope>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  // K7: the input updates instantly (searchInput); filtering runs on the
  // ~250ms-debounced `search` so large lists don't re-filter per keystroke.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  // ── Editor state ───────────────────────────────────────────
  const [editorOpen, setEditorOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRecord | null>(null);
  const [quickText, setQuickText] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickContact, setQuickContact] = useState<Contact | null>(null);
  const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);
  const deepLinkHandledRef = useRef<string | null>(null);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT") return;

      if (
        (event.key === "n" || event.key === "N") &&
        // R3-15: a bare "n" only — Ctrl/Meta/Alt+N are browser/OS shortcuts and
        // must not hijack into a new note.
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        activeTab === "collection"
      ) {
        // N6: nooit een editor-remount triggeren vanaf knoppen/contentEditable
        // of terwijl de editor dan wel een dialog openstaat — een "n" met focus
        // op een toolbar-knop vernietigde anders de in-memory draft.
        if (editorOpen) return;
        if (target.tagName === "BUTTON" || target.isContentEditable) return;
        if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
        event.preventDefault();
        setEditNote(null);
        setEditorSeed(null);
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
  }, [activeTab, editorOpen]);

  // ── Collection: filtered & sorted notes ────────────────────
  // A non-empty search retrieves across ALL buckets (active+completed+archived)
  // so a note that's since been completed/archived stays findable; clearing the
  // search returns to the scoped view. (Privacy mode disables search entirely.)
  const allNotes = useMemo(() => [...active, ...completed, ...archived], [active, archived, completed]);

  useEffect(() => {
    if (!userLoaded || !user?.id) return;
    const url = new URL(window.location.href);
    const noteId = url.searchParams.get("note")?.trim() ?? "";
    const createNew = url.searchParams.get("new") === "1";
    if (!noteId && !createNew) return;

    const contextType = url.searchParams.get("contextType")?.trim() ?? "";
    const contextId = url.searchParams.get("contextId")?.trim() ?? "";
    const contextTitle = url.searchParams.get("contextTitle")?.trim().slice(0, 200) ?? "";
    const signature = `${noteId}|${createNew}|${contextType}|${contextId}`;
    if (deepLinkHandledRef.current === signature) return;

    if (noteId) {
      if (isLoading) return;
      deepLinkHandledRef.current = signature;
      const target = allNotes.find((note) => note.id === noteId);
      if (target) {
        setActiveTab("collection");
        setEditNote(target);
        setEditorSeed(null);
        setEditorOpen(true);
      } else {
        toastError("Deze notitie bestaat niet meer of is niet toegankelijk.");
      }
      clearNotesDeepLink(url);
      return;
    }

    let businessContext: BusinessContextValue | null = null;
    if (contextType === "contact") {
      if (contactsLoading) return;
      const contact = allContacts.find((item) => item.id === contextId);
      if (contact) {
        businessContext = businessContextFromContact(contact);
      } else if (contactsError && contextId) {
        // De URL komt uit het contactdetail. Bij een tijdelijke lijstfout houden
        // we die intentie vast; de backend resolveert naam/eigenaarschap bij save.
        businessContext = { type: "contact", id: contextId, title: contextTitle || "Contact" };
        toastError("Contacten konden niet gecontroleerd worden; de koppeling wordt bij opslaan gevalideerd.");
      } else {
        toastError("Dit contact bestaat niet meer of is niet toegankelijk.");
      }
    } else if (contextType) {
      toastError("Deze koppeling wordt niet ondersteund.");
    }

    deepLinkHandledRef.current = signature;
    setActiveTab("collection");
    setEditNote(null);
    setEditorSeed({ titel: "", tags: [], businessContext });
    setEditorOpen(true);
    clearNotesDeepLink(url);
  }, [allContacts, allNotes, contactsError, contactsLoading, isLoading, toastError, user?.id, userLoaded]);

  const sourceNotes = useMemo(
    () =>
      !privacyOn && search.trim()
        ? allNotes
        : viewMode === "active" ? active : viewMode === "completed" ? completed : archived,
    [privacyOn, search, viewMode, active, completed, archived, allNotes],
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
        const contextTitle = note.businessContextTitle ?? note.business_context_title ?? "";
        const haystack = `${note.titel ?? ""} ${note.inhoud} ${(note.tags ?? []).join(" ")} ${contextTitle}`.toLowerCase();
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

      if (noteHasAnyLink(note)) linkedCount += 1;
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
    searchInput.trim(),
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
    () => buildBacklinksById(allNotes),
    [allNotes],
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
    setEditorSeed(null);
    setEditorOpen(true);
  };

  const handleOpenInEditor = () => {
    const { cleanText, extractedTags } = parseHashTags(quickText);
    const matchedBusinessContext = quickContact
      ? businessContextFromContact(quickContact)
      : resolveLaventeCareBusinessContextFromText(cleanText, laventeCareContextOptions);
    setEditNote(null);
    setEditorSeed(
      cleanText || matchedBusinessContext
        ? { titel: cleanText, tags: extractedTags, businessContext: matchedBusinessContext }
        : null,
    );
    setEditorOpen(true);
  };

  const handleQuickCreate = async () => {
    if (quickSaving) return;
    const { cleanText, extractedTags } = parseHashTags(quickText);
    if (!cleanText) return;

    setQuickSaving(true);
    try {
      const matchedBusinessContext = quickContact
        ? businessContextFromContact(quickContact)
        : resolveLaventeCareBusinessContextFromText(cleanText, laventeCareContextOptions);
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
      setQuickContact(null);
    } catch {
      // N3: useNotes' create-mutatie toast de fout al ("Kon notitie niet
      // opslaan.") — de catch blijft alleen om een unhandled rejection te
      // voorkomen, zonder tweede toast.
    } finally {
      setQuickSaving(false);
    }
  };

  // H2 (R3): after a 409 we refetch the note and let the editor resubmit with
  // the FRESH gewijzigd on explicit "Toch overschrijven" — this ref carries that
  // refreshed token so the second attempt isn't rejected by the same stale one.
  const overwriteTokenRef = useRef<{ id: string; gewijzigd: string } | null>(null);

  const handleSave = async (data: NoteCreateData, overwrite?: boolean) => {
    if (!editNote) {
      await create(data);
      // R3-12: only now that the create succeeded do we clear the capture field
      // that seeded this editor (and drop the seed).
      if (editorSeed) {
        setQuickText("");
        setQuickContact(null);
        setEditorSeed(null);
      }
      return;
    }
    // On an explicit overwrite, prefer the token we captured from the conflict
    // refetch; otherwise the gewijzigd we opened with.
    const expectedGewijzigd =
      overwrite && overwriteTokenRef.current?.id === editNote.id
        ? overwriteTokenRef.current.gewijzigd
        : editNote.gewijzigd;
    try {
      await update(editNote.id, { ...data, expectedGewijzigd });
      overwriteTokenRef.current = null;
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Refetch so the editor can show the newest version + a real overwrite
        // path instead of retrying the same doomed token forever.
        let fresh: NoteRecord | null = null;
        try {
          const res = await refetch();
          const rows = res.data?.data;
          const match = Array.isArray(rows)
            ? (rows as Array<{ id?: string }>).find((n) => n.id === editNote.id)
            : undefined;
          fresh = (match as unknown as NoteRecord) ?? null;
        } catch {
          fresh = null;
        }
        if (fresh?.gewijzigd) {
          overwriteTokenRef.current = { id: editNote.id, gewijzigd: fresh.gewijzigd };
        }
        throw new NoteConflictError(fresh);
      }
      throw err;
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

  const handleUpdateContent = async (id: string, inhoud: string, expectedGewijzigd?: string) => {
    await update(id, { inhoud, expectedGewijzigd });
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
    // Direct (zonder debounce) zetten zodat de navigatie meteen resultaat toont.
    setSearchInput(title);
    setSearch(title);
    searchRef.current?.focus();
  };

  // ── M-J: pragmatisch tagbeheer ─────────────────────────────
  // Client-side loop over alle geladen notities met de tag; sequentieel via de
  // bestaande update-mutatie (met concurrency-token). Notities die falen worden
  // overgeslagen en meegeteld in de eindmelding.
  const runTagOperation = async (
    tag: string,
    transform: (tags: string[]) => string[],
    onProgress?: (index: number, total: number) => void,
  ) => {
    const targets = [...active, ...completed, ...archived].filter((note) =>
      (note.tags ?? []).includes(tag),
    );
    let done = 0;
    let failed = 0;
    for (const note of targets) {
      onProgress?.(done + failed + 1, targets.length);
      try {
        await update(note.id, {
          tags: transform(note.tags ?? []),
          expectedGewijzigd: note.gewijzigd,
        });
        done += 1;
      } catch {
        failed += 1;
      }
    }
    return { done, failed, total: targets.length };
  };

  const handleRenameTag = async (
    tag: string,
    next: string,
    onProgress?: (index: number, total: number) => void,
  ) => {
    const clean = next.trim().replace(/^#+/, "").replace(/\s+/g, "-").toLowerCase();
    if (!clean || clean === tag) return false;
    const confirmed = await openConfirm({
      title: `Tag hernoemen?`,
      message: `Alle geladen notities met #${tag} krijgen #${clean}.`,
      confirmLabel: "Hernoemen",
    });
    if (!confirmed) return false;
    const result = await runTagOperation(
      tag,
      (tags) => Array.from(new Set(tags.map((t) => (t === tag ? clean : t)))),
      onProgress,
    );
    if (result.failed > 0) {
      toastError(`Tag hernoemd in ${result.done} van ${result.total} notities — ${result.failed} overgeslagen.`);
    } else {
      toastSuccess(`Tag #${tag} hernoemd naar #${clean} in ${result.done} notitie${result.done === 1 ? "" : "s"}.`);
    }
    return true;
  };

  const handleDeleteTag = async (
    tag: string,
    onProgress?: (index: number, total: number) => void,
  ) => {
    const confirmed = await openConfirm({
      title: "Tag verwijderen?",
      message: `#${tag} wordt uit alle geladen notities verwijderd. De notities zelf blijven bestaan.`,
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!confirmed) return false;
    const result = await runTagOperation(
      tag,
      (tags) => tags.filter((t) => t !== tag),
      onProgress,
    );
    if (result.failed > 0) {
      toastError(`Tag verwijderd uit ${result.done} van ${result.total} notities — ${result.failed} overgeslagen.`);
    } else {
      toastSuccess(`Tag #${tag} verwijderd uit ${result.done} notitie${result.done === 1 ? "" : "s"}.`);
    }
    return true;
  };

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setTagFilter(null);
    setNoteScope("all");
    setSortMode("recent");
    setViewMode("active");
  };

  return (
    <AppPageShell width="wide" className="text-slate-100">
      <NotesHeader
        count={count}
        archivedCount={archived.length}
        completedCount={completed.length}
        pinnedCount={pinned.length}
        isLoading={isLoading}
        privacyOn={privacyOn}
        isPrivacyUnknown={isPrivacyUnknown}
        togglePrivacy={togglePrivacy}
        handleNew={handleNew}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <div className="mt-4 flex flex-col gap-4 sm:gap-6">
        {/* ── Week Journal Tab ── */}
        {activeTab === "journal" && (
          <section
            id="notes-tabpanel-journal"
            role="tabpanel"
            aria-labelledby="notes-tab-journal"
            tabIndex={0}
            className="focus:outline-none"
          >
            <WeekJournal
              notes={[...active, ...completed]}
              diensten={diensten}
              agendaEvents={upcomingAgendaEvents}
              weekStart={weekStart}
              onWeekChange={setWeekStart}
              onEdit={handleEdit}
              onCreate={create}
              onToggleComplete={toggleComplete}
              isLoading={isLoading}
              isError={isError}
              masked={privacyOn}
            />
          </section>
        )}

        {/* ── Collection Tab ── */}
        {activeTab === "collection" && (
          <section
            id="notes-tabpanel-collection"
            role="tabpanel"
            aria-labelledby="notes-tab-collection"
            tabIndex={0}
            className="flex flex-col gap-4 focus:outline-none sm:gap-6"
          >
            <NotesCaptureCard
              value={quickText}
              saving={quickSaving}
              onChange={setQuickText}
              onSave={handleQuickCreate}
              onOpenEditor={handleOpenInEditor}
              contacts={quickContacts}
              contactsLoading={contactsLoading}
              contactsError={contactsError}
              selectedContact={quickContact}
              onSelectContact={setQuickContact}
              onClearContact={() => setQuickContact(null)}
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
              search={searchInput}
              setSearch={setSearchInput}
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
              onRenameTag={handleRenameTag}
              onDeleteTag={handleDeleteTag}
            />

            <NotesList
              displayed={displayed}
              isLoading={isLoading}
              isError={isError}
              onRetry={() => void refetch()}
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
          </section>
        )}
      </div>

        {editorOpen && (
          <LazyNoteEditor
            key={editNote?.id ?? `new-note:${editorSeed?.businessContext?.type ?? "none"}:${editorSeed?.businessContext?.id ?? "none"}`}
            note={editNote}
            userId={user?.id}
            initialTitle={!editNote ? editorSeed?.titel : undefined}
            initialTags={!editNote ? editorSeed?.tags : undefined}
            initialBusinessContext={!editNote ? editorSeed?.businessContext : undefined}
            onSave={handleSave}
            onClose={() => {
              setEditorOpen(false);
              setEditNote(null);
              setEditorSeed(null);
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
    </AppPageShell>
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
  contacts,
  contactsLoading,
  contactsError,
  selectedContact,
  onSelectContact,
  onClearContact,
}: {
  value: string;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void | Promise<void>;
  onOpenEditor: () => void;
  contacts: Contact[];
  contactsLoading: boolean;
  contactsError: boolean;
  selectedContact: Contact | null;
  onSelectContact: (contact: Contact) => void;
  onClearContact: () => void;
}) {
  const parsed = parseHashTags(value);
  const quickContext = getPrimaryWorkspaceContext(value, parsed.extractedTags);
  const canSave = Boolean(parsed.cleanText);
  const mentionListId = "notes-capture-contact-list";
  const mention = useContactMention({
    value,
    contacts,
    selectedContact,
    onChange,
    onSelect: onSelectContact,
  });

  return (
    <section className="glass relative border-amber-500/20 bg-amber-500/[0.045] p-2">
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 focus-within:border-amber-500/45">
        <StickyNote size={16} className="shrink-0 text-amber-300/80" />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (mention.handleKeyDown(event)) return;
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void onSave();
            }
          }}
          placeholder="Snel noteren... #tag of @contact"
          disabled={saving}
          aria-label="Snel noteren"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={mention.isOpen}
          aria-controls={mentionListId}
          aria-activedescendant={mention.isOpen && mention.suggestions[mention.activeIndex] ? `${mentionListId}-${mention.suggestions[mention.activeIndex].id}` : undefined}
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

      <ContactMentionMenu
        id={mentionListId}
        isOpen={mention.isOpen}
        query={mention.query}
        suggestions={mention.suggestions}
        activeIndex={mention.activeIndex}
        isLoading={contactsLoading}
        isError={contactsError}
        onSelect={mention.pick}
      />

      {(parsed.extractedTags.length > 0 || quickContext || selectedContact) && (
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
          {selectedContact && (
            <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-1 text-xs font-semibold text-violet-200">
              <UserRound size={11} className="shrink-0" aria-hidden="true" />
              <span className="truncate">{selectedContact.display_name}</span>
              <button
                type="button"
                onClick={onClearContact}
                aria-label={`Koppeling met ${selectedContact.display_name} verwijderen`}
                className="-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-violet-300/70 hover:bg-violet-500/20 hover:text-violet-100"
              >
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          )}
        </div>
      )}
    </section>
  );
}

function businessContextFromContact(contact: Contact): BusinessContextValue {
  return { type: "contact", id: contact.id, title: contact.display_name };
}

function clearNotesDeepLink(url: URL) {
  for (const key of ["note", "new", "contextType", "contextId", "contextTitle"]) {
    url.searchParams.delete(key);
  }
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}
