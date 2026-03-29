"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { X, Tag, Palette, ListChecks, Clock } from "lucide-react";
import type { NoteRecord } from "@/hooks/useNotes";

const KLEUREN = [
  "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ef4444", "#ec4899", "#06b6d4", "#64748b",
];

interface NoteEditorProps {
  note?: NoteRecord | null;
  onSave:  (data: { titel?: string; inhoud: string; tags?: string[]; kleur?: string }) => void;
  onClose: () => void;
}

export function NoteEditor({ note, onSave, onClose }: NoteEditorProps) {
  const [titel, setTitel]     = useState(note?.titel ?? "");
  const [inhoud, setInhoud]   = useState(note?.inhoud ?? "");
  const [tags, setTags]       = useState<string[]>(note?.tags ?? []);
  const [kleur, setKleur]     = useState(note?.kleur ?? "");
  const [tagInput, setTagInput] = useState("");
  const [showColors, setShowColors] = useState(false);

  const textRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus + auto-resize on mount
  useEffect(() => {
    textRef.current?.focus();
    autoResize();
  }, []);

  // Auto-resize textarea
  const autoResize = useCallback(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(120, Math.min(el.scrollHeight, 360))}px`;
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
    });
    onClose();
  }, [inhoud, titel, tags, kleur, onSave, onClose]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handleSave]);

  // Insert checklist line at cursor
  const insertChecklist = () => {
    const el = textRef.current;
    if (!el) return;
    const pos = el.selectionStart;
    const before = inhoud.slice(0, pos);
    const after = inhoud.slice(pos);
    const prefix = before.length > 0 && !before.endsWith("\n") ? "\n" : "";
    const newText = `${before}${prefix}- [ ] ${after}`;
    setInhoud(newText);
    // Focus cursor after "- [ ] "
    requestAnimationFrame(() => {
      const newPos = pos + prefix.length + 6;
      el.setSelectionRange(newPos, newPos);
      el.focus();
      autoResize();
    });
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((tt) => tt !== tag));
  };

  // Word & character count
  const charCount = inhoud.length;
  const wordCount = inhoud.trim() ? inhoud.trim().split(/\s+/).length : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Editor panel */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.97 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden"
        style={{
          background: kleur
            ? `linear-gradient(135deg, ${kleur}15 0%, #0f0f14 40%)`
            : "#0f0f14",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/8">
          <h3 className="text-sm font-semibold text-slate-200">
            {note ? "Notitie bewerken" : "Nieuwe notitie"}
          </h3>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-600 mr-2 hidden sm:block">
              Ctrl+Enter = opslaan · Esc = sluiten
            </span>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Title */}
          <input
            type="text"
            placeholder="Titel (optioneel)"
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            className="w-full bg-transparent text-base font-semibold text-slate-200 placeholder:text-slate-600 outline-none"
          />

          {/* Content */}
          <textarea
            ref={textRef}
            placeholder="Schrijf je notitie...  (tip: gebruik - [ ] voor checklists)"
            value={inhoud}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={(e) => {
              // Auto-continue checklist on Enter
              if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
                const el = e.currentTarget;
                const pos = el.selectionStart;
                const lineStart = inhoud.lastIndexOf("\n", pos - 1) + 1;
                const currentLine = inhoud.slice(lineStart, pos);
                const match = /^- \[[ x]\] /.exec(currentLine);
                if (match) {
                  // If line is empty checklist item, remove it instead
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
          <div className="flex items-center gap-1.5">
            {/* Checklist button */}
            <button
              onClick={insertChecklist}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Checklist toevoegen"
            >
              <ListChecks size={14} className="text-slate-500" />
            </button>

            {/* Color picker */}
            <button
              onClick={() => setShowColors(!showColors)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Palette size={14} className="text-slate-500" />
            </button>
            {showColors && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-1"
              >
                <button
                  onClick={() => setKleur("")}
                  className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                    !kleur ? "border-white/40 bg-slate-700" : "border-transparent bg-slate-800 hover:border-white/20"
                  }`}
                />
                {KLEUREN.map((c) => (
                  <button
                    key={c}
                    onClick={() => setKleur(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-all cursor-pointer ${
                      kleur === c ? "border-white/60 scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </motion.div>
            )}

            {/* Spacer + word count */}
            <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-600">
              <Clock size={10} />
              {wordCount} woorden · {charCount} tekens
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] text-slate-300 bg-white/8 px-2 py-0.5 rounded-md cursor-pointer hover:bg-red-500/20 transition-colors"
                onClick={() => removeTag(tag)}
              >
                <Tag size={9} /> {tag} <X size={9} />
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
              className="bg-transparent text-[11px] text-slate-400 placeholder:text-slate-600 outline-none w-16"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            Annuleren
          </button>
          <button
            onClick={handleSave}
            disabled={!inhoud.trim()}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-500/90 hover:bg-amber-500 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            {note ? "Opslaan" : "Aanmaken"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
