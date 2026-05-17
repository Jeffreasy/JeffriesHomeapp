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
const BRIDGE_SECRET = process.env.TELEGRAM_BRIDGE_SECRET;
const POLL_TIMEOUT_SECONDS = Number(process.env.TELEGRAM_POLL_TIMEOUT_SECONDS ?? 25);
const OFFSET_FILE = ".telegram-offset.json";

if (!CONVEX_URL) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL ontbreekt in .env.local");
}
if (!BRIDGE_SECRET) {
  throw new Error("TELEGRAM_BRIDGE_SECRET ontbreekt in .env.local");
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
  let disableWebhook = true;
  let botToken = null;

  console.log("Telegram poller gestart");
  console.log(`Convex: ${CONVEX_URL}`);
  console.log(`Offset: ${offset ?? "nieuw"}\n`);

  while (true) {
    try {
      // 1. Haal de token veilig op via Convex als we die nog niet hebben
      if (!botToken) {
        console.log("Haal Telegram Bot Token op via Convex...");
        const res = await convex.action(api.telegram.bot.getBotToken, {
          bridgeSecret: BRIDGE_SECRET,
        });
        if (res.ok && res.token) {
          botToken = res.token;
          console.log("Token ontvangen. Start lokale polling.");
        } else {
          throw new Error("Kon bot token niet ophalen");
        }
      }

      const tgBase = `https://api.telegram.org/bot${botToken}/`;

      // 2. Schakel webhook uit als we lokaal gaan pollen
      if (disableWebhook) {
        await fetch(tgBase + "deleteWebhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ drop_pending_updates: false })
        });
        disableWebhook = false;
      }

      // 3. Poll lokaal naar de Telegram API
      const tgRes = await fetch(tgBase + "getUpdates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          offset, 
          timeout: POLL_TIMEOUT_SECONDS, 
          allowed_updates: ["message"] 
        })
      });

      const tgData = await tgRes.json();
      if (!tgData.ok) {
        throw new Error(`Telegram API fout: ${JSON.stringify(tgData)}`);
      }

      const updates = tgData.result;
      let processed = 0;

      // 4. Stuur updates één voor één naar Convex voor afhandeling
      for (const update of updates) {
        await convex.action(api.telegram.bot.handleUpdatePublic, {
          bridgeSecret: BRIDGE_SECRET,
          update
        });
        
        processed += 1;
        if (typeof update.update_id === "number") {
          offset = update.update_id + 1;
          saveOffset(offset);
        }
      }

      if (processed > 0) {
        console.log(`${processed} update(s) verwerkt, offset ${offset}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Poll fout: ${message}`);
      // Als de fout een Convex authenticatiefout is (of iets mis is met de token), probeer opnieuw op te halen
      if (message.includes("token")) {
        botToken = null;
        console.error("Wacht 30 seconden voor we opnieuw een token proberen op te halen...");
        await new Promise((resolve) => setTimeout(resolve, 30000));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }
}

pollLoop();
