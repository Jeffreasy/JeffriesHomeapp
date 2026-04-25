"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMutation as useConvexMutation, useQuery as useConvexQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Room } from "@/lib/api";

type ConvexRoom = {
  _id: string;
  name: string;
  icon: string;
  floorNumber: number;
  createdAt: string;
};

function toRoom(room: ConvexRoom): Room {
  return {
    id: room._id,
    name: room.name,
    icon: room.icon,
    floor_number: room.floorNumber,
    created_at: room.createdAt,
  };
}

export function useRooms() {
  const raw = useConvexQuery(api.rooms.listForUser);
  const rooms = (raw ?? []).map(toRoom).sort((a, b) =>
    a.floor_number === b.floor_number
      ? a.name.localeCompare(b.name)
      : a.floor_number - b.floor_number
  );

  return {
    data: rooms,
    isLoading: raw === undefined,
    error: null as Error | null,
  };
}

export function useCreateRoom() {
  const createRoom = useConvexMutation(api.rooms.createForUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; icon: string; floor_number: number }) =>
      createRoom({
        name: data.name,
        icon: data.icon,
        floorNumber: data.floor_number,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateRoom() {
  const updateRoom = useConvexMutation(api.rooms.updateForUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { id: string; name?: string; icon?: string; floor_number?: number }) =>
      updateRoom({
        id: data.id as Id<"rooms">,
        name: data.name,
        icon: data.icon,
        floorNumber: data.floor_number,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDeleteRoom() {
  const deleteRoom = useConvexMutation(api.rooms.removeForUser);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteRoom({ id: id as Id<"rooms"> }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
