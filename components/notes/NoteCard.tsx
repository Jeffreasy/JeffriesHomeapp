"use client";

import { motion } from "framer-motion";
import { Pin, Archive, Trash2, Tag, ListChecks, Check, Clock, CalendarDays, AlertTriangle, Link2 } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { NoteRecord } from "@/hooks/useNotes";

interface NoteCardProps {
  note: NoteRecord;
  onEdit:      (note: NoteRecord) => void;
  onTogglePin: (id: NoteRecord["_id"]) => void;
  onArchive:   (id: NoteRecord["_id"]) => void;
  onDelete:    (id: NoteRecord["_id"]) => void;
  onUpdateContent?: (id: NoteRecord["_id"], inhoud: string) => void;
  onNavigateToNote?: (title: string) => void;
  masked?:     boolean;
}

const KLEUR_OPACITY = "25";

const PRIORITEIT_STYLES: Record<string, { dot: string; label: string }> = {
  hoog:    { dot: "bg-red-500",    label: "Hoog" },
  normaal: { dot: "bg-slate-500",  label: "Normaal" },
  laag:    { dot: "bg-blue-400",   label: "Laag" },
};

export function NoteCard({ note, onEdit, onTogglePin, onArchive, onDelete, onUpdateContent, onNavigateToNote, masked }: NoteCardProps) {
  const displayTitle = note.titel || note.inhoud.slice(0, 50);
  const age = formatAge(note.gewijzigd);
  const checklistInfo = getChecklistInfo(note.inhoud);
  const allLines = note.inhoud.split("\n");
  const deadlineInfo = note.deadline ? getDeadlineInfo(note.deadline) : null;
  const prio = PRIORITEIT_STYLES[note.prioriteit ?? "normaal"] ?? PRIORITEIT_STYLES.normaal;
  const backlinks = useQuery(api.notes.getBacklinks, masked ? "skip" : { noteId: note._id });

  const toggleCheckbox = (originalLineIndex: number) => {
    if (!onUpdateContent) return;
    const lines = [...allLines];
    const line = lines[originalLineIndex];
    if (!line) return;
    if (UNCHECKED.test(line)) {
      lines[originalLineIndex] = line.replace("- [ ]", "- [x]");
    } else if (CHECKED.test(line)) {
      lines[originalLineIndex] = line.replace(/- \[x\]/i, "- [ ]");
    }
    onUpdateContent(note._id, lines.join("\n"));
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative rounded-xl border border-white/8 hover:border-white/15 transition-all cursor-pointer"
      style={{
        background: note.kleur
          ? `linear-gradient(135deg, ${note.kleur}${KLEUR_OPACITY} 0%, rgba(15,15,20,0.85) 100%)`
          : "rgba(255,255,255,0.03)",
      }}
      onClick={() => onEdit(note)}
    >
      {/* Priority indicator — left strip */}
      {note.prioriteit === "hoog" && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-full bg-red-500" />
      )}

      {/* Pin indicator */}
      {note.isPinned && (
        <div className="absolute top-2 right-2">
          <Pin size={12} className="text-amber-400 fill-amber-400" />
        </div>
      )}

      <div className="p-4">
        {/* Title row with priority dot */}
        <div className="flex items-center gap-1.5 mb-1">
          {note.prioriteit && note.prioriteit !== "normaal" && (
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${prio.dot}`}
              title={`Prioriteit: ${prio.label}`}
            />
          )}
          <h3 className="text-sm font-semibold text-slate-200 line-clamp-1">
            {masked ? "••••••" : displayTitle}
          </h3>
        </div>

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
        {!masked && note.linkedEventId && (
          <div className="inline-flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded-md mb-2 ml-1">
            <CalendarDays size={9} aria-hidden="true" />
            <span>Gekoppeld</span>
          </div>
        )}

        {/* Content preview with checklist + wiki-link support */}
        <div className="text-xs text-slate-500 line-clamp-4 mb-2 leading-relaxed">
          {masked ? "•••• •••• ••••" : renderPreview(allLines, onUpdateContent ? toggleCheckbox : undefined, onNavigateToNote)}
        </div>

        {/* Checklist progress */}
        {!masked && checklistInfo.total > 0 && (
          <div className="flex items-center gap-2 mb-2">
            <ListChecks size={10} className="text-slate-600 shrink-0" aria-hidden="true" />
            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden" role="progressbar" aria-valuenow={checklistInfo.pct} aria-valuemin={0} aria-valuemax={100}>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {masked ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-500 bg-white/5 px-1.5 py-0.5 rounded-md">
                <Tag size={8} aria-hidden="true" />
                ••••
              </span>
            ) : (
              <>
                {(note.tags ?? []).slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-md"
                  >
                    <Tag size={8} aria-hidden="true" />
                    {tag}
                  </span>
                ))}
                {(note.tags ?? []).length > 2 && (
                  <span className="text-[10px] text-slate-600">+{(note.tags ?? []).length - 2}</span>
                )}
              </>
            )}
            <span className="text-[10px] text-slate-600">{age}</span>
          </div>

          {/* Action buttons — always visible on mobile, hover on desktop */}
          <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(note._id); }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label={note.isPinned ? "Losmaken" : "Vastpinnen"}
            >
              <Pin size={14} className={note.isPinned ? "text-amber-400 fill-amber-400" : "text-slate-500"} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(note._id); }}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label={note.isArchived ? "Terugzetten" : "Archiveren"}
            >
              <Archive size={14} className="text-slate-500" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(note._id); }}
              className="p-2 rounded-lg hover:bg-red-500/20 transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="Verwijderen"
            >
              <Trash2 size={14} className="text-slate-500 hover:text-red-400" />
            </button>
          </div>
        </div>

        {/* Backlinks (Zettelkasten) */}
        {!masked && backlinks && backlinks.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 pb-2 -mt-1 flex-wrap">
            <Link2 size={10} className="text-amber-400/60 shrink-0" />
            {backlinks.slice(0, 3).map((bl) => (
              <span
                key={bl.id}
                onClick={(e) => { e.stopPropagation(); onNavigateToNote?.(bl.titel); }}
                className="text-[10px] text-amber-400/70 bg-amber-400/8 px-1.5 py-0.5 rounded-md cursor-pointer hover:bg-amber-400/15 transition-colors"
              >
                {bl.titel}
              </span>
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
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);

  if (days < 0) return { label: "Verlopen!", style: "text-red-400 bg-red-500/15", overdue: true };
  if (days === 0) return { label: "Vandaag", style: "text-amber-400 bg-amber-500/15", overdue: false };
  if (days === 1) return { label: "Morgen", style: "text-amber-400 bg-amber-500/15", overdue: false };
  if (days <= 7) return { label: `Over ${days}d`, style: "text-sky-400 bg-sky-500/10", overdue: false };
  return {
    label: new Date(deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
    style: "text-slate-400 bg-white/5",
    overdue: false,
  };
}

const UNCHECKED = /^- \[ \] (.+)$/;
const CHECKED   = /^- \[x\] (.+)$/i;

function getChecklistInfo(text: string) {
  const lines = text.split("\n");
  const total = lines.filter((l) => UNCHECKED.test(l) || CHECKED.test(l)).length;
  const done  = lines.filter((l) => CHECKED.test(l)).length;
  return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

function renderPreview(allLines: string[], onToggle?: (originalLineIdx: number) => void, onNavigateToNote?: (title: string) => void) {
  const previewLines = allLines.slice(0, 4);
  return previewLines.map((line, previewIdx) => {
    const originalIdx = previewIdx;

    const unchecked = UNCHECKED.exec(line);
    if (unchecked) {
      return (
        <div key={originalIdx} className="flex items-start gap-1.5">
          <span
            role="checkbox"
            aria-checked="false"
            aria-label={unchecked[1]}
            onClick={onToggle ? (e) => { e.stopPropagation(); onToggle(originalIdx); } : undefined}
            className={`mt-0.5 w-3 h-3 rounded-[3px] border border-white/20 shrink-0 ${onToggle ? "cursor-pointer hover:border-amber-400/50" : ""}`}
          />
          <span>{renderLineWithLinks(unchecked[1], onNavigateToNote)}</span>
        </div>
      );
    }
    const checked = CHECKED.exec(line);
    if (checked) {
      return (
        <div key={originalIdx} className="flex items-start gap-1.5">
          <span
            role="checkbox"
            aria-checked="true"
            aria-label={checked[1]}
            onClick={onToggle ? (e) => { e.stopPropagation(); onToggle(originalIdx); } : undefined}
            className={`mt-0.5 w-3 h-3 rounded-[3px] bg-emerald-500/40 border border-emerald-500/50 shrink-0 flex items-center justify-center ${onToggle ? "cursor-pointer hover:bg-emerald-500/60" : ""}`}
          >
            <Check size={7} className="text-emerald-300" />
          </span>
          <span className="line-through text-slate-600">{renderLineWithLinks(checked[1], onNavigateToNote)}</span>
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
      return (
        <span
          key={i}
          onClick={onNavigateToNote ? (e) => { e.stopPropagation(); onNavigateToNote(linkMatch[1]); } : undefined}
          className="inline-flex items-center gap-0.5 text-amber-400/80 bg-amber-400/10 px-1 py-0.5 rounded text-[10px] cursor-pointer hover:bg-amber-400/20 transition-colors"
        >
          <Link2 size={8} />
          {linkMatch[1]}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
