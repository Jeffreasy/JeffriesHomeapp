"use client";

import { useState, useRef, useEffect, useCallback, useMemo, useId, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Archive,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Hash,
  Heading1,
  History,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Palette,
  Pin,
  Quote,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { getNotesSearch } from "@/lib/api/generated/notes/notes";
import type { NoteCreateData, NoteRecord, NoteRevisionRecord } from "@/hooks/useNotes";
import { formatDateRange, getTimeLabel, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { AppIcon } from "@/components/ui/AppIcon";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { SymbolPicker } from "@/components/ui/SymbolPicker";
import { NOTE_SYMBOL_OPTIONS, resolveAppIconName, type AppIconName } from "@/lib/symbols";

const KLEUREN = [
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#64748b",
];

const PRIORITEITEN = [
  { value: "hoog", label: "Hoog", dot: "bg-red-500" },
  { value: "normaal", label: "Normaal", dot: "bg-slate-500" },
  { value: "laag", label: "Laag", dot: "bg-blue-400" },
] as const;

const NOTE_TEMPLATES = [
  {
    id: "evaluatie",
    title: "Evaluatie",
    label: "Evaluatie",
    icon: "chart" as AppIconName,
    content: "## Wat ging goed?\n\n## Wat kan beter?\n\n## Acties\n- [ ] ",
  },
  {
    id: "dienst",
    title: "Dienstnotitie",
    label: "Dienst",
    icon: "roster" as AppIconName,
    content: "## Dienst\n\n## Bijzonderheden\n\n## Overdracht\n- [ ] ",
  },
  {
    id: "planning",
    title: "Planning",
    label: "Planning",
    icon: "calendar" as AppIconName,
    content: "## Doel\n\n## Stappen\n- [ ] \n\n## Deadline\n",
  },
  {
    id: "besluit",
    title: "Besluit",
    label: "Besluit",
    icon: "shield" as AppIconName,
    content: "## Besluit\n\n## Reden\n\n## Impact\n\n## Volgende stap\n- [ ] ",
  },
] as const;

type LinkSearchItem = {
  id?: string;
  titel?: string | null;
};

type EventOptionGroup = {
  id: string;
  label: string;
  events: PersonalEvent[];
};

type EditorPanel = "details" | "style" | "history";
type PendingEditorAction = "archive" | "complete" | "delete" | "pin" | null;
type NoteAction = (id: string) => void | Promise<void>;
type NoteEditorSnapshot = {
  titel: string;
  inhoud: string;
  tags: string[];
  kleur: string;
  deadline: string;
  linkedEventId: string;
  prioriteit: string;
  symbol: AppIconName;
};

interface NoteEditorProps {
  note?: NoteRecord | null;
  userId?: string;
  onSave: (data: NoteCreateData) => Promise<void>;
  onClose: () => void;
  onDelete?: NoteAction;
  onArchive?: NoteAction;
  onTogglePin?: NoteAction;
  onToggleComplete?: NoteAction;
  onLoadRevisions?: (id: string) => Promise<NoteRevisionRecord[]>;
  onRestoreRevision?: (id: string, revisionId: string) => Promise<NoteRecord>;
  eventOptions?: PersonalEvent[];
  initialDeadline?: string;
  initialLinkedEventId?: string;
  initialTags?: string[];
  initialTitle?: string;
}

export function NoteEditor({
  note,
  userId,
  onSave,
  onClose,
  onDelete,
  onArchive,
  onTogglePin,
  onToggleComplete,
  onLoadRevisions,
  onRestoreRevision,
  eventOptions = [],
  initialDeadline,
  initialLinkedEventId,
  initialTags,
  initialTitle,
}: NoteEditorProps) {
  const titleId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { openConfirm } = useConfirm();

  const [saving, setSaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingEditorAction>(null);
  const [saveError, setSaveError] = useState("");
  const [titel, setTitel] = useState(note?.titel ?? initialTitle ?? "");
  const [inhoud, setInhoud] = useState(note?.inhoud ?? "");
  const [tags, setTags] = useState<string[]>(() => normalizeTags(note?.tags ?? initialTags ?? []));
  const [kleur, setKleur] = useState(note?.kleur ?? "");
  const [tagInput, setTagInput] = useState("");
  const [deadline, setDeadline] = useState(note?.deadline ?? initialDeadline ?? "");
  const [linkedEventId, setLinkedEventId] = useState(note?.linkedEventId ?? note?.linked_event_id ?? initialLinkedEventId ?? "");
  const [prioriteit, setPrioriteit] = useState(note?.prioriteit ?? "normaal");
  const [symbol, setSymbol] = useState<AppIconName>(() => resolveAppIconName(note?.symbol, "note"));
  const [activePanel, setActivePanel] = useState<EditorPanel>(() => note ? "details" : "style");
  const [showTemplates, setShowTemplates] = useState(false);

  const [linkSearch, setLinkSearch] = useState("");
  const [linkActive, setLinkActive] = useState(false);
  const [linkCursorPos, setLinkCursorPos] = useState(0);
  const [linkResults, setLinkResults] = useState<{ id: string; titel: string }[]>([]);

  const [revisions, setRevisions] = useState<NoteRevisionRecord[]>([]);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisionError, setRevisionError] = useState("");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [baseline, setBaseline] = useState<NoteEditorSnapshot>(() => buildInitialSnapshot(note, {
    initialDeadline,
    initialLinkedEventId,
    initialTags,
    initialTitle,
  }));

  const resolvedUserId = userId || note?.user_id;
  const isPinned = Boolean(note?.isPinned || note?.is_pinned);
  const isCompleted = Boolean(note?.isCompleted || note?.is_completed);
  const charCount = inhoud.length;
  const wordCount = inhoud.trim() ? inhoud.trim().split(/\s+/).length : 0;
  const lineCount = inhoud ? inhoud.split("\n").length : 0;

  const eventOptionGroups = useMemo(
    () => buildEventOptionGroups(eventOptions),
    [eventOptions],
  );
  const eventById = useMemo(() => {
    const map = new Map<string, PersonalEvent>();
    for (const event of eventOptions) {
      if (event.eventId) map.set(event.eventId, event);
    }
    return map;
  }, [eventOptions]);
  const linkedEventExists = useMemo(
    () => Boolean(linkedEventId && eventOptionGroups.some((group) => group.events.some((event) => event.eventId === linkedEventId))),
    [eventOptionGroups, linkedEventId],
  );
  const selectedEvent = linkedEventId ? eventById.get(linkedEventId) : undefined;
  const showEventSelector = eventOptionGroups.length > 0 || Boolean(linkedEventId);
  const actionBusy = saving || pendingAction !== null || restoringId !== null;

  const currentSnapshot = useMemo<NoteEditorSnapshot>(() => normalizeEditorSnapshot({
    titel: titel.trim(),
    inhoud: inhoud.trimEnd(),
    tags,
    kleur,
    deadline,
    linkedEventId,
    prioriteit,
    symbol,
  }), [deadline, inhoud, kleur, linkedEventId, prioriteit, symbol, tags, titel]);
  const isDirty = useMemo(
    () => !sameEditorSnapshot(currentSnapshot, baseline),
    [baseline, currentSnapshot],
  );
  const checklistStats = useMemo(() => getChecklistStats(inhoud), [inhoud]);

  const hasContent = Boolean(titel.trim() || inhoud.trim());
  const canSave = hasContent && (!note || isDirty);

  const autoResize = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = typeof window !== "undefined" && window.innerWidth < 768 ? 360 : 560;
    el.style.height = `${Math.max(240, Math.min(el.scrollHeight, maxHeight))}px`;
  }, []);

  const applyContent = useCallback((next: string, cursorStart?: number, cursorEnd?: number) => {
    setInhoud(next);
    requestAnimationFrame(() => {
      const el = textRef.current;
      if (el && cursorStart != null) {
        el.setSelectionRange(cursorStart, cursorEnd ?? cursorStart);
        el.focus();
      }
      autoResize();
    });
  }, [autoResize]);

  const replaceSelection = useCallback((build: (selection: string) => { replacement: string; cursorOffset?: number; selectLength?: number }) => {
    const el = textRef.current;
    const start = el?.selectionStart ?? inhoud.length;
    const end = el?.selectionEnd ?? inhoud.length;
    const selection = inhoud.slice(start, end);
    const patch = build(selection);
    const cursorOffset = patch.cursorOffset ?? patch.replacement.length;
    const selectLength = patch.selectLength ?? 0;
    const next = inhoud.slice(0, start) + patch.replacement + inhoud.slice(end);
    const cursor = start + cursorOffset;
    applyContent(next, cursor, cursor + selectLength);
  }, [applyContent, inhoud]);

  const prefixSelectedLines = useCallback((prefix: string | ((index: number) => string)) => {
    const el = textRef.current;
    const start = el?.selectionStart ?? inhoud.length;
    const end = el?.selectionEnd ?? inhoud.length;
    const lineStart = inhoud.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextBreak = inhoud.indexOf("\n", end);
    const lineEnd = nextBreak === -1 ? inhoud.length : nextBreak;
    const block = inhoud.slice(lineStart, lineEnd);

    if (!block) {
      const value = typeof prefix === "function" ? prefix(0) : prefix;
      const before = inhoud.slice(0, start);
      const needsBreak = before.length > 0 && !before.endsWith("\n");
      const insert = `${needsBreak ? "\n" : ""}${value}`;
      applyContent(inhoud.slice(0, start) + insert + inhoud.slice(end), start + insert.length);
      return;
    }

    const transformed = block
      .split("\n")
      .map((line, index) => `${typeof prefix === "function" ? prefix(index) : prefix}${line}`)
      .join("\n");
    const next = inhoud.slice(0, lineStart) + transformed + inhoud.slice(lineEnd);
    applyContent(next, lineStart + transformed.length);
  }, [applyContent, inhoud]);

  const reloadRevisions = useCallback(async () => {
    if (!note?.id || !onLoadRevisions) return;
    setRevisionLoading(true);
    setRevisionError("");
    try {
      const rows = await onLoadRevisions(note.id);
      setRevisions(rows);
    } catch (err: unknown) {
      setRevisionError(err instanceof Error ? err.message : "Geschiedenis laden mislukt");
    } finally {
      setRevisionLoading(false);
    }
  }, [note?.id, onLoadRevisions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && window.innerWidth >= 640) {
        textRef.current?.focus();
      }
      autoResize();
    }, 120);
    return () => clearTimeout(timer);
  }, [autoResize]);

  useEffect(() => {
    autoResize();
  }, [autoResize, inhoud]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const modal = scrollRef.current?.parentElement;
      if (modal) {
        modal.style.maxHeight = window.innerWidth < 640 ? `${vv.height}px` : `${vv.height - 16}px`;
      }
    };

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize();
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  useEffect(() => {
    if (!linkActive || !linkSearch || !resolvedUserId) {
      setLinkResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await getNotesSearch({ userId: resolvedUserId, q: linkSearch, limit: 5 });
        const items = getLinkSearchItems(results);
        setLinkResults(items
          .filter((item): item is LinkSearchItem & { id: string } => Boolean(item.id))
          .map((item) => ({ id: item.id, titel: item.titel ?? "Zonder titel" })));
      } catch {
        setLinkResults([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [linkActive, linkSearch, resolvedUserId]);

  useEffect(() => {
    if (activePanel === "history") {
      void reloadRevisions();
    }
  }, [activePanel, reloadRevisions]);

  const handleContentChange = (val: string) => {
    setInhoud(val);

    const el = textRef.current;
    if (el) {
      const pos = el.selectionStart;
      const textBefore = val.slice(0, pos);
      const lastOpen = textBefore.lastIndexOf("[[");
      const lastClose = textBefore.lastIndexOf("]]");

      if (lastOpen > lastClose) {
        const searchTerm = textBefore.slice(lastOpen + 2);
        if (!searchTerm.includes("\n")) {
          setLinkActive(true);
          setLinkSearch(searchTerm);
          setLinkCursorPos(pos);
          return;
        }
      }
    }
    setLinkActive(false);
    setLinkSearch("");
  };

  const insertLink = useCallback((title: string) => {
    const el = textRef.current;
    if (!el) return;

    const before = inhoud.slice(0, linkCursorPos);
    const lastOpen = before.lastIndexOf("[[");
    const newText = inhoud.slice(0, lastOpen) + `[[${title}]]` + inhoud.slice(linkCursorPos);
    setInhoud(newText);
    setLinkActive(false);
    setLinkSearch("");

    requestAnimationFrame(() => {
      const newPos = lastOpen + title.length + 4;
      el.setSelectionRange(newPos, newPos);
      el.focus();
      autoResize();
    });
  }, [autoResize, inhoud, linkCursorPos]);

  const handleSave = useCallback(async () => {
    if (!canSave || actionBusy) return;
    setSaving(true);
    setSaveError("");
    try {
      const isEditing = Boolean(note);
      const cleanTitle = titel.trim();
      const cleanContent = inhoud.trimEnd();
      await onSave({
        titel: cleanTitle || (isEditing ? "" : undefined),
        inhoud: cleanContent,
        tags: tags.length > 0 ? tags : isEditing ? [] : undefined,
        kleur: kleur || (isEditing ? "" : undefined),
        deadline: normalizeDeadlineForSave(deadline) || (isEditing ? "" : undefined),
        linkedEventId: linkedEventId || (isEditing ? "" : undefined),
        prioriteit,
        symbol,
      });
      setBaseline(currentSnapshot);
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }, [actionBusy, canSave, currentSnapshot, deadline, inhoud, kleur, linkedEventId, note, onClose, onSave, prioriteit, symbol, tags, titel]);

  const handleCloseAttempt = useCallback(async () => {
    if (isDirty) {
      const confirmed = await openConfirm({
        title: "Wijzigingen sluiten?",
        message: "Je hebt nog onopgeslagen wijzigingen in deze notitie.",
        confirmLabel: "Sluiten",
        variant: "danger",
      });
      if (!confirmed) return;
    }
    onClose();
  }, [isDirty, onClose, openConfirm]);

  const handleDeleteClick = useCallback(async () => {
    if (!onDelete || !note || actionBusy) return;
    const confirmed = await openConfirm({
      title: "Notitie verwijderen?",
      message: "Deze notitie en de bijbehorende geschiedenis worden permanent verwijderd.",
      confirmLabel: "Verwijderen",
      variant: "danger",
    });
    if (!confirmed) return;
    setPendingAction("delete");
    setSaveError("");
    try {
      await onDelete(note.id);
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Verwijderen mislukt");
      setPendingAction(null);
    }
  }, [actionBusy, note, onClose, onDelete, openConfirm]);

  const handleArchiveClick = useCallback(async () => {
    if (!onArchive || !note || actionBusy) return;
    setPendingAction("archive");
    setSaveError("");
    try {
      await onArchive(note.id);
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Archiveren mislukt");
      setPendingAction(null);
    }
  }, [actionBusy, note, onArchive, onClose]);

  const handleCompleteClick = useCallback(async () => {
    if (!onToggleComplete || !note || actionBusy || isDirty) return;
    setPendingAction("complete");
    setSaveError("");
    try {
      await onToggleComplete(note.id);
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Afronden mislukt");
      setPendingAction(null);
    }
  }, [actionBusy, isDirty, note, onClose, onToggleComplete]);

  const handlePinClick = useCallback(async () => {
    if (onTogglePin && note && !actionBusy) {
      setPendingAction("pin");
      setSaveError("");
      try {
        await onTogglePin(note.id);
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : "Pinnen mislukt");
      } finally {
        setPendingAction(null);
      }
    }
  }, [actionBusy, note, onTogglePin]);

  const applySnapshot = useCallback((snapshot: NoteEditorSnapshot) => {
    setTitel(snapshot.titel);
    setInhoud(snapshot.inhoud);
    setTags(snapshot.tags);
    setKleur(snapshot.kleur);
    setDeadline(snapshot.deadline);
    setLinkedEventId(snapshot.linkedEventId);
    setPrioriteit(snapshot.prioriteit);
    setSymbol(snapshot.symbol);
    requestAnimationFrame(() => {
      textRef.current?.focus();
      autoResize();
    });
  }, [autoResize]);

  const handleResetChanges = useCallback(async () => {
    if (!isDirty || actionBusy) return;
    const confirmed = await openConfirm({
      title: "Wijzigingen terugzetten?",
      message: "De editor gaat terug naar de laatst opgeslagen versie.",
      confirmLabel: "Terugzetten",
    });
    if (!confirmed) return;
    applySnapshot(baseline);
  }, [actionBusy, applySnapshot, baseline, isDirty, openConfirm]);

  const handleRestoreRevision = useCallback(async (revision: NoteRevisionRecord) => {
    if (!note?.id || !onRestoreRevision) return;
    const confirmed = await openConfirm({
      title: "Versie herstellen?",
      message: "De huidige inhoud wordt eerst als nieuwe versie bewaard, daarna wordt deze versie teruggezet.",
      confirmLabel: "Herstellen",
    });
    if (!confirmed) return;

    setRestoringId(revision.id);
    setSaveError("");
    try {
      const restored = await onRestoreRevision(note.id, revision.id);
      const restoredSnapshot = snapshotFromNote(restored);
      applySnapshot(restoredSnapshot);
      setBaseline(restoredSnapshot);
      await reloadRevisions();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Herstellen mislukt");
    } finally {
      setRestoringId(null);
    }
  }, [applySnapshot, note?.id, onRestoreRevision, openConfirm, reloadRevisions]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        void handleCloseAttempt();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        void handleSave();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCloseAttempt, handleSave]);

  const insertChecklist = () => prefixSelectedLines("- [ ] ");
  const insertBulletList = () => prefixSelectedLines("- ");
  const insertNumberedList = () => prefixSelectedLines((index) => `${index + 1}. `);
  const insertHeading = () => prefixSelectedLines("## ");
  const insertQuote = () => prefixSelectedLines("> ");
  const insertWikiLink = () => replaceSelection((selection) => {
    const label = selection.trim() || "Nieuwe notitie";
    return {
      replacement: `[[${label}]]`,
      cursorOffset: selection.trim() ? label.length + 4 : 2,
      selectLength: selection.trim() ? 0 : label.length,
    };
  });
  const insertTimestamp = () => replaceSelection(() => {
    const value = formatDutchDateTime(new Date().toISOString());
    return { replacement: value };
  });

  const applyTemplate = (template: typeof NOTE_TEMPLATES[number]) => {
    const prefix = inhoud.trim() ? "\n\n" : "";
    setInhoud(`${inhoud}${prefix}${template.content}`);
    if (!titel.trim()) setTitel(template.title);
    setShowTemplates(false);
    requestAnimationFrame(() => {
      textRef.current?.focus();
      autoResize();
    });
  };

  const addTag = () => {
    const nextTags = normalizeTags([...tags, ...tagInput.split(",")]);
    if (nextTags.length !== tags.length || tagsKey(nextTags) !== tagsKey(tags)) {
      setTags(nextTags);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((item) => item !== tag));

  const setQuickDeadline = (days: number, hour = 9) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(hour, 0, 0, 0);
    setDeadline(date.toISOString());
  };

  const handleEventChange = (nextEventId: string) => {
    setLinkedEventId(nextEventId);
    if (!deadline && nextEventId) {
      const event = eventById.get(nextEventId);
      const eventDeadline = event ? eventToDeadline(event) : "";
      if (eventDeadline) setDeadline(eventDeadline);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
    >
      <div
        className="absolute inset-0 cursor-pointer bg-black/65 backdrop-blur-sm"
        onClick={() => void handleCloseAttempt()}
      />

      <motion.div
        initial={{ opacity: 0, y: 48, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 48, scale: 0.98 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-[100dvh] w-full flex-col overflow-hidden rounded-none border-0 border-[var(--color-border)] shadow-2xl shadow-black/40 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-5xl sm:rounded-2xl sm:border"
        style={{
          maxHeight: "100dvh",
          background: kleur
            ? `linear-gradient(145deg, ${kleur}12 0%, var(--color-surface) 48%)`
            : "var(--color-surface)",
        }}
      >
        <div className="flex justify-center pb-0 pt-[max(0.5rem,env(safe-area-inset-top))] sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <AppIcon name={symbol} tone="amber" size="md" framed active />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase text-[var(--color-text-subtle)]">
                {note ? "Notitie bewerken" : "Nieuwe notitie"}
              </p>
              <h2 id={titleId} className="truncate text-base font-bold text-[var(--color-text)] sm:text-lg">
                {titel.trim() || note?.titel || "Naamloze notitie"}
              </h2>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <span
              className={`hidden rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex ${
                isDirty
                  ? "border-amber-500/25 bg-amber-500/10 text-amber-300"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {isDirty ? "Onopgeslagen" : "Opgeslagen"}
            </span>
            {note && onTogglePin && (
              <button
                type="button"
                onClick={() => void handlePinClick()}
                disabled={actionBusy}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 transition-colors ${
                  isPinned
                    ? "text-amber-300 hover:bg-amber-500/10"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                } disabled:cursor-not-allowed disabled:opacity-45`}
                title={isPinned ? "Ontpinnen" : "Pinnen"}
                aria-label={isPinned ? "Ontpinnen" : "Pinnen"}
              >
                <Pin size={18} className={isPinned ? "fill-amber-300" : ""} />
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleCloseAttempt()}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl p-2 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
              aria-label="Sluiten"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6">
          <div className="grid min-h-full gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="min-w-0 space-y-3">
              <input
                type="text"
                placeholder="Titel"
                value={titel}
                onChange={(event) => setTitel(event.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-transparent bg-transparent px-1 text-xl font-bold text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-subtle)] focus:border-[var(--color-border)] focus:bg-black/10 focus:px-3 sm:text-2xl"
              />

              <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-black/10">
                <div className="flex flex-wrap items-center gap-1 border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]/70 px-2 py-2">
                  <ToolbarButton icon={ListChecks} label="Checklist" onClick={insertChecklist} />
                  <ToolbarButton icon={List} label="Opsomming" onClick={insertBulletList} />
                  <ToolbarButton icon={ListOrdered} label="Genummerde lijst" onClick={insertNumberedList} />
                  <ToolbarButton icon={Heading1} label="Kop" onClick={insertHeading} />
                  <ToolbarButton icon={Quote} label="Quote" onClick={insertQuote} />
                  <ToolbarButton icon={Link2} label="Wiki-link" onClick={insertWikiLink} />
                  <ToolbarButton icon={Clock} label="Tijdstempel" onClick={insertTimestamp} />
                  <ToolbarButton icon={Sparkles} label="Templates" onClick={() => setShowTemplates((value) => !value)} active={showTemplates} />
                  <div className="ml-auto flex min-h-[40px] items-center gap-2 px-2 text-[11px] text-[var(--color-text-subtle)]">
                    <Clock size={12} />
                    <span>{wordCount}w</span>
                    <span>{charCount}c</span>
                  </div>
                </div>

                <AnimatePresence>
                  {showTemplates && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-b border-[var(--color-border)]"
                    >
                      <div className="grid gap-2 p-3 sm:grid-cols-2">
                        {NOTE_TEMPLATES.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => applyTemplate(template)}
                            className="flex min-h-[48px] min-w-0 items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left transition-colors hover:border-amber-500/25 hover:bg-amber-500/10"
                          >
                            <AppIcon name={template.icon} tone="amber" size="sm" framed active />
                            <span className="min-w-0 truncate text-sm font-semibold text-[var(--color-text)]">
                              {template.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="relative">
                  <textarea
                    ref={textRef}
                    placeholder="Schrijf je notitie..."
                    value={inhoud}
                    onChange={(event) => handleContentChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
                        const el = event.currentTarget;
                        const pos = el.selectionStart;
                        const lineStart = inhoud.lastIndexOf("\n", pos - 1) + 1;
                        const currentLine = inhoud.slice(lineStart, pos);
                        const match = /^- \[[ x]\] /.exec(currentLine);
                        if (match) {
                          if (currentLine.trim() === "- [ ]") {
                            event.preventDefault();
                            applyContent(inhoud.slice(0, lineStart) + inhoud.slice(pos), lineStart);
                            return;
                          }
                          event.preventDefault();
                          const insert = "\n- [ ] ";
                          applyContent(inhoud.slice(0, pos) + insert + inhoud.slice(pos), pos + insert.length);
                        }
                      }
                    }}
                    className="block w-full resize-none bg-transparent px-4 py-4 text-base leading-relaxed text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)] sm:text-sm"
                    style={{ minHeight: 280 }}
                  />

                  <AnimatePresence>
                    {linkActive && linkResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="absolute left-3 right-3 top-3 z-20 max-h-[220px] overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-lg shadow-black/30"
                      >
                        {linkResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              insertLink(result.titel);
                            }}
                            className="flex min-h-[44px] w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-hover)]"
                          >
                            <Link2 size={14} className="shrink-0 text-amber-400/70" />
                            <span className="truncate">{result.titel}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            <aside className="min-w-0 space-y-3">
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-1">
                <PanelButton icon={CalendarDays} label="Details" active={activePanel === "details"} onClick={() => setActivePanel("details")} />
                <PanelButton icon={Palette} label="Stijl" active={activePanel === "style"} onClick={() => setActivePanel("style")} />
                <PanelButton icon={History} label="Historie" active={activePanel === "history"} onClick={() => setActivePanel("history")} />
              </div>

              <AnimatePresence mode="wait">
                {activePanel === "details" && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-3"
                  >
                    <PanelSection title="Planning">
                      <div className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-center gap-2">
                        <Clock size={15} className="text-[var(--color-text-subtle)]" />
                        <input
                          type="datetime-local"
                          value={formatDeadlineForInput(deadline)}
                          onChange={(event) => setDeadline(event.target.value ? localDateTimeToIso(event.target.value) : "")}
                          className="min-h-[44px] min-w-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none [color-scheme:dark]"
                        />
                        <button
                          type="button"
                          onClick={() => setDeadline("")}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                          aria-label="Deadline verwijderen"
                          title="Deadline verwijderen"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <QuickButton label="Vandaag" onClick={() => setQuickDeadline(0, 17)} />
                        <QuickButton label="Morgen" onClick={() => setQuickDeadline(1, 9)} />
                        <QuickButton label="+7d" onClick={() => setQuickDeadline(7, 9)} />
                        <QuickButton label="Wissen" onClick={() => setDeadline("")} />
                      </div>
                    </PanelSection>

                    <PanelSection title="Prioriteit">
                      <div className="grid grid-cols-3 gap-1.5">
                        {PRIORITEITEN.map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setPrioriteit(item.value)}
                            className={`flex min-h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition-colors ${
                              prioriteit === item.value
                                ? "border-white/15 bg-white/10 text-[var(--color-text)]"
                                : "border-transparent text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                            }`}
                          >
                            <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </PanelSection>

                    <PanelSection title="Afspraak">
                      {showEventSelector ? (
                        <div className="space-y-2">
                          <select
                            value={linkedEventId}
                            onChange={(event) => handleEventChange(event.target.value)}
                            className="min-h-[44px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-text)] outline-none [color-scheme:dark]"
                          >
                            <option value="">Geen afspraak gekoppeld</option>
                            {linkedEventId && !linkedEventExists && (
                              <option value={linkedEventId}>
                                Huidige koppeling ({shortEventId(linkedEventId)})
                              </option>
                            )}
                            {eventOptionGroups.map((group) => (
                              <optgroup key={group.id} label={group.label}>
                                {group.events.map((event) => (
                                  <option key={event.eventId} value={event.eventId}>
                                    {formatEventOption(event)}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          {selectedEvent && (
                            <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100/80">
                              <p className="truncate font-semibold text-cyan-100">{selectedEvent.titel}</p>
                              <p className="mt-0.5 text-cyan-100/60">{formatDateRange(selectedEvent)} · {getTimeLabel(selectedEvent)}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          Geen afspraken beschikbaar.
                        </p>
                      )}
                    </PanelSection>
                  </motion.div>
                )}

                {activePanel === "style" && (
                  <motion.div
                    key="style"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-3"
                  >
                    <PanelSection title="Symbool">
                      <SymbolPicker
                        value={symbol}
                        options={NOTE_SYMBOL_OPTIONS}
                        onChange={setSymbol}
                        tone="amber"
                        fallback="note"
                        className="border-0 bg-transparent p-0"
                        gridClassName="grid-cols-2"
                      />
                    </PanelSection>

                    <PanelSection title="Kleur">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setKleur("")}
                          className={`flex h-11 w-11 items-center justify-center rounded-xl border transition-all ${
                            !kleur
                              ? "border-white/30 bg-[var(--color-surface-hover)]"
                              : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-white/20"
                          }`}
                          aria-label="Geen kleur"
                          title="Geen kleur"
                        >
                          {!kleur && <X size={14} className="text-[var(--color-text-muted)]" />}
                        </button>
                        {KLEUREN.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setKleur(item)}
                            className={`flex h-11 w-11 items-center justify-center rounded-xl border-2 transition-all ${
                              kleur === item ? "scale-105 border-white/60" : "border-transparent hover:scale-105"
                            }`}
                            style={{ background: item }}
                            aria-label={`Kleur ${item}`}
                            title={`Kleur ${item}`}
                          >
                            {kleur === item && <Check size={15} className="text-white drop-shadow" />}
                          </button>
                        ))}
                      </div>
                    </PanelSection>

                    <PanelSection title="Tags">
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            className="inline-flex min-h-[38px] min-w-0 items-center gap-1 rounded-lg border border-amber-500/15 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-300/85 transition-colors hover:border-red-500/25 hover:bg-red-500/15 hover:text-red-300"
                            onClick={() => removeTag(tag)}
                            aria-label={`Tag ${tag} verwijderen`}
                            title={`Tag ${tag} verwijderen`}
                          >
                            <Tag size={11} />
                            <span className="max-w-[9rem] truncate">{tag}</span>
                            <X size={11} />
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
                        <div className="grid min-h-[44px] grid-cols-[1rem_minmax(0,1fr)] items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3">
                          <Hash size={14} className="text-[var(--color-text-subtle)]" />
                          <input
                            type="text"
                            placeholder="Nieuwe tag"
                            value={tagInput}
                            onChange={(event) => setTagInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === ",") {
                                event.preventDefault();
                                addTag();
                              }
                            }}
                            className="min-w-0 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={addTag}
                          className="min-h-[44px] rounded-xl border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                        >
                          Toevoegen
                        </button>
                      </div>
                    </PanelSection>
                  </motion.div>
                )}

                {activePanel === "history" && (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="space-y-3"
                  >
                    <PanelSection
                      title="Geschiedenis"
                      action={note && onLoadRevisions ? (
                        <button
                          type="button"
                          onClick={() => void reloadRevisions()}
                          disabled={revisionLoading}
                          className="flex min-h-[34px] min-w-[34px] items-center justify-center rounded-lg text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-45"
                          aria-label="Geschiedenis vernieuwen"
                          title="Geschiedenis vernieuwen"
                        >
                          <RefreshCw size={13} className={revisionLoading ? "animate-spin" : ""} />
                        </button>
                      ) : null}
                    >
                      {!note ? (
                        <p className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          Geschiedenis start na de eerste opslag.
                        </p>
                      ) : !onLoadRevisions ? (
                        <p className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          Geschiedenis is niet beschikbaar in deze context.
                        </p>
                      ) : revisionLoading ? (
                        <p className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          Versies laden...
                        </p>
                      ) : revisionError ? (
                        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                          {revisionError}
                        </p>
                      ) : revisions.length === 0 ? (
                        <p className="rounded-xl border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text-muted)]">
                          Nog geen eerdere versies.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {revisions.map((revision) => (
                            <div
                              key={revision.id}
                              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[var(--color-text)]">
                                    {revision.titel || firstContentLine(revision.inhoud) || "Naamloze versie"}
                                  </p>
                                  <p className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                                    {formatDutchDateTime(revision.aangemaakt)}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => void handleRestoreRevision(revision)}
                                  disabled={!onRestoreRevision || actionBusy}
                                  className="flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-2.5 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
                                >
                                  <RotateCcw size={13} />
                                  {restoringId === revision.id ? "..." : "Herstel"}
                                </button>
                              </div>
                              <p className="mt-2 line-clamp-2 break-words text-xs leading-relaxed text-[var(--color-text-muted)]">
                                {revision.inhoud || "Geen inhoud"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </PanelSection>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-2 sm:grid-cols-4 lg:grid-cols-2">
                <Metric label="Woorden" value={wordCount} />
                <Metric label="Regels" value={lineCount} />
                <Metric label="Acties" value={checklistStats.total ? `${checklistStats.done}/${checklistStats.total}` : "0"} />
                <Metric label="Versies" value={revisions.length} />
              </div>
            </aside>
          </div>
        </div>

        <footer className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
          {saveError && (
            <p role="alert" className="mb-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {saveError}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
              {isDirty && (
                <button
                  type="button"
                  onClick={() => void handleResetChanges()}
                  disabled={actionBusy}
                  className="flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <RotateCcw size={16} />
                  <span className="truncate">Terugzetten</span>
                </button>
              )}
              {note && onDelete && (
                <button
                  type="button"
                  onClick={() => void handleDeleteClick()}
                  disabled={actionBusy}
                  className="flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-red-500/20 px-3 text-sm font-semibold text-red-400 transition-colors hover:border-red-500/35 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Trash2 size={16} />
                  <span className="truncate">{pendingAction === "delete" ? "Bezig..." : "Verwijderen"}</span>
                </button>
              )}
              {note && onArchive && (
                <button
                  type="button"
                  onClick={() => void handleArchiveClick()}
                  disabled={actionBusy}
                  className="flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] px-3 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <Archive size={16} />
                  <span className="truncate">
                    {pendingAction === "archive" ? "Bezig..." : note.isArchived ? "Dearchiveren" : "Archiveren"}
                  </span>
                </button>
              )}
              {note && onToggleComplete && (
                <button
                  type="button"
                  onClick={() => void handleCompleteClick()}
                  disabled={actionBusy || isDirty}
                  title={isDirty ? "Sla wijzigingen eerst op" : isCompleted ? "Heropenen" : "Afronden"}
                  className="flex min-h-[44px] min-w-0 items-center justify-center gap-2 rounded-xl border border-emerald-500/20 px-3 text-sm font-semibold text-emerald-300 transition-colors hover:border-emerald-500/35 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <CheckCircle2 size={16} />
                  <span className="truncate">
                    {pendingAction === "complete" ? "Bezig..." : isCompleted ? "Heropenen" : "Afronden"}
                  </span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
              <button
                type="button"
                onClick={() => void handleCloseAttempt()}
                disabled={actionBusy}
                className="min-h-[44px] min-w-0 rounded-xl border border-[var(--color-border)] px-4 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)] disabled:opacity-50 sm:min-w-[112px]"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!canSave || actionBusy}
                className="min-h-[44px] min-w-0 rounded-xl bg-amber-500 px-4 text-sm font-bold text-[var(--color-primary-foreground)] transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-35 sm:min-w-[120px]"
              >
                {saving ? "Opslaan..." : note ? canSave ? "Opslaan" : "Opgeslagen" : "Aanmaken"}
              </button>
            </div>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg p-2 transition-colors ${
        active
          ? "bg-amber-500/15 text-amber-300"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
      }`}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon size={16} />
    </button>
  );
}

function PanelButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[42px] min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors ${
        active
          ? "bg-amber-500/15 text-amber-200"
          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
      }`}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      <Icon size={14} />
      <span className="truncate">{label}</span>
    </button>
  );
}

function PanelSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3">
      <div className="flex min-h-[34px] items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase text-[var(--color-text-subtle)]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function QuickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[38px] min-w-0 rounded-lg border border-[var(--color-border)] px-2 text-xs font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-lg bg-black/10 px-2 py-2 text-center">
      <p className="truncate text-[10px] uppercase text-[var(--color-text-subtle)]">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-[var(--color-text)]">{value}</p>
    </div>
  );
}

function formatEventOption(event: PersonalEvent) {
  const source = event.kalender === "Rooster" ? "Dienst" : event.kalender;
  return `${formatDateRange(event)} - ${getTimeLabel(event)} - ${event.titel} (${source})`;
}

function buildEventOptionGroups(events: PersonalEvent[]): EventOptionGroup[] {
  const unique = new Map<string, PersonalEvent>();
  for (const event of events) {
    if (!event.eventId || isDeletedEvent(event)) continue;
    unique.set(event.eventId, event);
  }

  const personal: PersonalEvent[] = [];
  const roster: PersonalEvent[] = [];
  const history: PersonalEvent[] = [];

  for (const event of unique.values()) {
    if (event.kalender !== "Rooster") {
      personal.push(event);
    } else if (event.status === "Voorbij") {
      history.push(event);
    } else {
      roster.push(event);
    }
  }

  return [
    { id: "personal", label: "Eigen afspraken", events: personal.sort(compareEventOptions) },
    { id: "roster", label: "Diensten", events: roster.sort(compareEventOptions) },
    { id: "history", label: "Voorbij", events: history.sort(compareEventOptions).reverse() },
  ].filter((group) => group.events.length > 0);
}

function compareEventOptions(a: PersonalEvent, b: PersonalEvent) {
  return eventOptionSortKey(a).localeCompare(eventOptionSortKey(b)) || a.titel.localeCompare(b.titel, "nl");
}

function eventOptionSortKey(event: PersonalEvent) {
  return `${event.startDatum || "9999-12-31"}T${event.startTijd || "00:00"}`;
}

function eventToDeadline(event: PersonalEvent) {
  if (!event.startDatum) return "";
  const time = event.startTijd || "09:00";
  const value = `${event.startDatum}T${time}`;
  return localDateTimeToIso(value);
}

function isDeletedEvent(event: PersonalEvent) {
  return event.status === "VERWIJDERD" || event.status === "cancelled" || event.status === "PendingDelete";
}

function shortEventId(eventId: string) {
  return eventId.length > 12 ? `${eventId.slice(0, 12)}...` : eventId;
}

function formatDeadlineForInput(value?: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T09:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return value.slice(0, 16);

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-") + `T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function localDateTimeToIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function normalizeDeadlineForSave(value: string): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) {
    return localDateTimeToIso(value);
  }
  return value;
}

function getLinkSearchItems(results: unknown): LinkSearchItem[] {
  if (Array.isArray(results)) return results as LinkSearchItem[];
  if (!results || typeof results !== "object") return [];
  const data = (results as { data?: unknown }).data;
  return Array.isArray(data) ? data as LinkSearchItem[] : [];
}

function buildInitialSnapshot(
  note: NoteRecord | null | undefined,
  options: {
    initialDeadline?: string;
    initialLinkedEventId?: string;
    initialTags?: string[];
    initialTitle?: string;
  },
): NoteEditorSnapshot {
  if (note) return snapshotFromNote(note);
  return normalizeEditorSnapshot({
    titel: options.initialTitle ?? "",
    inhoud: "",
    tags: options.initialTags ?? [],
    kleur: "",
    deadline: options.initialDeadline ?? "",
    linkedEventId: options.initialLinkedEventId ?? "",
    prioriteit: "normaal",
    symbol: "note",
  });
}

function snapshotFromNote(note: NoteRecord): NoteEditorSnapshot {
  return normalizeEditorSnapshot({
    titel: note.titel ?? "",
    inhoud: note.inhoud ?? "",
    tags: note.tags ?? [],
    kleur: note.kleur ?? "",
    deadline: note.deadline ?? "",
    linkedEventId: note.linkedEventId ?? note.linked_event_id ?? "",
    prioriteit: note.prioriteit ?? "normaal",
    symbol: resolveAppIconName(note.symbol, "note"),
  });
}

function sameEditorSnapshot(a: NoteEditorSnapshot, b: NoteEditorSnapshot) {
  return (
    a.titel === b.titel &&
    a.inhoud === b.inhoud &&
    tagsKey(a.tags) === tagsKey(b.tags) &&
    a.kleur === b.kleur &&
    a.deadline === b.deadline &&
    a.linkedEventId === b.linkedEventId &&
    a.prioriteit === b.prioriteit &&
    a.symbol === b.symbol
  );
}

function tagsKey(values?: string[]) {
  return normalizeTags(values ?? []).join(",");
}

function normalizeEditorSnapshot(snapshot: NoteEditorSnapshot): NoteEditorSnapshot {
  return {
    titel: snapshot.titel.trim(),
    inhoud: snapshot.inhoud.trimEnd(),
    tags: normalizeTags(snapshot.tags),
    kleur: snapshot.kleur,
    deadline: snapshot.deadline,
    linkedEventId: snapshot.linkedEventId,
    prioriteit: snapshot.prioriteit || "normaal",
    symbol: snapshot.symbol,
  };
}

function normalizeTags(values: string[]) {
  return [...new Set(values.map(cleanTag).filter(Boolean))].sort();
}

function cleanTag(value: string) {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, "-").toLowerCase();
}

function getChecklistStats(value: string) {
  const matches = value.match(/^- \[[ xX]\] /gm) ?? [];
  const done = matches.filter((match) => /^- \[[xX]\] /.test(match)).length;
  return { total: matches.length, done };
}

function firstContentLine(value?: string | null) {
  return (value ?? "").split("\n").map((line) => line.trim()).find(Boolean) ?? "";
}

function formatDutchDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
