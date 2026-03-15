"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { devicesApi, type Device, type DeviceCommand } from "@/lib/api";

// ─── Devices ──────────────────────────────────────────────────────────────────

export function useDevices() {
  return useQuery({
    queryKey: ["devices"],
    queryFn: devicesApi.list,
    staleTime: 15_000,
    refetchInterval: 30_000,
    select: (data) =>
      [...data].sort((a, b) =>
        a.commissioned_at.localeCompare(b.commissioned_at)
      ),
  });
}

// ─── Lamp Command (with optimistic update for on/off) ─────────────────────────

export function useLampCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cmd }: { id: string; cmd: DeviceCommand }) =>
      devicesApi.command(id, cmd),

    // Optimistic update only for on/off — not for rapid color changes
    onMutate: async ({ id, cmd }): Promise<{ prev: unknown }> => {
      const isRapidChange =
        cmd.r !== undefined ||
        cmd.g !== undefined ||
        cmd.b !== undefined ||
        cmd.brightness !== undefined ||
        cmd.color_temp_mireds !== undefined;

      await queryClient.cancelQueries({ queryKey: ["devices"] });
      const prev = queryClient.getQueryData(["devices"]);

      if (!isRapidChange) {
        queryClient.setQueryData(["devices"], (old: Device[] | undefined) =>
          old?.map((d) =>
            d.id === id
              ? { ...d, current_state: { ...d.current_state, ...cmd } }
              : d
          )
        );
      }

      return { prev };
    },

    onError: (_err, _vars, ctx: { prev: unknown } | undefined) => {
      if (ctx?.prev) queryClient.setQueryData(["devices"], ctx.prev);
    },

    onSettled: () => {
      // Don't invalidate after every rapid command to avoid flicker
    },
  });
}

// ─── Device Update (rename, room assign) ─────────────────────────────────────

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; room_id?: string | null; ip_address?: string };
    }) =>
      devicesApi.update(id, {
        name: data.name,
        ip_address: data.ip_address,
        room_id: data.room_id ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

// ─── Delete Device ────────────────────────────────────────────────────────────

export function useDeleteDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => devicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
