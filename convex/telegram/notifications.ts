"use node";

/**
 * Proactieve Telegram meldingen voor Jeffries Brain.
 *
 * Wordt aangeroepen vanuit Convex crons. Dedupe loopt via auditLogs zodat een
 * haperende cron of deployment geen spam veroorzaakt.
 */

import { internalAction, type ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { sendMessage } from "./api";

type BrainPreferences = {
  proactiveLevel: "laag" | "normaal" | "hoog";
  briefingTime?: string;
  quietHoursStart?: string;
  quietHoursEnd?: string;
};

type SystemOverview = {
  bridge?: { online?: boolean; status?: string; lastSeenAt?: string | null; lastError?: string | null } | null;
  commands?: { failed?: number };
  confirmations?: { pending?: number };
  sync?: Record<string, { status: string; lastError?: string | null; lastErrorAt?: string | null }>;
};

function getOwnerChatId(): number {
  const ownerChatId = process.env.TELEGRAM_OWNER_CHAT_ID;
  if (!ownerChatId) throw new Error("TELEGRAM_OWNER_CHAT_ID niet geconfigureerd");
  return Number(ownerChatId);
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function amsterdamTime(): string {
  return new Date().toLocaleTimeString("nl-NL", {
    timeZone: "Europe/Amsterdam",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function minutesOfDay(value: string): number | null {
  const match = value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function isWithinBriefingWindow(targetTime?: string): boolean {
  const target = minutesOfDay(targetTime ?? "08:00");
  const now = minutesOfDay(amsterdamTime());
  if (target == null || now == null) return false;
  const diff = (now - target + 1440) % 1440;
  return diff >= 0 && diff < 15;
}

function isQuietNow(preferences: BrainPreferences): boolean {
  const start = minutesOfDay(preferences.quietHoursStart ?? "23:00");
  const end = minutesOfDay(preferences.quietHoursEnd ?? "07:00");
  const now = minutesOfDay(amsterdamTime());
  if (start == null || end == null || now == null) return false;
  if (start < end) return now >= start && now < end;
  return now >= start || now < end;
}

function since(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

async function alreadySent(ctx: ActionCtx, userId: string, action: string, hours: number) {
  return await ctx.runQuery(internal.auditLogs.hasRecentInternal, {
    userId,
    source: "telegram.notifications",
    action,
    sinceIso: since(hours),
  }) as boolean;
}

async function recordNotification(ctx: ActionCtx, userId: string, action: string, status: string, summary: string, metadata?: Record<string, unknown>) {
  await ctx.runMutation(internal.auditLogs.recordInternal, {
    userId,
    actor: "system",
    source: "telegram.notifications",
    action,
    entity: "telegramMessage",
    status,
    summary,
    ...(metadata ? { metadata: JSON.stringify(metadata) } : {}),
  });
}

export const sendScheduledBriefing = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const preferences = await ctx.runQuery(internal.brainPreferences.getInternal, { userId }) as BrainPreferences;
    if (!isWithinBriefingWindow(preferences.briefingTime)) {
      return { ok: true, sent: false, reason: "outside-window" };
    }
    if (await alreadySent(ctx, userId, "daily-briefing", 20)) {
      return { ok: true, sent: false, reason: "already-sent" };
    }

    const result = await ctx.runAction(internal.ai.grok.chat.chat, {
      agentId: "brain",
      history: [],
      vraag: "Maak mijn proactieve ochtendbriefing voor vandaag. Focus op planning, afspraken, relevante notities, habits, emails die aandacht nodig hebben, systeemstatus en concrete acties. Houd het Telegram-vriendelijk.",
    }) as { ok: boolean; antwoord?: string; error?: string };

    const text = result.ok && result.antwoord
      ? result.antwoord
      : `Ochtendbriefing kon niet worden gemaakt: ${result.error ?? "onbekende fout"}`;

    await sendMessage(getOwnerChatId(), escapeHtml(text));
    await recordNotification(ctx, userId, "daily-briefing", result.ok ? "success" : "failed", "Dagelijkse Telegram briefing verstuurd", {
      briefingTime: preferences.briefingTime ?? "08:00",
    });
    return { ok: result.ok, sent: true };
  },
});

export const sendHealthAlert = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const preferences = await ctx.runQuery(internal.brainPreferences.getInternal, { userId }) as BrainPreferences;
    if (preferences.proactiveLevel === "laag") {
      return { ok: true, sent: false, reason: "proactive-low" };
    }
    if (isQuietNow(preferences) && preferences.proactiveLevel !== "hoog") {
      return { ok: true, sent: false, reason: "quiet-hours" };
    }

    const overview = await ctx.runQuery(internal.settings.getOverviewInternal, { userId }) as SystemOverview;
    const problems: string[] = [];

    if (!overview.bridge?.online) {
      problems.push(`🌉 Bridge offline of geen recente heartbeat (laatst: ${overview.bridge?.lastSeenAt ?? "onbekend"})`);
    }
    if ((overview.commands?.failed ?? 0) > 0) {
      problems.push(`💡 ${overview.commands?.failed} lamp/bridge commando's mislukt`);
    }
    for (const [source, status] of Object.entries(overview.sync ?? {})) {
      if (status.status === "failed") {
        problems.push(`🔄 ${source} sync faalt${status.lastError ? `: ${status.lastError}` : ""}`);
      }
    }
    if (preferences.proactiveLevel === "hoog" && (overview.confirmations?.pending ?? 0) > 0) {
      problems.push(`🧾 ${overview.confirmations?.pending} AI-actie(s) wachten op bevestiging`);
    }

    if (!problems.length) return { ok: true, sent: false, reason: "healthy" };
    if (await alreadySent(ctx, userId, "health-alert", 4)) {
      return { ok: true, sent: false, reason: "already-sent" };
    }

    const text = [
      "⚠️ HOMEAPP AANDACHT NODIG",
      "━━━━━━━━━━━━━━━━",
      ...problems.slice(0, 8).map((problem) => `• ${problem}`),
      "",
      "Gebruik /status voor het volledige overzicht.",
    ].join("\n");

    await sendMessage(getOwnerChatId(), escapeHtml(text));
    await recordNotification(ctx, userId, "health-alert", "success", `${problems.length} aandachtspunt(en) gemeld`, {
      problems,
    });
    return { ok: true, sent: true, problems: problems.length };
  },
});
