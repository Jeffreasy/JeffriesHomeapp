"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { StickyNote, Plus, ChevronRight, Pin, ListChecks } from "lucide-react";
import Link from "next/link";
import { useNotes, type NoteRecord } from "@/hooks/useNotes";

export function QuickNote() {
  const { notes, create, isLoading } = useNotes();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  // Parse #tags from the text input
  const handleQuickSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { cleanText, extractedTags } = parseHashTags(text.trim());
      await create({
        inhoud: cleanText,
        tags: extractedTags.length > 0 ? extractedTags : undefined,
      });
      setText("");
    } finally {
      setSaving(false);
    }
  };

  const recent = notes.slice(0, 3);
  const totalPinned = notes.filter((n) => n.isPinned).length;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Notities</p>
          {notes.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-white/5 px-1.5 py-0.5 rounded-md tabular-nums">
              {notes.length}
              {totalPinned > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  · {totalPinned} <Pin size={9} className="text-amber-400 fill-amber-400" />
                </span>
              )}
            </span>
          )}
        </div>
        <Link
          href="/notities"
          className="text-xs text-amber-400/70 hover:text-amber-400 transition-colors flex items-center gap-1"
        >
          Alle notities <ChevronRight size={12} />
        </Link>
      </div>

      {/* Quick capture */}
      <div className="glass rounded-xl border border-white/5 mb-3">
        <div className="flex items-center gap-2 px-3 py-2">
          <StickyNote size={14} className="text-amber-400/50 shrink-0" />
          <input
            type="text"
            placeholder="Snel noteren... (#tag voor labels)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleQuickSave();
              }
            }}
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
          />
          {text.trim() && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleQuickSave}
              disabled={saving}
              className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              <Plus size={14} />
            </motion.button>
          )}
        </div>
        {/* Show extracted tags preview */}
        {text.includes("#") && (
          <div className="px-3 pb-2 flex items-center gap-1">
            {parseHashTags(text).extractedTags.map((t) => (
              <span key={t} className="text-[10px] text-amber-400/60 bg-amber-500/10 px-1.5 py-0.5 rounded">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recent notes */}
      {!isLoading && recent.length > 0 && (
        <div className="space-y-1">
          {recent.map((note) => (
            <RecentNoteRow key={note._id} note={note} />
          ))}
        </div>
      )}
    </section>
  );
}

function RecentNoteRow({ note }: { note: NoteRecord }) {
  const displayTitle = note.titel || note.inhoud.slice(0, 50);
  const checklistInfo = getQuickChecklistInfo(note.inhoud);

  return (
    <Link href="/notities">
      <motion.div
        whileHover={{ x: 2 }}
        className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
      >
        {note.isPinned && <Pin size={10} className="text-amber-400 fill-amber-400 shrink-0" />}
        <div
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: note.kleur ?? "#475569" }}
        />
        <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors truncate flex-1 min-w-0">
          {displayTitle}
        </span>
        {checklistInfo && (
          <span className="text-[10px] text-slate-600 shrink-0 tabular-nums">
            <ListChecks size={9} className="inline mr-0.5" />
            {checklistInfo}
          </span>
        )}
        <span className="text-[10px] text-slate-600 shrink-0">
          {formatCompact(note.gewijzigd)}
        </span>
      </motion.div>
    </Link>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseHashTags(text: string) {
  const tagPattern = /#([a-zA-Z\u00C0-\u024F0-9_-]+)/g;
  const extractedTags: string[] = [];
  let match;
  while ((match = tagPattern.exec(text)) !== null) {
    const tag = match[1].toLowerCase();
    if (!extractedTags.includes(tag)) extractedTags.push(tag);
  }
  const cleanText = text.replace(tagPattern, "").replace(/\s{2,}/g, " ").trim();
  return { cleanText, extractedTags };
}

function getQuickChecklistInfo(text: string): string | null {
  const lines = text.split("\n");
  const total = lines.filter((l) => /^- \[[ x]\] /i.test(l)).length;
  if (total === 0) return null;
  const done = lines.filter((l) => /^- \[x\] /i.test(l)).length;
  return `${done}/${total}`;
}

function formatCompact(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "nu";
  if (hrs < 24) return `${hrs}u`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}
