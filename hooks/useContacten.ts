"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/nextjs";
import {
  contactenApi,
  type ContactCreate,
  type ContactUpdate,
} from "@/lib/api";

const KEY = "contacten";

/** List + write mutations for the unified Contacts module. */
export function useContacten(opts?: { includeArchived?: boolean }) {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const includeArchived = opts?.includeArchived ?? false;

  const listQuery = useQuery({
    queryKey: [KEY, "list", { includeArchived }],
    queryFn: () => contactenApi.list(userId, { includeArchived, limit: 500 }),
    enabled: !!userId,
    staleTime: 15_000,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [KEY] });
  const invalidateContactLifecycle = () => {
    void invalidate();
    void queryClient.invalidateQueries({ queryKey: ["/notes"] });
    void queryClient.invalidateQueries({ queryKey: ["notes", "context", "contact"] });
  };

  const create = useMutation({
    mutationFn: (data: ContactCreate) => contactenApi.create(userId, data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactUpdate }) => contactenApi.update(userId, id, data),
    onSuccess: invalidateContactLifecycle,
  });
  const remove = useMutation({
    mutationFn: (id: string) => contactenApi.remove(userId, id),
    onSuccess: invalidateContactLifecycle,
  });

  const addDate = useMutation({
    mutationFn: (vars: { contactId: string; data: Parameters<typeof contactenApi.addDate>[2] }) =>
      contactenApi.addDate(userId, vars.contactId, vars.data),
    onSuccess: invalidate,
  });
  const deleteDate = useMutation({
    mutationFn: (vars: { contactId: string; dateId: string }) =>
      contactenApi.deleteDate(userId, vars.contactId, vars.dateId),
    onSuccess: invalidate,
  });
  const addFact = useMutation({
    mutationFn: (vars: { contactId: string; data: Parameters<typeof contactenApi.addFact>[2] }) =>
      contactenApi.addFact(userId, vars.contactId, vars.data),
    onSuccess: invalidate,
  });
  const deleteFact = useMutation({
    mutationFn: (vars: { contactId: string; factId: string }) =>
      contactenApi.deleteFact(userId, vars.contactId, vars.factId),
    onSuccess: invalidate,
  });

  const assignLabel = useMutation({
    mutationFn: (vars: { contactId: string; data: Parameters<typeof contactenApi.assignLabel>[2] }) =>
      contactenApi.assignLabel(userId, vars.contactId, vars.data),
    onSuccess: invalidate,
  });
  const removeLabel = useMutation({
    mutationFn: (vars: { contactId: string; labelId: string }) =>
      contactenApi.removeLabel(userId, vars.contactId, vars.labelId),
    onSuccess: invalidate,
  });

  const addChannel = useMutation({
    mutationFn: (vars: { contactId: string; data: Parameters<typeof contactenApi.addChannel>[2] }) =>
      contactenApi.addChannel(userId, vars.contactId, vars.data),
    onSuccess: invalidate,
  });
  const deleteChannel = useMutation({
    mutationFn: (vars: { contactId: string; channelId: string }) =>
      contactenApi.deleteChannel(userId, vars.contactId, vars.channelId),
    onSuccess: invalidate,
  });

  const addInteraction = useMutation({
    mutationFn: (vars: { contactId: string; data: Parameters<typeof contactenApi.addInteraction>[2] }) =>
      contactenApi.addInteraction(userId, vars.contactId, vars.data),
    onSuccess: invalidate,
  });
  const deleteInteraction = useMutation({
    mutationFn: (vars: { contactId: string; interactionId: string }) =>
      contactenApi.deleteInteraction(userId, vars.contactId, vars.interactionId),
    onSuccess: invalidate,
  });

  const merge = useMutation({
    mutationFn: (vars: { fromId: string; into: string }) => contactenApi.merge(userId, vars.fromId, vars.into),
    onSuccess: invalidateContactLifecycle,
  });
  const addOrganization = useMutation({
    mutationFn: (vars: { contactId: string; data: Parameters<typeof contactenApi.addOrganization>[2] }) =>
      contactenApi.addOrganization(userId, vars.contactId, vars.data),
    onSuccess: invalidate,
  });
  const removeOrganization = useMutation({
    mutationFn: (vars: { contactId: string; orgId: string }) =>
      contactenApi.removeOrganization(userId, vars.contactId, vars.orgId),
    onSuccess: invalidate,
  });
  const updateChannel = useMutation({
    mutationFn: (vars: { contactId: string; channelId: string; data: Parameters<typeof contactenApi.updateChannel>[3] }) =>
      contactenApi.updateChannel(userId, vars.contactId, vars.channelId, vars.data),
    onSuccess: invalidate,
  });

  return {
    userId,
    contacts: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    isError: listQuery.isError,
    refetch: listQuery.refetch,
    create,
    update,
    remove,
    addDate,
    deleteDate,
    addFact,
    deleteFact,
    assignLabel,
    removeLabel,
    addChannel,
    deleteChannel,
    addInteraction,
    deleteInteraction,
    merge,
    addOrganization,
    removeOrganization,
    updateChannel,
  };
}

/** The per-user label catalog + management mutations. */
export function useLabels() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: [KEY, "labels"],
    queryFn: () => contactenApi.labelsList(userId),
    enabled: !!userId,
    staleTime: 30_000,
  });

  // Label edits change chips across many contacts, so invalidate the whole module.
  const invalidateAll = () => queryClient.invalidateQueries({ queryKey: [KEY] });

  const createLabel = useMutation({
    mutationFn: (data: { name: string; color?: string }) => contactenApi.labelCreate(userId, data),
    onSuccess: invalidateAll,
  });
  const updateLabel = useMutation({
    mutationFn: (vars: { labelId: string; data: { name?: string; color?: string } }) =>
      contactenApi.labelUpdate(userId, vars.labelId, vars.data),
    onSuccess: invalidateAll,
  });
  const deleteLabel = useMutation({
    mutationFn: (labelId: string) => contactenApi.labelDelete(userId, labelId),
    onSuccess: invalidateAll,
  });
  const mergeLabel = useMutation({
    mutationFn: (vars: { labelId: string; into: string }) => contactenApi.labelMerge(userId, vars.labelId, vars.into),
    onSuccess: invalidateAll,
  });
  const bulkLabel = useMutation({
    mutationFn: (vars: { labelId: string; contactIds: string[]; remove?: boolean }) =>
      contactenApi.labelBulk(userId, vars.labelId, { contact_ids: vars.contactIds, remove: vars.remove }),
    onSuccess: invalidateAll,
  });

  return {
    labels: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    createLabel,
    updateLabel,
    deleteLabel,
    mergeLabel,
    bulkLabel,
  };
}

/** Full detail (with important dates + facts) for one contact. */
export function useContact(id: string | null) {
  const { user } = useUser();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: [KEY, "detail", id],
    queryFn: () => contactenApi.get(userId, id as string),
    enabled: !!userId && !!id,
    staleTime: 10_000,
  });
}
