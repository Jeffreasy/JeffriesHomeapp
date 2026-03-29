"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { StickyNote, Plus, ChevronRight, Pin } from "lucide-react";
import Link from "next/link";
import { useNotes, type NoteRecord } from "@/hooks/useNotes";

export function QuickNote() {
  const { notes, create, isLoading } = useNotes();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const handleQuickSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await create({ inhoud: text.trim() });
      setText("");
    } finally {
      setSaving(false);
    }
  };

  const recent = notes.slice(0, 3);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider">Notities</p>
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
            placeholder="Snel iets noteren..."
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
      </div>

      {/* Recent notes */}
      {!isLoading && recent.length > 0 && (
        <div className="space-y-1.5">
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
        <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors truncate">
          {displayTitle}
        </span>
        <span className="text-[10px] text-slate-600 ml-auto shrink-0">
          {formatCompact(note.gewijzigd)}
        </span>
      </motion.div>
    </Link>
  );
}

function formatCompact(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return "nu";
  if (hrs < 24) return `${hrs}u`;
  return `${Math.floor(hrs / 24)}d`;
}
