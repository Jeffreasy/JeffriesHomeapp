"use node";

/**
 * convex/telegram/bot.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Telegram Bot — Text + Voice + Agent routing + Lamp control.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { action, internalAction } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import { sendMessage, sendTyping, setWebhook as tgSetWebhook, getMe, getFile, downloadFile, transcribeVoice } from "./api";
import { JEFFREY_USER_ID } from "../lib/config";

const OWNER_USER_ID = JEFFREY_USER_ID;

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

async function processText(ctx: any, chatId: number, text: string): Promise<void> {
  if (text === "/start") { await sendMessage(chatId, buildWelcomeText(), { parseMode: undefined as any }); return; }
  if (text === "/help")  { await sendMessage(chatId, buildHelpText(), { parseMode: undefined as any }); return; }

  // Sla user bericht op
  await ctx.runMutation(api.chatMessages.save, { chatId, role: "user", content: text });

  // Lamp commando → direct uitvoeren
  const lampCmd = detectLampCommand(text);
  if (lampCmd) {
    await ctx.runMutation(api.deviceCommands.queueCommand, {
      userId: OWNER_USER_ID, command: lampCmd.command, bron: "telegram",
    });
    const reply = `💡 ${lampCmd.beschrijving} — commando verstuurd!`;
    await ctx.runMutation(api.chatMessages.save, { chatId, role: "assistant", content: reply, agentId: "lampen" });
    await sendMessage(chatId, reply, { parseMode: undefined as any });
    return;
  }

  // Chat history laden
  const history = await ctx.runQuery(api.chatMessages.getHistory, { chatId, limit: 10 }) as Array<{ role: "user" | "assistant"; content: string }>;
  const grokHistory = history.slice(0, -1).map((m: any) => ({ role: m.role, content: m.content }));

  // Slash commando routing
  const cmd = text.split(" ")[0].toLowerCase().replace(/@\w+/, "");
  const customVraag = text.slice(cmd.length).trim();
  const mapping = COMMAND_MAP[cmd];

  if (mapping) {
    await sendTyping(chatId);
    const result = await ctx.runAction(api.ai.grok.chat.chat, {
      userId: OWNER_USER_ID, vraag: customVraag || "Geef een beknopt overzicht",
      agentId: mapping.agentId, history: grokHistory,
    }) as { ok: boolean; antwoord?: string; error?: string };
    await saveAndReply(ctx, chatId, result, mapping.agentId);
    return;
  }

  // Vrije tekst → smart routing
  await sendTyping(chatId);
  const detectedAgent = detectAgent(text);
  const result = await ctx.runAction(api.ai.grok.chat.chat, {
    userId: OWNER_USER_ID, vraag: text, agentId: detectedAgent, history: grokHistory,
  }) as { ok: boolean; antwoord?: string; error?: string };
  await saveAndReply(ctx, chatId, result, detectedAgent);
}

// ─── Webhook Handler ─────────────────────────────────────────────────────────

export const handleUpdate = internalAction({
  args: { update: v.any() },
  handler: async (ctx, { update }) => {
    const message = update?.message;
    if (!message?.chat?.id) return;
    const chatId = message.chat.id as number;

    // ── Spraakbericht → Groq Whisper transcriptie ─────────────────────────
    const voice = message.voice ?? message.audio;
    if (voice && !message.text) {
      try {
        await sendTyping(chatId);
        const fileInfo = await getFile(voice.file_id);
        const audioBuffer = await downloadFile(fileInfo.file_path);
        const transcription = await transcribeVoice(audioBuffer, "voice.ogg");

        if (!transcription.trim()) {
          await sendMessage(chatId, "🎙️ Kon geen spraak herkennen.", { parseMode: undefined as any });
          return;
        }

        await sendMessage(chatId, `🎙️ "${transcription}"`, { parseMode: undefined as any });
        await processText(ctx, chatId, transcription);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        await sendMessage(chatId, `🎙️ Fout: ${errMsg.slice(0, 100)}`, { parseMode: undefined as any });
      }
      return;
    }

    // ── Tekst bericht ─────────────────────────────────────────────────────
    if (!message.text) return;
    try {
      await processText(ctx, chatId, (message.text as string).trim());
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("[Telegram Bot] processText crashed:", errMsg);
      await sendMessage(chatId, `❌ Er ging iets mis: ${errMsg.slice(0, 200)}`, { parseMode: undefined as any });
    }
  },
});

async function saveAndReply(
  ctx: any, chatId: number,
  result: { ok: boolean; antwoord?: string; error?: string },
  agentId?: string,
) {
  if (result.ok && result.antwoord) {
    // Escape HTML entities zodat <email@addr> en dergelijke niet als tags worden geparsed
    let antwoord = result.antwoord
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (antwoord.length > 4000) antwoord = antwoord.slice(0, 3997) + "...";
    await ctx.runMutation(api.chatMessages.save, { chatId, role: "assistant" as const, content: result.antwoord, agentId });
    await sendMessage(chatId, antwoord);
  } else {
    const escaped = (result.error ?? "Kon geen antwoord genereren")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    await sendMessage(chatId, `❌ ${escaped}`);
  }
}

// ─── Webhook Setup ───────────────────────────────────────────────────────────

export const registerWebhook = action({
  args: { webhookUrl: v.string() },
  handler: async (_ctx, { webhookUrl }) => {
    const secret = "homebot_" + Date.now().toString(36);
    const result = await tgSetWebhook(webhookUrl, secret);
    const me = await getMe() as { username: string };
    return { ok: true, result, bot: me.username, secret };
  },
});

export const status = action({
  args: {},
  handler: async () => {
    const me = await getMe() as { username: string; first_name: string; id: number };
    return { ok: true, bot: me };
  },
});
