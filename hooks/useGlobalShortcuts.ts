"use client";

import { useEffect } from "react";
import { type Device } from "@/lib/api";
import { type DeviceCommand } from "@/lib/api";

interface ShortcutOptions {
  devices: Device[];
  allOn: boolean;
  sendCommand: (args: { id: string; cmd: DeviceCommand }) => void;
}

/**
 * useGlobalShortcuts — registreert globale keyboard shortcuts voor het Dashboard.
 *
 * Shortcuts:
 *   - Spatiebalk → toggle alle lampen aan/uit
 */
export function useGlobalShortcuts({ devices, allOn, sendCommand }: ShortcutOptions) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Skip als gebruiker in een invoerveld typt
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.code === "Space") {
        e.preventDefault();
        devices.forEach((d) => sendCommand({ id: d.id, cmd: { on: !allOn } }));
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [devices, allOn, sendCommand]);
}
