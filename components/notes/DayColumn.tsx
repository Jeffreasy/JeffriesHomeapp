"use client";

import { useState, useRef, useCallback, type KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ListChecks, Plus, RotateCcw } from "lucide-react";
import type { NoteRecord, NoteCreateData } from "@/hooks/useNotes";
import { getTimeLabel, type PersonalEvent } from "@/hooks/usePersonalEvents";
import { type DienstRow, shiftTypeColor } from "@/lib/schedule";
import { AppIcon } from "@/components/ui/AppIcon";
import { resolveAppIconName } from "@/lib/symbols";
import { getChecklistInfo } from "./NotesUtils";

interface DayColumnProps {
  date: Date;
  isToday: boolean;
  notes: NoteRecord[];
  diensten?: DienstRow[];
  agendaEvents?: PersonalEvent[];
  onEdit: (note: NoteRecord) => void;
  onCreate: (data: NoteCreateData) => Promise<void>;
  onToggleComplete: (id: string) => void | Promise<void>;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
}

const DAG_NAMEN_LANG = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

export function DayColumn({ date, isToday, notes, diensten = [], agendaEvents = [], onEdit, onCreate, onToggleComplete }: DayColumnProps) {
  const [quickText, setQuickText] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const dagNaam = DAG_NAMEN_LANG[date.getDay()];
  const dagNr = date.getDate();
  const maand = date.toLocaleDateString("nl-NL", { month: "short" });
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  const openNotes = notes.filter((note) => !(note.isCompleted || note.is_completed));
  const completedNotes = notes.filter((note) => note.isCompleted || note.is_completed);

  const handleQuickSave = useCallback(async () => {
    const text = quickText.trim();
    if (!text || saving) return;

    setSaving(true);
    try {
      // Anchor the quick-add deadline at 09:00 local and store it as a full ISO
      // string so it matches the format the note editor produces
      // (normalizeDeadlineForSave -> toISOString). A bare "YYYY-MM-DD" would sort
      // lexically ahead of any "...T..:..:..Z" deadline on the same day and would
      // be parsed as UTC-midnight by getDeadlineState, skewing the soon/overdue
      // buckets for users outside UTC.
      const deadlineAt = new Date(date);
      deadlineAt.setHours(9, 0, 0, 0);
      const titleChars = Array.from(text);
      await onCreate({
        inhoud: text,
        titel: titleChars.length > 80 ? titleChars.slice(0, 77).join("") + "..." : text,
        deadline: deadlineAt.toISOString(),
      });
      setQuickText("");
    } finally {
      setSaving(false);
    }
  }, [quickText, saving, onCreate, date]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuickSave();
    }
    if (e.key === "Escape") {
      setQuickText("");
      inputRef.current?.blur();
    }
  };

  const handleToggleComplete = async (note: NoteRecord) => {
    if (pendingCompleteId) return;
    setPendingCompleteId(note.id);
    try {
      await onToggleComplete(note.id);
    } finally {
      setPendingCompleteId(null);
    }
  };

  return (
    <div
      className={`
        group relative flex flex-col rounded-xl border transition-colors duration-200
        ${isToday
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : isWeekend
            ? "border-[var(--color-border)] bg-[var(--color-surface)]/50"
            : "border-[var(--color-border)] bg-[var(--color-surface)]"
        }
      `}
    >
      {/* Dag header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          {isToday && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          )}
          <span className={`text-sm font-semibold capitalize ${isToday ? "text-emerald-400" : isWeekend ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"}`}>
            {dagNaam}
          </span>
          <span className={`text-xs ${isToday ? "text-emerald-400/70" : "text-[var(--color-text-muted)]"}`}>
            {dagNr} {maand}
          </span>
        </div>
        {notes.length > 0 && (
          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-text-subtle)]">
            {openNotes.length}/{notes.length}
          </span>
        )}
      </div>

      {diensten.length > 0 && (
        <div className="mx-3 mt-2 space-y-1">
          {diensten.map((dienst) => {
            const shiftColors = dienst.shiftType ? shiftTypeColor(dienst.shiftType) : null;
            return (
              <div
                key={dienst.eventId}
                className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-colors"
                style={{
                  background: shiftColors ? shiftColors.accent + "0a" : "rgba(255,255,255,0.03)",
                  borderColor: shiftColors ? shiftColors.accent + "1a" : "rgba(255,255,255,0.08)",
                  color: shiftColors ? shiftColors.accent : "#94a3b8",
                }}
              >
                <span className="flex items-center gap-1.5 uppercase tracking-widest font-black text-[9px]">
                  <span
                    className="h-1.5 w-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: shiftColors ? shiftColors.accent : "#94a3b8" }}
                  />
                  {dienst.shiftType}
                </span>
                <span className="font-mono tracking-tighter text-slate-400">
                  {dienst.startTijd}–{dienst.eindTijd}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {agendaEvents.length > 0 && (
        <div className="mx-3 mt-2 space-y-1">
          {agendaEvents.slice(0, 4).map((event) => (
            <div
              key={event.eventId}
              className="flex items-center justify-between gap-2 rounded-lg border border-sky-500/15 bg-sky-500/[0.045] px-2.5 py-1.5 text-[11px]"
            >
              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-sky-200">
                <AppIcon name={resolveAppIconName(event.symbol, "agenda")} tone="cyan" size="xs" />
                <span className="truncate">{event.titel}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-[10px] text-slate-400">
                <Clock size={9} />
                {getTimeLabel(event)}
              </span>
            </div>
          ))}
          {agendaEvents.length > 4 && (
            <p className="px-2 text-[10px] font-medium text-slate-500">+{agendaEvents.length - 4} meer afspraken</p>
          )}
        </div>
      )}

      {/* Notities lijst */}
      <div className="flex-1 px-3 py-2 space-y-1 min-h-[60px]">
        <AnimatePresence mode="popLayout">
          {openNotes.length === 0 && completedNotes.length === 0 && !isToday && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[var(--color-text-subtle)] italic py-2 text-center"
            >
              Geen notities
            </motion.p>
          )}
          {openNotes.map((note) => (
            <JournalNoteButton
              key={note.id}
              note={note}
              columnDate={date}
              pending={pendingCompleteId === note.id}
              onEdit={onEdit}
              onToggleComplete={handleToggleComplete}
            />
          ))}
        </AnimatePresence>

        {completedNotes.length > 0 && (
          <div className="mt-2 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.035] p-1.5">
            <div className="mb-1 flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-300/80">
              <CheckCircle2 size={11} />
              Afgerond
            </div>
            <div className="space-y-1">
              {completedNotes.map((note) => (
                <JournalNoteButton
                  key={note.id}
                  note={note}
                  completed
                  columnDate={date}
                  pending={pendingCompleteId === note.id}
                  onEdit={onEdit}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick-add input */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] hover:border-[var(--color-border-hover)] transition-colors px-2.5 py-2 focus-within:border-emerald-500/40 focus-within:bg-emerald-500/[0.02]">
          <Plus size={14} className="text-[var(--color-text-subtle)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Schrijf iets..."
            disabled={saving}
            className="flex-1 bg-transparent text-base sm:text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none disabled:opacity-50"
          />
          {quickText.trim() && (
            <span className="text-[10px] text-[var(--color-text-subtle)]">↵</span>
          )}
        </div>
      </div>
    </div>
  );
}

function isSameAmsterdamDay(iso: string, date: Date): boolean {
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return false;
  return fmt(parsed) === fmt(date);
}

function JournalNoteButton({
  note,
  completed = false,
  pending,
  columnDate,
  onEdit,
  onToggleComplete,
}: {
  note: NoteRecord;
  completed?: boolean;
  pending: boolean;
  columnDate: Date;
  onEdit: (note: NoteRecord) => void;
  onToggleComplete: (note: NoteRecord) => void | Promise<void>;
}) {
  // When the note sits in this day because of its DEADLINE, show the deadline
  // time (not the creation time, which would be on a different day).
  const bucketedByDeadline = Boolean(note.deadline && isSameAmsterdamDay(note.deadline, columnDate));
  const checklist = getChecklistInfo(note.inhoud);
  const previewTitle = note.titel || note.inhoud.split("\n")[0].slice(0, 50) || "Zonder titel";
  const openNote = () => onEdit(note);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openNote();
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      role="button"
      tabIndex={0}
      aria-label={`Notitie openen: ${previewTitle}`}
      onClick={openNote}
      onKeyDown={handleKeyDown}
      className="group/item w-full cursor-pointer rounded-lg px-2.5 py-2 text-left outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-400/60"
    >
      <div className="flex items-start gap-2">
        <AppIcon
          name={resolveAppIconName(note.symbol, "note")}
          tone={completed ? "green" : "amber"}
          size="xs"
          framed
          className="mt-0.5 h-6 w-6 rounded-md"
          iconClassName={note.kleur ? undefined : "text-[var(--color-text-muted)]"}
        />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${completed ? "text-slate-500 line-through decoration-emerald-400/50" : "text-[var(--color-text)]"}`}>
            {previewTitle}
          </p>
          {note.titel && note.inhoud !== note.titel && (
            <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
              {note.inhoud.split("\n")[0].slice(0, 60)}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {checklist.total > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-300">
                <ListChecks size={9} />
                {checklist.done}/{checklist.total}
              </span>
            )}
            {(note.tags?.length ?? 0) > 0 && note.tags!.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400/70">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] text-[var(--color-text-subtle)] opacity-0 transition-opacity group-hover/item:opacity-100">
            {bucketedByDeadline && <Clock size={9} aria-hidden="true" />}
            {bucketedByDeadline ? formatTime(note.deadline!) : formatTime(note.aangemaakt)}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void onToggleComplete(note);
            }}
            disabled={pending}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 opacity-100 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40 sm:opacity-0 sm:group-hover/item:opacity-100"
            aria-label={completed ? "Heropenen" : "Afronden"}
            title={completed ? "Heropenen" : "Afronden"}
          >
            {completed ? <RotateCcw size={13} /> : <CheckCircle2 size={14} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
