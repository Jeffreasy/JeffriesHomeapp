"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { UserRound } from "lucide-react";
import type { Contact } from "@/lib/api";

type UseContactMentionOptions = {
  value: string;
  contacts: Contact[];
  selectedContact: Contact | null;
  onChange: (value: string) => void;
  onSelect: (contact: Contact) => void;
};

type ContactMentionMatch = { start: number; query: string };

/**
 * Detecteert alleen een @-zoekopdracht aan het einde van de capture-regel. De
 * tekstmarkering wordt na selectie verwijderd: de persistente koppeling leeft
 * apart van de notitie-inhoud en blijft daardoor ondubbelzinnig.
 */
export function useContactMention({
  value,
  contacts,
  selectedContact,
  onChange,
  onSelect,
}: UseContactMentionOptions) {
  const mention = useMemo(() => (selectedContact ? null : getContactMention(value)), [selectedContact, value]);
  const suggestions = useMemo(() => {
    if (!mention) return [];
    const needle = normalize(mention.query);
    return contacts
      .filter((contact) => !contact.archived)
      .filter((contact) => !needle || contactSearchText(contact).includes(needle))
      .sort((a, b) => {
        const aName = normalize(a.display_name);
        const bName = normalize(b.display_name);
        const aStarts = needle && aName.startsWith(needle) ? 0 : 1;
        const bStarts = needle && bName.startsWith(needle) ? 0 : 1;
        return aStarts - bStarts || a.display_name.localeCompare(b.display_name, "nl");
      })
      .slice(0, 6);
  }, [contacts, mention]);
  const [activeIndex, setActiveIndex] = useState(0);
  const safeActiveIndex = suggestions.length > 0 ? Math.min(activeIndex, suggestions.length - 1) : 0;

  const pick = (contact: Contact) => {
    if (!mention) return;
    onChange(value.slice(0, mention.start).trimEnd());
    onSelect(contact);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!mention) return false;
    if (event.key === "Escape") {
      event.preventDefault();
      onChange(value.slice(0, mention.start).trimEnd());
      return true;
    }
    // Zolang een @-zoekopdracht openstaat mag Enter niet per ongeluk de hele
    // quick note opslaan wanneer contacten nog laden of er geen match is.
    if (suggestions.length === 0) {
      if (event.key === "Enter" || event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        return true;
      }
      return false;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % suggestions.length);
      return true;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
      return true;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      pick(suggestions[safeActiveIndex] ?? suggestions[0]);
      return true;
    }
    return false;
  };

  return {
    activeIndex: safeActiveIndex,
    handleKeyDown,
    isOpen: Boolean(mention),
    pick,
    query: mention?.query ?? "",
    suggestions,
  };
}

export function ContactMentionMenu({
  id,
  isOpen,
  query,
  suggestions,
  activeIndex,
  isLoading,
  isError,
  onSelect,
}: {
  id: string;
  isOpen: boolean;
  query: string;
  suggestions: Contact[];
  activeIndex: number;
  isLoading?: boolean;
  isError?: boolean;
  onSelect: (contact: Contact) => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      id={id}
      role="listbox"
      aria-label="Contact kiezen"
      className="absolute left-2 right-2 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-[var(--color-border)] bg-[#11111a] p-1.5 shadow-2xl sm:left-10 sm:right-auto sm:min-w-80"
    >
      {isLoading ? (
        <p role="status" className="px-3 py-2 text-xs text-slate-500">Contacten laden…</p>
      ) : isError ? (
        <p role="alert" className="px-3 py-2 text-xs text-amber-300">Contacten konden niet geladen worden.</p>
      ) : suggestions.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-500">
          Geen contact gevonden{query ? ` voor “${query}”` : ""}.
        </p>
      ) : (
        suggestions.map((contact, index) => (
          <button
            key={contact.id}
            id={`${id}-${contact.id}`}
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(contact)}
            className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors ${
              index === activeIndex ? "bg-violet-500/15 text-violet-100" : "text-slate-300 hover:bg-white/[0.05]"
            }`}
          >
            <UserRound size={14} className="shrink-0 text-violet-300/80" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{contact.display_name}</span>
              <span className="block truncate text-[10px] text-slate-500">{contactMeta(contact)}</span>
            </span>
          </button>
        ))
      )}
    </div>
  );
}

function getContactMention(value: string): ContactMentionMatch | null {
  const match = /(?:^|\s)@([^@\n]*)$/.exec(value);
  if (!match || match.index == null) return null;
  const atOffset = match[0].indexOf("@");
  return { start: match.index + atOffset, query: (match[1] ?? "").trimStart() };
}

function contactSearchText(contact: Contact) {
  return normalize([
    contact.display_name,
    ...(contact.relationship_types ?? []),
    ...(contact.labels ?? []).map((label) => label.name),
    ...(contact.organizations ?? []).map((organization) => organization.organization_name ?? ""),
  ].join(" "));
}

function contactMeta(contact: Contact) {
  const labels: Record<string, string> = {
    family: "Familie",
    friend: "Vriend",
    colleague: "Collega",
    business: "Zakelijk",
  };
  const types = (contact.relationship_types ?? []).map((type) => labels[type] ?? type);
  return types.join(" · ") || contact.organizations?.[0]?.organization_name || "Contact";
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("nl-NL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}
