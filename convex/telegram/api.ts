"use node";

/**
 * convex/telegram/api.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Telegram Bot API helpers — sendMessage, setWebhook, etc.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const TG_BASE = "https://api.telegram.org/bot";

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN niet geconfigureerd");
  return token;
}

async function tgFetch(method: string, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${TG_BASE}${getToken()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram API fout: ${JSON.stringify(data)}`);
  return data.result;
}

/** Stuur tekst bericht naar een chat. */
export async function sendMessage(chatId: number, text: string, opts?: {
  parseMode?: "MarkdownV2" | "HTML";
  replyToMessageId?: number;
}): Promise<void> {
  await tgFetch("sendMessage", {
    chat_id:    chatId,
    text,
    parse_mode: opts?.parseMode ?? "HTML",
    reply_to_message_id: opts?.replyToMessageId,
  });
}

/** Stuur "typing..." indicator. */
export async function sendTyping(chatId: number): Promise<void> {
  await tgFetch("sendChatAction", { chat_id: chatId, action: "typing" });
}

/** Registeer webhook URL bij Telegram. */
export async function setWebhook(url: string, secret: string): Promise<unknown> {
  return tgFetch("setWebhook", {
    url,
    secret_token:       secret,
    allowed_updates:    ["message"],
    max_connections:    10,
  });
}

/** Verwijder webhook. */
export async function deleteWebhook(): Promise<unknown> {
  return tgFetch("deleteWebhook", { drop_pending_updates: true });
}

/** Haal bot info op. */
export async function getMe(): Promise<unknown> {
  return tgFetch("getMe", {});
}
