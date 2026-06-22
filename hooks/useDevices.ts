"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { devicesApi, type Device, type DeviceCommand } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

// ─── Devices (Go API — proxies to Convex + WiZ UDP) ──────────────────────────

export function useDevices() {
  const { data, isLoading, error } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: () => devicesApi.list(),
  });

  const devices = (data ?? []).sort((a, b) =>
    (a.commissioned_at ?? "").localeCompare(b.commissioned_at ?? "")
  );

  return { data: devices, isLoading, error };
}

// ─── Lamp Command (via Go API → WiZ UDP or Convex queue) ──────────────────────

export function useLampCommand() {
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();

  const mutation = useMutation({
    mutationFn: ({ id, cmd }: { id: string; cmd: DeviceCommand }) =>
      devicesApi.command(id, cmd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: () => {
      // A physical-device control surface must never silently swallow a failed
      // command — tell the user and reconverge on the real server state.
      toastError("Lamp-commando mislukt — controleer of de lamp bereikbaar is");
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  return {
    mutate: mutation.mutate,
    isPending: mutation.isPending,
  };
}

// ─── Create Device ────────────────────────────────────────────────────────────

export function useCreateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; ip_address: string; room_id?: string | null }) =>
      devicesApi.register({
        name: data.name,
        ip_address: data.ip_address,
        room_id: data.room_id ?? undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

// ─── Update Device ────────────────────────────────────────────────────────────

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; room_id?: string | null; ip_address?: string };
    }) => devicesApi.update(id, { ...data, room_id: data.room_id ?? undefined }),
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
