"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, FileText } from "lucide-react";
import type { NoteRecord, NoteCreateData } from "@/hooks/useNotes";

interface DayColumnProps {
  date: Date;
  isToday: boolean;
  notes: NoteRecord[];
  onEdit: (note: NoteRecord) => void;
  onCreate: (data: NoteCreateData) => Promise<void>;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" });
}

const DAG_NAMEN = ["zo", "ma", "di", "wo", "do", "vr", "za"];
const DAG_NAMEN_LANG = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];

export function DayColumn({ date, isToday, notes, onEdit, onCreate }: DayColumnProps) {
  const [quickText, setQuickText] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const dagNaam = DAG_NAMEN_LANG[date.getDay()];
  const dagNr = date.getDate();
  const maand = date.toLocaleDateString("nl-NL", { month: "short" });
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  const handleQuickSave = useCallback(async () => {
    const text = quickText.trim();
    if (!text || saving) return;

    setSaving(true);
    try {
      await onCreate({
        inhoud: text,
        titel: text.length > 80 ? text.slice(0, 77) + "..." : text,
      });
      setQuickText("");
    } finally {
      setSaving(false);
    }
  }, [quickText, saving, onCreate]);

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
          <span className="text-[10px] font-medium text-[var(--color-text-subtle)] bg-white/5 px-1.5 py-0.5 rounded">
            {notes.length}
          </span>
        )}
      </div>

      {/* Notities lijst */}
      <div className="flex-1 px-3 py-2 space-y-1 min-h-[60px]">
        <AnimatePresence mode="popLayout">
          {notes.length === 0 && !isToday && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[var(--color-text-subtle)] italic py-2 text-center"
            >
              Geen notities
            </motion.p>
          )}
          {notes.map((note) => (
            <motion.button
              key={note.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={() => onEdit(note)}
              className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group/item"
            >
              <div className="flex items-start gap-2">
                {note.kleur ? (
                  <span
                    className="mt-1.5 h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: note.kleur }}
                  />
                ) : (
                  <FileText size={12} className="mt-1 shrink-0 text-[var(--color-text-subtle)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[var(--color-text)] truncate font-medium">
                    {note.titel || note.inhoud.split("\n")[0].slice(0, 50)}
                  </p>
                  {note.titel && note.inhoud !== note.titel && (
                    <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                      {note.inhoud.split("\n")[0].slice(0, 60)}
                    </p>
                  )}
                </div>
                <span className="text-[10px] text-[var(--color-text-subtle)] shrink-0 mt-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                  {formatTime(note.aangemaakt)}
                </span>
              </div>
              {(note.tags?.length ?? 0) > 0 && (
                <div className="flex gap-1 mt-1 ml-4">
                  {note.tags!.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[10px] text-amber-400/70 bg-amber-400/10 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
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
            className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] outline-none disabled:opacity-50"
          />
          {quickText.trim() && (
            <span className="text-[10px] text-[var(--color-text-subtle)]">↵</span>
          )}
        </div>
      </div>
    </div>
  );
}
