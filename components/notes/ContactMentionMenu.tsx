"use client";

import { useMemo, useState, type KeyboardEvent, type RefObject } from "react";
import { UserRound } from "lucide-react";
import type { Contact } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { InputAnchoredListbox } from "@/components/ui/InputAnchoredListbox";

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
  anchorRef,
  isOpen,
  query,
  suggestions,
  activeIndex,
  isLoading,
  isError,
  onSelect,
}: {
  id: string;
  anchorRef: RefObject<HTMLElement | null>;
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
    <InputAnchoredListbox
      id={id}
      anchorRef={anchorRef}
      label="Contact kiezen"
    >
      {isLoading ? (
        <p role="status" className="px-3 py-2 text-xs text-[var(--color-text-muted)]">Contacten laden…</p>
      ) : isError ? (
        <p role="alert" className="px-3 py-2 text-xs text-[var(--color-danger)]">Contacten konden niet geladen worden.</p>
      ) : suggestions.length === 0 ? (
        <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
          Geen contact gevonden{query ? ` voor “${query}”` : ""}.
        </p>
      ) : (
        suggestions.map((contact, index) => (
          <Button
            key={contact.id}
            variant="ghost"
            fullWidth
            id={`${id}-${contact.id}`}
            type="button"
            role="option"
            tabIndex={-1}
            aria-selected={index === activeIndex}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelect(contact)}
            className={`justify-start gap-2 rounded-lg px-2.5 py-2 text-left ${
              index === activeIndex
                ? "bg-[var(--color-primary-subtle)] text-[var(--color-text)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]"
            }`}
          >
            <UserRound size={14} className="shrink-0 text-[var(--color-primary-hover)]" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-semibold">{contact.display_name}</span>
              <span className="block truncate text-micro text-[var(--color-text-muted)]">{contactMeta(contact)}</span>
            </span>
          </Button>
        ))
      )}
    </InputAnchoredListbox>
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
