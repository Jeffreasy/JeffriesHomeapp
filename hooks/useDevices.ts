"use client";

import { useCallback } from "react";
import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { devicesApi, settingsApi, type Device, type DeviceCommand } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { sortedCopy } from "@/lib/collections";
import { LampCommandJournal, replaceDeviceInCollection } from "@/lib/lampCommandJournal";
import { uniqueDevicesById } from "@/lib/lighting";
import {
  LampCommandTransport,
  isLampCommandSupersededError,
  runWithAbortTimeout,
  type LampCommandReservation,
} from "@/lib/lampCommandTransport";

const LAMP_COMMAND_MUTATION_KEY = ["lamp-command"] as const;

// ─── Devices (Go API — PostgreSQL state + WiZ UDP/queue) ─────────────────────

export function useDevices() {
  const pendingLampCommands = useIsMutating({
    mutationKey: LAMP_COMMAND_MUTATION_KEY,
  });
  const { data, isLoading, isFetching, error } = useQuery<Device[]>({
    queryKey: ["devices"],
    queryFn: () => devicesApi.list(),
    // Automations, Telegram en fysieke schakelaars wijzigen de lampstatus
    // buiten de app om — poll zodat de UI binnen 10s reconvergeert.
    refetchInterval: pendingLampCommands > 0 ? false : 10_000,
    refetchOnWindowFocus: pendingLampCommands === 0,
    refetchOnReconnect: pendingLampCommands === 0,
    refetchIntervalInBackground: false,
  });

  const devices = sortedCopy(data ?? [], (a, b) =>
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
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["settings-overview"],
    queryFn: () => settingsApi.overview(),
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });

  const bridge = (data?.bridge ?? null) as BridgeStatus | null;
  // De backend serialiseert het bridge-object áltijd — óók in direct-modus,
  // waar er geen bridge en dus geen offline-toestand is. Alleen waarschuwen
  // wanneer commando's daadwerkelijk via de queue lopen (queue-modus) én de
  // bridge offline is; buiten queue-modus voert de backend direct uit en is
  // een "offline"-banner een false positive.
  const queueMode = Boolean(
    (data?.integrations as { queueLightCommands?: boolean } | undefined)?.queueLightCommands
  );
  const isStatusKnown = data !== undefined && !isError;
  const isOffline =
    isStatusKnown && queueMode && bridge !== null && bridge.online === false;
  return {
    bridge,
    bridgeOffline: isOffline,
    isOffline,
    isLoading,
    isError,
    isStatusKnown,
    error,
  };
}

// ─── Lamp Command (via Go API → WiZ UDP or PostgreSQL queue) ─────────────────

export interface LampCommandInput {
  id: string;
  cmd: DeviceCommand;
  /**
   * Batch-modus: onderdruk de per-command toast — de batch-caller (sendBatch)
   * meldt fouten gebundeld.
   */
  batch?: boolean;
  /**
   * Slider/picker updates with the same key may be coalesced while waiting.
   * Omit this for power, scene and mode commands: those are ordering barriers.
   */
  continuousKey?: "brightness" | "color-temperature" | "color";
}

interface LampCommandVars extends LampCommandInput {
  reservation: LampCommandReservation;
  deadlineAt: number;
}

interface LampCommandContext {
  operationToken?: number;
}

const commandJournals = new WeakMap<QueryClient, LampCommandJournal>();
const commandTransports = new WeakMap<QueryClient, LampCommandTransport>();
const invalidationTimers = new WeakMap<QueryClient, ReturnType<typeof setTimeout>>();
const LAMP_COMMAND_TIMEOUT_MS = 15_000;

function getCommandJournal(queryClient: QueryClient) {
  const existing = commandJournals.get(queryClient);
  if (existing) return existing;

  const journal = new LampCommandJournal();
  commandJournals.set(queryClient, journal);
  return journal;
}

function getCommandTransport(queryClient: QueryClient) {
  const existing = commandTransports.get(queryClient);
  if (existing) return existing;

  const transport = new LampCommandTransport();
  commandTransports.set(queryClient, transport);
  return transport;
}

function scheduleDeviceInvalidation(queryClient: QueryClient) {
  const existing = invalidationTimers.get(queryClient);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    invalidationTimers.delete(queryClient);
    // React Query removes a mutation from the active count immediately after
    // onSettled. If another command remains, its own onSettled schedules the
    // single eventual reconciliation read.
    if (queryClient.isMutating({ mutationKey: LAMP_COMMAND_MUTATION_KEY }) > 0) return;
    void queryClient.invalidateQueries({ queryKey: ["devices"] });
  }, 0);
  invalidationTimers.set(queryClient, timer);
}

function reserveCommand(transport: LampCommandTransport, input: LampCommandInput): LampCommandVars {
  // Start de deadline bij de gebruikersinteractie, dus vóór optimistic
  // preflight en eventuele wachttijd achter een eerder commando.
  const deadlineAt = Date.now() + LAMP_COMMAND_TIMEOUT_MS;
  const options = input.continuousKey
    ? { kind: "continuous" as const, coalesceKey: input.continuousKey }
    : { kind: "barrier" as const };
  return { ...input, deadlineAt, reservation: transport.reserve(input.id, options) };
}

export interface LampBatchResult {
  total: number;
  succeeded: number;
  failed: Device[];
}

/**
 * Shared lamp mutation hook. Supplying a device id scopes `isPending` to that
 * lamp; without an id it reflects every in-flight lighting command.
 */
export function useLampCommand(deviceId?: string) {
  const queryClient = useQueryClient();
  const { error: toastError } = useToast();
  const pendingCommands = useIsMutating({
    mutationKey: LAMP_COMMAND_MUTATION_KEY,
    predicate: deviceId
      ? (candidate) =>
          (candidate.state.variables as LampCommandVars | undefined)?.id === deviceId
      : undefined,
  });
  const journal = getCommandJournal(queryClient);
  const transport = getCommandTransport(queryClient);
  const hasPendingCommands = useCallback(
    () =>
      queryClient.isMutating({
        mutationKey: LAMP_COMMAND_MUTATION_KEY,
        predicate: deviceId
          ? (candidate) =>
              (candidate.state.variables as LampCommandVars | undefined)?.id === deviceId
          : undefined,
      }) > 0,
    [deviceId, queryClient],
  );

  const projectOutcome = (
    vars: LampCommandVars,
    context: LampCommandContext | undefined,
    outcome: "succeeded" | "failed",
  ) => {
    if (context?.operationToken === undefined) return;
    const projectedDevice = journal.settle(vars.id, context.operationToken, outcome);
    if (!projectedDevice) return;
    queryClient.setQueryData<Device[]>(["devices"], (devices) =>
      replaceDeviceInCollection(devices, projectedDevice),
    );
  };

  const mutation = useMutation<void, Error, LampCommandVars, LampCommandContext>({
    mutationKey: LAMP_COMMAND_MUTATION_KEY,
    // Lampbediening is een lokale fysieke intentie. Ook zonder browsernetwerk
    // moet mutationFn starten, zodat offline commando's begrensd terugrollen in
    // plaats van door React Query onbeperkt als paused te blijven hangen.
    networkMode: "always",
    mutationFn: ({ id, cmd, reservation, deadlineAt }) =>
      runWithAbortTimeout(
        (signal) =>
          transport.execute(
            reservation,
            () => devicesApi.command(id, cmd, signal),
            signal,
          ),
        Math.max(0, deadlineAt - Date.now()),
        LAMP_COMMAND_TIMEOUT_MS,
      ),
    onMutate: async ({ id, cmd }) => {
      // Register synchronously before awaiting query cancellation. Concurrent
      // hook instances therefore retain the user's command order per device.
      const cachedDevices = queryClient.getQueryData<Device[]>(["devices"]);
      const currentDevice = cachedDevices?.find((device) => device.id === id);
      const started = currentDevice ? journal.begin(currentDevice, cmd) : null;

      await queryClient.cancelQueries({ queryKey: ["devices"] });

      if (started) {
        const projectedDevice = journal.getProjectedDevice(id) ?? started.projectedDevice;
        queryClient.setQueryData<Device[]>(["devices"], (devices) =>
          replaceDeviceInCollection(devices, projectedDevice),
        );
      }

      return { operationToken: started?.token };
    },
    onSuccess: (_data, vars, context) => {
      projectOutcome(vars, context, "succeeded");
    },
    onError: (error, vars, context) => {
      const superseded = isLampCommandSupersededError(error);
      // Verwijder uitsluitend deze operatie uit het per-device journal. Andere
      // lampen en eerdere/latere succesvolle deelupdates blijven behouden.
      projectOutcome(vars, context, "failed");
      if (superseded || vars.batch) return;
      // Een fysieke bediening mag nooit stil mislukken. De gerichte rollback is
      // direct; de 10s-poll reconvergeert zonder andere commands te overschrijven.
      toastError("Lamp-commando mislukt — controleer of de lamp bereikbaar is");
    },
    onSettled: () => {
      // A 204 is emitted after the backend state write. Reconcile exactly once
      // when the final command settles; polling/focus reads stay paused before it.
      scheduleDeviceInvalidation(queryClient);
    },
  });

  const { mutate: execute, mutateAsync: executeAsync } = mutation;
  const mutate = useCallback(
    (input: LampCommandInput) => execute(reserveCommand(transport, input)),
    [execute, transport],
  );
  const mutateAsync = useCallback(
    (input: LampCommandInput) => executeAsync(reserveCommand(transport, input)),
    [executeAsync, transport],
  );
  const subscribeToBarriers = useCallback(
    (listener: () => void) =>
      deviceId ? transport.subscribeToBarriers(deviceId, listener) : () => undefined,
    [deviceId, transport],
  );

  /**
   * Stuur één command naar unieke lampen parallel (alles aan/uit, scènes).
   * Het resultaat is awaitable; partial failures worden één keer gebundeld.
   */
  const sendBatch = useCallback(
    async (targets: readonly Device[], cmd: DeviceCommand): Promise<LampBatchResult> => {
      const uniqueTargets = uniqueDevicesById(targets);
      if (uniqueTargets.length === 0) return { total: 0, succeeded: 0, failed: [] };

      const results = await Promise.allSettled(
        uniqueTargets.map((device) =>
          mutateAsync({ id: device.id, cmd, batch: true }),
        ),
      );
      // Bij fouten verwijdert het journal alleen de betreffende operatie.
      const failed = uniqueTargets.filter(
        (_, index) => results[index].status === "rejected",
      );
      if (failed.length > 0) {
        const failedNames = failed.map((device) => device.name);
        const shown = failedNames.slice(0, 3).join(", ");
        const rest = failedNames.length - 3;
        toastError(
          `${failedNames.length} van ${uniqueTargets.length} lampen reageerde niet: ${shown}${rest > 0 ? ` en ${rest} meer` : ""}`,
        );
      }

      return {
        total: uniqueTargets.length,
        succeeded: uniqueTargets.length - failed.length,
        failed,
      };
    },
    [mutateAsync, toastError],
  );

  return {
    mutate,
    mutateAsync,
    subscribeToBarriers,
    hasPendingCommands,
    sendBatch,
    isPending: pendingCommands > 0,
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
