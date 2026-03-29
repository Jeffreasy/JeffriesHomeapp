"use client";

import { motion } from "framer-motion";
import { Pin, Archive, Trash2, Edit3, Tag } from "lucide-react";
import type { NoteRecord } from "@/hooks/useNotes";

interface NoteCardProps {
  note: NoteRecord;
  onEdit:      (note: NoteRecord) => void;
  onTogglePin: (id: NoteRecord["_id"]) => void;
  onArchive:   (id: NoteRecord["_id"]) => void;
  onDelete:    (id: NoteRecord["_id"]) => void;
  masked?:     boolean;
}

const KLEUR_OPACITY = "25"; // hex opacity for card tint

export function NoteCard({ note, onEdit, onTogglePin, onArchive, onDelete, masked }: NoteCardProps) {
  const displayTitle = note.titel || note.inhoud.slice(0, 50);
  const preview = note.inhoud.length > 120 ? note.inhoud.slice(0, 120) + "…" : note.inhoud;
  const age = formatAge(note.gewijzigd);

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
      {/* Pin indicator */}
      {note.isPinned && (
        <div className="absolute top-2 right-2">
          <Pin size={12} className="text-amber-400 fill-amber-400" />
        </div>
      )}

      <div className="p-4">
        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-200 mb-1 line-clamp-1">
          {masked ? "••••••" : displayTitle}
        </h3>

        {/* Content preview — with checklist support */}
        <div className="text-xs text-slate-500 line-clamp-3 mb-3 leading-relaxed">
          {masked ? "•••• •••• ••••" : renderPreview(preview)}
        </div>

        {/* Checklist progress (if applicable) */}
        {!masked && hasChecklist(note.inhoud) && (
          <ChecklistProgress inhoud={note.inhoud} />
        )}

        {/* Footer: tags + time + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {(note.tags ?? []).slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-white/5 px-1.5 py-0.5 rounded-md"
              >
                <Tag size={8} />
                {tag}
              </span>
            ))}
            <span className="text-[10px] text-slate-600">{age}</span>
          </div>

          {/* Action buttons — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onTogglePin(note._id); }}
              className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title={note.isPinned ? "Losmaken" : "Vastpinnen"}
            >
              <Pin size={12} className={note.isPinned ? "text-amber-400 fill-amber-400" : "text-slate-500"} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(note._id); }}
              className="p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
              title="Archiveren"
            >
              <Archive size={12} className="text-slate-500" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(note._id); }}
              className="p-1 rounded-md hover:bg-red-500/20 transition-colors cursor-pointer"
              title="Verwijderen"
            >
              <Trash2 size={12} className="text-slate-500 hover:text-red-400" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function formatAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "zojuist";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}u`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

// ─── Checklist helpers ────────────────────────────────────────────────────────

const UNCHECKED = /^- \[ \] (.+)$/;
const CHECKED   = /^- \[x\] (.+)$/i;

function hasChecklist(text: string): boolean {
  return UNCHECKED.test(text) || CHECKED.test(text);
}

function renderPreview(text: string) {
  const lines = text.split("\n").slice(0, 4);
  return lines.map((line, i) => {
    const unchecked = UNCHECKED.exec(line);
    if (unchecked) {
      return (
        <div key={i} className="flex items-start gap-1.5">
          <span className="mt-0.5 w-3 h-3 rounded-[3px] border border-white/20 shrink-0" />
          <span>{unchecked[1]}</span>
        </div>
      );
    }
    const checked = CHECKED.exec(line);
    if (checked) {
      return (
        <div key={i} className="flex items-start gap-1.5">
          <span className="mt-0.5 w-3 h-3 rounded-[3px] bg-emerald-500/40 border border-emerald-500/50 shrink-0 flex items-center justify-center text-[7px] text-emerald-300">✓</span>
          <span className="line-through text-slate-600">{checked[1]}</span>
        </div>
      );
    }
    return <div key={i}>{line}</div>;
  });
}

function ChecklistProgress({ inhoud }: { inhoud: string }) {
  const lines = inhoud.split("\n");
  const total   = lines.filter((l) => UNCHECKED.test(l) || CHECKED.test(l)).length;
  const done    = lines.filter((l) => CHECKED.test(l)).length;
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);

  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: pct === 100 ? "#22c55e" : "#f59e0b",
          }}
        />
      </div>
      <span className="text-[10px] text-slate-600 shrink-0">{done}/{total}</span>
    </div>
  );
}

