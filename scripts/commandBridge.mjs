#!/usr/bin/env node

/**
 * scripts/commandBridge.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Lokale bridge: pollt Convex deviceCommands → voert uit via lokale WiZ API.
 * Gebruik:  node scripts/commandBridge.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync } from "fs";
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import WebSocket from "ws";

Object.assign(global, { WebSocket });

// ─── Load .env.local ─────────────────────────────────────────────────────────

function loadEnv() {
  try {
    const content = readFileSync(".env.local", "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  } catch { /* no .env.local */ }
}
loadEnv();

// ─── Config ──────────────────────────────────────────────────────────────────

const CONVEX_URL    = process.env.NEXT_PUBLIC_CONVEX_URL
  || "https://adorable-mink-458.eu-west-1.convex.cloud";
const API_BASE      = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const API_KEY       = process.env.NEXT_PUBLIC_API_KEY || "";
const BRIDGE_SECRET = process.env.TELEGRAM_BRIDGE_SECRET || "";

if (!BRIDGE_SECRET) {
  throw new Error("TELEGRAM_BRIDGE_SECRET ontbreekt in .env.local");
}

const convex = new ConvexClient(CONVEX_URL);
let isExecuting = false;
const bridgeId = process.env.HOMEAPP_BRIDGE_ID || "default";
const bridgeVersion = "1.2.0 (WebSocket)";
const stats = {
  commandsSeen: 0,
  commandsDone: 0,
  commandsFailed: 0,
  lastSuccessAt: undefined,
  lastErrorAt: undefined,
  lastError: undefined,
};

async function heartbeat(status = "online") {
  try {
    await convex.mutation(api.bridgeHealth.heartbeat, {
      bridgeSecret: BRIDGE_SECRET,
      bridgeId,
      status,
      apiBase: API_BASE,
      version: bridgeVersion,
      lastSuccessAt: stats.lastSuccessAt,
      lastErrorAt: stats.lastErrorAt,
      lastError: stats.lastError,
      commandsSeen: stats.commandsSeen,
      commandsDone: stats.commandsDone,
      commandsFailed: stats.commandsFailed,
    });
  } catch (err) {
    console.error(`⚠️ Heartbeat mislukt: ${err.message}`);
  }
}

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

// ─── WebSocket Subscription ──────────────────────────────────────────────────

function startSubscription() {
  convex.onUpdate(
    api.deviceCommands.listPending,
    { bridgeSecret: BRIDGE_SECRET },
    async (pending) => {
      if (!pending || pending.length === 0) return;
      if (isExecuting) return; 

      isExecuting = true;
      try {
        console.log(`⚡ ${pending.length} pending command(s) via WebSocket`);
        stats.commandsSeen += pending.length;
        const devices = await getDevices().catch(() => []);

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

            await convex.mutation(api.deviceCommands.markDone, {
              id: cmd._id, status: "done", bridgeSecret: BRIDGE_SECRET,
            });
            stats.commandsDone += 1;
            stats.lastSuccessAt = new Date().toISOString();
            stats.lastError = undefined;
          } catch (err) {
            console.error(`  ❌ ${err.message}`);
            await convex.mutation(api.deviceCommands.markDone, {
              id: cmd._id, status: "failed", error: err.message, bridgeSecret: BRIDGE_SECRET,
            });
            stats.commandsFailed += 1;
            stats.lastErrorAt = new Date().toISOString();
            stats.lastError = err.message;
          }
        }
        await heartbeat(stats.lastError ? "warning" : "online");
      } catch (err) {
        console.error(`⚠️ ${err.message}`);
        stats.lastErrorAt = new Date().toISOString();
        stats.lastError = err.message;
        await heartbeat("error");
      } finally {
        isExecuting = false;
      }
    },
    (err) => {
      console.error("❌ WebSocket Subscription Error:", err.message);
    }
  );
}

console.log("🌉 Command Bridge gestart (WebSocket Modus)");
console.log(`   Convex: ${CONVEX_URL}`);
console.log(`   WiZ API: ${API_BASE}`);
console.log(`   API Key: ${API_KEY ? "✅ geladen" : "❌ ONTBREEKT"}`);
console.log(`   Bridge Secret: ${BRIDGE_SECRET ? "✅ geladen" : "❌ ONTBREEKT"}`);
console.log(`   Bridge ID: ${bridgeId}\n`);

setInterval(() => heartbeat(stats.lastError ? "warning" : "online"), 300_000); // 5 min heartbeat ipv 1 min
heartbeat("online");
startSubscription();
