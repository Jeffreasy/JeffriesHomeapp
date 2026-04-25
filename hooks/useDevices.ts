"use client";

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/convex/_generated/api";
import { type Device, type DeviceCommand } from "@/lib/api";
import type { Id } from "@/convex/_generated/dataModel";

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

// ─── Lamp Command (via Convex queue → local bridge picks up) ──────────────────

export function useLampCommand() {
  const queueCmd = useConvexMutation(api.deviceCommands.queueForUser);

  return {
    mutate: ({ id, cmd }: { id: string; cmd: DeviceCommand }) => {
      queueCmd({
        deviceId: id,
        command: {
          on:                cmd.on,
          brightness:        cmd.brightness,
          color_temp_mireds: cmd.color_temp_mireds,
          r:                 cmd.r,
          g:                 cmd.g,
          b:                 cmd.b,
          scene_id:          cmd.scene_id,
        },
      }).catch((err: unknown) => console.warn("[LampCommand] queue failed:", err));
    },
    isPending: false,
  };
}

// ─── Device Update (rename, room assign) ─────────────────────────────────────

export function useCreateDevice() {
  const createDevice = useConvexMutation(api.devices.create);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { name: string; ip_address: string; room_id?: string | null }) =>
      createDevice({
        name: data.name,
        ipAddress: data.ip_address,
        deviceType: "color_light",
        ...(data.room_id ? { roomId: data.room_id } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

export function useUpdateDevice() {
  const updateDevice = useConvexMutation(api.devices.update);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: { name?: string; room_id?: string | null; ip_address?: string };
    }) => {
      const payload: {
        id: Id<"devices">;
        name?: string;
        roomId?: string | null;
        ipAddress?: string;
      } = {
        id: id as Id<"devices">,
      };
      if (data.name !== undefined) payload.name = data.name;
      if (data.ip_address !== undefined) payload.ipAddress = data.ip_address;
      if (data.room_id !== undefined) payload.roomId = data.room_id;
      return updateDevice(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}

// ─── Delete Device ────────────────────────────────────────────────────────────

export function useDeleteDevice() {
  const removeDevice = useConvexMutation(api.devices.remove);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => removeDevice({ id: id as Id<"devices"> }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });
}
