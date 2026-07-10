"use client";

import Link from "next/link";
import { BriefcaseBusiness, UserRound } from "lucide-react";
import type { NoteRecord } from "@/hooks/useNotes";
import { getNoteBusinessContext } from "./NotesUtils";

type NoteContextBadgeProps = {
  note: NoteRecord;
  masked?: boolean;
  compact?: boolean;
  className?: string;
};

/**
 * Zichtbare, consistente verwijzing naar de context van een notitie. Een
 * contactcontext navigeert rechtstreeks naar het contact; overige contexten
 * blijven informatief totdat hun modules een stabiel deep-linkcontract hebben.
 */
export function NoteContextBadge({
  note,
  masked = false,
  compact = false,
  className = "",
}: NoteContextBadgeProps) {
  if (masked) return null;
  const context = getNoteBusinessContext(note);
  if (!context?.type) return null;

  const isContact = context.type === "contact";
  const label = context.title || (isContact ? "Contact" : "Zakelijke context");
  const classes = `inline-flex min-w-0 max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 font-semibold ${
    compact ? "text-[10px]" : "text-[11px]"
  } ${
    isContact
      ? "border-violet-500/20 bg-violet-500/10 text-violet-200 hover:bg-violet-500/15"
      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
  } ${className}`;

  const content = (
    <>
      {isContact ? <UserRound size={compact ? 9 : 10} aria-hidden="true" /> : <BriefcaseBusiness size={compact ? 9 : 10} aria-hidden="true" />}
      <span className="truncate">{label}</span>
    </>
  );

  if (isContact && context.id) {
    return (
      <Link
        href={`/contacten?contact=${encodeURIComponent(context.id)}`}
        onClick={(event) => event.stopPropagation()}
        aria-label={`Open contact: ${label}`}
        title={`Open contact ${label}`}
        className={classes}
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={classes} title={label}>
      {content}
    </span>
  );
}
