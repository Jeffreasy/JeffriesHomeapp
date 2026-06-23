"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/Toast";
import {
  getNotesIdRevisions,
  useGetNotes,
  useGetNotesTags,
  postNotesIdRevisionsRevisionIDRestore,
  usePostNotes,
  usePatchNotesId,
  useDeleteNotesId,
  getGetNotesQueryKey,
  getGetNotesTagsQueryKey,
} from "@/lib/api/generated/notes/notes";
import type { HandlerNoteCreateBody, HandlerNoteUpdateBody, ModelNote, ModelNoteRevision } from "@/lib/api/model";

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
  isCompleted:     boolean;
  is_pinned:       boolean;
  is_archived:     boolean;
  is_completed:    boolean;
  completedAt?:    string | null;
  completed_at?:   string | null;
  deadline?:       string | null;
  linkedEventId?:  string | null;
  linked_event_id?: string | null;
  prioriteit?:     string | null;
  symbol?:         string | null;
  businessContextType?: string | null;
  businessContextId?: string | null;
  businessContextTitle?: string | null;
  business_context_type?: string | null;
  business_context_id?: string | null;
  business_context_title?: string | null;
  aangemaakt:      string;
  gewijzigd:       string;
}

export interface NoteRevisionRecord {
  id: string;
  note_id: string;
  user_id: string;
  titel?: string | null;
  inhoud: string;
  tags?: string[];
  kleur?: string | null;
  deadline?: string | null;
  linkedEventId?: string | null;
  linked_event_id?: string | null;
  prioriteit?: string | null;
  symbol?: string | null;
  businessContextType?: string | null;
  businessContextId?: string | null;
  businessContextTitle?: string | null;
  business_context_type?: string | null;
  business_context_id?: string | null;
  business_context_title?: string | null;
  aangemaakt: string;
}

export type NoteCreateData = {
  titel?: string;
  inhoud: string;
  tags?: string[];
  kleur?: string;
  deadline?: string;
  linkedEventId?: string;
  prioriteit?: string;
  symbol?: string;
  businessContextType?: string;
  businessContextId?: string;
  businessContextTitle?: string;
};

export type NoteUpdateData = {
  titel?: string;
  inhoud?: string;
  tags?: string[];
  kleur?: string;
  deadline?: string;
  linkedEventId?: string;
  prioriteit?: string;
  symbol?: string;
  businessContextType?: string;
  businessContextId?: string;
  businessContextTitle?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isCompleted?: boolean;
  is_pinned?: boolean;
  is_archived?: boolean;
  is_completed?: boolean;
  // Optimistic-concurrency token: the gewijzigd the editor last saw. The backend
  // rejects the write (409) if the note changed since, so a stale full-body save
  // can't silently clobber a concurrent change.
  expectedGewijzigd?: string;
};

// Optimistic create inserts a placeholder note with a "temp-" id until the server
// responds. Quick-actions against it would 404, so they are no-ops until it lands.
const isTempId = (id: string) => id.startsWith("temp-");

type NotesCache = {
  data?: ModelNote[];
  status?: number;
};

type BusinessContextFields = {
  business_context_type?: string | null;
  business_context_id?: string | null;
  business_context_title?: string | null;
};

type ModelNoteWithBusinessContext = ModelNote & BusinessContextFields;
type ModelNoteRevisionWithBusinessContext = ModelNoteRevision & BusinessContextFields;
type NoteCreateBodyWithBusinessContext = HandlerNoteCreateBody & {
  businessContextType?: string;
  businessContextId?: string;
  businessContextTitle?: string;
};
type NoteUpdateBodyWithBusinessContext = HandlerNoteUpdateBody & {
  businessContextType?: string;
  businessContextId?: string;
  businessContextTitle?: string;
};

function toRecord(row: ModelNote): NoteRecord {
  const source = row as ModelNoteWithBusinessContext;
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
    isCompleted: row.is_completed ?? false,
    is_pinned: row.is_pinned ?? false,
    is_archived: row.is_archived ?? false,
    is_completed: row.is_completed ?? false,
    completedAt: row.completed_at,
    completed_at: row.completed_at,
    deadline: row.deadline,
    linkedEventId: row.linked_event_id,
    linked_event_id: row.linked_event_id,
    prioriteit: row.prioriteit,
    symbol: row.symbol,
    businessContextType: source.business_context_type ?? null,
    businessContextId: source.business_context_id ?? null,
    businessContextTitle: source.business_context_title ?? null,
    business_context_type: source.business_context_type ?? null,
    business_context_id: source.business_context_id ?? null,
    business_context_title: source.business_context_title ?? null,
    aangemaakt: row.aangemaakt ?? new Date().toISOString(),
    gewijzigd: row.gewijzigd ?? new Date().toISOString(),
  };
}

function toRevisionRecord(row: ModelNoteRevision): NoteRevisionRecord {
  const source = row as ModelNoteRevisionWithBusinessContext;
  return {
    id: row.id ?? "",
    note_id: row.note_id ?? "",
    user_id: row.user_id ?? "",
    titel: row.titel,
    inhoud: row.inhoud ?? "",
    tags: row.tags ?? [],
    kleur: row.kleur,
    deadline: row.deadline,
    linkedEventId: row.linked_event_id,
    linked_event_id: row.linked_event_id,
    prioriteit: row.prioriteit,
    symbol: row.symbol,
    businessContextType: source.business_context_type ?? null,
    businessContextId: source.business_context_id ?? null,
    businessContextTitle: source.business_context_title ?? null,
    business_context_type: source.business_context_type ?? null,
    business_context_id: source.business_context_id ?? null,
    business_context_title: source.business_context_title ?? null,
    aangemaakt: row.aangemaakt ?? new Date().toISOString(),
  };
}

function toModelPatch(data: Partial<NoteUpdateData>): Partial<ModelNote> {
  const patch: Partial<ModelNote> = { ...(data as Partial<ModelNote>) };
  if ("linkedEventId" in data) {
    patch.linked_event_id = data.linkedEventId || undefined;
    delete (patch as Record<string, unknown>).linkedEventId;
  }
  if ("isPinned" in data) {
    patch.is_pinned = data.isPinned;
    delete (patch as Record<string, unknown>).isPinned;
  }
  if ("isArchived" in data) {
    patch.is_archived = data.isArchived;
    delete (patch as Record<string, unknown>).isArchived;
  }
  if ("isCompleted" in data) {
    patch.is_completed = data.isCompleted;
    patch.completed_at = data.isCompleted ? new Date().toISOString() : undefined;
    delete (patch as Record<string, unknown>).isCompleted;
  }
  if ("businessContextType" in data) {
    (patch as ModelNoteWithBusinessContext).business_context_type = data.businessContextType || undefined;
    delete (patch as Record<string, unknown>).businessContextType;
  }
  if ("businessContextId" in data) {
    (patch as ModelNoteWithBusinessContext).business_context_id = data.businessContextId || undefined;
    delete (patch as Record<string, unknown>).businessContextId;
  }
  if ("businessContextTitle" in data) {
    (patch as ModelNoteWithBusinessContext).business_context_title = data.businessContextTitle || undefined;
    delete (patch as Record<string, unknown>).businessContextTitle;
  }
  return patch;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotes() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();

  const queryKey = getGetNotesQueryKey({ userId });
  const tagsQueryKey = getGetNotesTagsQueryKey({ userId });

  const { data: notesRaw, isLoading: loadingNotes, isError: notesError } = useGetNotes({ userId }, { query: { enabled: !!userId } });
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

  const { active, archived, completed, pinned } = useMemo(() => {
    if (!raw) return { active: [], archived: [], completed: [], pinned: [] };
    const act: NoteRecord[] = [];
    const arch: NoteRecord[] = [];
    const done: NoteRecord[] = [];
    const pin: NoteRecord[] = [];
    for (const n of raw) {
      if (n.isArchived || n.is_archived) {
        arch.push(n);
      } else if (n.isCompleted || n.is_completed) {
        done.push(n);
      } else {
        act.push(n);
        if (n.isPinned || n.is_pinned) pin.push(n);
      }
    }
    return { active: act, archived: arch, completed: done, pinned: pin };
  }, [raw]);

  // Mutations
  const createMut = usePostNotes({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });
        const previousNotes = queryClient.getQueryData<NotesCache>(queryKey);
        
        // Optimistic UI Update
        const newNote: ModelNoteWithBusinessContext = {
          id: `temp-${Date.now()}`,
          user_id: userId,
          titel: variables.data.titel ?? undefined,
          inhoud: variables.data.inhoud,
          tags: variables.data.tags ?? [],
          kleur: variables.data.kleur ?? undefined,
          is_pinned: false,
          is_archived: false,
          is_completed: false,
          deadline: variables.data.deadline ?? undefined,
          linked_event_id: variables.data.linkedEventId ?? undefined,
          prioriteit: variables.data.prioriteit ?? "normaal",
          symbol: variables.data.symbol ?? "note",
          business_context_type: (variables.data as NoteCreateBodyWithBusinessContext).businessContextType ?? undefined,
          business_context_id: (variables.data as NoteCreateBodyWithBusinessContext).businessContextId ?? undefined,
          business_context_title: (variables.data as NoteCreateBodyWithBusinessContext).businessContextTitle ?? undefined,
          aangemaakt: new Date().toISOString(),
          gewijzigd: new Date().toISOString(),
        };

        queryClient.setQueryData<NotesCache>(queryKey, (old) => {
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
        queryClient.invalidateQueries({ queryKey: tagsQueryKey });
      },
    }
  });

  const updateMut = usePatchNotesId({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });
        const previousNotes = queryClient.getQueryData<NotesCache>(queryKey);

        const patch = toModelPatch(variables.data as Partial<NoteUpdateData>);
        queryClient.setQueryData<NotesCache>(queryKey, (old) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((note: ModelNote) =>
              note.id === variables.id ? { ...note, ...patch, gewijzigd: new Date().toISOString() } : note
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
        queryClient.invalidateQueries({ queryKey: tagsQueryKey });
      },
    }
  });

  const deleteMut = useDeleteNotesId({
    mutation: {
      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });
        const previousNotes = queryClient.getQueryData<NotesCache>(queryKey);

        queryClient.setQueryData<NotesCache>(queryKey, (old) => {
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
        queryClient.invalidateQueries({ queryKey: tagsQueryKey });
      },
    }
  });

  return {
    raw,
    notes: raw,
    active,
    archived,
    completed,
    pinned,
    allTags,
    isLoading: loadingNotes || loadingTags,
    isError: notesError,
    count: active.length,

    create: async (data: NoteCreateData) => {
      await createMut.mutateAsync({ data: data as NoteCreateBodyWithBusinessContext, params: { userId } });
    },
    update: async (id: string, data: Partial<NoteUpdateData>) => {
      await updateMut.mutateAsync({ id, data: data as NoteUpdateBodyWithBusinessContext });
    },
    togglePin: async (id: string) => {
      if (isTempId(id)) return;
      const note = raw?.find(n => n.id === id);
      if (note) {
        await updateMut.mutateAsync({ id, data: { isPinned: !(note.isPinned || note.is_pinned) } });
      }
    },
    archive: async (id: string) => {
      if (isTempId(id)) return;
      const note = raw?.find(n => n.id === id);
      await updateMut.mutateAsync({ id, data: { isArchived: !(note?.isArchived || note?.is_archived) } });
    },
    toggleComplete: async (id: string) => {
      if (isTempId(id)) return;
      const note = raw?.find(n => n.id === id);
      if (note) {
        await updateMut.mutateAsync({ id, data: { isCompleted: !(note.isCompleted || note.is_completed) } });
      }
    },
    revisions: async (id: string, limit = 20) => {
      if (!userId) return [];
      const result = await getNotesIdRevisions(id, { userId, limit });
      const rows = Array.isArray(result.data) ? result.data : [];
      return rows.map(toRevisionRecord);
    },
    restoreRevision: async (id: string, revisionId: string) => {
      if (!userId) throw new Error("Gebruiker ontbreekt");
      const result = await postNotesIdRevisionsRevisionIDRestore(id, revisionId, { userId });
      if (!result.data || typeof result.data === "string") {
        throw new Error("Herstellen mislukt");
      }
      const row = result.data;
      const restored = toRecord(row);
      queryClient.setQueryData<NotesCache>(queryKey, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((note: ModelNote) => note.id === id ? row : note),
        };
      });
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: tagsQueryKey });
      return restored;
    },
    remove: async (id: string) => {
      if (isTempId(id)) return;
      await deleteMut.mutateAsync({ id });
    },
  };
}
