"use client";

import { useState, type MouseEvent as ReactMouseEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Pin, Archive, Trash2, Tag, ListChecks, Check, Clock, CalendarDays, AlertTriangle, Link2, CheckCircle2 } from "lucide-react";
import type { NoteRecord } from "@/hooks/useNotes";
import { AppIcon } from "@/components/ui/AppIcon";
import { resolveAppIconName } from "@/lib/symbols";
import { CHECKLIST_ITEM, CHECKLIST_DONE, getChecklistInfo, amsterdamDayDiff } from "./NotesUtils";

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

const KLEUR_OPACITY = "25";

const PRIORITEIT_STYLES: Record<string, { dot: string; label: string }> = {
  hoog:    { dot: "bg-red-500",    label: "Hoog" },
  normaal: { dot: "bg-slate-500",  label: "Normaal" },
  laag:    { dot: "bg-blue-400",   label: "Laag" },
};

type PendingAction = "pin" | "complete" | "archive" | "delete" | "check" | null;

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
  const deadlineInfo = note.deadline ? getDeadlineInfo(note.deadline) : null;
  const prio = PRIORITEIT_STYLES[note.prioriteit ?? "normaal"] ?? PRIORITEIT_STYLES.normaal;
  const symbol = resolveAppIconName(note.symbol, "note");
  const compact = density === "compact";
  const isCompleted = note.isCompleted || note.is_completed;
  const isPinned = note.isPinned || note.is_pinned;
  const linkedEventId = note.linkedEventId ?? note.linked_event_id;
  const actionButtonClass = compact
    ? "flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[40px] sm:min-w-[40px]"
    : "flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-45";
  const runAction = async (action: PendingAction, callback: () => void | Promise<void>) => {
    if (pendingAction) return;
    setPendingAction(action);
    try {
      await callback();
    } finally {
      setPendingAction(null);
    }
  };

  const toggleCheckbox = async (originalLineIndex: number) => {
    if (!onUpdateContent) return;
    const lines = [...allLines];
    const line = lines[originalLineIndex];
    if (!line) return;
    if (/^- \[ \]/.test(line)) {
      lines[originalLineIndex] = line.replace(/^- \[ \]/, "- [x]");
    } else if (/^- \[[xX]\]/.test(line)) {
      lines[originalLineIndex] = line.replace(/^- \[[xX]\]/, "- [ ]");
    } else {
      return;
    }
    await runAction("check", () => onUpdateContent(note.id, lines.join("\n"), note.gewijzigd));

  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`glass group relative rounded-xl border border-[var(--color-border)] outline-none transition-all ${
        pendingAction
          ? "cursor-progress opacity-80"
          : "cursor-pointer hover:border-[var(--color-border-hover)]"
      }`}
      style={{
        background: note.kleur
          ? `linear-gradient(135deg, ${note.kleur}${KLEUR_OPACITY} 0%, rgba(15,15,20,0.85) 100%)`
          : "var(--color-surface)",
      }}
      onClick={() => {
        if (!pendingAction) onEdit(note);
      }}
    >
      {/* Priority indicator — left strip */}
      {isCompleted ? (
        <div className="absolute bottom-3 left-0 top-3 w-0.5 rounded-full bg-emerald-500" />
      ) : note.prioriteit === "hoog" && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-red-500" />
      )}

      {/* Pin indicator */}
      {isPinned && (
        <div className="absolute top-2 right-2">
          <Pin size={12} className="text-amber-400 fill-amber-400" />
        </div>
      )}

      <div className={compact ? "p-3" : "p-4"}>
        {/* Title row with priority dot */}
        <div className="mb-1 flex items-center gap-2">
          <AppIcon name={symbol} tone="amber" size="sm" framed className="h-8 w-8 rounded-lg" />
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
          <h3 className={`min-w-0 flex-1 truncate text-sm font-semibold ${isCompleted ? "text-slate-400 line-through decoration-emerald-400/50" : "text-slate-200"}`}>
            <button
              type="button"
              disabled={Boolean(pendingAction)}
              aria-label={masked ? "Notitie openen" : `Notitie openen: ${displayTitle}`}
              onClick={(e) => {
                e.stopPropagation();
                if (!pendingAction) onEdit(note);
              }}
              className="block w-full truncate rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 disabled:cursor-progress"
            >
              {masked ? "••••••" : displayTitle}
            </button>
          </h3>
        </div>

        {!masked && isCompleted && (
          <div className="mb-2 inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
            <CheckCircle2 size={9} aria-hidden="true" />
            Afgerond{note.completedAt || note.completed_at ? ` · ${formatAge(note.completedAt ?? note.completed_at ?? note.gewijzigd)}` : ""}
          </div>
        )}

        {/* Deadline badge */}
        {!masked && deadlineInfo && (
          <div className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md mb-2 ${deadlineInfo.style}`}>
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
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-400 mb-2 ml-1"
            title={linkedEventLabel ? `Gekoppeld aan ${linkedEventLabel}` : "Gekoppeld aan afspraak"}
          >
            <CalendarDays size={9} aria-hidden="true" />
            <span className="truncate">{linkedEventLabel ?? "Gekoppeld"}</span>
          </div>
        )}

        {/* Content preview with checklist + wiki-link support */}
        <div className={`mb-2 break-words text-xs leading-relaxed text-slate-400 ${compact ? "line-clamp-3" : "line-clamp-4"}`}>
          {masked ? "•••• •••• ••••" : renderPreview(allLines, onUpdateContent ? toggleCheckbox : undefined, onNavigateToNote)}
        </div>

        {/* Checklist progress */}
        {!masked && checklistInfo.total > 0 && (
          <div className="mb-2 flex items-center gap-2">
            <ListChecks size={10} className="text-slate-600 shrink-0" aria-hidden="true" />
            <div className="flex-1 h-1 rounded-full bg-[var(--color-surface)] overflow-hidden" role="progressbar" aria-valuenow={checklistInfo.pct} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${checklistInfo.pct}%`,
                  background: checklistInfo.pct === 100
                    ? "#22c55e"
                    : checklistInfo.pct > 50
                      ? "#f59e0b"
                      : "#64748b",
                }}
              />
            </div>
            <span className="text-[10px] text-slate-600 shrink-0 tabular-nums">
              {checklistInfo.done}/{checklistInfo.total}
            </span>
          </div>
        )}

        {/* Footer: tags + time + actions */}
        <div className="flex items-end justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {masked ? (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-slate-500">
                <Tag size={8} aria-hidden="true" />
                ••••
              </span>
            ) : (
              <>
                {(note.tags ?? []).slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex min-w-0 items-center gap-0.5 rounded-md bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-slate-400"
                  >
                    <Tag size={8} aria-hidden="true" />
                    <span className="max-w-[5rem] truncate">{tag}</span>
                  </span>
                ))}
                {(note.tags ?? []).length > 2 && (
                  <span className="text-[10px] text-slate-600">+{(note.tags ?? []).length - 2}</span>
                )}
              </>
            )}
            <span className="text-[10px] text-slate-600">{age}</span>
          </div>

          {/* Action buttons — always visible on touch, hover-reveal only on hover-capable pointers (e.g. desktop) */}
          <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:[@media(hover:hover)]:opacity-0 sm:group-hover:opacity-100">
            {onToggleComplete && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); void runAction("complete", () => onToggleComplete(note.id)); }}
                disabled={Boolean(pendingAction)}
                className={`${actionButtonClass} hover:bg-emerald-500/15`}
                aria-label={isCompleted ? "Heropenen" : "Afronden"}
                title={isCompleted ? "Heropenen" : "Afronden"}
              >
                <CheckCircle2 size={14} className={isCompleted ? "text-emerald-400 fill-emerald-400/20" : "text-slate-500"} />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void runAction("pin", () => onTogglePin(note.id)); }}
              disabled={Boolean(pendingAction)}
              className={`${actionButtonClass} hover:bg-[var(--color-surface-hover)]`}
              aria-label={isPinned ? "Losmaken" : "Vastpinnen"}
            >
              <Pin size={14} className={isPinned ? "text-amber-400 fill-amber-400" : "text-slate-500"} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void runAction("archive", () => onArchive(note.id)); }}
              disabled={Boolean(pendingAction)}
              className={`${actionButtonClass} hover:bg-[var(--color-surface-hover)]`}
              aria-label={note.isArchived ? "Terugzetten" : "Archiveren"}
            >
              <Archive size={14} className="text-slate-500" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); void runAction("delete", () => onDelete(note.id)); }}
              disabled={Boolean(pendingAction)}
              className={`${actionButtonClass} hover:bg-red-500/20`}
              aria-label="Verwijderen"
            >
              <Trash2 size={14} className="text-slate-500 hover:text-red-400" />
            </button>
          </div>
        </div>

        {/* Backlinks (Zettelkasten) — geen extra px: de kaart-container levert
            de horizontale padding al (N7, dubbele inspringing weg). */}
        {!masked && backlinks && backlinks.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Link2 size={10} className="text-amber-400/60 shrink-0" />
            {backlinks.slice(0, 3).map((bl) => (
              <button
                key={bl.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onNavigateToNote?.(bl.titel || "Naamloos"); }}
                aria-label={`Ga naar notitie: ${bl.titel || "Naamloos"}`}
                className="text-[10px] text-amber-400/70 bg-amber-400/8 px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-amber-400/15 transition-colors"
              >
                {bl.titel}
              </button>
            ))}
            {backlinks.length > 3 && (
              <span className="text-[10px] text-slate-600">+{backlinks.length - 3}</span>
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

  if (days < 0) return { label: "Verlopen!", style: "text-red-400 bg-red-500/15", overdue: true };
  if (days === 0) return { label: "Vandaag", style: "text-amber-400 bg-amber-500/15", overdue: false };
  if (days === 1) return { label: "Morgen", style: "text-amber-400 bg-amber-500/15", overdue: false };
  if (days <= 7) return { label: `Over ${days}d`, style: "text-sky-400 bg-sky-500/10", overdue: false };
  return {
    label: new Date(deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
    style: "text-slate-400 bg-[var(--color-surface)]",
    overdue: false,
  };
}

function renderPreview(allLines: string[], onToggle?: (originalLineIdx: number) => void | Promise<void>, onNavigateToNote?: (title: string) => void) {
  const previewLines = allLines.slice(0, 4);
  return previewLines.map((line, previewIdx) => {
    const originalIdx = previewIdx;

    const item = CHECKLIST_ITEM.exec(line);
    if (item) {
      const done = CHECKLIST_DONE.test(line);
      const label = item[1] || "";
      // The single interactive element IS the ~28px hit area, carrying the
      // checkbox role; the small visual box inside is decorative (aria-hidden) —
      // no nested interactive roles.
      const checkboxProps = onToggle
        ? {
            role: "checkbox" as const,
            "aria-checked": done,
            "aria-label": label || "taak",
            tabIndex: 0,
            onClick: (e: ReactMouseEvent) => { e.stopPropagation(); onToggle(originalIdx); },
            onKeyDown: (e: ReactKeyboardEvent) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              e.stopPropagation();
              onToggle(originalIdx);
            },
          }
        : { role: "checkbox" as const, "aria-checked": done, "aria-label": label || "taak" };
      return (
        <div key={originalIdx} className="flex items-start gap-1.5">
          <span
            {...checkboxProps}
            className={`group/cb -m-1 flex shrink-0 items-center justify-center rounded p-1 outline-none ${onToggle ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-amber-400/60" : ""}`}
          >
            <span
              aria-hidden
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border ${
                done
                  ? "border-emerald-500/50 bg-emerald-500/40"
                  : `border-[var(--color-border)] ${onToggle ? "group-hover/cb:border-amber-400/50" : ""}`
              }`}
            >
              {done && <Check size={8} className="text-emerald-300" />}
            </span>
          </span>
          <span className={done ? "mt-0.5 line-through text-slate-600" : "mt-0.5"}>
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
            className="inline-flex items-center gap-0.5 text-amber-400/80 bg-amber-400/10 px-1 py-0.5 rounded text-[10px]"
          >
            <Link2 size={8} />
            {linkMatch[1]}
          </span>
        );
      }
      return (
        <button
          key={i}
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigateToNote(linkMatch[1]); }}
          aria-label={`Ga naar notitie: ${linkMatch[1]}`}
          className="inline-flex items-center gap-0.5 text-amber-400/80 bg-amber-400/10 px-1 py-0.5 rounded text-[10px] cursor-pointer hover:bg-amber-400/20 transition-colors"
        >
          <Link2 size={8} />
          {linkMatch[1]}
        </button>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
