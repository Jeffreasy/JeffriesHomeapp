"use node";

/**
 * convex/telegram/bot.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Telegram Bot — Webhook handler + Agent routing.
 *
 * Flow:
 *   1. Telegram stuurt update naar /telegram/webhook
 *   2. Bot detecteert commando of vrije tekst
 *   3. Routeert naar juiste agent via Grok chat
 *   4. Stuurt AI-antwoord terug naar Telegram
 *
 * Commando's:
 *   /start       — Welkomstbericht
 *   /briefing    — Daily briefing (Dashboard Agent)
 *   /lampen      — Lamp status
 *   /rooster     — Weekplanning
 *   /finance     — Salaris & transacties
 *   /email       — Inbox overzicht
 *   /help        — Alle commando's
 *   Vrije tekst  — Grok beantwoordt via Dashboard Agent
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { action, internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { sendMessage, sendTyping, setWebhook as tgSetWebhook, getMe } from "./api";

// Jeffrey's vaste userId (single-user app)
const OWNER_USER_ID = "user_3Ax561ZvuSkGtWpKFooeY65HNtY";

// Geautoriseerde Telegram chat ID's (wordt gevuld bij eerste /start)
const ALLOWED_CHAT_IDS = new Set<number>();

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

function buildHelpText(): string {
  const lines = [
    "🏠 <b>Jeffries HomeBot</b> — Commando's:\n",
    ...Object.entries(COMMAND_MAP).map(([cmd, { beschrijving }]) => `${cmd} — ${beschrijving}`),
    "\n💬 Of stel gewoon een <i>vrije vraag</i> — Grok beantwoordt het via de juiste agent.",
  ];
  return lines.join("\n");
}

function buildWelcomeText(): string {
  return [
    "👋 <b>Welkom bij Jeffries HomeBot!</b>\n",
    "Ik ben verbonden met je volledige Homeapp via Grok AI.",
    "Ik ken je lampen, rooster, financiën, emails, en automations.\n",
    "Probeer: <code>/briefing</code> voor een dagelijkse update,",
    "of stel gewoon een vraag in het Nederlands.\n",
    "Type /help voor alle commando's.",
  ].join("\n");
}

// ─── Webhook Handler (wordt aangeroepen vanuit HTTP route) ────────────────────

export const handleUpdate = internalAction({
  args: { update: v.any() },
  handler: async (ctx, { update }) => {
    const message = update?.message;
    if (!message?.text || !message?.chat?.id) return;

    const chatId = message.chat.id as number;
    const text   = (message.text as string).trim();

    // ── /start ────────────────────────────────────────────────────────────
    if (text === "/start") {
      ALLOWED_CHAT_IDS.add(chatId);
      await sendMessage(chatId, buildWelcomeText());
      return;
    }

    // ── /help ─────────────────────────────────────────────────────────────
    if (text === "/help") {
      await sendMessage(chatId, buildHelpText());
      return;
    }

    // ── Commando routing ──────────────────────────────────────────────────
    const cmd = text.split(" ")[0].toLowerCase().replace(/@\w+/, ""); // Strip @botname
    const customVraag = text.slice(cmd.length).trim();
    const mapping = COMMAND_MAP[cmd];

    if (mapping) {
      await sendTyping(chatId);

      const vraag = customVraag || `Geef een overzicht als ${mapping.beschrijving}`;

      const result = await ctx.runAction(internal.ai.grok.chat, {
        userId:  OWNER_USER_ID,
        vraag,
        agentId: mapping.agentId,
      }) as { ok: boolean; antwoord?: string; error?: string };

      if (result.ok && result.antwoord) {
        // Telegram HTML max 4096 chars
        const antwoord = result.antwoord.length > 4000
          ? result.antwoord.slice(0, 3997) + "..."
          : result.antwoord;
        await sendMessage(chatId, antwoord);
      } else {
        await sendMessage(chatId, `❌ Fout: ${result.error ?? "Onbekende fout"}`);
      }
      return;
    }

    // ── Vrije vraag → Dashboard Agent via Grok ────────────────────────────
    await sendTyping(chatId);

    const result = await ctx.runAction(internal.ai.grok.chat, {
      userId: OWNER_USER_ID,
      vraag:  text,
    }) as { ok: boolean; antwoord?: string; error?: string };

    if (result.ok && result.antwoord) {
      const antwoord = result.antwoord.length > 4000
        ? result.antwoord.slice(0, 3997) + "..."
        : result.antwoord;
      await sendMessage(chatId, antwoord);
    } else {
      await sendMessage(chatId, `❌ ${result.error ?? "Kon geen antwoord genereren"}`);
    }
  },
});

// ─── Webhook Setup (handmatig aanroepen) ──────────────────────────────────────

/** Registreer de webhook bij Telegram. Roep aan na deploy. */
export const registerWebhook = action({
  args: { webhookUrl: v.string() },
  handler: async (_ctx, { webhookUrl }) => {
    const secret = "homebot_" + Date.now().toString(36);
    const result = await tgSetWebhook(webhookUrl, secret);
    const me     = await getMe() as { username: string };
    return { ok: true, result, bot: me.username, secret };
  },
});

/** Check bot status. */
export const status = action({
  args: {},
  handler: async () => {
    const me = await getMe() as { username: string; first_name: string; id: number };
    return { ok: true, bot: me };
  },
});
