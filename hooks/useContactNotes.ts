"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { notesApi, type NoteRow } from "@/lib/api";
import type { NoteRecord } from "@/hooks/useNotes";

export const CONTACT_NOTES_QUERY_KEY = ["notes", "context", "contact"] as const;

/** Alleen notities die server-side aan dit contact en deze gebruiker zijn gekoppeld. */
export function useContactNotes(contactId: string | null) {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const query = useQuery({
    queryKey: [...CONTACT_NOTES_QUERY_KEY, userId, contactId],
    queryFn: () => notesApi.listByContext(userId, "contact", contactId as string),
    enabled: Boolean(userId && contactId),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const notes = useMemo(
    () => (query.data ?? []).map(noteRowToRecord),
    [query.data],
  );

  return { ...query, notes };
}

function noteRowToRecord(row: NoteRow): NoteRecord {
  return {
    ...row,
    id: row.id,
    _id: row.id,
    user_id: row.user_id,
    titel: row.titel,
    inhoud: row.inhoud,
    tags: row.tags ?? [],
    kleur: row.kleur,
    isPinned: row.is_pinned ?? false,
    isArchived: row.is_archived ?? false,
    isCompleted: row.is_completed ?? false,
    is_pinned: row.is_pinned ?? false,
    is_archived: row.is_archived ?? false,
    is_completed: row.is_completed ?? false,
    deadline: row.deadline,
    linkedEventId: row.linked_event_id,
    linked_event_id: row.linked_event_id,
    prioriteit: row.prioriteit,
    symbol: row.symbol,
    businessContextType: row.business_context_type,
    businessContextId: row.business_context_id,
    businessContextTitle: row.business_context_title,
    business_context_type: row.business_context_type,
    business_context_id: row.business_context_id,
    business_context_title: row.business_context_title,
    aangemaakt: row.aangemaakt,
    gewijzigd: row.gewijzigd,
  };
}
