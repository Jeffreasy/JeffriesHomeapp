"use node";

/**
 * convex/telegram/bot.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Telegram Bot — Text + Voice + Agent routing + Lamp control.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { action, internalAction, type ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import {
  sendMessage,
  sendTyping,
  setWebhook as tgSetWebhook,
  getMe,
  getFile,
  downloadFile,
  transcribeVoice,
  disableWebhookForPolling,
  getUpdates,
} from "./api";
import { JEFFREY_USER_ID } from "../lib/config";

const OWNER_USER_ID = JEFFREY_USER_ID;

function requireBridgeSecret(provided: string) {
  const expected = process.env.TELEGRAM_BRIDGE_SECRET;
  if (!expected) throw new Error("TELEGRAM_BRIDGE_SECRET niet geconfigureerd");
  if (provided !== expected) throw new Error("Unauthorized");
}

function getOwnerChatId(): string {
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!ownerChatId) throw new Error("TELEGRAM_OWNER_CHAT_ID niet geconfigureerd");
  return ownerChatId;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function sendPlainText(chatId: number, text: string): Promise<void> {
  await sendMessage(chatId, escapeHtml(text));
}

// ─── Commando → Agent mapping ────────────────────────────────────────────────

const COMMAND_MAP: Record<string, { agentId: string; beschrijving: string }> = {
  "/briefing":    { agentId: "dashboard",      beschrijving: "📊 Dagelijkse briefing" },
  "/lampen":      { agentId: "lampen",          beschrijving: "💡 Lamp status" },
  "/rooster":     { agentId: "rooster",         beschrijving: "📅 Weekplanning" },
  "/afspraak":    { agentId: "rooster",         beschrijving: "📌 Afspraak beheren" },
  "/agenda":      { agentId: "rooster",         beschrijving: "📌 Agenda overzicht" },
  "/finance":     { agentId: "finance",         beschrijving: "💰 Salaris & transacties" },
  "/email":       { agentId: "email",           beschrijving: "📧 Inbox overzicht" },
  "/inbox":       { agentId: "email",           beschrijving: "📊 Inbox analyse" },
  "/compose":     { agentId: "email",           beschrijving: "✍️ Email componeren" },
  "/triage":      { agentId: "email",           beschrijving: "🗂️ Inbox triage" },
  "/search":      { agentId: "email",           beschrijving: "🔍 Email zoeken" },
  "/notities":    { agentId: "notes",           beschrijving: "📝 Notities beheren" },
  "/noteer":      { agentId: "notes",           beschrijving: "📝 Snel notitie maken" },
  "/automations": { agentId: "automations",     beschrijving: "⚙️ Automations status" },
  "/habits":      { agentId: "habits",          beschrijving: "🎯 Habits overzicht" },
  "/streak":      { agentId: "habits",          beschrijving: "🔥 Streak status" },
  "/check":       { agentId: "habits",          beschrijving: "✅ Habit aftikken" },
};

// ─── Lamp Command Detection ──────────────────────────────────────────────────

interface LampCommand {
  command: { on?: boolean; brightness?: number; scene_id?: number; r?: number; g?: number; b?: number; color_temp_mireds?: number };
  beschrijving: string;
}

const SCENE_KEYWORDS: Record<string, { id: number; naam: string }> = {
  ocean: { id: 1, naam: "Ocean" }, romance: { id: 2, naam: "Romance" },
  sunset: { id: 3, naam: "Sunset" }, zonsondergang: { id: 3, naam: "Sunset" },
  party: { id: 4, naam: "Party" }, feest: { id: 4, naam: "Party" },
  fireplace: { id: 5, naam: "Fireplace" }, openhaard: { id: 5, naam: "Fireplace" },
  cozy: { id: 6, naam: "Cozy" }, gezellig: { id: 6, naam: "Cozy" },
  forest: { id: 7, naam: "Forest" }, bos: { id: 7, naam: "Forest" },
  "wake up": { id: 9, naam: "Wake Up" }, wakker: { id: 9, naam: "Wake Up" },
  bedtime: { id: 10, naam: "Bedtime" }, slaap: { id: 10, naam: "Bedtime" },
  nachtlamp: { id: 14, naam: "Night Light" }, nachtlicht: { id: 14, naam: "Night Light" },
  focus: { id: 15, naam: "Focus" }, studie: { id: 15, naam: "Focus" },
  relax: { id: 16, naam: "Relax" }, ontspan: { id: 16, naam: "Relax" },
  "tv time": { id: 18, naam: "TV Time" }, tv: { id: 18, naam: "TV Time" }, film: { id: 18, naam: "TV Time" },
  club: { id: 26, naam: "Club" }, kerst: { id: 27, naam: "Christmas" },
  christmas: { id: 27, naam: "Christmas" }, kaars: { id: 29, naam: "Candlelight" },
  kaarslicht: { id: 29, naam: "Candlelight" },
};

function detectLampCommand(text: string): LampCommand | null {
  const lower = text.toLowerCase();
  const isLampRelated = ["lamp", "lampen", "licht", "lichten", "scene", "sfeer"].some((w) => lower.includes(w));
  if (!isLampRelated) return null;

  // Vraagzinnen → NIET als commando behandelen, laat Grok het afhandelen
  const isQuestion = ["welke", "hoeveel", "staan", "status", "wat", "zijn er", "overzicht"].some((w) => lower.includes(w));
  if (isQuestion) return null;

  // Aan/uit
  for (const p of ["uit", "off", "uitzetten", "uitdoen", "doof"]) {
    if (lower.includes(p)) return { command: { on: false }, beschrijving: "Lampen uitzetten" };
  }
  for (const p of ["aan", "on", "aanzetten", "aandoen"]) {
    if (lower.includes(p) && !Object.keys(SCENE_KEYWORDS).some((s) => lower.includes(s))) {
      return { command: { on: true }, beschrijving: "Lampen aanzetten" };
    }
  }

  // Scenes
  for (const [keyword, scene] of Object.entries(SCENE_KEYWORDS)) {
    if (lower.includes(keyword)) {
      return { command: { scene_id: scene.id, on: true }, beschrijving: `Scene: ${scene.naam}` };
    }
  }

  // Helderheid
  const bm = lower.match(/(\d+)\s*%/);
  if (bm) {
    const val = Math.min(100, Math.max(1, parseInt(bm[1])));
    return { command: { brightness: val }, beschrijving: `Helderheid naar ${val}%` };
  }
  if (lower.includes("dim")) return { command: { brightness: 30 }, beschrijving: "Lampen dimmen (30%)" };
  if (lower.includes("fel") || lower.includes("helder")) return { command: { brightness: 100 }, beschrijving: "Lampen vol (100%)" };

  // Kleurtemperatuur
  if (lower.includes("warm")) return { command: { color_temp_mireds: 454, on: true }, beschrijving: "Warm wit (2200K)" };
  if (lower.includes("koud") || lower.includes("koel")) return { command: { color_temp_mireds: 154, on: true }, beschrijving: "Koel wit (6500K)" };

  return null;
}


// ─── Keyword → Agent routing ─────────────────────────────────────────────────

const KEYWORD_ROUTES: Array<{ keywords: string[]; agentId: string }> = [
  { keywords: ["lamp", "lampen", "licht", "lichten", "scene", "kleur", "wiz", "smart home"], agentId: "lampen" },
  { keywords: ["dienst", "rooster", "shift", "werk", "planning", "vrij", "weekend", "afspraak", "agenda", "morgen", "vandaag", "overmorgen", "schema"], agentId: "rooster" },
  { keywords: ["salaris", "loon", "geld", "ort", "netto", "bruto", "transactie", "saldo", "bank", "uitgaven", "betaling", "kosten", "verdien"], agentId: "finance" },
  { keywords: ["email", "mail", "inbox", "ongelezen", "bericht", "stuur", "reply", "gmail"], agentId: "email" },
  { keywords: ["notitie", "notities", "noteer", "onthoud", "schrijf op", "opschrijven", "boodschappenlijst", "checklist", "to-do", "todo", "lijstje"], agentId: "notes" },
  { keywords: ["habit", "habits", "gewoonte", "streak", "badge", "xp", "level", "gym", "meditatie", "water drinken", "checklist habit", "voltooid"], agentId: "habits" },
  { keywords: ["automation", "automations", "cron", "sync", "systeem", "status", "health"], agentId: "automations" },
];

function detectAgent(text: string): string {
  const lower = text.toLowerCase();
  let best = { agentId: "dashboard", score: 0 };
  for (const route of KEYWORD_ROUTES) {
    const score = route.keywords.filter((kw) => lower.includes(kw)).length;
    if (score > best.score) best = { agentId: route.agentId, score };
  }
  return best.agentId;
}

// ─── Messages ────────────────────────────────────────────────────────────────

function buildHelpText(): string {
  return [
    "🏠 Jeffries HomeBot\n",
    "Commando's:",
    ...Object.entries(COMMAND_MAP).map(([cmd, { beschrijving }]) => `  ${cmd} — ${beschrijving}`),
    "\n💡 Lamp bediening: 'lampen uit', 'lampen 50%', 'dim'",
    "📝 Notities: 'noteer ...', 'zoek in notities'",
    "🎙️ Spraakberichten worden automatisch herkend!",
    "💬 Of stel gewoon een vrije vraag!",
  ].join("\n");
}

function buildWelcomeText(): string {
  return [
    "👋 Welkom bij Jeffries HomeBot!\n",
    "Ik bedien je Homeapp via Grok AI.",
    "Typ of spreek — ik snap het allebei.\n",
    "💡 'Lampen uit'  📅 'Wanneer werk ik?'",
    "💰 'Salaris'  📧 'Ongelezen emails'",
    "📝 'Noteer: ...'  🔍 'Zoek in notities'\n",
    "Type /help voor alle commando's.",
  ].join("\n");
}

// ─── Text Processing (shared by text + voice) ───────────────────────────────

type TelegramVoice = {
  file_id: string;
};

type TelegramMessage = {
  chat?: { id?: number };
  text?: string;
  voice?: TelegramVoice;
  audio?: TelegramVoice;
};

type TelegramUpdate = {
  update_id?: number;
  message?: TelegramMessage;
};

type ChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type GrokChatResult = {
  ok: boolean;
  antwoord?: string;
  error?: string;
};

async function processText(ctx: ActionCtx, chatId: number, text: string): Promise<void> {
  if (text === "/start") { await sendMessage(chatId, buildWelcomeText()); return; }
  if (text === "/help")  { await sendMessage(chatId, buildHelpText()); return; }

  // Sla user bericht op
  await ctx.runMutation(api.chatMessages.save, { chatId, role: "user", content: text });

  // Lamp commando → direct uitvoeren
  const lampCmd = detectLampCommand(text);
  if (lampCmd) {
    await ctx.runMutation(internal.deviceCommands.queueCommand, {
      userId: OWNER_USER_ID, command: lampCmd.command, bron: "telegram",
    });
    const reply = `💡 ${lampCmd.beschrijving} — commando verstuurd!`;
    await ctx.runMutation(api.chatMessages.save, { chatId, role: "assistant", content: reply, agentId: "lampen" });
    await sendPlainText(chatId, reply);
    return;
  }

  // Chat history laden
  const history = await ctx.runQuery(api.chatMessages.getHistory, { chatId, limit: 10 }) as ChatHistoryMessage[];
  const grokHistory = history.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));

  // Slash commando routing
  const cmd = text.split(" ")[0].toLowerCase().replace(/@\w+/, "");
  const customVraag = text.slice(cmd.length).trim();
  const mapping = COMMAND_MAP[cmd];

  if (mapping) {
    await sendTyping(chatId);
    // /noteer smart routing: stuur tekst direct als notitie-instructie
    let vraag = customVraag || "Geef een beknopt overzicht";
    if (cmd === "/noteer" && customVraag) {
      vraag = `Maak een notitie aan met de volgende inhoud: ${customVraag}`;
    }
    const result = await ctx.runAction(internal.ai.grok.chat.chat, {
      vraag,
      agentId: mapping.agentId, history: grokHistory,
    }) as GrokChatResult;
    await saveAndReply(ctx, chatId, result, mapping.agentId);
    return;
  }

  // Vrije tekst → smart routing
  await sendTyping(chatId);
  const detectedAgent = detectAgent(text);
  const result = await ctx.runAction(internal.ai.grok.chat.chat, {
    vraag: text, agentId: detectedAgent, history: grokHistory,
  }) as GrokChatResult;
  await saveAndReply(ctx, chatId, result, detectedAgent);
}

// ─── Webhook Handler ─────────────────────────────────────────────────────────

async function processUpdate(ctx: ActionCtx, update: TelegramUpdate): Promise<void> {
  const message = update.message;
  if (!message?.chat?.id) return;
  const chatId = message.chat.id as number;

  // ── Security: chatId whitelist ───────────────────────────────────────
  let ownerChatId: string;
  try {
    ownerChatId = getOwnerChatId();
  } catch (err) {
    console.error(`[Telegram] Configuratie ontbreekt: ${(err as Error).message}`);
    return;
  }
  if (String(chatId) !== ownerChatId) {
    console.warn(`[Telegram] ❌ Onbekend chatId: ${chatId}`);
    await sendPlainText(chatId, "Je bent niet geautoriseerd om deze bot te gebruiken.");
    return;
  }

  // ── Spraakbericht → Groq Whisper transcriptie ─────────────────────────
  const voice = message.voice ?? message.audio;
  if (voice && !message.text) {
    try {
      await sendTyping(chatId);
      const fileInfo = await getFile(voice.file_id);
      const audioBuffer = await downloadFile(fileInfo.file_path);
      const transcription = await transcribeVoice(audioBuffer, "voice.ogg");

      if (!transcription.trim()) {
        await sendPlainText(chatId, "Kon geen spraak herkennen.");
        return;
      }

      await sendPlainText(chatId, `"${transcription}"`);
      await processText(ctx, chatId, transcription);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await sendPlainText(chatId, `Fout: ${errMsg.slice(0, 100)}`);
    }
    return;
  }

  // ── Tekst bericht ─────────────────────────────────────────────────────
  if (!message.text) return;
  try {
    await processText(ctx, chatId, message.text.trim());
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Telegram Bot] processText crashed:", errMsg);
    await sendPlainText(chatId, `Er ging iets mis: ${errMsg.slice(0, 200)}`);
  }
}

async function processUpdateSafe(ctx: ActionCtx, update: TelegramUpdate): Promise<void> {
  try {
    await processUpdate(ctx, update);
  } catch (err) {
    console.error(`[Telegram] Update verwerken mislukt: ${(err as Error).message}`);
  }
}

export const handleUpdate = internalAction({
  args: { update: v.any() },
  handler: async (ctx, { update }) => {
    await processUpdateSafe(ctx, update as TelegramUpdate);
  },
});

export const handleUpdatePublic = action({
  args: { update: v.any(), bridgeSecret: v.string() },
  handler: async (ctx, { update, bridgeSecret }) => {
    requireBridgeSecret(bridgeSecret);
    await processUpdateSafe(ctx, update as TelegramUpdate);
  },
});

export const pollUpdates = action({
  args: {
    bridgeSecret: v.string(),
    offset: v.optional(v.number()),
    timeoutSeconds: v.optional(v.number()),
    disableWebhook: v.optional(v.boolean()),
  },
  handler: async (ctx, { bridgeSecret, offset, timeoutSeconds, disableWebhook }) => {
    requireBridgeSecret(bridgeSecret);
    if (disableWebhook) await disableWebhookForPolling();
    const updates = await getUpdates(offset, timeoutSeconds ?? 25) as TelegramUpdate[];
    let nextOffset = offset;
    let processed = 0;

    for (const update of updates) {
      await processUpdateSafe(ctx, update);
      processed += 1;
      if (typeof update.update_id === "number") {
        nextOffset = update.update_id + 1;
      }
    }

    return { ok: true, count: updates.length, processed, nextOffset };
  },
});

async function saveAndReply(
  ctx: ActionCtx, chatId: number,
  result: GrokChatResult,
  agentId?: string,
) {
  if (result.ok && result.antwoord) {
    let antwoord = escapeHtml(result.antwoord);
    if (antwoord.length > 4000) antwoord = antwoord.slice(0, 3997) + "...";
    await ctx.runMutation(api.chatMessages.save, { chatId, role: "assistant" as const, content: result.antwoord, agentId });
    await sendMessage(chatId, antwoord);
  } else {
    const escaped = escapeHtml(result.error ?? "Kon geen antwoord genereren");
    await sendMessage(chatId, `❌ ${escaped}`);
  }
}

// ─── Webhook Setup ───────────────────────────────────────────────────────────

export const registerWebhook = action({
  args: { webhookUrl: v.string(), bridgeSecret: v.string() },
  handler: async (_ctx, { webhookUrl, bridgeSecret }) => {
    requireBridgeSecret(bridgeSecret);
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (!secret) throw new Error("TELEGRAM_WEBHOOK_SECRET niet geconfigureerd");
    const result = await tgSetWebhook(webhookUrl, secret);
    const me = await getMe() as { username: string };
    return { ok: true, result, bot: me.username };
  },
});

export const status = action({
  args: {},
  handler: async () => {
    const me = await getMe() as { username: string; first_name: string; id: number };
    return { ok: true, bot: me };
  },
});
