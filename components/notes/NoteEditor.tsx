"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Tag, Palette, ListChecks, Clock, CalendarDays, AlertTriangle, Link2, Check, Trash2, Archive, Pin } from "lucide-react";
import { getNotesSearch } from "@/lib/api/generated/notes/notes";
import type { NoteRecord, NoteCreateData } from "@/hooks/useNotes";
import { formatDateRange, getTimeLabel, type PersonalEvent } from "@/hooks/usePersonalEvents";

const KLEUREN = [
  "#f59e0b", "#22c55e", "#3b82f6", "#ef4444",
  "#ec4899", "#06b6d4", "#64748b",
];

const PRIORITEITEN = [
  { value: "hoog",    label: "Hoog",    dot: "bg-red-500" },
  { value: "normaal", label: "Normaal", dot: "bg-slate-500" },
  { value: "laag",    label: "Laag",    dot: "bg-blue-400" },
] as const;

type LinkSearchItem = {
  id?: string;
  titel?: string | null;
};

interface NoteEditorProps {
  note?: NoteRecord | null;
  userId?: string;
  onSave:  (data: NoteCreateData) => Promise<void>;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  onTogglePin?: (id: string) => void;
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
  eventOptions = [],
  initialDeadline,
  initialLinkedEventId,
  initialTags,
  initialTitle,
}: NoteEditorProps) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [titel, setTitel]           = useState(note?.titel ?? initialTitle ?? "");
  const [inhoud, setInhoud]         = useState(note?.inhoud ?? "");
  const [tags, setTags]             = useState<string[]>(note?.tags ?? initialTags ?? []);
  const [kleur, setKleur]           = useState(note?.kleur ?? "");
  const [tagInput, setTagInput]     = useState("");
  const [showColors, setShowColors] = useState(false);
  const [deadline, setDeadline]     = useState(note?.deadline ?? initialDeadline ?? "");
  const [linkedEventId, setLinkedEventId] = useState(note?.linkedEventId ?? note?.linked_event_id ?? initialLinkedEventId ?? "");
  const [prioriteit, setPrioriteit] = useState(note?.prioriteit ?? "normaal");
  const [showMeta, setShowMeta]     = useState(!!(note?.deadline || initialDeadline || linkedEventId || (note?.prioriteit && note.prioriteit !== "normaal")));

  // ── Zettelkasten [[link]] autocomplete ──────────────────────────────
  const [linkSearch, setLinkSearch]     = useState("");
  const [linkActive, setLinkActive]    = useState(false);
  const [linkCursorPos, setLinkCursorPos] = useState(0);

  const [linkResults, setLinkResults]  = useState<{ id: string; titel: string }[]>([]);

  const resolvedUserId = userId || note?.user_id;

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
      } catch { setLinkResults([]); }
    }, 200);
    return () => clearTimeout(timer);
  }, [linkActive, linkSearch, resolvedUserId]);

  const textRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
    if (isMobile) {
      // On mobile, expand fully to avoid double scrollbars
      el.style.height = `${Math.max(120, el.scrollHeight)}px`;
    } else {
      el.style.height = `${Math.max(100, Math.min(el.scrollHeight, 500))}px`;
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      const isMobile = window.innerWidth < 640;
      if (!isMobile) {
        textRef.current?.focus();
      }
      autoResize();
    }, 150);
    return () => clearTimeout(t);
  }, [autoResize]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // ── Visualviewport resize for mobile keyboard ──
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const modal = scrollRef.current?.parentElement;
      if (modal) {
        const isMobile = window.innerWidth < 640;
        modal.style.maxHeight = isMobile ? `${vv.height}px` : `${vv.height - 16}px`;
      }
    };

    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    onResize(); // Set initial height
    return () => {
      vv.removeEventListener("resize", onResize);
      vv.removeEventListener("scroll", onResize);
    };
  }, []);

  const handleContentChange = (val: string) => {
    setInhoud(val);
    autoResize();

    // Detect [[ autocomplete trigger
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
  }, [inhoud, linkCursorPos, autoResize]);

  const handleSave = useCallback(async () => {
    if (!inhoud.trim()) return;
    setSaving(true);
    setSaveError("");
    try {
      const isEditing = Boolean(note);
      await onSave({
        titel: titel.trim() || undefined,
        inhoud: inhoud.trim(),
        tags: tags.length > 0 ? tags : isEditing ? [] : undefined,
        kleur: kleur || (isEditing ? "" : undefined),
        deadline: deadline || (isEditing ? "" : undefined),
        linkedEventId: linkedEventId || (isEditing ? "" : undefined),
        prioriteit: prioriteit,
      });
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }, [inhoud, titel, tags, kleur, deadline, linkedEventId, prioriteit, note, onSave, onClose]);

  const handleCloseAttempt = useCallback(() => {
    const cleanTitel = titel.trim();
    const cleanInhoud = inhoud.trim();
    const origTitel = note?.titel ?? "";
    const origInhoud = note?.inhoud ?? "";
    const origDeadline = note?.deadline ?? "";
    const origPrioriteit = note?.prioriteit ?? "normaal";
    const origKleur = note?.kleur ?? "";
    const origTags = note?.tags ?? [];
    const origLinkedEventId = note?.linkedEventId ?? note?.linked_event_id ?? initialLinkedEventId ?? "";

    const hasChanges =
      cleanTitel !== origTitel ||
      cleanInhoud !== origInhoud ||
      deadline !== origDeadline ||
      linkedEventId !== origLinkedEventId ||
      prioriteit !== origPrioriteit ||
      kleur !== origKleur ||
      [...tags].sort().join(",") !== [...origTags].sort().join(",");

    if (hasChanges) {
      const confirmClose = window.confirm(
        "Je hebt onopgeslagen wijzigingen. Weet je zeker dat je wilt sluiten?"
      );
      if (!confirmClose) return;
    }
    onClose();
  }, [titel, inhoud, deadline, linkedEventId, initialLinkedEventId, prioriteit, kleur, tags, note, onClose]);

  const handleDeleteClick = () => {
    if (onDelete && note) {
      if (window.confirm("Notitie permanent verwijderen?")) {
        onDelete(note.id);
        onClose();
      }
    }
  };

  const handleArchiveClick = () => {
    if (onArchive && note) {
      onArchive(note.id);
      onClose();
    }
  };

  const handlePinClick = () => {
    if (onTogglePin && note) {
      onTogglePin(note.id);
    }
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); handleCloseAttempt(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCloseAttempt, handleSave]);

  const insertChecklist = () => {
    const el = textRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const before = inhoud.slice(0, pos);
    const after = inhoud.slice(pos);
    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const newText = `${before}${prefix}- [ ] ${after}`;
    setInhoud(newText);
    requestAnimationFrame(() => {
      const newPos = pos + prefix.length + 6;
      el.setSelectionRange(newPos, newPos);
      el.focus();
      autoResize();
    });
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((tt) => tt !== tag));

  const charCount = inhoud.length;
  const wordCount = inhoud.trim() ? inhoud.trim().split(/\s+/).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" 
        onClick={handleCloseAttempt}
      />

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-[100dvh] sm:h-auto sm:max-w-lg sm:mx-4 rounded-none sm:rounded-2xl border-0 sm:border border-[var(--color-border)] overflow-hidden flex flex-col"
        style={{
          maxHeight: "100dvh",
          background: kleur
            ? `linear-gradient(145deg, ${kleur}12 0%, var(--color-surface) 50%)`
            : "var(--color-surface)",
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-[var(--color-border)] shrink-0">
          <div className="flex items-center gap-2">
            {kleur && (
              <span className="h-3 w-3 rounded-full shrink-0" style={{ background: kleur }} />
            )}
            <h3 className="text-sm font-semibold text-[var(--color-text)]">
              {note ? "Notitie bewerken" : "Nieuwe notitie"}
            </h3>
          </div>
          <div className="flex items-center gap-1 -mr-1">
            {note && onTogglePin && (
              <button
                type="button"
                onClick={handlePinClick}
                className={`p-2 rounded-lg transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${
                  note.isPinned
                    ? "text-amber-400"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
                }`}
                title={note.isPinned ? "Ontpinnen" : "Pinnen"}
                aria-label={note.isPinned ? "Ontpinnen" : "Pinnen"}
              >
                <Pin size={18} className={note.isPinned ? "fill-amber-400" : ""} />
              </button>
            )}
            <button
              onClick={handleCloseAttempt}
              className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Sluiten"
            >
              <X size={18} className="text-[var(--color-text-muted)]" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
          {/* Title */}
          <input
            type="text"
            placeholder="Titel (optioneel)"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            className="w-full bg-transparent text-base font-semibold text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none min-h-[44px]"
          />

          {/* Content */}
          <div className="relative">
            <textarea
              ref={textRef}
              placeholder="Schrijf je notitie..."
              value={inhoud}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                  const el = e.currentTarget;
                  const pos = el.selectionStart;
                  const lineStart = inhoud.lastIndexOf("\n", pos - 1) + 1;
                  const currentLine = inhoud.slice(lineStart, pos);
                  const match = /^- \[[ x]\] /.exec(currentLine);
                  if (match) {
                    if (currentLine.trim() === "- [ ]") {
                      e.preventDefault();
                      setInhoud(inhoud.slice(0, lineStart) + inhoud.slice(pos));
                      return;
                    }
                    e.preventDefault();
                    const insert = "\n- [ ] ";
                    setInhoud(inhoud.slice(0, pos) + insert + inhoud.slice(pos));
                    requestAnimationFrame(() => {
                      el.setSelectionRange(pos + insert.length, pos + insert.length);
                      autoResize();
                    });
                  }
                }
              }}
              className="w-full bg-transparent text-base sm:text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none resize-none leading-relaxed rounded-xl border border-[var(--color-border)] focus:border-amber-500/30 px-3 py-3 transition-colors"
              style={{ minHeight: 100 }}
            />

            {/* [[wiki-link]] autocomplete dropdown */}
            <AnimatePresence>
              {linkActive && linkResults && linkResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute left-0 right-0 mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] overflow-hidden max-h-[200px] overflow-y-auto z-10 shadow-lg shadow-black/30"
                >
                  {linkResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); insertLink(result.titel); }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer min-h-[40px]"
                    >
                      <Link2 size={14} className="text-amber-400/70 shrink-0" />
                      <span className="truncate">{result.titel}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Toolbar row */}
          <div className="flex items-center gap-1">
            <ToolbarButton icon={ListChecks} label="Checklist" onClick={insertChecklist} active={false} />
            <ToolbarButton icon={Palette} label="Kleur" onClick={() => setShowColors(!showColors)} active={showColors} />
            <ToolbarButton icon={CalendarDays} label="Deadline" onClick={() => setShowMeta(!showMeta)} active={showMeta} />

            <div className="ml-auto flex items-center gap-1 text-[10px] text-[var(--color-text-subtle)]">
              <Clock size={10} />
              {wordCount}w · {charCount}c
            </div>
          </div>

          {/* Color picker */}
          <AnimatePresence>
            {showColors && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
                  <button
                    onClick={() => setKleur("")}
                    className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                      !kleur ? "border-white/40 bg-[var(--color-surface)]" : "border-transparent bg-[var(--color-surface)] hover:border-white/20"
                    }`}
                    aria-label="Geen kleur"
                  >
                    {!kleur && <X size={12} className="text-[var(--color-text-muted)]" />}
                  </button>
                  {KLEUREN.map((c) => (
                    <button
                      key={c}
                      onClick={() => setKleur(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                        kleur === c ? "border-white/60 scale-110" : "border-transparent hover:scale-105"
                      }`}
                      style={{ background: c }}
                      aria-label={`Kleur ${c}`}
                    >
                      {kleur === c && <Check size={14} className="text-white drop-shadow" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Deadline + Priority (collapsible meta section) */}
          <AnimatePresence>
            {showMeta && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)]">
                  {/* Deadline picker */}
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-[var(--color-text-subtle)] shrink-0" />
                    <input
                      type="datetime-local"
                      value={deadline ? deadline.slice(0, 16) : ""}
                      onChange={(e) => setDeadline(e.target.value ? new Date(e.target.value).toISOString() : "")}
                      className="bg-transparent text-base sm:text-sm text-[var(--color-text)] outline-none border border-[var(--color-border)] rounded-lg px-3 py-2.5 flex-1 min-h-[44px] [color-scheme:dark]"
                    />
                    {deadline && (
                      <button
                        onClick={() => setDeadline("")}
                        className="p-2 hover:bg-[var(--color-surface-hover)] rounded-lg cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Deadline verwijderen"
                      >
                        <X size={14} className="text-[var(--color-text-muted)]" />
                      </button>
                    )}
                  </div>

                  {/* Priority selector */}
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-[var(--color-text-subtle)] shrink-0" />
                    <div className="flex gap-1.5 flex-1">
                      {PRIORITEITEN.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setPrioriteit(p.value)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer min-h-[40px] ${
                            prioriteit === p.value
                              ? "bg-white/10 text-[var(--color-text)] border border-white/15"
                              : "text-[var(--color-text-muted)] hover:bg-white/5 border border-transparent"
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${p.dot}`} />
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {eventOptions.length > 0 && (
                    <div className="flex items-center gap-2">
                      <CalendarDays size={14} className="text-[var(--color-text-subtle)] shrink-0" />
                      <select
                        value={linkedEventId}
                        onChange={(e) => setLinkedEventId(e.target.value)}
                        className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-base text-[var(--color-text)] outline-none [color-scheme:dark] sm:text-sm"
                      >
                        <option value="">Geen afspraak gekoppeld</option>
                        {eventOptions.slice(0, 80).map((event) => (
                          <option key={event.eventId} value={event.eventId}>
                            {formatEventOption(event)}
                          </option>
                        ))}
                      </select>
                      {linkedEventId && (
                        <button
                          type="button"
                          onClick={() => setLinkedEventId("")}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2 hover:bg-[var(--color-surface-hover)] cursor-pointer"
                          aria-label="Afspraak loskoppelen"
                        >
                          <X size={14} className="text-[var(--color-text-muted)]" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tags */}
          <div className="flex items-center flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs text-amber-300/80 bg-amber-500/10 border border-amber-500/15 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-red-500/20 hover:text-red-300 hover:border-red-500/20 transition-colors min-h-[36px]"
                onClick={() => removeTag(tag)}
              >
                <Tag size={10} /> {tag} <X size={10} />
              </span>
            ))}
            <input
              type="text"
              placeholder="+ tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="bg-transparent text-base sm:text-xs text-[var(--color-text-muted)] placeholder:text-[var(--color-text-subtle)] outline-none w-20 min-h-[36px]"
            />
          </div>
        </div>

        {/* Footer — fixed at bottom */}
        <div className="flex flex-col gap-2 px-4 sm:px-5 py-3 border-t border-[var(--color-border)] shrink-0 bg-[var(--color-surface)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {saveError && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
          <div className="flex items-center gap-2 w-full justify-between">
            {/* Quick Actions (Delete, Archive) */}
            <div className="flex items-center gap-1">
              {note && onDelete && (
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="p-2.5 rounded-xl border border-red-500/10 hover:border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold"
                  title="Notitie verwijderen"
                  aria-label="Notitie verwijderen"
                >
                  <Trash2 size={16} />
                  <span className="hidden sm:inline">Verwijderen</span>
                </button>
              )}
              {note && onArchive && (
                <button
                  type="button"
                  onClick={handleArchiveClick}
                  className="p-2.5 rounded-xl border border-[var(--color-border)] hover:border-[var(--color-border-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold"
                  title={note.isArchived ? "Dearchiveren" : "Archiveren"}
                  aria-label={note.isArchived ? "Dearchiveren" : "Archiveren"}
                >
                  <Archive size={16} />
                  <span className="hidden sm:inline">{note.isArchived ? "Dearchiveren" : "Archiveren"}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <p className="text-[10px] text-[var(--color-text-subtle)] hidden md:block mr-2">
                Ctrl+Enter om op te slaan
              </p>
              <button
                onClick={handleCloseAttempt}
                disabled={saving}
                className="px-5 py-2.5 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer min-h-[44px] rounded-xl border border-[var(--color-border)] sm:border-none disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                disabled={!inhoud.trim() || saving}
                className="px-6 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] bg-amber-500 hover:bg-amber-400 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
              >
                {saving ? "Opslaan..." : note ? "Opslaan" : "Aanmaken"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function formatEventOption(event: PersonalEvent) {
  const source = event.kalender === "Rooster" ? "Dienst" : event.kalender;
  return `${formatDateRange(event)} - ${getTimeLabel(event)} - ${event.titel} (${source})`;
}

function getLinkSearchItems(results: unknown): LinkSearchItem[] {
  if (Array.isArray(results)) return results as LinkSearchItem[];
  if (!results || typeof results !== "object") return [];
  const data = (results as { data?: unknown }).data;
  return Array.isArray(data) ? data as LinkSearchItem[] : [];
}

// ── Extracted toolbar button ──────────────────────────────────────────
function ToolbarButton({
  icon: Icon,
  label,
  onClick,
  active,
}: {
  icon: typeof ListChecks;
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-2.5 rounded-lg transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${
        active
          ? "bg-amber-500/10 text-amber-400"
          : "hover:bg-[var(--color-surface-hover)] text-[var(--color-text-subtle)]"
      }`}
      title={label}
      aria-label={label}
    >
      <Icon size={16} />
    </button>
  );
}
