"use client";

import { useCallback, useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { automationsApi, type AutomationRow } from "@/lib/api";
import {
  type Automation,
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

  const [docs, setDocs] = useState<AutomationRow[]>([]);
  const automations: Automation[] = docs.map(fromRow);

  const fetchAutomations = useCallback(async () => {
    if (!userId) return;
    try {
      const result = await automationsApi.list(userId);
      setDocs(result);
    } catch {
      setDocs([]);
    }
  }, [userId]);

  useEffect(() => { fetchAutomations(); }, [fetchAutomations]);

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
    async (shiftType: ShiftType) => {
      if (!userId) return 0;
      const groupTag = `dienst-wekker-${shiftType.toLowerCase()}`;
      await automationsApi.deleteByGroup(userId, groupTag);
      const pack = createDienstWekkerPack(shiftType);
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
      fetchAutomations();
      return pack.length;
    },
    [userId, fetchAutomations]
  );

  return { automations, add, addDienstWekkerPack, toggle, remove, lastCheck: null };
}
