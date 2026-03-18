"use client";

import { useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { type Id } from "@/convex/_generated/dataModel";
import {
  type Automation,
  type ShiftType,
  createDienstWekkerPack,
} from "@/lib/automations";

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

  // ── Convex mutations ──────────────────────────────────────────────────────
  const createMutation        = useMutation(api.automations.create);
  const toggleMutation        = useMutation(api.automations.toggle);
  const removeMutation        = useMutation(api.automations.remove);
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

  // NOTE: Automations worden uitgevoerd door de Python backend engine (24/7 Docker).
  // De browser is NOOIT verantwoordelijk voor het vuren van automations.

  return { automations, add, addDienstWekkerPack, toggle, remove };
}
