"use client";

import { useEffect } from "react";
import { type Device } from "@/lib/api";
import { type DeviceCommand } from "@/lib/api";

interface ShortcutOptions {
  devices: Device[];
  allOn: boolean;
  /** Batch-sender uit useLampCommand — één invalidate i.p.v. N refetches. */
  sendBatch: (targets: Device[], cmd: DeviceCommand) => void;
}

/**
 * useGlobalShortcuts — registreert globale keyboard shortcuts voor het Dashboard.
 *
 * Shortcuts:
 *   - Spatiebalk → toggle alle lampen aan/uit
 */
export function useGlobalShortcuts({ devices, allOn, sendBatch }: ShortcutOptions) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;

      // Skip als gebruiker in een invoerveld typt of een knop/link gefocust
      // heeft: spatie moet dan het element activeren, niet alle lampen flippen.
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return;
      if (target?.isContentEditable) return;
      // Skip zolang er een dialog/sheet open staat (detailpaneel, confirm,
      // form) — zelfde brede selector als FocusModeControl.
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"]')) return;

      if (e.code === "Space") {
        e.preventDefault();
        sendBatch(devices, { on: !allOn });
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [devices, allOn, sendBatch]);
}
