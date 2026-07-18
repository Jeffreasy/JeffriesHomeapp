"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ListChecks, Plus, RotateCcw } from "lucide-react";
import type { NoteRecord, NoteCreateData } from "@/hooks/useNotes";
import { getTimeLabel, type PersonalEvent } from "@/hooks/usePersonalEvents";
import type { DienstRow } from "@/lib/schedule";
import { shiftPresentation } from "@/components/schedule/schedulePresentation";
import { AppIcon } from "@/components/ui/AppIcon";
import { resolveAppIconName } from "@/lib/symbols";
import { getChecklistInfo } from "./NotesUtils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";
import { cn } from "@/lib/utils";
import { NoteContextBadge } from "./NoteContextBadge";

interface DayColumnProps {
  date: Date;
  isToday: boolean;
  notes: NoteRecord[];
  diensten?: DienstRow[];
  agendaEvents?: PersonalEvent[];
  onEdit: (note: NoteRecord) => void;
  onCreate: (data: NoteCreateData) => Promise<void>;
  onToggleComplete: (id: string) => void | Promise<void>;
  masked?: boolean;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
}

const DAG_NAMEN_LANG = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

export function DayColumn({ date, isToday, notes, diensten = [], agendaEvents = [], onEdit, onCreate, onToggleComplete, masked = false }: DayColumnProps) {
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
      // K1: a quick-add in TODAY's column is a journal entry, not a task — it
      // buckets via `aangemaakt` (WeekJournal falls back to it) and gets NO
      // artificial deadline. The old 09:00-today deadline inflated the
      // "Aandacht" bucket (deadline-today counts as attention) for every
      // journal jot. Only a quick-add on ANOTHER day still needs a deadline
      // anchor, otherwise it would land in the wrong column; 09:00 local as a
      // full ISO string matches the editor's normalizeDeadlineForSave output
      // (a bare "YYYY-MM-DD" would parse as UTC-midnight and skew buckets).
      const titleChars = Array.from(text);
      let deadline: string | undefined;
      if (!isToday) {
        const deadlineAt = new Date(date);
        deadlineAt.setHours(9, 0, 0, 0);
        deadline = deadlineAt.toISOString();
      }
      await onCreate({
        inhoud: text,
        titel: titleChars.length > 80 ? titleChars.slice(0, 77).join("") + "…" : text,
        deadline,
      });
      setQuickText("");
    } catch {
      // useNotes' create-mutatie toast de fout al — deze catch voorkomt alleen
      // een unhandled rejection; de invoer blijft staan voor een retry (low).
    } finally {
      setSaving(false);
    }
  }, [quickText, saving, onCreate, date, isToday]);

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
    <Surface
      tone={isToday ? "success" : isWeekend ? "subtle" : "default"}
      radius="md"
      padding="none"
      className="group relative flex flex-col transition-colors duration-[var(--motion-standard)] motion-reduce:transition-none"
    >
      {/* Dag header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <div className="flex items-center gap-2">
          {isToday && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-success)] opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-success)]" />
            </span>
          )}
          <span className={`text-sm font-semibold capitalize ${isToday ? "text-[var(--color-success)]" : isWeekend ? "text-[var(--color-text-muted)]" : "text-[var(--color-text)]"}`}>
            {dagNaam}
          </span>
          <span className={`text-xs ${isToday ? "text-[var(--color-success)]" : "text-[var(--color-text-muted)]"}`}>
            {dagNr} {maand}
          </span>
        </div>
        {notes.length > 0 && (
          <Badge tone="neutral" size="sm">
            {openNotes.length}/{notes.length}
          </Badge>
        )}
      </div>

      {diensten.length > 0 && (
        <div className="mx-3 mt-2 space-y-1">
          {diensten.map((dienst) => {
            const shift = shiftPresentation(dienst.shiftType ?? "");
            return (
              <div
                key={dienst.eventId}
                className={cn(
                  "flex items-center justify-between rounded-lg border px-2.5 py-1.5 text-micro font-semibold",
                  shift.surface,
                  shift.border,
                  shift.text,
                )}
              >
                <span className="flex items-center gap-1.5 uppercase tracking-widest font-black text-micro">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", shift.dot)} />
                  {dienst.shiftType}
                </span>
                <span className="font-mono tracking-tighter text-[var(--color-text-muted)]">
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
            <Surface
              key={event.eventId}
              tone="info"
              radius="sm"
              padding="none"
              className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-micro"
            >
              <span className="flex min-w-0 items-center gap-1.5 font-semibold text-[var(--color-info)]">
                <AppIcon name={resolveAppIconName(event.symbol, "agenda")} tone="info" size="xs" />
                <span className="truncate">{event.titel}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-micro text-[var(--color-text-muted)]">
                <Clock size={9} />
                {getTimeLabel(event)}
              </span>
            </Surface>
          ))}
          {agendaEvents.length > 4 && (
            <p className="px-2 text-micro font-medium text-[var(--color-text-muted)]">+{agendaEvents.length - 4} meer afspraken</p>
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
              masked={masked}
            />
          ))}
        </AnimatePresence>

        {completedNotes.length > 0 && (
          <Surface tone="success" radius="sm" padding="none" className="mt-2 p-1.5">
            <div className="mb-1 flex items-center gap-1.5 px-1 text-micro font-semibold uppercase tracking-wide text-[var(--color-success)]">
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
                  masked={masked}
                />
              ))}
            </div>
          </Surface>
        )}
      </div>

      {/* Quick-add input */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Plus size={14} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--color-text-subtle)]" />
          <Input
            ref={inputRef}
            type="text"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Schrijf iets…"
            disabled={saving}
            className="border-dashed pl-9 pr-12 text-base sm:text-sm"
          />
          {quickText.trim() && (
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-micro text-[var(--color-text-subtle)]">Enter</span>
          )}
        </div>
      </div>
    </Surface>
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
  masked = false,
}: {
  note: NoteRecord;
  completed?: boolean;
  pending: boolean;
  columnDate: Date;
  onEdit: (note: NoteRecord) => void;
  onToggleComplete: (note: NoteRecord) => void | Promise<void>;
  masked?: boolean;
}) {
  // When the note sits in this day because of its DEADLINE, show the deadline
  // time (not the creation time, which would be on a different day).
  const bucketedByDeadline = Boolean(note.deadline && isSameAmsterdamDay(note.deadline, columnDate));
  const checklist = getChecklistInfo(note.inhoud);
  const previewTitle = note.titel || note.inhoud.split("\n")[0].slice(0, 50) || "Zonder titel";
  const displayTitle = masked ? "••••••" : previewTitle;
  const openNote = () => onEdit(note);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      // N2/R3-13: plain container — the TITLE is the real focusable open-control
      // (a role="button" div wrapping the real Afronden button was invalid ARIA
      // nesting, like the pre-N2 NoteCard).
      className="group/item w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-[var(--color-surface-hover)] focus-within:bg-[var(--color-surface-hover)]"
    >
      <div className="flex items-start gap-2">
        <AppIcon
          name={resolveAppIconName(note.symbol, "note")}
          tone={completed ? "success" : "accent"}
          size="xs"
          framed
          className="mt-0.5 h-6 w-6 rounded-md"
          iconClassName={note.kleur ? undefined : "text-[var(--color-text-muted)]"}
        />
        <div className="min-w-0 flex-1">
          <Button
            variant="ghost"
            fullWidth
            onClick={openNote}
            aria-label={masked ? "Notitie openen" : `Notitie openen: ${previewTitle}`}
            className={`justify-start truncate rounded-lg border-0 px-0 text-left shadow-none ${completed ? "text-[var(--color-text-muted)] line-through decoration-[var(--color-success-border)]" : "text-[var(--color-text)]"}`}
          >
            {displayTitle}
          </Button>
          {!masked && note.titel && note.inhoud !== note.titel && (
            <p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
              {note.inhoud.split("\n")[0].slice(0, 60)}
            </p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {!masked && checklist.total > 0 && (
              <Badge tone="info" size="sm">
                <ListChecks size={9} />
                {checklist.done}/{checklist.total}
              </Badge>
            )}
            {!masked && (note.tags?.length ?? 0) > 0 && note.tags!.slice(0, 2).map((tag) => (
              <Badge key={tag} tone="accent" size="sm">
                {tag}
              </Badge>
            ))}
            <NoteContextBadge note={note} compact masked={masked} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {/* K3: [@media(hover:hover)]-guard zoals NoteCard — touch-apparaten
              (geen hover) zien tijd en Afronden-knop altijd. */}
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-micro text-[var(--color-text-subtle)] opacity-100 transition-opacity [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/item:opacity-100 [@media(hover:hover)]:group-focus-within/item:opacity-100">
            {bucketedByDeadline && <Clock size={9} aria-hidden="true" />}
            {bucketedByDeadline ? formatTime(note.deadline!) : formatTime(note.aangemaakt)}
          </span>
          <IconButton
            label={completed ? "Heropenen" : "Afronden"}
            icon={completed ? <RotateCcw size={13} /> : <CheckCircle2 size={14} />}
            variant={completed ? "secondary" : "success"}
            onClick={(event) => {
              event.stopPropagation();
              void onToggleComplete(note);
            }}
            loading={pending}
            // R3-13: also reveal on keyboard focus within the card, not only on
            // pointer hover, so keyboard users can reach Afronden.
            className="opacity-100 sm:[@media(hover:hover)]:opacity-0 sm:group-hover/item:opacity-100 sm:group-focus-within/item:opacity-100"
          />
        </div>
      </div>
    </motion.div>
  );
}
