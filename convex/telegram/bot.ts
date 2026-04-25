"use node";

/**
 * convex/telegram/bot.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Telegram Bot — Text + Voice + Agent routing + Lamp control.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { action, internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import {
  sendMessage,
  sendTyping,
  setWebhook as tgSetWebhook,
  getMe,
  getWebhookInfo,
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

function safeUrlHost(value?: string): string | null {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

async function sendPlainText(chatId: number, text: string): Promise<void> {
  await sendMessage(chatId, escapeHtml(text));
}

// ─── Commando → Agent mapping ────────────────────────────────────────────────

const COMMAND_MAP: Record<string, { agentId: string; beschrijving: string }> = {
  "/brain":       { agentId: "brain",          beschrijving: "🧠 Centrale assistent" },
  "/briefing":    { agentId: "brain",          beschrijving: "🧠 Dagelijkse briefing" },
  "/dashboard":   { agentId: "dashboard",      beschrijving: "📊 Dashboard snapshot" },
  "/lampen":      { agentId: "lampen",          beschrijving: "💡 Lamp status" },
  "/rooster":     { agentId: "rooster",         beschrijving: "📅 Weekplanning" },
  "/afspraak":    { agentId: "agenda",          beschrijving: "🗓️ Afspraak beheren" },
  "/agenda":      { agentId: "agenda",          beschrijving: "🗓️ Agenda overzicht" },
  "/calendar":    { agentId: "agenda",          beschrijving: "🗓️ Google Calendar" },
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

function hasAgendaIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return [
    "agenda", "afspraak", "afspraken", "calendar", "kalender",
    "gepland", "planning", "wanneer had", "wanneer heb",
  ].some((keyword) => lower.includes(keyword));
}

function hasSearchIntent(text: string): boolean {
  const lower = text.toLowerCase();
  return /\b(zoek|zoeken|vind|vinden|check|toon|laat zien)\b/.test(lower);
}

function routeFreeText(text: string): { agentId: string; vraag: string } {
  if (hasAgendaIntent(text)) {
    return {
      agentId: "agenda",
      vraag: hasSearchIntent(text)
        ? `Zoek in mijn agenda inclusief historie. Gebruik afsprakenOpvragen met zoekterm en includeHistorie=true als er een naam, titel of projectterm genoemd wordt. Vraag: ${text}`
        : text,
    };
  }

  if (hasSearchIntent(text)) {
    return {
      agentId: "brain",
      vraag: `Voer een cross-domain zoekactie uit. Zoek naast email ook expliciet in agenda-afspraken met historie via afsprakenOpvragen met zoekterm/includeHistorie=true voordat je zegt dat er geen afspraken zijn. Vraag: ${text}`,
    };
  }

  return { agentId: "brain", vraag: text };
}

// ─── Messages ────────────────────────────────────────────────────────────────

function buildHelpText(): string {
  return [
    "🏠 Jeffries HomeBot",
    "🧠 Vrije tekst gaat standaard naar Jeffries Brain.\n",
    "Cockpit:",
    "  /status — systeem, sync en bridge health",
    "  /pending — open AI-acties met codes",
    "  /confirm CODE — actie uitvoeren",
    "  /cancel CODE — actie annuleren",
    "  /prefs — Brain voorkeuren bekijken",
    "  /pref detail kort|normaal|uitgebreid",
    "  /pref toon direct|warm|coachend",
    "  /pref proactief laag|normaal|hoog",
    "  /pref focus planning,gezondheid,rust\n",
    "Specialisten:",
    ...Object.entries(COMMAND_MAP).map(([cmd, { beschrijving }]) => `  ${cmd} — ${beschrijving}`),
    "\n💡 Lamp bediening: 'lampen uit', 'lampen 50%', 'dim'",
    "📝 Notities: 'noteer ...', 'zoek in notities'",
    "🎙️ Spraakberichten worden automatisch herkend.",
  ].join("\n");
}

function buildWelcomeText(): string {
  return [
    "👋 Welkom bij Jeffries HomeBot!\n",
    "Jeffries Brain is je centrale cockpit voor Homeapp.",
    "Typ of spreek — ik combineer planning, agenda, mail, notities, habits, lampen en systeemstatus.\n",
    "💡 'Lampen uit'  📅 'Wanneer werk ik?'",
    "💰 'Salaris'  📧 'Ongelezen emails'",
    "📝 'Noteer: ...'  ⚙️ '/status'\n",
    "Type /help voor alle commando's.",
  ].join("\n");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "onbekend";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesUntil(value: string): number {
  return Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 60_000));
}

function boolStatus(ok: boolean): string {
  return ok ? "✅" : "⚠️";
}

async function getPendingActions(ctx: ActionCtx): Promise<PendingAction[]> {
  return await ctx.runQuery(internal.ai.grok.pendingActions.listPending, {
    userId: OWNER_USER_ID,
  }) as PendingAction[];
}

function buildPendingText(actions: PendingAction[]): string {
  if (!actions.length) {
    return [
      "✅ Geen open AI-acties.",
      "",
      "Alles wat bevestigd moest worden is afgerond, verlopen of geannuleerd.",
    ].join("\n");
  }

  return [
    "🧾 OPEN AI-ACTIES",
    "━━━━━━━━━━━━━━━━",
    `Totaal: ${actions.length}`,
    "",
    ...actions.slice(0, 10).map((action, index) => [
      `${index + 1}. ${action.summary}`,
      `   Code: ${action.code}`,
      `   Agent: ${action.agentId} | Tool: ${action.toolName}`,
      `   Vervalt over: ${minutesUntil(action.expiresAt)} min`,
    ].join("\n")),
    "",
    "Uitvoeren: /confirm CODE",
    "Annuleren: /cancel CODE",
  ].join("\n");
}

function buildPreferencesText(preferences: BrainPreferences): string {
  return [
    "🧠 BRAIN VOORKEUREN",
    "━━━━━━━━━━━━━━━━",
    `Detail: ${preferences.detailLevel}`,
    `Toon: ${preferences.tone}`,
    `Proactief: ${preferences.proactiveLevel}`,
    `Focus: ${preferences.focusAreas.join(", ") || "geen"}`,
    `Briefing: ${preferences.briefingTime ?? "niet ingesteld"}`,
    `Stille uren: ${preferences.quietHoursStart ?? "?"} - ${preferences.quietHoursEnd ?? "?"}`,
    "",
    "Aanpassen:",
    "/pref detail kort|normaal|uitgebreid",
    "/pref toon direct|warm|coachend",
    "/pref proactief laag|normaal|hoog",
    "/pref focus planning,gezondheid,rust",
    "/pref briefing 08:00",
    "/pref stil 23:00 07:00",
  ].join("\n");
}

function normalizeCode(value: string): string {
  return value.trim().toUpperCase();
}

function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeAssistantText(text: string): string {
  try {
    const parsed = JSON.parse(text) as { telegramText?: unknown; antwoord?: unknown; summary?: unknown };
    if (typeof parsed.telegramText === "string") return parsed.telegramText;
    if (typeof parsed.antwoord === "string") return parsed.antwoord;
    if (typeof parsed.summary === "string") return parsed.summary;
  } catch {}
  return text;
}

async function sendStatus(ctx: ActionCtx, chatId: number) {
  const overview = await ctx.runQuery(internal.settings.getOverviewInternal, {
    userId: OWNER_USER_ID,
  }) as SystemOverview;

  const syncEntries = Object.entries(overview.sync ?? {});
  const failedSync = syncEntries.filter(([, status]) => status.status === "failed");
  const bridgeOk = Boolean(overview.bridge?.online);
  const pending = overview.confirmations?.pending ?? 0;
  const failedCommands = overview.commands?.failed ?? 0;
  const allGood = bridgeOk && failedSync.length === 0 && failedCommands === 0;

  const syncLines = syncEntries.length
    ? syncEntries.map(([source, status]) =>
      `• ${source}: ${status.status === "success" ? "✅" : status.status === "running" ? "🔄" : "⚠️"} ${status.status} | laatste succes: ${formatDateTime(status.lastSuccessAt)}`
    )
    : ["• Nog geen sync-status records"];

  const integrationLines = Object.entries(overview.integrations ?? {})
    .map(([name, ok]) => `• ${name}: ${boolStatus(Boolean(ok))}`);

  await sendPlainText(chatId, [
    "⚙️ HOMEAPP STATUS",
    "━━━━━━━━━━━━━━━━",
    allGood ? "🟢 Alles operationeel" : "🟠 Aandacht nodig",
    "",
    `🧠 Brain confirmations: ${pending} open`,
    `💡 Lampen: ${overview.devices?.on ?? 0}/${overview.devices?.total ?? 0} aan | ${overview.devices?.online ?? 0} online`,
    `📧 Email: ${overview.email?.unread ?? 0} ongelezen | sync: ${formatDateTime(overview.email?.lastFullSync)}`,
    `📅 Rooster: ${overview.schedule?.upcoming ?? 0} aankomend | import: ${formatDateTime(overview.schedule?.importedAt)}`,
    `📝 Data: ${overview.data?.notes ?? 0} notities | ${overview.data?.activeHabits ?? 0} actieve habits`,
    "",
    "🌉 Bridge:",
    overview.bridge
      ? `• ${overview.bridge.status} | gezien: ${formatDateTime(overview.bridge.lastSeenAt)} | fouten: ${overview.bridge.commandsFailed}`
      : "• Geen bridge heartbeat gevonden",
    "",
    "🔄 Sync:",
    ...syncLines,
    "",
    "🔌 Integraties:",
    ...integrationLines.slice(0, 12),
  ].join("\n"));
}

async function sendPending(ctx: ActionCtx, chatId: number) {
  const pending = await getPendingActions(ctx);
  await sendPlainText(chatId, buildPendingText(pending));
}

async function cancelPending(ctx: ActionCtx, chatId: number, arg: string) {
  const pending = await getPendingActions(ctx);
  if (!pending.length) {
    await sendPlainText(chatId, "✅ Geen open acties om te annuleren.");
    return;
  }

  const target = normalizeCode(arg);
  if (!target) {
    if (pending.length === 1) {
      await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
        id: pending[0]._id,
        status: "cancelled",
      });
      await sendPlainText(chatId, `✅ Geannuleerd: ${pending[0].summary}`);
      return;
    }
    await sendPlainText(chatId, `${buildPendingText(pending)}\n\nGeef een code mee: /cancel CODE`);
    return;
  }

  if (["ALL", "ALLE", "ALLES"].includes(target)) {
    for (const action of pending) {
      await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
        id: action._id,
        status: "cancelled",
      });
    }
    await sendPlainText(chatId, `✅ ${pending.length} open acties geannuleerd.`);
    return;
  }

  const action = pending.find((item) => item.code === target);
  if (!action) {
    await sendPlainText(chatId, `Ik zie geen open actie met code ${target}.\n\n${buildPendingText(pending)}`);
    return;
  }

  await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
    id: action._id,
    status: "cancelled",
  });
  await sendPlainText(chatId, `✅ Geannuleerd: ${action.summary}`);
}

async function sendPreferences(ctx: ActionCtx, chatId: number) {
  const preferences = await ctx.runQuery(internal.brainPreferences.getInternal, {
    userId: OWNER_USER_ID,
  }) as BrainPreferences;
  await sendPlainText(chatId, buildPreferencesText(preferences));
}

async function updatePreference(ctx: ActionCtx, chatId: number, arg: string) {
  const [rawKey, ...rest] = arg.trim().split(/\s+/).filter(Boolean);
  const key = rawKey?.toLowerCase();
  const value = rest.join(" ").trim();

  if (!key || !value) {
    await sendPreferences(ctx, chatId);
    return;
  }

  const update: Partial<BrainPreferences> = {};
  if (["detail", "detailniveau"].includes(key)) {
    if (!["kort", "normaal", "uitgebreid"].includes(value)) {
      await sendPlainText(chatId, "Detailniveau moet zijn: kort, normaal of uitgebreid.");
      return;
    }
    update.detailLevel = value as BrainPreferences["detailLevel"];
  } else if (["toon", "tone"].includes(key)) {
    if (!["direct", "warm", "coachend"].includes(value)) {
      await sendPlainText(chatId, "Toon moet zijn: direct, warm of coachend.");
      return;
    }
    update.tone = value as BrainPreferences["tone"];
  } else if (["proactief", "proactive"].includes(key)) {
    if (!["laag", "normaal", "hoog"].includes(value)) {
      await sendPlainText(chatId, "Proactiviteit moet zijn: laag, normaal of hoog.");
      return;
    }
    update.proactiveLevel = value as BrainPreferences["proactiveLevel"];
  } else if (key === "focus") {
    update.focusAreas = value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 10);
  } else if (key === "briefing") {
    if (!isTime(value)) {
      await sendPlainText(chatId, "Gebruik HH:MM, bijvoorbeeld /pref briefing 08:00.");
      return;
    }
    update.briefingTime = value;
  } else if (["stil", "stilleuren", "quiet"].includes(key)) {
    const [start, end] = rest;
    if (!start || !end || !isTime(start) || !isTime(end)) {
      await sendPlainText(chatId, "Gebruik: /pref stil 23:00 07:00.");
      return;
    }
    update.quietHoursStart = start;
    update.quietHoursEnd = end;
  } else {
    await sendPlainText(chatId, `Onbekende voorkeur: ${key}\n\n${buildPreferencesText(await ctx.runQuery(internal.brainPreferences.getInternal, { userId: OWNER_USER_ID }) as BrainPreferences)}`);
    return;
  }

  const result = await ctx.runMutation(internal.brainPreferences.updateInternal, {
    userId: OWNER_USER_ID,
    ...update,
  }) as { preferences: BrainPreferences };

  await sendPlainText(chatId, [
    "✅ Brain voorkeur bijgewerkt.",
    "",
    buildPreferencesText(result.preferences),
  ].join("\n"));
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

type PendingAction = {
  _id: Id<"aiPendingActions">;
  agentId: string;
  toolName: string;
  summary: string;
  code: string;
  expiresAt: string;
  createdAt: string;
};

type BrainPreferences = {
  detailLevel: "kort" | "normaal" | "uitgebreid";
  tone: "direct" | "warm" | "coachend";
  proactiveLevel: "laag" | "normaal" | "hoog";
  focusAreas: string[];
  briefingTime?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
};

type SyncOverview = {
  status: string;
  lastSuccessAt?: string | null;
};

type SystemOverview = {
  sync?: Record<string, SyncOverview>;
  bridge?: {
    online?: boolean;
    status?: string;
    lastSeenAt?: string | null;
    commandsFailed?: number;
  } | null;
  confirmations?: { pending?: number };
  commands?: { failed?: number };
  devices?: { on?: number; total?: number; online?: number };
  email?: { unread?: number; lastFullSync?: string | null };
  schedule?: { upcoming?: number; importedAt?: string | null };
  data?: { notes?: number; activeHabits?: number };
  integrations?: Record<string, boolean>;
};

async function processText(ctx: ActionCtx, chatId: number, text: string): Promise<void> {
  if (text === "/start") { await sendMessage(chatId, buildWelcomeText()); return; }
  if (text === "/help")  { await sendMessage(chatId, buildHelpText()); return; }

  // Sla user bericht op
  await ctx.runMutation(internal.chatMessages.save, { chatId, role: "user", content: text });

  const cmd = text.split(" ")[0].toLowerCase().replace(/@\w+/, "");
  const customVraag = text.slice(cmd.length).trim();

  if (cmd === "/status" || cmd === "/health") {
    await sendStatus(ctx, chatId);
    return;
  }

  if (cmd === "/pending") {
    await sendPending(ctx, chatId);
    return;
  }

  if (cmd === "/cancel" || cmd === "/annuleer") {
    await cancelPending(ctx, chatId, customVraag);
    return;
  }

  if (cmd === "/confirm" || cmd === "/bevestig") {
    await sendTyping(chatId);
    const vraag = customVraag ? `bevestig ${customVraag}` : "bevestig";
    const result = await ctx.runAction(internal.ai.grok.chat.chat, {
      vraag,
      agentId: "brain",
      history: [],
    }) as GrokChatResult;
    await saveAndReply(ctx, chatId, result, "brain");
    return;
  }

  if (cmd === "/prefs") {
    await sendPreferences(ctx, chatId);
    return;
  }

  if (cmd === "/pref") {
    await updatePreference(ctx, chatId, customVraag);
    return;
  }

  // Lamp commando → direct uitvoeren
  const lampCmd = detectLampCommand(text);
  if (lampCmd) {
    await ctx.runMutation(internal.deviceCommands.queueCommand, {
      userId: OWNER_USER_ID, command: lampCmd.command, bron: "telegram",
    });
    const reply = `💡 ${lampCmd.beschrijving} — commando verstuurd!`;
    await ctx.runMutation(internal.chatMessages.save, { chatId, role: "assistant", content: reply, agentId: "lampen" });
    await sendPlainText(chatId, reply);
    return;
  }

  // Chat history laden
  const history = await ctx.runQuery(internal.chatMessages.getHistory, { chatId, limit: 10 }) as ChatHistoryMessage[];
  const grokHistory = history.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));

  // Slash commando routing
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

  // Vrije tekst → centrale routing. Agenda-intenties gaan direct naar de
  // Agenda specialist; brede zoekvragen krijgen een cross-domain guardrail.
  await sendTyping(chatId);
  const routed = routeFreeText(text);
  const result = await ctx.runAction(internal.ai.grok.chat.chat, {
    vraag: routed.vraag, agentId: routed.agentId, history: grokHistory,
  }) as GrokChatResult;
  await saveAndReply(ctx, chatId, result, routed.agentId);
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
    const cleanAnswer = normalizeAssistantText(result.antwoord);
    let antwoord = escapeHtml(cleanAnswer);
    if (antwoord.length > 4000) antwoord = antwoord.slice(0, 3997) + "...";
    await ctx.runMutation(internal.chatMessages.save, { chatId, role: "assistant" as const, content: cleanAnswer, agentId });
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
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Niet ingelogd");
    const me = await getMe() as { username: string; first_name: string; id: number };
    const webhook = await getWebhookInfo() as {
      url?: string;
      has_custom_certificate?: boolean;
      pending_update_count?: number;
      last_error_date?: number;
      last_error_message?: string;
      max_connections?: number;
    };
    const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;
    return {
      ok: true,
      bot: me,
      ownerConfigured: Boolean(ownerChatId),
      ownerChatSuffix: ownerChatId ? ownerChatId.slice(-4) : null,
      webhookSecretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
      webhook: {
        configured: Boolean(webhook.url),
        urlHost: safeUrlHost(webhook.url),
        pendingUpdateCount: webhook.pending_update_count ?? 0,
        lastErrorDate: webhook.last_error_date ?? null,
        lastErrorMessage: webhook.last_error_message ?? null,
        maxConnections: webhook.max_connections ?? null,
      },
    };
  },
});
