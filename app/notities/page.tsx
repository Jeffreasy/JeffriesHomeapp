"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  StickyNote, Plus, Search, Pin, Archive, Tag,
  Eye, EyeOff, Filter,
} from "lucide-react";
import { useNotes, type NoteRecord } from "@/hooks/useNotes";
import { usePrivacy } from "@/hooks/usePrivacy";
import { NoteCard } from "@/components/notes/NoteCard";
import { NoteEditor } from "@/components/notes/NoteEditor";
import type { Id } from "@/convex/_generated/dataModel";

type ViewMode = "active" | "archived";

export default function NotitiesPage() {
  const {
    notes, archived, pinned, allTags, isLoading, count,
    create, update, togglePin, archive, remove,
  } = useNotes();
  const { hidden: privacyOn, toggle: togglePrivacy } = usePrivacy();

  const [viewMode, setViewMode] = useState<ViewMode>("active");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editNote, setEditNote] = useState<NoteRecord | null>(null);

  // Filter notes
  const displayed = (viewMode === "active" ? notes : archived).filter((n) => {
    if (tagFilter && !(n.tags ?? []).includes(tagFilter)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const haystack = `${n.titel ?? ""} ${n.inhoud} ${(n.tags ?? []).join(" ")}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  const handleEdit = (note: NoteRecord) => {
    setEditNote(note);
    setEditorOpen(true);
  };

  const handleNew = () => {
    setEditNote(null);
    setEditorOpen(true);
  };

  const handleSave = async (data: { titel?: string; inhoud: string; tags?: string[]; kleur?: string }) => {
    if (editNote) {
      await update(editNote._id, data);
    } else {
      await create(data);
    }
  };

  const handleDelete = (id: Id<"notes">) => {
    if (confirm("Notitie permanent verwijderen?")) {
      remove(id);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#0a0a0f" }}>
      {/* ─── Header ────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <StickyNote size={18} className="text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Notities</h1>
              <p className="text-xs text-slate-500">
                {count} notitie{count !== 1 ? "s" : ""} · {pinned.length} vastgezet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Privacy toggle */}
            <button
              onClick={togglePrivacy}
              title={privacyOn ? "Tonen" : "Verbergen"}
              className={`p-2 rounded-xl text-xs border transition-all cursor-pointer ${
                privacyOn
                  ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30"
                  : "bg-white/5 text-slate-500 border-white/10 hover:text-slate-300"
              }`}
            >
              {privacyOn ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>

            {/* New note */}
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={handleNew}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer"
            >
              <Plus size={14} /> Nieuw
            </motion.button>
          </div>
        </div>
      </header>

      <main className="px-6 py-5 max-w-4xl mx-auto space-y-5">
        {/* ─── Search + Filters ──────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="flex-1 flex items-center gap-2 px-3 py-2 glass rounded-xl border border-white/5">
            <Search size={14} className="text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Zoek in notities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-slate-200 placeholder:text-slate-600 outline-none"
            />
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 glass rounded-xl border border-white/5 p-1">
            <button
              onClick={() => setViewMode("active")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                viewMode === "active"
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Actief ({notes.length})
            </button>
            <button
              onClick={() => setViewMode("archived")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                viewMode === "archived"
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Archive size={12} className="inline mr-1" />
              Archief ({archived.length})
            </button>
          </div>
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={12} className="text-slate-600 shrink-0" />
            <button
              onClick={() => setTagFilter(null)}
              className={`px-2 py-0.5 text-[10px] rounded-md border transition-all cursor-pointer ${
                !tagFilter
                  ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                  : "text-slate-500 border-white/8 hover:border-white/15"
              }`}
            >
              Alle
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] rounded-md border transition-all cursor-pointer ${
                  tagFilter === tag
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "text-slate-500 border-white/8 hover:border-white/15"
                }`}
              >
                <Tag size={8} /> {tag}
              </button>
            ))}
          </div>
        )}

        {/* ─── Notes Grid ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mx-auto" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-16">
            <StickyNote size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-500 mb-4">
              {search || tagFilter ? "Geen notities gevonden" : "Nog geen notities"}
            </p>
            {!search && !tagFilter && (
              <button
                onClick={handleNew}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <Plus size={12} /> Eerste notitie maken
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <AnimatePresence mode="popLayout">
              {displayed.map((note) => (
                <NoteCard
                  key={note._id}
                  note={note}
                  onEdit={handleEdit}
                  onTogglePin={togglePin}
                  onArchive={archive}
                  onDelete={handleDelete}
                  masked={privacyOn}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* ─── Editor Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editorOpen && (
          <NoteEditor
            note={editNote}
            onSave={handleSave}
            onClose={() => { setEditorOpen(false); setEditNote(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
