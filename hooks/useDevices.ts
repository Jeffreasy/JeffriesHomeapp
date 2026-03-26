"use client";

import { useQuery as useConvexQuery } from "convex/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { devicesApi, type Device, type DeviceCommand } from "@/lib/api";

// ─── Map Convex camelCase → app snake_case Device interface ───────────────────

type ConvexDevice = {
  _id: string;
  name: string;
  deviceType: string;
  roomId?: string;
  ipAddress: string;
  currentState: { on: boolean; brightness: number; color_temp: number; r: number; g: number; b: number };
  status: "online" | "offline";
  lastSeen?: string;
  commissionedAt: string;
  manufacturer?: string;
  model?: string;
};

function toDevice(d: ConvexDevice): Device {
  return {
    id: d._id,
    name: d.name,
    device_type: d.deviceType,
    room_id: d.roomId ?? null,
    ip_address: d.ipAddress ?? null,
    current_state: d.currentState,
    status: d.status,
    last_seen: d.lastSeen ?? null,
    commissioned_at: d.commissionedAt,
    manufacturer: d.manufacturer ?? null,
    model: d.model ?? null,
  };
}

// ─── Devices (Convex-first — works in prod without local FastAPI) ─────────────

export function useDevices() {
  const raw = useConvexQuery(api.devices.listForUser);

  const devices = (raw ?? []).map(toDevice).sort((a, b) =>
    a.commissioned_at.localeCompare(b.commissioned_at)
  );

  return {
    data: devices,
    isLoading: raw === undefined,
    error: null as Error | null,
  };
}

// ─── Lamp Command (still via FastAPI — needs local network for UDP) ────────────

export function useLampCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, cmd }: { id: string; cmd: DeviceCommand }) =>
      devicesApi.command(id, cmd),

    onError: (err) => {
      console.warn("[LampCommand] FastAPI onbereikbaar:", err);
    },

    onSettled: () => {
      // Don't invalidate — Convex provides real-time updates
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
