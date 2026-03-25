"use node";

/**
 * convex/telegram/bot.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Telegram Bot — Webhook handler + Smart Agent routing + Lamp Control.
 *
 * Flow:
 *   1. Telegram stuurt update → /telegram/webhook
 *   2. Lamp commando's → direct in command queue (geen Grok nodig)
 *   3. Slash commando → directe agent routing via Grok
 *   4. Vrije tekst → keyword detectie → juiste agent via Grok
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { action, internalAction } from "../_generated/server";
import { api } from "../_generated/api";
import { v } from "convex/values";
import { sendMessage, sendTyping, setWebhook as tgSetWebhook, getMe } from "./api";

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
  command: { on?: boolean; brightness?: number; r?: number; g?: number; b?: number };
  beschrijving: string;
}

function detectLampCommand(text: string): LampCommand | null {
  const lower = text.toLowerCase();

  // Aan/uit detectie
  const uitPatterns = ["uit", "off", "uitzetten", "uitdoen", "doof", "stop"];
  const aanPatterns = ["aan", "on", "aanzetten", "aandoen"];

  const isLampRelated = ["lamp", "lampen", "licht", "lichten"].some((w) => lower.includes(w));
  if (!isLampRelated) return null;

  for (const p of uitPatterns) {
    if (lower.includes(p)) {
      return { command: { on: false }, beschrijving: "Lampen uitzetten" };
    }
  }

  for (const p of aanPatterns) {
    if (lower.includes(p)) {
      return { command: { on: true }, beschrijving: "Lampen aanzetten" };
    }
  }

  // Brightness detectie
  const brightnessMatch = lower.match(/(\d+)\s*%/);
  if (brightnessMatch) {
    const val = Math.min(100, Math.max(1, parseInt(brightnessMatch[1])));
    return { command: { brightness: val }, beschrijving: `Helderheid naar ${val}%` };
  }

  if (lower.includes("dim")) {
    return { command: { brightness: 30 }, beschrijving: "Lampen dimmen (30%)" };
  }

  if (lower.includes("fel") || lower.includes("helder") || lower.includes("vol")) {
    return { command: { brightness: 100 }, beschrijving: "Lampen vol (100%)" };
  }

  return null;
}

// ─── Smart Keyword → Agent routing ───────────────────────────────────────────

const KEYWORD_ROUTES: Array<{ keywords: string[]; agentId: string }> = [
  { keywords: ["lamp", "lampen", "licht", "lichten", "scene", "kleur", "rgb", "wiz"],
    agentId: "lampen" },
  { keywords: ["dienst", "rooster", "shift", "werk", "planning", "vrij", "weekend", "conflict", "afspraak", "agenda"],
    agentId: "rooster" },
  { keywords: ["salaris", "loon", "geld", "ort", "netto", "bruto", "betaling", "transactie", "uitgaven", "saldo", "bank", "rabo"],
    agentId: "finance" },
  { keywords: ["email", "mail", "inbox", "ongelezen", "bericht", "stuur", "verstuur", "reply", "bijlage", "gmail"],
    agentId: "email" },
  { keywords: ["automation", "automations", "cron", "sync", "trigger", "schema"],
    agentId: "automations" },
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
    "\n💡 Lamp bediening (directe actie):",
    '  "Doe de lampen uit"',
    '  "Lampen aan"',
    '  "Dim de lampen"',
    '  "Lampen 50%"',
    "\n💬 Of stel een vrije vraag!",
  ].join("\n");
}

function buildWelcomeText(): string {
  return [
    "👋 Welkom bij Jeffries HomeBot!\n",
    "Ik bedien je Homeapp via Grok AI.\n",
    "💡 Zeg 'lampen uit' en ze gaan uit.",
    "📅 Zeg 'wanneer werk ik?' en ik check je rooster.",
    "💰 Zeg 'salaris' en ik geef je netto.\n",
    "Type /help voor alle commando's.",
  ].join("\n");
}

// ─── Webhook Handler ─────────────────────────────────────────────────────────

export const handleUpdate = internalAction({
  args: { update: v.any() },
  handler: async (ctx, { update }) => {
    const message = update?.message;
    if (!message?.text || !message?.chat?.id) return;

    const chatId = message.chat.id as number;
    const text   = (message.text as string).trim();

    // ── /start ────────────────────────────────────────────────────────────
    if (text === "/start") {
      await sendMessage(chatId, buildWelcomeText(), { parseMode: undefined as any });
      return;
    }

    // ── /help ─────────────────────────────────────────────────────────────
    if (text === "/help") {
      await sendMessage(chatId, buildHelpText(), { parseMode: undefined as any });
      return;
    }

    // ── Sla user bericht op ──────────────────────────────────────────────
    await ctx.runMutation(api.chatMessages.save, {
      chatId, role: "user", content: text,
    });

    // ── Lamp commando → direct uitvoeren via command queue ────────────────
    const lampCmd = detectLampCommand(text);
    if (lampCmd) {
      await ctx.runMutation(api.deviceCommands.queueCommand, {
        userId:  OWNER_USER_ID,
        command: lampCmd.command,
        bron:    "telegram",
      });
      const reply = `💡 ${lampCmd.beschrijving} — commando verstuurd!`;
      await ctx.runMutation(api.chatMessages.save, {
        chatId, role: "assistant", content: reply, agentId: "lampen",
      });
      await sendMessage(chatId, reply, { parseMode: undefined as any });
      return;
    }

    // ── Laad chat history voor Grok ──────────────────────────────────────
    const history = await ctx.runQuery(api.chatMessages.getHistory, {
      chatId, limit: 10,
    }) as Array<{ role: "user" | "assistant"; content: string }>;

    // Format als Grok history (alles behalve het huidige bericht)
    const grokHistory = history
      .slice(0, -1)  // Huidig bericht zit er al in via save
      .map((m) => ({ role: m.role, content: m.content }));

    // ── Slash commando routing ────────────────────────────────────────────
    const cmd = text.split(" ")[0].toLowerCase().replace(/@\w+/, "");
    const customVraag = text.slice(cmd.length).trim();
    const mapping = COMMAND_MAP[cmd];

    if (mapping) {
      await sendTyping(chatId);
      const vraag = customVraag || "Geef een beknopt overzicht";

      const result = await ctx.runAction(api.ai.grok.chat, {
        userId:  OWNER_USER_ID,
        vraag,
        agentId: mapping.agentId,
        history: grokHistory,
      }) as { ok: boolean; antwoord?: string; error?: string };

      await saveAndReply(ctx, chatId, result, mapping.agentId);
      return;
    }

    // ── Vrije tekst → Smart routing ──────────────────────────────────────
    await sendTyping(chatId);
    const detectedAgent = detectAgent(text);

    const result = await ctx.runAction(api.ai.grok.chat, {
      userId:  OWNER_USER_ID,
      vraag:   text,
      agentId: detectedAgent,
      history: grokHistory,
    }) as { ok: boolean; antwoord?: string; error?: string };

    await saveAndReply(ctx, chatId, result, detectedAgent);
  },
});

async function saveAndReply(
  ctx: any,
  chatId: number,
  result: { ok: boolean; antwoord?: string; error?: string },
  agentId?: string,
) {
  if (result.ok && result.antwoord) {
    const antwoord = result.antwoord.length > 4000
      ? result.antwoord.slice(0, 3997) + "..."
      : result.antwoord;
    // Sla assistant response op
    await ctx.runMutation(api.chatMessages.save, {
      chatId, role: "assistant" as const, content: antwoord, agentId,
    });
    await sendMessage(chatId, antwoord, { parseMode: undefined as any });
  } else {
    const errMsg = `❌ ${result.error ?? "Kon geen antwoord genereren"}`;
    await sendMessage(chatId, errMsg);
  }
}

// ─── Webhook Setup ───────────────────────────────────────────────────────────

export const registerWebhook = action({
  args: { webhookUrl: v.string() },
  handler: async (_ctx, { webhookUrl }) => {
    const secret = "homebot_" + Date.now().toString(36);
    const result = await tgSetWebhook(webhookUrl, secret);
    const me     = await getMe() as { username: string };
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
