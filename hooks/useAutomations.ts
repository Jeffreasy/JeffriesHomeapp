"use client";

import { useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { automationsApi, type AutomationRow } from "@/lib/api";
import {
  type Automation,
  type DienstWekkerTimes,
  type ShiftType,
  createDienstWekkerPack,
} from "@/lib/automations";

// ─── Map PG row → Automation type ────────────────────────────────────────────

function fromRow(row: AutomationRow): Automation {
  return {
    id:          row.id,
    name:        row.name,
    enabled:     row.enabled,
    createdAt:   row.created_at,
    lastFiredAt: row.last_fired_at ?? undefined,
    group:       row.group_name ?? undefined,
    trigger:     row.trigger_config as unknown as Automation["trigger"],
    action:      row.action_config as unknown as Automation["action"],
  };
}

// ─── useAutomations ───────────────────────────────────────────────────────────

export function useAutomations() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();

  const {
    data: docs = [],
    refetch,
    isError,
    isFetching,
  } = useQuery({
    queryKey: ["automations", userId],
    queryFn: () => automationsApi.list(userId),
    enabled: !!userId,
    initialData: [] as AutomationRow[],
  });

  const automations = useMemo<Automation[]>(() => docs.map(fromRow), [docs]);

  const fetchAutomations = useCallback(async () => {
    if (!userId) return;
    await refetch();
  }, [userId, refetch]);

  const add = useCallback(
    async (data: Omit<Automation, "id" | "createdAt" | "lastFiredAt">) => {
      if (!userId) return;
      await automationsApi.create(userId, {
        name:           data.name,
        enabled:        data.enabled,
        created_at:     new Date().toISOString(),
        group_name:     data.group ?? null,
        trigger_config: data.trigger as unknown as Record<string, unknown>,
        action_config:  data.action as unknown as Record<string, unknown>,
      });
      fetchAutomations();
    },
    [userId, fetchAutomations]
  );

  const update = useCallback(
    async (id: string, data: Partial<Automation>) => {
      await automationsApi.update(id, {
        name:           data.name,
        enabled:        data.enabled,
        group_name:     data.group ?? null,
        trigger_config: data.trigger as unknown as Record<string, unknown>,
        action_config:  data.action as unknown as Record<string, unknown>,
      });
      fetchAutomations();
    },
    [fetchAutomations]
  );

  const toggle = useCallback(
    async (id: string) => {
      // Optimistic: flip `enabled` direct in de cache, rollback bij fout.
      const key = ["automations", userId];
      const previous = queryClient.getQueryData<AutomationRow[]>(key);
      queryClient.setQueryData<AutomationRow[]>(key, (old) =>
        old?.map((row) => (row.id === id ? { ...row, enabled: !row.enabled } : row))
      );
      try {
        await automationsApi.toggle(id);
      } catch (err) {
        if (previous) queryClient.setQueryData(key, previous);
        throw err;
      }
      fetchAutomations();
    },
    [userId, queryClient, fetchAutomations]
  );

  const remove = useCallback(
    async (id: string) => {
      await automationsApi.delete(id);
      fetchAutomations();
    },
    [fetchAutomations]
  );

  const addDienstWekkerPack = useCallback(
    async (shiftType: ShiftType, times?: Partial<DienstWekkerTimes>) => {
      if (!userId) return 0;
      const groupTag = `dienst-wekker-${shiftType.toLowerCase()}`;
      // Create-before-delete: bouw eerst het nieuwe pack op, en verwijder de
      // oude stappen pas als álles gelukt is (per id, zodat de nieuwe entries
      // de group-delete overleven). Faalt een create, dan ruimen we de
      // zojuist aangemaakte entries op en blijft de oude wekker intact —
      // nooit een half-geïnstalleerd alarm.
      const oldIds = docs
        .filter((row) => row.group_name === groupTag)
        .map((row) => row.id);
      const pack = createDienstWekkerPack(shiftType, times);
      // allSettled (not all): attempt every create even if one fails, so we
      // know exactly which entries exist and can roll them back.
      const results = await Promise.allSettled(
        pack.map((a) =>
          automationsApi.create(userId, {
            name:           a.name,
            enabled:        a.enabled,
            created_at:     a.createdAt,
            group_name:     a.group ?? null,
            trigger_config: a.trigger as unknown as Record<string, unknown>,
            action_config:  a.action as unknown as Record<string, unknown>,
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        // Rollback: verwijder de deels aangemaakte nieuwe entries.
        const createdIds = results
          .filter((r): r is PromiseFulfilledResult<AutomationRow> => r.status === "fulfilled")
          .map((r) => r.value.id);
        const cleanup = await Promise.allSettled(createdIds.map((id) => automationsApi.delete(id)));
        await fetchAutomations();
        // L8: alleen "intact gebleven" beloven als de rollback ook écht slaagde —
        // anders staan er losse nieuwe stappen naast het oude profiel.
        const cleanupFailed = cleanup.filter((r) => r.status === "rejected").length;
        throw new Error(
          cleanupFailed > 0
            ? `${failed} van ${pack.length} wekker-onderdelen konden niet worden opgeslagen en het terugdraaien lukte ook niet volledig — controleer je wekkers, er kunnen dubbele stappen staan`
            : `${failed} van ${pack.length} wekker-onderdelen konden niet worden opgeslagen — je oude wekkerprofiel is intact gebleven`
        );
      }
      // Alles aangemaakt — nu pas de oude stappen verwijderen.
      const deleteResults = await Promise.allSettled(oldIds.map((id) => automationsApi.delete(id)));
      await fetchAutomations();
      const deleteFailed = deleteResults.filter((r) => r.status === "rejected").length;
      if (deleteFailed > 0) {
        throw new Error(
          `Nieuwe wekker opgeslagen, maar ${deleteFailed} oude stap(pen) konden niet worden verwijderd — controleer op dubbele wekkers`
        );
      }
      return pack.length;
    },
    [userId, docs, fetchAutomations]
  );

  const removeDienstWekkerPack = useCallback(
    async (shiftType: ShiftType) => {
      if (!userId) return;
      const groupTag = `dienst-wekker-${shiftType.toLowerCase()}`;
      await automationsApi.deleteByGroup(userId, groupTag);
      await fetchAutomations();
    },
    [userId, fetchAutomations]
  );

  // isLoading: still fetching the first time (initialData keeps isPending false,
  // so derive it from isFetching while the list is still empty).
  const isLoading = isFetching && automations.length === 0 && !isError;

  return { automations, add, update, addDienstWekkerPack, removeDienstWekkerPack, toggle, remove, isLoading, isError, refetch: fetchAutomations };
}
