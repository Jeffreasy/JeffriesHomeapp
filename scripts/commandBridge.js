#!/usr/bin/env node

/**
 * scripts/commandBridge.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Lokale bridge: pollt Convex deviceCommands → voert uit via lokale WiZ API.
 *
 * Gebruik:
 *   node scripts/commandBridge.js
 *
 * Vereist:
 *   - Lokale API draait op http://localhost:8000
 *   - CONVEX_URL is beschikbaar (uit .env.local)
 *
 * Dit script:
 *   1. Pollt elke 2 sec op pending commands
 *   2. Haalt device IDs op als target = ALL
 *   3. Stuurt commando naar lokale WiZ API
 *   4. Markeert als done/failed in Convex
 * ─────────────────────────────────────────────────────────────────────────────
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const API_KEY  = process.env.NEXT_PUBLIC_API_KEY || "";
const POLL_INTERVAL = 2000; // 2 seconden

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
  // Converteer onze command shape naar WiZ API shape
  const wizCmd = {};
  if (command.on !== undefined)        wizCmd.on = command.on;
  if (command.brightness !== undefined) wizCmd.brightness = command.brightness;
  if (command.r !== undefined)         wizCmd.r = command.r;
  if (command.g !== undefined)         wizCmd.g = command.g;
  if (command.b !== undefined)         wizCmd.b = command.b;
  if (command.color_temp_mireds !== undefined) wizCmd.color_temp_mireds = command.color_temp_mireds;
  if (command.scene_id !== undefined)  wizCmd.scene_id = command.scene_id;

  return apiFetch(`/devices/${deviceId}/command`, {
    method: "POST",
    body: JSON.stringify(wizCmd),
  });
}

// ─── Convex SDK-free polling via HTTP ─────────────────────────────────────────

async function convexQuery(functionName, args = {}) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL niet ingesteld");

  // Convex HTTP API endpoint
  const apiUrl = url.replace(".cloud", ".site").replace("convex.cloud", "convex.site");
  // We use the Convex JS client approach instead
  const { ConvexHttpClient } = await import("convex/browser");
  const client = new ConvexHttpClient(url);
  return client.query(functionName, args);
}

async function convexMutation(functionName, args = {}) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL niet ingesteld");
  const { ConvexHttpClient } = await import("convex/browser");
  const client = new ConvexHttpClient(url);
  return client.mutation(functionName, args);
}

// ─── Main Loop ───────────────────────────────────────────────────────────────

async function pollAndExecute() {
  try {
    const { api } = await import("../convex/_generated/api.js");

    const pending = await convexQuery(api.deviceCommands.listPending);
    if (!pending || pending.length === 0) return;

    console.log(`⚡ ${pending.length} pending command(s) gevonden`);

    const devices = await getDevices();

    for (const cmd of pending) {
      try {
        if (cmd.deviceId) {
          // Specifiek device
          await sendCommand(cmd.deviceId, cmd.command);
          console.log(`  ✅ ${cmd.deviceId} → ${JSON.stringify(cmd.command)}`);
        } else {
          // ALLE devices
          for (const device of devices) {
            await sendCommand(device.id, cmd.command);
          }
          console.log(`  ✅ ALL (${devices.length}) → ${JSON.stringify(cmd.command)}`);
        }

        await convexMutation(api.deviceCommands.markDone, {
          id: cmd._id,
          status: "done",
        });
      } catch (err) {
        console.error(`  ❌ Fout: ${err.message}`);
        await convexMutation(api.deviceCommands.markDone, {
          id: cmd._id,
          status: "failed",
          error: err.message,
        });
      }
    }
  } catch (err) {
    // Stil falen bij poll errors
    if (!err.message?.includes("geen pending")) {
      console.error(`⚠️ Poll error: ${err.message}`);
    }
  }
}

console.log("🌉 Command Bridge gestart — pollt elke 2s op device commands...");
console.log(`   API: ${API_BASE}`);

setInterval(pollAndExecute, POLL_INTERVAL);
// Start ook direct
pollAndExecute();
