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

const OWNER_USER_ID = "user_3Ax561ZvuSkGtWpKFooeY65HNtY";

// ─── Commando → Agent mapping ────────────────────────────────────────────────

const COMMAND_MAP: Record<string, { agentId: string; beschrijving: string }> = {
  "/briefing":    { agentId: "dashboard",      beschrijving: "📊 Dagelijkse briefing" },
  "/lampen":      { agentId: "lampen",          beschrijving: "💡 Lamp status" },
  "/rooster":     { agentId: "rooster",         beschrijving: "📅 Weekplanning" },
  "/finance":     { agentId: "finance",         beschrijving: "💰 Salaris & transacties" },
  "/email":       { agentId: "email",           beschrijving: "📧 Inbox overzicht" },
  "/inbox":       { agentId: "email-analyst",   beschrijving: "📊 Inbox analyse" },
  "/compose":     { agentId: "email-composer",  beschrijving: "✍️ Email componeren" },
  "/triage":      { agentId: "email-manager",   beschrijving: "🗂️ Inbox triage" },
  "/search":      { agentId: "email-reader",    beschrijving: "🔍 Email zoeken" },
  "/automations": { agentId: "automations",     beschrijving: "⚙️ Automations status" },
};

// ─── Lamp Command Detection ──────────────────────────────────────────────────

interface LampCommand {
  command: { on?: boolean; brightness?: number };
  beschrijving: string;
}

function detectLampCommand(text: string): LampCommand | null {
  const lower = text.toLowerCase();
  const isLampRelated = ["lamp", "lampen", "licht", "lichten"].some((w) => lower.includes(w));
  if (!isLampRelated) return null;

  for (const p of ["uit", "off", "uitzetten", "uitdoen", "doof"]) {
    if (lower.includes(p)) return { command: { on: false }, beschrijving: "Lampen uitzetten" };
  }
  for (const p of ["aan", "on", "aanzetten", "aandoen"]) {
    if (lower.includes(p)) return { command: { on: true }, beschrijving: "Lampen aanzetten" };
  }
  const bm = lower.match(/(\d+)\s*%/);
  if (bm) {
    const val = Math.min(100, Math.max(1, parseInt(bm[1])));
    return { command: { brightness: val }, beschrijving: `Helderheid naar ${val}%` };
  }
  if (lower.includes("dim")) return { command: { brightness: 30 }, beschrijving: "Lampen dimmen (30%)" };
  if (lower.includes("fel") || lower.includes("helder")) return { command: { brightness: 100 }, beschrijving: "Lampen vol (100%)" };
  return null;
}

// ─── Keyword → Agent routing ─────────────────────────────────────────────────

const KEYWORD_ROUTES: Array<{ keywords: string[]; agentId: string }> = [
  { keywords: ["lamp", "lampen", "licht", "lichten", "scene", "kleur", "wiz"], agentId: "lampen" },
  { keywords: ["dienst", "rooster", "shift", "werk", "planning", "vrij", "weekend", "afspraak", "agenda"], agentId: "rooster" },
  { keywords: ["salaris", "loon", "geld", "ort", "netto", "bruto", "transactie", "saldo", "bank"], agentId: "finance" },
  { keywords: ["email", "mail", "inbox", "ongelezen", "bericht", "stuur", "reply", "gmail"], agentId: "email" },
  { keywords: ["automation", "automations", "cron", "sync"], agentId: "automations" },
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
    "💰 'Salaris'  📧 'Ongelezen emails'\n",
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
    const result = await ctx.runAction(api.ai.grok.chat, {
      userId: OWNER_USER_ID, vraag: customVraag || "Geef een beknopt overzicht",
      agentId: mapping.agentId, history: grokHistory,
    }) as { ok: boolean; antwoord?: string; error?: string };
    await saveAndReply(ctx, chatId, result, mapping.agentId);
    return;
  }

  // Vrije tekst → smart routing
  await sendTyping(chatId);
  const detectedAgent = detectAgent(text);
  const result = await ctx.runAction(api.ai.grok.chat, {
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
    await processText(ctx, chatId, (message.text as string).trim());
  },
});

async function saveAndReply(
  ctx: any, chatId: number,
  result: { ok: boolean; antwoord?: string; error?: string },
  agentId?: string,
) {
  if (result.ok && result.antwoord) {
    const antwoord = result.antwoord.length > 4000 ? result.antwoord.slice(0, 3997) + "..." : result.antwoord;
    await ctx.runMutation(api.chatMessages.save, { chatId, role: "assistant" as const, content: antwoord, agentId });
    await sendMessage(chatId, antwoord, { parseMode: undefined as any });
  } else {
    await sendMessage(chatId, `❌ ${result.error ?? "Kon geen antwoord genereren"}`);
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
