"use client";

/**
 * useHomeapp.ts — Backwards-compatible barrel re-export.
 *
 * Imports are now split across:
 *   - hooks/useDevices.ts  (device queries + mutations + lamp commands)
 *   - hooks/useRooms.ts    (room queries + mutations)
 *
 * This file re-exports everything so existing imports keep working.
 */

export {
  useDevices,
  useCreateDevice,
  useLampCommand,
  useUpdateDevice,
  useDeleteDevice,
} from "@/hooks/useDevices";

export {
  useRooms,
  useCreateRoom,
  useDeleteRoom,
} from "@/hooks/useRooms";
