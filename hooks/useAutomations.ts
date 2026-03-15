"use client";

import { useCallback, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import {
  type Automation,
  type ShiftType,
  createDienstWekkerPack,
  shouldFire,
  actionToCommand,
} from "@/lib/automations";
import { devicesApi } from "@/lib/api";

// ─── Map Convex doc → Automation type ────────────────────────────────────────

function fromDoc(doc: any): Automation {
  return {
    id:          doc._id,
    name:        doc.name,
    enabled:     doc.enabled,
    createdAt:   doc.createdAt,
    lastFiredAt: doc.lastFiredAt,
    group:       doc.group,
    trigger:     doc.trigger,
    action:      doc.action,
  };
}

// ─── useAutomations ───────────────────────────────────────────────────────────

export function useAutomations() {
  const { user } = useUser();
  const userId = user?.id ?? "";

  // ── Convex queries ────────────────────────────────────────────────────────
  const docs = useQuery(api.automations.list, userId ? { userId } : "skip");
  const automations: Automation[] = (docs ?? []).map(fromDoc);
  const lastCheck = null; // shown in UI, will be updated by engine state

  // ── Convex mutations ──────────────────────────────────────────────────────
  const createMutation  = useMutation(api.automations.create);
  const toggleMutation  = useMutation(api.automations.toggle);
  const removeMutation  = useMutation(api.automations.remove);
  const markFiredMutation = useMutation(api.automations.markFired);
  const removeByGroupMutation = useMutation(api.automations.removeByGroup);

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const add = useCallback(
    async (data: Omit<Automation, "id" | "createdAt" | "lastFiredAt">) => {
      if (!userId) return;
      await createMutation({
        userId,
        name:      data.name,
        enabled:   data.enabled,
        createdAt: new Date().toISOString(),
        group:     data.group,
        trigger:   data.trigger,
        action:    data.action,
      });
    },
    [userId, createMutation]
  );

  const toggle = useCallback(
    async (id: string) => {
      await toggleMutation({ id: id as Id<"automations"> });
    },
    [toggleMutation]
  );

  const remove = useCallback(
    async (id: string) => {
      await removeMutation({ id: id as Id<"automations"> });
    },
    [removeMutation]
  );

  const addDienstWekkerPack = useCallback(
    async (shiftType: ShiftType) => {
      if (!userId) return 0;
      const groupTag = `dienst-wekker-${shiftType.toLowerCase()}`;
      // Remove existing pack first
      await removeByGroupMutation({ userId, group: groupTag });
      // Create new pack
      const pack = createDienstWekkerPack(shiftType);
      await Promise.all(
        pack.map((a) =>
          createMutation({
            userId,
            name:      a.name,
            enabled:   a.enabled,
            createdAt: a.createdAt,
            group:     a.group,
            trigger:   a.trigger,
            action:    a.action,
          })
        )
      );
      return pack.length;
    },
    [userId, createMutation, removeByGroupMutation]
  );

  // ── Engine: check every 15s ───────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    let deviceCache: any[] = [];

    const tick = async () => {
      if (!docs) return;
      const current = docs.map(fromDoc);

      for (const auto of current) {
        if (!shouldFire(auto)) continue;

        if (deviceCache.length === 0) {
          try { deviceCache = await devicesApi.list(); } catch { continue; }
        }

        const targets = auto.action.deviceIds?.length
          ? deviceCache.filter((d) => auto.action.deviceIds!.includes(d.id))
          : deviceCache;

        const cmd = actionToCommand(auto.action);
        await Promise.allSettled(targets.map((d) => devicesApi.command(d.id, cmd)));

        // Mark as fired in Convex
        await markFiredMutation({
          id: auto.id as Id<"automations">,
          firedAt: new Date().toISOString(),
        });

        console.log(`[Automation] Fired: "${auto.name}"`);
      }
    };

    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [userId, docs, markFiredMutation]);

  return { automations, add, addDienstWekkerPack, toggle, remove, lastCheck };
}
