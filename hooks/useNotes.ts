"use client";

import { useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NoteRecord {
  _id:         Id<"notes">;
  _creationTime: number;
  userId:      string;
  titel?:      string;
  inhoud:      string;
  tags?:       string[];
  kleur?:      string;
  isPinned:    boolean;
  isArchived:  boolean;
  aangemaakt:  string;
  gewijzigd:   string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotes() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  const raw = useQuery(
    api.notes.list,
    userId ? { userId } : "skip"
  ) as NoteRecord[] | undefined;

  const createNote  = useMutation(api.notes.create);
  const updateNote  = useMutation(api.notes.update);
  const togglePin   = useMutation(api.notes.togglePin);
  const archiveNote = useMutation(api.notes.archive);
  const removeNote  = useMutation(api.notes.remove);

  // Split into active + archived, pinned first
  const { active, archived, pinned } = useMemo(() => {
    if (!raw) return { active: [], archived: [], pinned: [] };

    const act: NoteRecord[] = [];
    const arch: NoteRecord[] = [];
    const pin: NoteRecord[] = [];

    for (const n of raw) {
      if (n.isArchived) {
        arch.push(n);
      } else {
        act.push(n);
        if (n.isPinned) pin.push(n);
      }
    }

    // Sort: pinned first, then by gewijzigd desc
    act.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.gewijzigd.localeCompare(a.gewijzigd);
    });

    return { active: act, archived: arch, pinned: pin };
  }, [raw]);

  // All unique tags across notes
  const allTags = useMemo(() => {
    if (!raw) return [];
    const set = new Set<string>();
    for (const n of raw) {
      for (const t of n.tags ?? []) set.add(t);
    }
    return Array.from(set).sort();
  }, [raw]);

  return {
    notes: active,
    archived,
    pinned,
    allTags,
    isLoading: raw === undefined,
    count: active.length,

    create: (data: { titel?: string; inhoud: string; tags?: string[]; kleur?: string }) =>
      createNote({ userId, ...data }),
    update: (id: Id<"notes">, data: { titel?: string; inhoud?: string; tags?: string[]; kleur?: string }) =>
      updateNote({ id, ...data }),
    togglePin: (id: Id<"notes">) => togglePin({ id }),
    archive:   (id: Id<"notes">) => archiveNote({ id }),
    remove:    (id: Id<"notes">) => removeNote({ id }),
  };
}
