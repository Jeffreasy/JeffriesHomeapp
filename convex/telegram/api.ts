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

/** Haal file path op via file_id. */
export async function getFile(fileId: string): Promise<{ file_path: string }> {
  return tgFetch("getFile", { file_id: fileId }) as Promise<{ file_path: string }>;
}

/** Download een Telegram file als ArrayBuffer. */
export async function downloadFile(filePath: string): Promise<ArrayBuffer> {
  const url = `https://api.telegram.org/file/bot${getToken()}/${filePath}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return res.arrayBuffer();
}

/** Transcribeer audio via Groq Whisper API. */
export async function transcribeVoice(audioBuffer: ArrayBuffer, filename: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("GROQ_API_KEY niet geconfigureerd");

  // Build multipart form data
  const boundary = "----FormBoundary" + Date.now().toString(36);
  const header = [
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    "Content-Type: audio/ogg",
    "",
  ].join("\r\n");
  const modelPart = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="model"',
    "",
    "whisper-large-v3",
  ].join("\r\n");
  const langPart = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="language"',
    "",
    "nl",
  ].join("\r\n");
  const footer = `\r\n--${boundary}--`;

  const encoder = new TextEncoder();
  const headerBytes  = encoder.encode(header + "\r\n");
  const modelBytes   = encoder.encode("\r\n" + modelPart);
  const langBytes    = encoder.encode("\r\n" + langPart);
  const footerBytes  = encoder.encode(footer);
  const audioBytes   = new Uint8Array(audioBuffer);

  // Concat all parts
  const body = new Uint8Array(
    headerBytes.length + audioBytes.length + modelBytes.length + langBytes.length + footerBytes.length
  );
  let offset = 0;
  body.set(headerBytes, offset);  offset += headerBytes.length;
  body.set(audioBytes, offset);   offset += audioBytes.length;
  body.set(modelBytes, offset);   offset += modelBytes.length;
  body.set(langBytes, offset);    offset += langBytes.length;
  body.set(footerBytes, offset);

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq Whisper ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as { text: string };
  return data.text;
}
