#!/usr/bin/env node

/**
 * Lokale Telegram bridge.
 *
 * Vraagt Convex om Telegram long polling te doen. Dit is bedoeld voor lokaal
 * gebruik, waar Telegram geen localhost webhook kan bereiken zonder tunnel.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

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
  } catch {
    // .env.local is optional; required vars are checked below.
  }
}

loadEnv();

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const POLL_TIMEOUT_SECONDS = Number(process.env.TELEGRAM_POLL_TIMEOUT_SECONDS ?? 25);
const OFFSET_FILE = ".telegram-offset.json";

if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL ontbreekt in .env.local");
}

const convex = new ConvexHttpClient(CONVEX_URL);

function loadOffset() {
  if (!existsSync(OFFSET_FILE)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(OFFSET_FILE, "utf-8"));
    return typeof parsed.offset === "number" ? parsed.offset : undefined;
  } catch {
    return undefined;
  }
}

function saveOffset(offset) {
  writeFileSync(OFFSET_FILE, JSON.stringify({ offset }, null, 2));
}

async function pollLoop() {
  let offset = loadOffset();
  console.log("Telegram poller gestart");
  console.log(`Convex: ${CONVEX_URL}`);
  console.log(`Offset: ${offset ?? "nieuw"}\n`);

  while (true) {
    try {
      const result = await convex.action(api.telegram.bot.pollUpdates, {
        offset,
        timeoutSeconds: POLL_TIMEOUT_SECONDS,
      });

      if (typeof result.nextOffset === "number") {
        offset = result.nextOffset;
        saveOffset(offset);
      }

      if (result.count > 0) {
        console.log(`${result.count} update(s) verwerkt, offset ${offset}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Poll fout: ${message}`);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

pollLoop();
