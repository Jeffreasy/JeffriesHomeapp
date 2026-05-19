"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetNotes,
  useGetNotesTags,
  usePostNotes,
  usePatchNotesId,
  useDeleteNotesId,
} from "@/lib/api/generated/notes/notes";
import type { ModelNote } from "@/lib/api/model";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NoteRecord {
  id:              string;
  _id?:            string;
  user_id:         string;
  titel?:          string | null;
  inhoud:          string;
  tags?:           string[];
  kleur?:          string | null;
  isPinned:        boolean;
  isArchived:      boolean;
  is_pinned:       boolean;
  is_archived:     boolean;
  deadline?:       string | null;
  linkedEventId?:  string | null;
  linked_event_id?: string | null;
  prioriteit?:     string | null;
  aangemaakt:      string;
  gewijzigd:       string;
}

export type NoteCreateData = {
  titel?: string;
  inhoud: string;
  tags?: string[];
  kleur?: string;
  deadline?: string;
  linkedEventId?: string;
  prioriteit?: string;
};

export type NoteUpdateData = {
  titel?: string;
  inhoud?: string;
  tags?: string[];
  kleur?: string;
  deadline?: string;
  linkedEventId?: string;
  prioriteit?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
};

function toRecord(row: ModelNote): NoteRecord {
  return {
    ...row,
    id: row.id ?? "",
    _id: row.id,
    user_id: row.user_id ?? "",
    titel: row.titel,
    inhoud: row.inhoud ?? "",
    tags: row.tags ?? [],
    kleur: row.kleur,
    isPinned: row.is_pinned ?? false,
    isArchived: row.is_archived ?? false,
    is_pinned: row.is_pinned ?? false,
    is_archived: row.is_archived ?? false,
    deadline: row.deadline,
    linkedEventId: row.linked_event_id,
    linked_event_id: row.linked_event_id,
    prioriteit: row.prioriteit,
    aangemaakt: row.aangemaakt ?? new Date().toISOString(),
    gewijzigd: row.gewijzigd ?? new Date().toISOString(),
  };
}

import { useToast } from "@/components/ui/Toast";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotes() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();

  const queryKey = ["/api/v1/notes", { userId }];

  const { data: notesRaw, isLoading: loadingNotes } = useGetNotes({ userId }, { query: { enabled: !!userId } });
  const { data: tagsRaw, isLoading: loadingTags } = useGetNotesTags({ userId }, { query: { enabled: !!userId } });

  const raw = useMemo<NoteRecord[]>(() => {
    if (!notesRaw?.data) return [];
    const arr = Array.isArray(notesRaw.data) ? notesRaw.data : [];
    return arr.map(toRecord);
  }, [notesRaw]);

  const allTags = useMemo<string[]>(() => {
    if (!tagsRaw?.data) return [];
    return Array.isArray(tagsRaw.data) ? (tagsRaw.data as string[]) : [];
  }, [tagsRaw]);

  const { active, archived, pinned } = useMemo(() => {
    if (!raw) return { active: [], archived: [], pinned: [] };
    const act: NoteRecord[] = [];
    const arch: NoteRecord[] = [];
    const pin: NoteRecord[] = [];
    for (const n of raw) {
      if (n.isArchived || n.is_archived) {
        arch.push(n);
      } else {
        act.push(n);
        if (n.isPinned || n.is_pinned) pin.push(n);
      }
    }
    return { active: act, archived: arch, pinned: pin };
  }, [raw]);

  // Mutations
  const createMut = usePostNotes({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });
        const previousNotes = queryClient.getQueryData<any>(queryKey);
        
        // Optimistic UI Update
        const newNote: ModelNote = {
          id: `temp-${Date.now()}`,
          user_id: userId,
          titel: variables.data.titel ?? undefined,
          inhoud: variables.data.inhoud,
          tags: variables.data.tags ?? [],
          kleur: variables.data.kleur ?? undefined,
          is_pinned: false,
          is_archived: false,
          deadline: variables.data.deadline ?? undefined,
          prioriteit: variables.data.prioriteit ?? "normaal",
          aangemaakt: new Date().toISOString(),
          gewijzigd: new Date().toISOString(),
        };

        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return { data: [newNote], status: 200 };
          return { ...old, data: [newNote, ...(old.data || [])] };
        });

        return { previousNotes };
      },
      onError: (err, variables, context) => {
        toastError("Kon notitie niet opslaan.");
        if (context?.previousNotes) {
          queryClient.setQueryData(queryKey, context.previousNotes);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    }
  });

  const updateMut = usePatchNotesId({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });
        const previousNotes = queryClient.getQueryData<any>(queryKey);

        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((note: ModelNote) =>
              note.id === variables.id ? { ...note, ...variables.data, gewijzigd: new Date().toISOString() } : note
            ),
          };
        });

        return { previousNotes };
      },
      onError: (err, variables, context) => {
        toastError("Kon wijzigingen niet opslaan.");
        if (context?.previousNotes) {
          queryClient.setQueryData(queryKey, context.previousNotes);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    }
  });

  const deleteMut = useDeleteNotesId({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });
        const previousNotes = queryClient.getQueryData<any>(queryKey);

        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((note: ModelNote) => note.id !== variables.id),
          };
        });

        return { previousNotes };
      },
      onError: (err, variables, context) => {
        toastError("Kon notitie niet verwijderen.");
        if (context?.previousNotes) {
          queryClient.setQueryData(queryKey, context.previousNotes);
        }
      },
      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },
    }
  });

  return {
    raw,
    notes: raw,
    active,
    archived,
    pinned,
    allTags,
    isLoading: loadingNotes || loadingTags,
    count: active.length,

    create: async (data: NoteCreateData) => {
      await createMut.mutateAsync({ data: data as any, params: { userId } });
    },
    update: async (id: string, data: Partial<NoteUpdateData>) => {
      await updateMut.mutateAsync({ id, data: data as any });
    },
    togglePin: async (id: string) => {
      const note = raw?.find(n => n.id === id);
      if (note) {
        await updateMut.mutateAsync({ id, data: { is_pinned: !note.isPinned } as any });
      }
    },
    archive: async (id: string) => {
      await updateMut.mutateAsync({ id, data: { is_archived: true } as any });
    },
    remove: async (id: string) => {
      await deleteMut.mutateAsync({ id });
    },
  };
}
