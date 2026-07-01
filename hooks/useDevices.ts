"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { devicesApi, settingsApi, type Device, type DeviceCommand } from "@/lib/api";
import { applyCommandToDevice } from "@/lib/deviceCommands";
import { useToast } from "@/components/ui/Toast";

// ─── Devices (Go API — proxies to Convex + WiZ UDP) ──────────────────────────

export function useDevices() {
  const { data, isLoading, isFetching, error } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: () => devicesApi.list(),
    // Automations, Telegram en fysieke schakelaars wijzigen de lampstatus
    // buiten de app om — poll zodat de UI binnen 10s reconvergeert.
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
  });

  const devices = (data ?? []).sort((a, b) =>
    (a.commissioned_at ?? "").localeCompare(b.commissioned_at ?? "")
  );

  return { data: devices, isLoading, isFetching, error };
}

// ─── Bridge status (N7) ───────────────────────────────────────────────────────

/** Shape van `overview.bridge` uit /settings/overview (zie SettingsBridge). */
export interface BridgeStatus {
  online: boolean;
  status?: string;
  lastSeenAt?: string | null;
  commandsPending?: number;
  commandsProcessing?: number;
  commandsFailed?: number;
  lastError?: string | null;
}

/**
 * useBridgeStatus — pollt dezelfde settings-overview als de instellingenpagina
 * (gedeelde query-key, dus geen dubbele calls als beide pagina's open staan).
 * In queue-modus is een offline bridge onzichtbaar op /lampen: commando's
 * worden 204-bevestigd maar nooit uitgevoerd (N7) — deze hook voedt de banner.
 */
export function useBridgeStatus() {
  const { data } = useQuery({
    queryKey: ["settings-overview"],
    queryFn: () => settingsApi.overview(),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const bridge = (data?.bridge ?? null) as BridgeStatus | null;
  // Alleen "offline" melden als er ooit een bridge-heartbeat bekend was —
  // zonder bridge-config (direct-modus) is er niets om over te waarschuwen.
  const bridgeOffline = bridge !== null && !bridge.online;
  return { bridge, bridgeOffline };
}

// ─── Lamp Command (via Go API → WiZ UDP or Convex queue) ──────────────────────

interface LampCommandVars {
  id: string;
  cmd: DeviceCommand;
  /**
   * Batch-modus: onderdruk de per-command invalidate/toast — de batch-caller
   * (sendBatch) invalideert één keer op het eind en meldt fouten gebundeld.
   */
  batch?: boolean;
}

export function useLampCommand() {
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();

  const mutation = useMutation({
    mutationFn: ({ id, cmd }: LampCommandVars) => devicesApi.command(id, cmd),
    onMutate: async ({ id, cmd }: LampCommandVars) => {
      // Optimistic: patch de cache met dezelfde command-simulatie als de scenes.
      await queryClient.cancelQueries({ queryKey: ["devices"] });
      const previous = queryClient.getQueryData<Device[]>(["devices"]);
      queryClient.setQueryData<Device[]>(["devices"], (old) =>
        old?.map((d) => (d.id === id ? applyCommandToDevice(d, cmd) : d))
      );
      return { previous };
    },
    onSuccess: (_data, vars) => {
      if (!vars.batch) queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (_err, vars, context) => {
      // Rollback naar de snapshot van vóór dit command.
      if (context?.previous) queryClient.setQueryData(["devices"], context.previous);
      if (vars.batch) return; // batch-caller meldt en invalideert gebundeld
      // A physical-device control surface must never silently swallow a failed
      // command — tell the user and reconverge on the real server state.
      toastError("Lamp-commando mislukt — controleer of de lamp bereikbaar is");
      queryClient.invalidateQueries({ queryKey: ["devices"] });
    },
  });

  const { mutateAsync } = mutation;

  /**
   * Stuur één command naar meerdere lampen tegelijk (alles aan/uit, scènes).
   * Eén invalidate + één fout-toast aan het eind i.p.v. N refetch-stormen.
   */
  const sendBatch = useCallback(
    (targets: Device[], cmd: DeviceCommand) => {
      if (targets.length === 0) return;
      void Promise.allSettled(
        targets.map((d) => mutateAsync({ id: d.id, cmd, batch: true }))
      ).then((results) => {
        queryClient.invalidateQueries({ queryKey: ["devices"] });
        // L9: benoem wélke lampen niet reageerden (eerste 3 + "en X meer").
        const failedNames = targets
          .filter((_, index) => results[index].status === "rejected")
          .map((d) => d.name);
        if (failedNames.length > 0) {
          const shown = failedNames.slice(0, 3).join(", ");
          const rest = failedNames.length - 3;
          toastError(
            `${failedNames.length} van ${targets.length} lampen reageerde niet: ${shown}${rest > 0 ? ` en ${rest} meer` : ""}`
          );
        }
      });
    },
    [mutateAsync, queryClient, toastError]
  );

  return {
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    sendBatch,
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
