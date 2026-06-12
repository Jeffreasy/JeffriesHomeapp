"use client";

import { useCallback, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
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

  const {
    data: docs = [],
    refetch,
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
      await automationsApi.toggle(id);
      fetchAutomations();
    },
    [fetchAutomations]
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
      await automationsApi.deleteByGroup(userId, groupTag);
      const pack = createDienstWekkerPack(shiftType, times);
      await Promise.all(
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
      await fetchAutomations();
      return pack.length;
    },
    [userId, fetchAutomations]
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

  return { automations, add, update, addDienstWekkerPack, removeDienstWekkerPack, toggle, remove, lastCheck: null };
}
