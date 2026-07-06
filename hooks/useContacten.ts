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

  const create = useMutation({
    mutationFn: (data: ContactCreate) => contactenApi.create(userId, data),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ContactUpdate }) => contactenApi.update(userId, id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => contactenApi.remove(userId, id),
    onSuccess: invalidate,
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
