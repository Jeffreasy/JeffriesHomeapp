"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roomsApi, type Room } from "@/lib/api";
import { sortedCopy } from "@/lib/collections";

export function useRooms() {
  const { data, isLoading, error } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: () => roomsApi.list(),
  });

  const rooms = sortedCopy(data ?? [], (a, b) =>
    a.floor_number === b.floor_number
      ? a.name.localeCompare(b.name)
      : a.floor_number - b.floor_number
  );

  return { data: rooms, isLoading, error };
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; icon: string; floor_number: number }) =>
      roomsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; name?: string; icon?: string; floor_number?: number }) =>
      roomsApi.update(data.id, {
        name: data.name,
        icon: data.icon,
        floor_number: data.floor_number,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roomsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
