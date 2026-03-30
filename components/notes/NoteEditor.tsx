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
    textRef.current?.focus();
    autoResize();
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
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

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
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
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
          <div className="flex items-center gap-1.5">
            <button
              onClick={insertChecklist}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Checklist toevoegen"
            >
              <ListChecks size={14} className="text-slate-500" />
            </button>

            <button
              onClick={() => setShowColors(!showColors)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Kleur kiezen"
            >
              <Palette size={14} className="text-slate-500" />
            </button>

            <button
              onClick={() => setShowMeta(!showMeta)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Deadline & prioriteit"
            >
              <CalendarDays size={14} className={showMeta ? "text-amber-400" : "text-slate-500"} />
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

            <div className="ml-auto flex items-center gap-2 text-[10px] text-slate-600">
              <Clock size={10} />
              {wordCount} woorden · {charCount} tekens
            </div>
          </div>

          {/* Deadline + Priority (collapsible meta section) */}
          {showMeta && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/5"
            >
              {/* Deadline picker */}
              <div className="flex items-center gap-2 flex-1">
                <Clock size={13} className="text-slate-500 shrink-0" />
                <input
                  type="datetime-local"
                  value={deadline ? deadline.slice(0, 16) : ""}
                  onChange={(e) => setDeadline(e.target.value ? new Date(e.target.value).toISOString() : "")}
                  className="bg-transparent text-xs text-slate-300 outline-none border border-white/10 rounded-lg px-2 py-1.5 flex-1 scheme-dark"
                />
                {deadline && (
                  <button
                    onClick={() => setDeadline("")}
                    className="p-0.5 hover:bg-white/10 rounded cursor-pointer"
                    aria-label="Deadline verwijderen"
                  >
                    <X size={11} className="text-slate-500" />
                  </button>
                )}
              </div>

              {/* Priority selector */}
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-slate-500 shrink-0" />
                <div className="relative">
                  <select
                    value={prioriteit}
                    onChange={(e) => setPrioriteit(e.target.value)}
                    className="appearance-none bg-transparent text-xs text-slate-300 outline-none border border-white/10 rounded-lg pl-2 pr-6 py-1.5 cursor-pointer scheme-dark"
                  >
                    {PRIORITEITEN.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </motion.div>
          )}

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
