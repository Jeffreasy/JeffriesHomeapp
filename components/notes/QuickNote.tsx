"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { StickyNote, Plus, ChevronRight, Pin, ListChecks, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useNotes, type NoteRecord } from "@/hooks/useNotes";
import { usePrivacy } from "@/hooks/usePrivacy";
import { AppIcon } from "@/components/ui/AppIcon";
import { useLaventeCareBusinessContextOptions } from "@/hooks/useLaventeCareBusinessContexts";
import { resolveLaventeCareBusinessContextFromText } from "@/lib/laventecare/business-context";
import { resolveAppIconName } from "@/lib/symbols";
import { businessContextLabel, enrichNoteDraft, getPrimaryWorkspaceContext, parseHashTags } from "@/lib/workspace-context";
import { useContacten } from "@/hooks/useContacten";
import type { Contact } from "@/lib/api";
import { ContactMentionMenu, useContactMention } from "./ContactMentionMenu";
import { NoteContextBadge } from "./NoteContextBadge";

export function QuickNote() {
  const { notes, active, create, isLoading } = useNotes();
  // N5: het dashboard moet dezelfde notes-privacyscope respecteren als /notities.
  const { hidden: privacyOn } = usePrivacy("notes");
  const { options: laventeCareContextOptions } = useLaventeCareBusinessContextOptions();
  const { contacts, isLoading: contactsLoading, isError: contactsError } = useContacten();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const mentionListId = "dashboard-quick-note-contact-list";
  const mention = useContactMention({
    value: text,
    contacts,
    selectedContact,
    onChange: setText,
    onSelect: setSelectedContact,
  });

  // Parse #tags from the text input
  const handleQuickSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { cleanText, extractedTags } = parseHashTags(text.trim());
      const matchedBusinessContext = selectedContact
        ? { type: "contact", id: selectedContact.id, title: selectedContact.display_name }
        : resolveLaventeCareBusinessContextFromText(cleanText, laventeCareContextOptions);
      const enriched = enrichNoteDraft({ title: cleanText, content: cleanText, tags: extractedTags, businessContext: matchedBusinessContext });
      // Consistent met /notities (low): leid een titel af uit de eerste regel,
      // code-point-safe afgekapt zodat een emoji-surrogaatpaar niet splitst.
      const titleChars = Array.from(cleanText);
      await create({
        titel: titleChars.length > 80 ? `${titleChars.slice(0, 77).join("")}...` : cleanText,
        inhoud: cleanText,
        tags: enriched.tags.length > 0 ? enriched.tags : undefined,
        symbol: enriched.symbol,
        businessContextType: enriched.businessContext?.type ?? undefined,
        businessContextId: enriched.businessContext?.id ?? undefined,
        businessContextTitle: enriched.businessContext?.title ?? undefined,
      });
      setText("");
      setSelectedContact(null);
    } catch {
      // useNotes toast de fout al — deze catch voorkomt alleen een unhandled
      // rejection (N5).
    } finally {
      setSaving(false);
    }
  };

  // "Recent" (low): écht recent — gearchiveerd/afgerond uitgesloten (active) en
  // gesorteerd op laatst gewijzigd, niet de pinned-first serverordening.
  const recent = [...active]
    .sort((a, b) => (b.gewijzigd || b.aangemaakt).localeCompare(a.gewijzigd || a.aangemaakt))
    .slice(0, 3);
  const totalPinned = notes.filter((n) => n.isPinned).length;
  const quickParsed = parseHashTags(text);
  const quickContext = getPrimaryWorkspaceContext(text, quickParsed.extractedTags);
  const quickBusinessContext = selectedContact
    ? { type: "contact", id: selectedContact.id, title: selectedContact.display_name }
    : resolveLaventeCareBusinessContextFromText(text, laventeCareContextOptions);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500 uppercase tracking-wider">Notities</p>
          {notes.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-600 bg-[var(--color-surface)] px-1.5 py-0.5 rounded-md tabular-nums">
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
      <div className="glass relative mb-3 rounded-xl border border-[var(--color-border)]">
        <div className="flex items-center gap-2 px-3 py-2">
          <StickyNote size={14} className="text-amber-400/50 shrink-0" />
          <input
            type="text"
            placeholder="Snel noteren... (#tag of @contact)"
            aria-label="Snel noteren"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={mention.isOpen}
            aria-controls={mentionListId}
            aria-activedescendant={mention.isOpen && mention.suggestions[mention.activeIndex] ? `${mentionListId}-${mention.suggestions[mention.activeIndex].id}` : undefined}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (mention.handleKeyDown(e)) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleQuickSave();
              }
            }}
            className="flex-1 bg-transparent text-base sm:text-sm text-slate-200 placeholder:text-slate-600 outline-none"
          />
          {text.trim() && (
            <motion.button
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => void handleQuickSave()}
              disabled={saving}
              aria-label="Snelle notitie opslaan"
              className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors cursor-pointer"
            >
              <Plus size={14} aria-hidden="true" />
            </motion.button>
          )}
        </div>
        <ContactMentionMenu
          id={mentionListId}
          isOpen={mention.isOpen}
          query={mention.query}
          suggestions={mention.suggestions}
          activeIndex={mention.activeIndex}
          isLoading={contactsLoading}
          isError={contactsError}
          onSelect={mention.pick}
        />
        {/* Show extracted tags preview */}
        {text.includes("#") && (
          <div className="px-3 pb-2 flex items-center gap-1">
            {quickParsed.extractedTags.map((t) => (
              <span key={t} className="text-[10px] text-amber-400/60 bg-amber-500/10 px-1.5 py-0.5 rounded">
                #{t}
              </span>
            ))}
          </div>
        )}
        {quickContext && (
          <div className="px-3 pb-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-semibold text-cyan-200">
              <AppIcon name={quickContext.noteSymbol} tone="cyan" size="xs" />
              {quickContext.label}
              <span className="text-cyan-300/70">#{quickContext.tag}</span>
            </span>
          </div>
        )}
        {quickBusinessContext && (
          <div className="px-3 pb-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">
              {quickBusinessContext.type === "contact" ? <UserRound size={11} aria-hidden="true" /> : <AppIcon name="business" tone="emerald" size="xs" />}
              {businessContextLabel(quickBusinessContext)}
              {selectedContact ? (
                <button
                  type="button"
                  onClick={() => setSelectedContact(null)}
                  aria-label={`Koppeling met ${selectedContact.display_name} verwijderen`}
                  className="-mr-1 flex h-5 w-5 items-center justify-center rounded hover:bg-emerald-500/20"
                >
                  <X size={10} aria-hidden="true" />
                </button>
              ) : null}
            </span>
          </div>
        )}
      </div>

      {/* Recent notes */}
      {!isLoading && recent.length > 0 && (
        <div className="space-y-1">
          {recent.map((note) => (
            <RecentNoteRow key={note._id} note={note} masked={privacyOn} />
          ))}
        </div>
      )}
    </section>
  );
}

function RecentNoteRow({ note, masked = false }: { note: NoteRecord; masked?: boolean }) {
  const displayTitle = masked ? "••••••" : note.titel || note.inhoud.slice(0, 50);
  const checklistInfo = masked ? null : getQuickChecklistInfo(note.inhoud);

  return (
    <motion.div
      whileHover={{ x: 2 }}
      className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
    >
      <Link
        href={`/notities?note=${encodeURIComponent(note.id)}`}
        aria-label={masked ? "Notitie openen" : `Notitie openen: ${displayTitle}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
      >
        {note.isPinned && <Pin size={10} className="text-amber-400 fill-amber-400 shrink-0" />}
        <AppIcon
          name={resolveAppIconName(note.symbol, "note")}
          tone="amber"
          size="xs"
          framed
          className="h-6 w-6 rounded-md"
        />
        <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors truncate flex-1 min-w-0">
          {displayTitle}
        </span>
      </Link>
      <NoteContextBadge note={note} masked={masked} compact className="max-w-28" />
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
  );
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
