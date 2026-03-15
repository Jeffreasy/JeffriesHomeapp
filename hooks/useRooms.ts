"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { roomsApi } from "@/lib/api";

// ─── Rooms ────────────────────────────────────────────────────────────────────

export function useRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: roomsApi.list,
    staleTime: 30_000,
  });
}

// ─── Room Create ──────────────────────────────────────────────────────────────

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

// ─── Delete Room ──────────────────────────────────────────────────────────────

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => roomsApi.delete(id),
    onSuccess: () => {
      // Invalidate both — devices in that room will have stale room_id
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
