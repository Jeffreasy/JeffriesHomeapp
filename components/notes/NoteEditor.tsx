"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Tag, Palette, ListChecks, Clock, CalendarDays, AlertTriangle, ChevronDown } from "lucide-react";
import type { NoteRecord, NoteCreateData } from "@/hooks/useNotes";

const KLEUREN = [
  "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ef4444", "#ec4899", "#06b6d4", "#64748b",
];

const PRIORITEITEN = [
  { value: "hoog",    label: "Hoog",    dot: "bg-red-500" },
  { value: "normaal", label: "Normaal", dot: "bg-slate-500" },
  { value: "laag",    label: "Laag",    dot: "bg-blue-400" },
] as const;

interface NoteEditorProps {
  note?: NoteRecord | null;
  onSave:  (data: NoteCreateData) => void;
  onClose: () => void;
}

export function NoteEditor({ note, onSave, onClose }: NoteEditorProps) {
  const [titel, setTitel]           = useState(note?.titel ?? "");
  const [inhoud, setInhoud]         = useState(note?.inhoud ?? "");
  const [tags, setTags]             = useState<string[]>(note?.tags ?? []);
  const [kleur, setKleur]           = useState(note?.kleur ?? "");
  const [tagInput, setTagInput]     = useState("");
  const [showColors, setShowColors] = useState(false);
  const [deadline, setDeadline]     = useState(note?.deadline ?? "");
  const [prioriteit, setPrioriteit] = useState(note?.prioriteit ?? "normaal");
  const [showMeta, setShowMeta]     = useState(!!(note?.deadline || (note?.prioriteit && note.prioriteit !== "normaal")));

  const textRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(120, Math.min(el.scrollHeight, 360))}px`;
  }, []);

  useEffect(() => {
    // Small delay so mobile keyboard has time to appear
    const t = setTimeout(() => {
      textRef.current?.focus();
      autoResize();
    }, 100);
    return () => clearTimeout(t);
  }, [autoResize]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleContentChange = (val: string) => {
    setInhoud(val);
    autoResize();
  };

  const handleSave = useCallback(() => {
    if (!inhoud.trim()) return;
    onSave({
      titel: titel.trim() || undefined,
      inhoud: inhoud.trim(),
      tags: tags.length > 0 ? tags : undefined,
      kleur: kleur || undefined,
      deadline: deadline || undefined,
      prioriteit: prioriteit !== "normaal" ? prioriteit : undefined,
    });
    onClose();
  }, [inhoud, titel, tags, kleur, deadline, prioriteit, onSave, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handleSave]);

  const insertChecklist = () => {
    const el = textRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const before = inhoud.slice(0, pos);
    const after = inhoud.slice(pos);
    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const newText = `${before}${prefix}- [ ] ${after}`;
    setInhoud(newText);
    requestAnimationFrame(() => {
      const newPos = pos + prefix.length + 6;
      el.setSelectionRange(newPos, newPos);
      el.focus();
      autoResize();
    });
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTags(tags.filter((tt) => tt !== tag));

  const charCount = inhoud.length;
  const wordCount = inhoud.trim() ? inhoud.trim().split(/\s+/).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl border border-white/10 overflow-hidden max-h-[92dvh] flex flex-col"
        style={{
          background: kleur
            ? `linear-gradient(135deg, ${kleur}15 0%, #0f0f14 40%)`
            : "#0f0f14",
        }}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-2 pb-0 sm:hidden">
          <div className="w-8 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8 shrink-0">
          <h3 className="text-sm font-semibold text-slate-200">
            {note ? "Notitie bewerken" : "Nieuwe notitie"}
          </h3>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-600 mr-2 hidden sm:block">
              Ctrl+Enter = opslaan · Esc = sluiten
            </span>
            <button onClick={onClose} className="p-2 -mr-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center">
              <X size={18} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-3">
          {/* Title */}
          <input
            type="text"
            placeholder="Titel (optioneel)"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            className="w-full bg-transparent text-base font-semibold text-slate-200 placeholder:text-slate-600 outline-none min-h-[44px]"
          />

          {/* Content */}
          <textarea
            ref={textRef}
            placeholder="Schrijf je notitie...  (tip: gebruik - [ ] voor checklists)"
            value={inhoud}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                const el = e.currentTarget;
                const pos = el.selectionStart;
                const lineStart = inhoud.lastIndexOf("\n", pos - 1) + 1;
                const currentLine = inhoud.slice(lineStart, pos);
                const match = /^- \[[ x]\] /.exec(currentLine);
                if (match) {
                  if (currentLine.trim() === "- [ ]") {
                    e.preventDefault();
                    setInhoud(inhoud.slice(0, lineStart) + inhoud.slice(pos));
                    return;
                  }
                  e.preventDefault();
                  const insert = "\n- [ ] ";
                  setInhoud(inhoud.slice(0, pos) + insert + inhoud.slice(pos));
                  requestAnimationFrame(() => {
                    el.setSelectionRange(pos + insert.length, pos + insert.length);
                    autoResize();
                  });
                }
              }
            }}
            className="w-full bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none resize-none leading-relaxed"
            style={{ minHeight: 120 }}
          />

          {/* Toolbar row */}
          <div className="flex items-center gap-1">
            <button
              onClick={insertChecklist}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Checklist toevoegen"
            >
              <ListChecks size={16} className="text-slate-500" />
            </button>

            <button
              onClick={() => setShowColors(!showColors)}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Kleur kiezen"
            >
              <Palette size={16} className={showColors ? "text-amber-400" : "text-slate-500"} />
            </button>

            <button
              onClick={() => setShowMeta(!showMeta)}
              className="p-2.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
              title="Deadline & prioriteit"
            >
              <CalendarDays size={16} className={showMeta ? "text-amber-400" : "text-slate-500"} />
            </button>

            {showColors && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1.5 ml-1"
              >
                <button
                  onClick={() => setKleur("")}
                  className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                    !kleur ? "border-white/40 bg-slate-700" : "border-transparent bg-slate-800 hover:border-white/20"
                  }`}
                />
                {KLEUREN.map((c) => (
                  <button
                    key={c}
                    onClick={() => setKleur(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                      kleur === c ? "border-white/60 scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </motion.div>
            )}

            <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-600">
              <Clock size={10} />
              {wordCount}w · {charCount}c
            </div>
          </div>

          {/* Deadline + Priority (collapsible meta section) */}
          {showMeta && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-col gap-3 p-3 rounded-xl bg-white/3 border border-white/5"
            >
              {/* Deadline picker */}
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-500 shrink-0" />
                <input
                  type="datetime-local"
                  value={deadline ? deadline.slice(0, 16) : ""}
                  onChange={(e) => setDeadline(e.target.value ? new Date(e.target.value).toISOString() : "")}
                  className="bg-transparent text-sm text-slate-300 outline-none border border-white/10 rounded-xl px-3 py-2.5 flex-1 min-h-[44px] scheme-dark"
                />
                {deadline && (
                  <button
                    onClick={() => setDeadline("")}
                    className="p-2 hover:bg-white/10 rounded-lg cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Deadline verwijderen"
                  >
                    <X size={14} className="text-slate-500" />
                  </button>
                )}
              </div>

              {/* Priority selector */}
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-slate-500 shrink-0" />
                <div className="relative flex-1">
                  <select
                    value={prioriteit}
                    onChange={(e) => setPrioriteit(e.target.value)}
                    className="w-full appearance-none bg-transparent text-sm text-slate-300 outline-none border border-white/10 rounded-xl pl-3 pr-8 py-2.5 cursor-pointer min-h-[44px] scheme-dark"
                  >
                    {PRIORITEITEN.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </motion.div>
          )}

          {/* Tags */}
          <div className="flex items-center flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs text-slate-300 bg-white/8 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-red-500/20 transition-colors min-h-[36px]"
                onClick={() => removeTag(tag)}
              >
                <Tag size={10} /> {tag} <X size={10} />
              </span>
            ))}
            <input
              type="text"
              placeholder="+ tag"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag();
                }
              }}
              className="bg-transparent text-xs text-slate-400 placeholder:text-slate-600 outline-none w-20 min-h-[36px]"
            />
          </div>
        </div>

        {/* Footer — fixed at bottom */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8 shrink-0 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer min-h-[44px] rounded-xl"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={!inhoud.trim()}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-amber-500/90 hover:bg-amber-500 rounded-xl transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
          >
            {note ? "Opslaan" : "Aanmaken"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
