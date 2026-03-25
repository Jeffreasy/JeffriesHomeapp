/**
 * convex/ai/grok.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Grok AI Chat met Tool Calling — kan zelf data ophalen op verzoek.
 *
 * Tools:
 *   - leesEmail(gmailId)    → volledige email body ophalen
 *   - zoekEmails(zoekterm)  → emails doorzoeken
 *   - lampStatus()          → live lamp status
 *   - lampBedien(actie)     → lamp aan/uit/dim command queuen
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { AGENT_REGISTRY, toMeta } from "./registry";
import type { AgentMeta } from "./registry";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_MODEL   = "grok-4-1-fast";
const OWNER_USER_ID = "user_3Ax561ZvuSkGtWpKFooeY65HNtY";
const MAX_TOOL_ROUNDS = 3;

// ─── Tool Definitions (xAI function calling format) ──────────────────────────

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "leesEmail",
      description: "Haal de volledige inhoud (body, van, aan, onderwerp, bijlagen) van een specifiek email bericht op via Gmail ID. Gebruik dit wanneer de gebruiker vraagt om een email te lezen of meer context wil over een specifiek bericht.",
      parameters: {
        type: "object",
        properties: {
          gmailId: { type: "string", description: "Het Gmail bericht ID (bijv. '1945a3b2c4d5e6f7')" },
        },
        required: ["gmailId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "zoekEmails",
      description: "Doorzoek alle emails op onderwerp, afzender of inhoud. Gebruik dit als de gebruiker vraagt naar een specifieke email, afzender of onderwerp.",
      parameters: {
        type: "object",
        properties: {
          zoekterm: { type: "string", description: "Zoekterm (doorzoekt subject, snippet, afzender)" },
        },
        required: ["zoekterm"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "lampBedien",
      description: "Bedien de WiZ lampen: aan/uit zetten, helderheid aanpassen. Gebruik dit als de gebruiker vraagt om lampen te bedienen.",
      parameters: {
        type: "object",
        properties: {
          actie: { type: "string", enum: ["aan", "uit", "dim", "vol"], description: "Wat te doen met de lampen" },
          helderheid: { type: "number", description: "Helderheid percentage (1-100), optioneel" },
        },
        required: ["actie"],
      },
    },
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────────────

async function executeTool(
  ctx: any,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  switch (toolName) {
    case "leesEmail": {
      try {
        const result = await ctx.runAction(api.actions.getGmailBody.getBody, {
          userId: OWNER_USER_ID,
          gmailId: args.gmailId as string,
        });
        // Truncate HTML, geef text body + metadata
        const body = result.text || result.html?.replace(/<[^>]+>/g, " ").slice(0, 2000) || "(geen body)";
        return JSON.stringify({
          van: result.from, aan: result.to, cc: result.cc,
          onderwerp: result.subject, datum: result.date,
          body: body.slice(0, 2000),
          bijlagen: result.attachments?.map((a: any) => a.filename) ?? [],
        });
      } catch (err) {
        return JSON.stringify({ error: `Kon email niet ophalen: ${(err as Error).message}` });
      }
    }

    case "zoekEmails": {
      try {
        const zoekterm = (args.zoekterm as string).toLowerCase();
        const allEmails = await ctx.runQuery(api.emails.list, {
          userId: OWNER_USER_ID,
        });
        const matches = allEmails
          .filter((e: any) =>
            e.subject?.toLowerCase().includes(zoekterm) ||
            e.from?.toLowerCase().includes(zoekterm) ||
            e.snippet?.toLowerCase().includes(zoekterm)
          )
          .slice(0, 10)
          .map((e: any) => ({
            gmailId: e.gmailId, van: e.from?.replace(/<.*>/, "").trim(),
            onderwerp: e.subject, snippet: e.snippet?.slice(0, 80),
            datum: e.datum, gelezen: e.isGelezen,
          }));
        return JSON.stringify({ resultaten: matches.length, emails: matches });
      } catch (err) {
        return JSON.stringify({ error: `Zoeken mislukt: ${(err as Error).message}` });
      }
    }

    case "lampBedien": {
      const actie = args.actie as string;
      const cmd: Record<string, unknown> = {};
      if (actie === "aan") cmd.on = true;
      else if (actie === "uit") cmd.on = false;
      else if (actie === "dim") cmd.brightness = (args.helderheid as number) ?? 30;
      else if (actie === "vol") cmd.brightness = 100;

      try {
        await ctx.runMutation(api.deviceCommands.queueCommand, {
          userId: OWNER_USER_ID, command: cmd, bron: "grok",
        });
        return JSON.stringify({ ok: true, actie, beschrijving: `Lampen ${actie} — commando verstuurd` });
      } catch (err) {
        return JSON.stringify({ error: `Lamp commando mislukt: ${(err as Error).message}` });
      }
    }

    default:
      return JSON.stringify({ error: `Onbekende tool: ${toolName}` });
  }
}

// ─── System Prompt ───────────────────────────────────────────────────────────

function buildSystemPrompt(agentMeta: AgentMeta, context: Record<string, unknown>): string {
  return `Je bent "${agentMeta.naam}" ${agentMeta.emoji} — Jeffrey's persoonlijke AI-assistent.

## Jouw Rol
${agentMeta.beschrijving}

## Wat je kunt
${agentMeta.capabilities.map((c) => `- ${c}`).join("\n")}

## Tools
Je hebt toegang tot tools waarmee je acties kunt uitvoeren:
- leesEmail(gmailId) — Volledige email inhoud ophalen. Gebruik gmailId uit de context hieronder.
- zoekEmails(zoekterm) — Emails doorzoeken op onderwerp/afzender.
- lampBedien(actie) — Lampen bedienen (aan/uit/dim/vol).

## Live Data (nu)
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

## REGELS
1. Antwoord ALTIJD direct — verwijs NOOIT naar een andere agent.
2. Gebruik de tools als de gebruiker om specifieke info vraagt (bijv. "lees die email" → leesEmail).
3. Als je emails ziet in de context met gmailId, GEBRUIK leesEmail() om de inhoud op te halen als gevraagd.
4. Antwoord in het Nederlands, beknopt.
5. Geen markdown (geen ** of \`\`\`) — dit is voor Telegram.
6. Wees proactief — bied aan om emails te lezen als de gebruiker vraagt over een onderwerp.`;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface GrokMessage {
  role: string;
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface GrokResponse {
  choices: Array<{ message: GrokMessage; finish_reason: string }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface AgentContextResult {
  ok: boolean;
  agent?: AgentMeta;
  context?: Record<string, unknown>;
  error?: string;
}

// ─── Chat Action ─────────────────────────────────────────────────────────────

export const chat = action({
  args: {
    userId:   v.string(),
    vraag:    v.string(),
    agentId:  v.optional(v.string()),
    history:  v.optional(v.array(v.object({
      role:    v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }))),
  },
  handler: async (ctx, { userId, vraag, agentId, history }): Promise<{
    ok: boolean;
    agent?: { id: string; naam: string; emoji: string };
    antwoord?: string;
    tokens?: GrokResponse["usage"];
    error?: string;
    beschikbaar?: Array<{ id: string; naam: string }>;
  }> => {
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return { ok: false, error: "GROK_API_KEY niet geconfigureerd" };

    const targetId = agentId ?? "dashboard";

    // ── Haal live agent context op ─────────────────────────────────────────
    const result: AgentContextResult = await ctx.runQuery(
      internal.ai.router.internalGetAgentContext,
      { agentId: targetId, userId },
    );

    if (!result.ok || !result.agent || !result.context) {
      return {
        ok: false,
        error: result.error ?? "Context ophalen mislukt",
        beschikbaar: AGENT_REGISTRY.map((a) => ({ id: a.id, naam: a.naam })),
      };
    }

    // ── Build messages ────────────────────────────────────────────────────
    const messages: GrokMessage[] = [
      { role: "system", content: buildSystemPrompt(result.agent, result.context) },
    ];
    if (history?.length) {
      for (const msg of history) messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: vraag });

    // ── Chat loop met tool calling ────────────────────────────────────────
    let totalTokens: GrokResponse["usage"] | undefined;

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const response = await fetch(GROK_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: GROK_MODEL, messages, tools: TOOLS,
            stream: false, temperature: 0.3, max_tokens: 1500,
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          return { ok: false, error: `Grok ${response.status}: ${errText.slice(0, 200)}` };
        }

        const data: GrokResponse = await response.json();
        totalTokens = data.usage;
        const choice = data.choices[0];
        if (!choice) return { ok: false, error: "Geen response van Grok" };

        const msg = choice.message;
        messages.push(msg);

        // ── Geen tool calls → klaar ──────────────────────────────────────
        if (choice.finish_reason !== "tool_calls" || !msg.tool_calls?.length) {
          return {
            ok: true,
            agent: { id: targetId, naam: result.agent.naam, emoji: result.agent.emoji },
            antwoord: msg.content ?? "",
            tokens: totalTokens,
          };
        }

        // ── Tool calls uitvoeren ─────────────────────────────────────────
        for (const toolCall of msg.tool_calls) {
          const toolArgs = JSON.parse(toolCall.function.arguments);
          const toolResult = await executeTool(ctx, toolCall.function.name, toolArgs);
          messages.push({
            role: "tool",
            content: toolResult,
            tool_call_id: toolCall.id,
          });
        }
        // Loop door → Grok krijgt tool results en antwoordt
      }

      // Max rounds bereikt
      const lastMsg = messages[messages.length - 1];
      return {
        ok: true,
        agent: { id: targetId, naam: result.agent.naam, emoji: result.agent.emoji },
        antwoord: (lastMsg.content as string) ?? "Ik heb te veel data moeten ophalen. Probeer een specifiekere vraag.",
        tokens: totalTokens,
      };
    } catch (err: unknown) {
      return { ok: false, error: `Grok request failed: ${(err as Error).message}` };
    }
  },
});
