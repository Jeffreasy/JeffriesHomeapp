"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Pin, Archive, Trash2, Tag, ListChecks, Check, Clock, CalendarDays, AlertTriangle, Link2, CheckCircle2 } from "lucide-react";
import type { NoteRecord } from "@/hooks/useNotes";
import { AppIcon } from "@/components/ui/AppIcon";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { resolveAppIconName } from "@/lib/symbols";
import { Progress } from "@/components/ui/Progress";
import { CHECKLIST_ITEM, CHECKLIST_DONE, getChecklistInfo, amsterdamDayDiff } from "./NotesUtils";
import { NoteContextBadge } from "./NoteContextBadge";
import { KLEUREN } from "./NoteEditorTemplates";
import { cn } from "@/lib/utils";
import { surfaceVariants } from "@/components/ui/Surface";

export type NoteBacklink = {
  id: string;
  titel: string;
};

interface NoteCardProps {
  note: NoteRecord;
  onEdit:      (note: NoteRecord) => void;
  density?: "comfortable" | "compact";
  onTogglePin: (id: string) => void | Promise<void>;
  onToggleComplete?: (id: string) => void | Promise<void>;
  onArchive:   (id: string) => void | Promise<void>;
  onDelete:    (id: string) => void | Promise<void>;
  onUpdateContent?: (id: string, inhoud: string, expectedGewijzigd?: string) => void | Promise<void>;

  onNavigateToNote?: (title: string) => void;
  linkedEventLabel?: string;
  backlinks?: NoteBacklink[];
  masked?:     boolean;
}

const PRIORITEIT_STYLES: Record<string, { dot: string; label: string }> = {
  hoog:    { dot: "bg-[var(--color-danger)]",     label: "Hoog" },
  normaal: { dot: "bg-[var(--color-text-subtle)]", label: "Normaal" },
  laag:    { dot: "bg-[var(--color-info)]",       label: "Laag" },
};

type PendingAction = "pin" | "complete" | "archive" | "delete" | "check" | null;
function noteCardBackground(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  const paletteColor = normalized
    ? KLEUREN.find((color) => color.toLowerCase() === normalized)
    : undefined;
  return paletteColor
    ? `linear-gradient(135deg, color-mix(in srgb, ${paletteColor} 16%, transparent) 0%, var(--color-surface) 100%)`
    : "var(--color-surface)";
}

export function NoteCard({
  note,
  density = "comfortable",
  onEdit,
  onTogglePin,
  onToggleComplete,
  onArchive,
  onDelete,
  onUpdateContent,
  onNavigateToNote,
  linkedEventLabel,
  backlinks = [],
  masked,
}: NoteCardProps) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const displayTitle = note.titel || note.inhoud.slice(0, 50);
  const age = formatAge(note.gewijzigd);
  const checklistInfo = getChecklistInfo(note.inhoud);
  const allLines = note.inhoud.split("\n");
  // R3-15 (DayColumn's guard): quick-capture stores the full line as BOTH titel
  // and inhoud, so the title and the first preview line were identical. When the
  // first content line matches the shown title, drop it from the preview.
  const previewSourceLines =
    note.titel && allLines[0]?.trim() === note.titel.trim()
      ? allLines.slice(1)
      : allLines;
  const deadlineInfo = note.deadline ? getDeadlineInfo(note.deadline) : null;
  const prio = PRIORITEIT_STYLES[note.prioriteit ?? "normaal"] ?? PRIORITEIT_STYLES.normaal;
  const symbol = resolveAppIconName(note.symbol, "note");
  const compact = density === "compact";
  const isCompleted = note.isCompleted || note.is_completed;
  const isPinned = note.isPinned || note.is_pinned;
  const linkedEventId = note.linkedEventId ?? note.linked_event_id;
  const runAction = async (action: PendingAction, callback: () => void | Promise<void>) => {
    if (pendingAction) return;
    setPendingAction(action);
    try {
      await callback();
    } finally {
      setPendingAction(null);
    }
  };

  // R3-14: a second checkbox tick while a PATCH is in flight was dropped
  // silently. Instead we QUEUE the latest requested line and replay it once the
  // in-flight action settles — by then the parent has re-rendered with the fresh
  // gewijzigd (from onSuccess), so the replay carries a valid concurrency token.
  const noteRef = useRef(note);
  noteRef.current = note;
  const queuedLineRef = useRef<number | null>(null);
  const checkInFlightRef = useRef(false);

  const runCheckToggle = useCallback(
    async (originalLineIndex: number) => {
      if (!onUpdateContent) return;
      const current = noteRef.current;
      const lines = current.inhoud.split("\n");
      const line = lines[originalLineIndex];
      if (!line) return;
      if (/^- \[ \]/.test(line)) {
        lines[originalLineIndex] = line.replace(/^- \[ \]/, "- [x]");
      } else if (/^- \[[xX]\]/.test(line)) {
        lines[originalLineIndex] = line.replace(/^- \[[xX]\]/, "- [ ]");
      } else {
        return;
      }
      await onUpdateContent(current.id, lines.join("\n"), current.gewijzigd);
    },
    [onUpdateContent],
  );

  const toggleCheckbox = async (originalLineIndex: number) => {
    if (!onUpdateContent) return;
    // Already saving: remember this tick (last one wins) and bail — the settle
    // effect below will replay it.
    if (checkInFlightRef.current) {
      queuedLineRef.current = originalLineIndex;
      return;
    }
    checkInFlightRef.current = true;
    setPendingAction("check");
    try {
      await runCheckToggle(originalLineIndex);
    } finally {
      setPendingAction(null);
      checkInFlightRef.current = false;
    }
  };

  // Drain a queued tick after the note prop refreshed (fresh token in hand).
  useEffect(() => {
    if (checkInFlightRef.current) return;
    const queued = queuedLineRef.current;
    if (queued == null) return;
    queuedLineRef.current = null;
    void toggleCheckbox(queued);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.gewijzigd]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        surfaceVariants({ padding: "none", radius: "md" }),
        "group relative outline-none transition-[border-color,opacity] duration-[var(--motion-standard)] motion-reduce:transition-none",
        pendingAction
          ? "cursor-progress opacity-80"
          : "cursor-pointer hover:border-[var(--color-border-hover)]",
      )}
      style={{ background: noteCardBackground(note.kleur) }}
      onClick={() => {
        if (!pendingAction) onEdit(note);
      }}
    >
      {/* Priority indicator — left strip */}
      {isCompleted ? (
        <div className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-[var(--color-success)]" />
      ) : note.prioriteit === "hoog" && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-[var(--color-danger)]" />
      )}

      {/* Pin indicator */}
      {isPinned && (
        <div className="absolute top-2 right-2">
          <Pin size={12} className="fill-[var(--color-primary)] text-[var(--color-primary)]" />
        </div>
      )}

      <div className={compact ? "p-3" : "p-4"}>
        {/* Title row with priority dot */}
        <div className="mb-1 flex items-center gap-2">
          <AppIcon name={symbol} tone="accent" size="sm" framed className="h-8 w-8 rounded-lg" />
          {note.prioriteit && note.prioriteit !== "normaal" && (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${prio.dot}`}
              title={`Prioriteit: ${prio.label}`}
            />
          )}
          {/* N2: the card root is a plain div (role="button" + interactive
              children was invalid ARIA nesting). The TITLE is the real,
              keyboard-focusable open-control; the card-wide onClick stays as a
              pointer convenience. */}
          <h3 className={`min-w-0 flex-1 truncate text-sm font-semibold ${isCompleted ? "text-[var(--color-text-muted)] line-through decoration-[var(--color-success-border)]" : "text-[var(--color-text)]"}`}>
            <Button
              variant="ghost"
              fullWidth
              disabled={Boolean(pendingAction)}
              aria-label={masked ? "Notitie openen" : `Notitie openen: ${displayTitle}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!pendingAction) onEdit(note);
              }}
              className="min-w-0 justify-start truncate rounded border-0 px-0 text-left shadow-none disabled:cursor-progress"
            >
              {masked ? "••••••" : displayTitle}
            </Button>
          </h3>
        </div>

        {!masked && isCompleted && (
          <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-[var(--color-success-subtle)] px-1.5 py-0.5 text-micro font-semibold text-[var(--color-success)]">
            <CheckCircle2 size={9} aria-hidden="true" />
            Afgerond{note.completedAt || note.completed_at ? ` · ${formatAge(note.completedAt ?? note.completed_at ?? note.gewijzigd)}` : ""}
          </div>
        )}

        {/* Deadline badge */}
        {!masked && deadlineInfo && (
          <div className={`inline-flex items-center gap-1 text-micro px-1.5 py-0.5 rounded-md mb-2 ${deadlineInfo.style}`}>
            {deadlineInfo.overdue
              ? <AlertTriangle size={9} aria-hidden="true" />
              : <Clock size={9} aria-hidden="true" />
            }
            <span>{deadlineInfo.label}</span>
          </div>
        )}

        {/* Linked event chip */}
        {!masked && linkedEventId && (
          <div
            className="mb-2 ml-1 inline-flex max-w-full items-center gap-1 rounded-md bg-[var(--color-info-subtle)] px-1.5 py-0.5 text-micro text-[var(--color-info)]"
            title={linkedEventLabel ? `Gekoppeld aan ${linkedEventLabel}` : "Gekoppeld aan afspraak"}
          >
            <CalendarDays size={9} aria-hidden="true" />
            <span className="truncate">{linkedEventLabel ?? "Gekoppeld"}</span>
          </div>
        )}

        <NoteContextBadge
          note={note}
          masked={masked}
          compact={compact}
          className="mb-2 ml-1 align-top"
        />

        {/* Content preview with checklist + wiki-link support */}
        <div className={`mb-2 break-words text-xs leading-relaxed text-[var(--color-text-muted)] ${compact ? "line-clamp-3" : "line-clamp-4"}`}>
          {masked ? "•••• •••• ••••" : renderPreview(previewSourceLines, onUpdateContent ? toggleCheckbox : undefined, onNavigateToNote, allLines.length - previewSourceLines.length)}
        </div>

        {/* Checklist progress */}
        {!masked && checklistInfo.total > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <ListChecks size={10} className="text-[var(--color-text-subtle)] shrink-0" aria-hidden="true" />
            <Progress
              value={checklistInfo.pct}
              label={`Checklistvoortgang: ${checklistInfo.done} van ${checklistInfo.total}`}
              tone={checklistInfo.pct === 100 ? "success" : checklistInfo.pct > 50 ? "warning" : "accent"}
              className="h-1 flex-1"
            />
            <span className="text-micro text-[var(--color-text-subtle)] shrink-0 tabular-nums">
              {checklistInfo.done}/{checklistInfo.total}
            </span>
          </div>
        )}

        {/* Footer: tags + time + actions */}
        <div className="flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {masked ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-micro text-[var(--color-text-muted)]">
                <Tag size={8} aria-hidden="true" />
                ••••
              </span>
            ) : (
              <>
                {(note.tags ?? []).slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex min-w-0 items-center gap-0.5 rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-micro text-[var(--color-text-muted)]"
                  >
                    <Tag size={8} aria-hidden="true" />
                    <span className="max-w-[5rem] truncate">{tag}</span>
                  </span>
                ))}
                {(note.tags ?? []).length > 2 && (
                  <span className="text-micro text-[var(--color-text-subtle)]">+{(note.tags ?? []).length - 2}</span>
                )}
              </>
            )}
            <span className="text-micro text-[var(--color-text-subtle)]">{age}</span>
          </div>

          {/* Action buttons — always visible on touch, hover-reveal only on hover-capable pointers (e.g. desktop) */}
          <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:[@media(hover:hover)]:opacity-0 sm:group-hover:opacity-100">
            {onToggleComplete && (
              <IconButton
                label={isCompleted ? "Heropenen" : "Afronden"}
                title={isCompleted ? "Heropenen" : "Afronden"}
                icon={<CheckCircle2 size={14} className={isCompleted ? "fill-current" : ""} />}
                variant={isCompleted ? "success" : "ghost"}
                onClick={(e) => { e.stopPropagation(); void runAction("complete", () => onToggleComplete(note.id)); }}
                disabled={Boolean(pendingAction)}
                className="rounded-lg"
                aria-pressed={isCompleted}
              />
            )}
            <IconButton
              label={isPinned ? "Losmaken" : "Vastpinnen"}
              icon={<Pin size={14} className={isPinned ? "fill-current" : ""} />}
              variant={isPinned ? "primary" : "ghost"}
              onClick={(e) => { e.stopPropagation(); void runAction("pin", () => onTogglePin(note.id)); }}
              disabled={Boolean(pendingAction)}
              className="rounded-lg"
              aria-pressed={isPinned}
            />
            <IconButton
              label={note.isArchived ? "Terugzetten" : "Archiveren"}
              icon={<Archive size={14} />}
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); void runAction("archive", () => onArchive(note.id)); }}
              disabled={Boolean(pendingAction)}
              className="rounded-lg"
            />
            <IconButton
              label="Verwijderen"
              icon={<Trash2 size={14} />}
              variant="danger"
              onClick={(e) => { e.stopPropagation(); void runAction("delete", () => onDelete(note.id)); }}
              disabled={Boolean(pendingAction)}
              className="rounded-lg"
            />
          </div>
        </div>

        {/* Backlinks (Zettelkasten) — geen extra px: de kaart-container levert
            de horizontale padding al (N7, dubbele inspringing weg). */}
        {!masked && backlinks && backlinks.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Link2 size={10} className="shrink-0 text-[var(--color-primary)]" />
            {backlinks.slice(0, 3).map((bl) => (
              <Button
                key={bl.id}
                size="sm"
                variant="ghost"
                onClick={(e) => { e.stopPropagation(); onNavigateToNote?.(bl.titel || "Naamloos"); }}
                aria-label={`Ga naar notitie: ${bl.titel || "Naamloos"}`}
                className="min-w-0 max-w-full rounded-md bg-[var(--color-primary-subtle)] px-2 text-micro text-[var(--color-primary)] hover:bg-[var(--color-primary-border)]"
              >
                {bl.titel}
              </Button>
            ))}
            {backlinks.length > 3 && (
              <span className="text-micro text-[var(--color-text-subtle)]">+{backlinks.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "zojuist";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}u`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}w`;
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

function getDeadlineInfo(deadline: string): { label: string; style: string; overdue: boolean } {
  // Day boundaries on the Europe/Amsterdam calendar so "Vandaag"/"Verlopen"
  // agree with the backend (Telegram/AI) and the metric tiles.
  const days = amsterdamDayDiff(deadline);

  if (days < 0) return { label: "Verlopen!", style: "bg-[var(--color-danger-subtle)] text-[var(--color-danger)]", overdue: true };
  if (days === 0) return { label: "Vandaag", style: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]", overdue: false };
  if (days === 1) return { label: "Morgen", style: "bg-[var(--color-warning-subtle)] text-[var(--color-warning)]", overdue: false };
  if (days <= 7) return { label: `Over ${days}d`, style: "bg-[var(--color-info-subtle)] text-[var(--color-info)]", overdue: false };
  return {
    label: new Date(deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
    style: "bg-[var(--color-surface)] text-[var(--color-text-muted)]",
    overdue: false,
  };
}

function renderPreview(allLines: string[], onToggle?: (originalLineIdx: number) => void | Promise<void>, onNavigateToNote?: (title: string) => void, indexOffset = 0) {
  const previewLines = allLines.slice(0, 4);
  return previewLines.map((line, previewIdx) => {
    // Map back to the real note-line index so checkbox toggles hit the right
    // line even when a leading duplicate-title line was dropped (R3-15).
    const originalIdx = previewIdx + indexOffset;

    const item = CHECKLIST_ITEM.exec(line);
    if (item) {
      const done = CHECKLIST_DONE.test(line);
      const label = item[1] || "";
      const checkboxVisual = (
        <span
          className={`flex h-3.5 w-3.5 items-center justify-center rounded-sm border ${
            done
              ? "border-[var(--color-success-border)] bg-[var(--color-success-subtle)]"
              : `border-[var(--color-border)] ${onToggle ? "group-hover/cb:border-[var(--color-primary-border)]" : ""}`
          }`}
        >
          {done && <Check size={8} className="text-[var(--color-success)]" />}
        </span>
      );
      return (
        <div key={originalIdx} className="flex items-start gap-1.5">
          {onToggle ? (
            <IconButton
              label={label || "Taak wisselen"}
              icon={checkboxVisual}
              role="checkbox"
              aria-checked={done}
              onClick={(event) => {
                event.stopPropagation();
                void onToggle(originalIdx);
              }}
              className="group/cb rounded-lg p-0"
            />
          ) : (
            <span aria-hidden="true" className="flex shrink-0 items-center justify-center p-1">
              {checkboxVisual}
            </span>
          )}
          <span className={done ? "mt-0.5 line-through text-[var(--color-text-subtle)]" : "mt-0.5"}>
            {renderLineWithLinks(label, onNavigateToNote)}
          </span>
        </div>
      );
    }
    return <div key={originalIdx}>{renderLineWithLinks(line, onNavigateToNote)}</div>;
  });
}

/** Render [[title]] patterns as clickable amber chips within a line */
function renderLineWithLinks(text: string, onNavigateToNote?: (title: string) => void) {
  const parts = text.split(/(\[\[[^\]]+\]\])/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    const linkMatch = /^\[\[([^\]]+)\]\]$/.exec(part);
    if (linkMatch) {
      if (!onNavigateToNote) {
        return (
          <span
            key={i}
            className="inline-flex items-center gap-0.5 rounded bg-[var(--color-primary-subtle)] px-1 py-0.5 text-micro text-[var(--color-primary)]"
          >
            <Link2 size={8} />
            {linkMatch[1]}
          </span>
        );
      }
      return (
        <Button
          key={i}
          size="sm"
          variant="ghost"
          onClick={(e) => { e.stopPropagation(); onNavigateToNote(linkMatch[1]); }}
          aria-label={`Ga naar notitie: ${linkMatch[1]}`}
          className="mx-0.5 min-w-0 gap-1 rounded bg-[var(--color-primary-subtle)] px-2 text-micro text-[var(--color-primary)] hover:bg-[var(--color-primary-border)]"
        >
          <Link2 size={8} />
          {linkMatch[1]}
        </Button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
