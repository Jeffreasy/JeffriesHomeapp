"use client";

import { BriefcaseBusiness, UserRound } from "lucide-react";
import type { NoteRecord } from "@/hooks/useNotes";
import { getNoteBusinessContext } from "./NotesUtils";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { cn } from "@/lib/utils";

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
  const classes = cn(
    "min-w-0 max-w-full gap-1 rounded-md px-2 font-semibold",
    "text-micro",
    className,
  );

  const content = (
    <>
      {isContact ? <UserRound size={compact ? 9 : 10} aria-hidden="true" /> : <BriefcaseBusiness size={compact ? 9 : 10} aria-hidden="true" />}
      <span className="truncate">{label}</span>
    </>
  );

  if (isContact && context.id) {
    return (
      <ButtonLink
        variant="secondary"
        href={`/contacten?contact=${encodeURIComponent(context.id)}`}
        onClick={(event) => event.stopPropagation()}
        aria-label={`Open contact: ${label}`}
        title={`Open contact ${label}`}
        className={cn(
          classes,
          "border-[var(--color-info-border)] bg-[var(--color-info-subtle)] text-[var(--color-info)] hover:bg-[var(--color-info-border)]",
        )}
      >
        {content}
      </ButtonLink>
    );
  }

  return (
    <Badge tone="accent" size="sm" className={classes} title={label}>
      {content}
    </Badge>
  );
}
