#!/usr/bin/env node

/**
 * scripts/commandBridge.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lokale bridge: pollt Convex deviceCommands → voert uit via lokale WiZ API.
 *
 * Gebruik:  node scripts/commandBridge.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// ─── Config ──────────────────────────────────────────────────────────────────

const CONVEX_URL    = process.env.NEXT_PUBLIC_CONVEX_URL
  || "https://adorable-mink-458.eu-west-1.convex.cloud";
const API_BASE      = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const API_KEY       = process.env.NEXT_PUBLIC_API_KEY || "";
const POLL_INTERVAL = 2000;

const convex = new ConvexHttpClient(CONVEX_URL);

// ─── Local WiZ API helpers ───────────────────────────────────────────────────

async function apiFetch(path, init = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

async function getDevices() {
  return apiFetch("/devices");
}

async function sendCommand(deviceId, command) {
  const wizCmd = {};
  if (command.on !== undefined)               wizCmd.on = command.on;
  if (command.brightness !== undefined)       wizCmd.brightness = command.brightness;
  if (command.r !== undefined)                wizCmd.r = command.r;
  if (command.g !== undefined)                wizCmd.g = command.g;
  if (command.b !== undefined)                wizCmd.b = command.b;
  if (command.color_temp_mireds !== undefined) wizCmd.color_temp_mireds = command.color_temp_mireds;
  if (command.scene_id !== undefined)         wizCmd.scene_id = command.scene_id;

  return apiFetch(`/devices/${deviceId}/command`, {
    method: "POST",
    body: JSON.stringify(wizCmd),
  });
}

// ─── Main Loop ───────────────────────────────────────────────────────────────

async function pollAndExecute() {
  try {
    const pending = await convex.query(api.deviceCommands.listPending);
    if (!pending || pending.length === 0) return;

    console.log(`⚡ ${pending.length} pending command(s)`);
    const devices = await getDevices();

    for (const cmd of pending) {
      try {
        if (cmd.deviceId) {
          await sendCommand(cmd.deviceId, cmd.command);
          console.log(`  ✅ ${cmd.deviceId} → ${JSON.stringify(cmd.command)}`);
        } else {
          for (const device of devices) {
            await sendCommand(device.id, cmd.command);
          }
          console.log(`  ✅ ALL (${devices.length}) → ${JSON.stringify(cmd.command)}`);
        }

        await convex.mutation(api.deviceCommands.markDone, { id: cmd._id, status: "done" });
      } catch (err) {
        console.error(`  ❌ ${err.message}`);
        await convex.mutation(api.deviceCommands.markDone, {
          id: cmd._id, status: "failed", error: err.message,
        });
      }
    }
  } catch (err) {
    if (err.message && !err.message.includes("pending")) {
      console.error(`⚠️ ${err.message}`);
    }
  }
}

console.log("🌉 Command Bridge gestart");
console.log(`   Convex: ${CONVEX_URL}`);
console.log(`   WiZ API: ${API_BASE}`);
console.log(`   Poll interval: ${POLL_INTERVAL}ms\n`);

setInterval(pollAndExecute, POLL_INTERVAL);
pollAndExecute();
