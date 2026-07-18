"use client";

import { useRef, useState } from "react";
import { StickyNote, Plus, ChevronRight, Pin, ListChecks, UserRound, X } from "lucide-react";
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
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Surface } from "@/components/ui/Surface";

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
  const mentionAnchorRef = useRef<HTMLInputElement>(null);
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
          <p className="text-xs text-[var(--color-text-muted)] uppercase tracking-wider">Notities</p>
          {notes.length > 0 && (
            <Badge tone="neutral" size="sm" className="tabular-nums">
              {notes.length}
              {totalPinned > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  · {totalPinned} <Pin size={9} className="fill-current text-[var(--color-primary)]" />
                </span>
              )}
            </Badge>
          )}
        </div>
        <ButtonLink
          href="/notities"
          variant="ghost"
          size="sm"
          className="gap-1 px-2"
        >
          Alle notities <ChevronRight size={12} />
        </ButtonLink>
      </div>

      {/* Quick capture */}
      <Surface padding="none" radius="md" className="relative mb-3">
        <div className="flex items-center gap-2 px-3 py-2">
          <StickyNote size={14} className="shrink-0 text-[var(--color-primary)]" />
          <Input
            ref={mentionAnchorRef}
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
            className="min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-base shadow-none hover:border-transparent focus:border-transparent focus:ring-0 sm:text-sm"
          />
          {text.trim() && (
            <IconButton
              label="Snelle notitie opslaan"
              icon={<Plus size={14} />}
              variant="primary"
              onClick={() => void handleQuickSave()}
              loading={saving}
            />
          )}
        </div>
        <ContactMentionMenu
          id={mentionListId}
          anchorRef={mentionAnchorRef}
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
              <Badge key={t} tone="accent" size="sm">
                #{t}
              </Badge>
            ))}
          </div>
        )}
        {quickContext && (
          <div className="px-3 pb-2">
            <Badge tone="info" size="sm">
              <AppIcon name={quickContext.noteSymbol} tone="info" size="xs" />
              {quickContext.label}
              <span className="text-[var(--color-info)]">#{quickContext.tag}</span>
            </Badge>
          </div>
        )}
        {quickBusinessContext && (
          <div className="px-3 pb-2">
            <Badge tone={quickBusinessContext.type === "contact" ? "info" : "accent"} size="sm">
              {quickBusinessContext.type === "contact" ? <UserRound size={11} aria-hidden="true" /> : <AppIcon name="business" tone="accent" size="xs" />}
              {businessContextLabel(quickBusinessContext)}
              {selectedContact ? (
                <IconButton
                  label={`Koppeling met ${selectedContact.display_name} verwijderen`}
                  icon={<X size={10} />}
                  onClick={() => setSelectedContact(null)}
                  className="-mr-2 border-transparent bg-transparent"
                />
              ) : null}
            </Badge>
          </div>
        )}
      </Surface>

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
    <div
      className="group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
    >
      <ButtonLink
        href={`/notities?note=${encodeURIComponent(note.id)}`}
        aria-label={masked ? "Notitie openen" : `Notitie openen: ${displayTitle}`}
        variant="ghost"
        fullWidth
        className="min-w-0 flex-1 justify-start gap-2.5 rounded-lg px-2"
      >
        {note.isPinned && <Pin size={10} className="shrink-0 fill-current text-[var(--color-primary)]" />}
        <AppIcon
          name={resolveAppIconName(note.symbol, "note")}
          tone="accent"
          size="xs"
          framed
          className="h-6 w-6 rounded-md"
        />
        <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-muted)]">
          {displayTitle}
        </span>
      </ButtonLink>
      <NoteContextBadge note={note} masked={masked} compact className="max-w-28" />
        {checklistInfo && (
          <span className="text-micro text-[var(--color-text-subtle)] shrink-0 tabular-nums">
            <ListChecks size={9} className="inline mr-0.5" />
            {checklistInfo}
          </span>
        )}
        <span className="text-micro text-[var(--color-text-subtle)] shrink-0">
          {formatCompact(note.gewijzigd)}
        </span>
    </div>
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
