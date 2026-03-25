"use node";

/**
 * convex/telegram/bot.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Telegram Bot — Webhook handler + Smart Agent routing.
 *
 * Flow:
 *   1. Telegram stuurt update → /telegram/webhook
 *   2. Slash commando → directe agent routing
 *   3. Vrije tekst → keyword detectie → juiste agent via Grok
 *   4. Grok antwoordt direct — nooit doorverwijzen
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { sendMessage, sendTyping, setWebhook as tgSetWebhook, getMe } from "./api";

// Jeffrey's vaste userId (single-user app)
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

// ─── Smart Keyword → Agent routing ───────────────────────────────────────────

const KEYWORD_ROUTES: Array<{ keywords: string[]; agentId: string }> = [
  { keywords: ["lamp", "lampen", "licht", "lichten", "aan", "uit", "helder", "dim", "scene", "kleur", "rgb", "wiz"],
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
    if (score > best.score) {
      best = { agentId: route.agentId, score };
    }
  }

  return best.agentId;
}

// ─── Messages ────────────────────────────────────────────────────────────────

function buildHelpText(): string {
  return [
    "🏠 <b>Jeffries HomeBot</b>\n",
    "<b>Commando's:</b>",
    ...Object.entries(COMMAND_MAP).map(([cmd, { beschrijving }]) => `  ${cmd} — ${beschrijving}`),
    "\n💬 Of vraag gewoon iets in het Nederlands!",
    "Ik snap automatisch welke agent je nodig hebt.",
    "\nVoorbeelden:",
    '  "Doe de lampen uit"',
    '  "Wat is mijn salaris?"',
    '  "Hoeveel ongelezen emails?"',
    '  "Wanneer werk ik morgen?"',
  ].join("\n");
}

function buildWelcomeText(): string {
  return [
    "👋 <b>Welkom bij Jeffries HomeBot!</b>\n",
    "Ik ben je AI-assistent, aangedreven door Grok.",
    "Vraag me alles over je Homeapp — ik snap het wel.\n",
    "Voorbeelden:",
    '  💡 "Doe de lampen uit"',
    '  📅 "Wanneer is mijn volgende dienst?"',
    '  💰 "Wat is mijn netto salaris?"',
    '  📧 "Hoeveel ongelezen emails heb ik?"',
    "\nOf type /help voor alle commando's.",
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
      await sendMessage(chatId, buildWelcomeText());
      return;
    }

    // ── /help ─────────────────────────────────────────────────────────────
    if (text === "/help") {
      await sendMessage(chatId, buildHelpText());
      return;
    }

    // ── Slash commando routing ────────────────────────────────────────────
    const cmd = text.split(" ")[0].toLowerCase().replace(/@\w+/, "");
    const customVraag = text.slice(cmd.length).trim();
    const mapping = COMMAND_MAP[cmd];

    if (mapping) {
      await sendTyping(chatId);
      const vraag = customVraag || `Geef een beknopt overzicht`;

      const result = await ctx.runAction(internal.ai.grok.chat, {
        userId:  OWNER_USER_ID,
        vraag,
        agentId: mapping.agentId,
      }) as { ok: boolean; antwoord?: string; error?: string };

      await sendReply(chatId, result);
      return;
    }

    // ── Vrije tekst → Smart routing via keyword detectie ──────────────────
    await sendTyping(chatId);
    const detectedAgent = detectAgent(text);

    const result = await ctx.runAction(internal.ai.grok.chat, {
      userId:  OWNER_USER_ID,
      vraag:   text,
      agentId: detectedAgent,
    }) as { ok: boolean; antwoord?: string; error?: string };

    await sendReply(chatId, result);
  },
});

async function sendReply(chatId: number, result: { ok: boolean; antwoord?: string; error?: string }) {
  if (result.ok && result.antwoord) {
    // Telegram max 4096 chars
    const antwoord = result.antwoord.length > 4000
      ? result.antwoord.slice(0, 3997) + "..."
      : result.antwoord;
    // Stuur als plain text (Grok output bevat markdown die Telegram HTML breekt)
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
