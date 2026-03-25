/**
 * convex/ai/grok.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Grok AI Chat — Verbindt de Agent Agency met xAI's Grok model.
 *
 * Flow:
 *   1. Gebruiker stuurt vraag + optioneel agentId
 *   2. Haal agent context op via router.internalGetAgentContext
 *   3. Injecteer als system prompt → stuur naar Grok API
 *   4. Retourneer antwoord met token usage
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { AGENT_REGISTRY, toMeta } from "./registry";
import type { AgentMeta } from "./registry";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_MODEL   = "grok-4-1-fast";

/** Build system prompt met agent context. */
function buildSystemPrompt(
  agentMeta: AgentMeta,
  context: Record<string, unknown>,
): string {
  return `Je bent "${agentMeta.naam}" ${agentMeta.emoji} — een gespecialiseerde AI-assistent voor Jeffrey's Homeapp.

## Jouw Rol
${agentMeta.beschrijving}

## Capabilities
${agentMeta.capabilities.map((c) => `- ${c}`).join("\n")}

## Beschikbare Tools
${agentMeta.tools.map((t) => `- ${t.naam} (${t.type}${t.methode ? ` ${t.methode}` : ""}): ${t.beschrijving}`).join("\n")}

## Live Data (op dit moment)
\`\`\`json
${JSON.stringify(context, null, 2)}
\`\`\`

## Regels
- Antwoord in het Nederlands tenzij anders gevraagd.
- Wees beknopt, direct, en informatief.
- Gebruik de live data hierboven — verwijs naar specifieke waarden.
- Als de vraag buiten jouw domein valt, verwijs naar de juiste agent.
- Beschikbare agents: ${AGENT_REGISTRY.map((a) => `${a.emoji} ${a.id}`).join(", ")}`;
}

interface GrokResponse {
  choices: Array<{ message: { content: string } }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface AgentContextResult {
  ok: boolean;
  agent?: AgentMeta;
  context?: Record<string, unknown>;
  error?: string;
}

/**
 * Chat met een specifieke agent — Grok beantwoordt vragen op basis van live data.
 */
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

    // ── Haal live agent context op via router ─────────────────────────────
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
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: buildSystemPrompt(result.agent, result.context) },
    ];
    if (history?.length) {
      for (const msg of history) messages.push({ role: msg.role, content: msg.content });
    }
    messages.push({ role: "user", content: vraag });

    // ── Call Grok API ─────────────────────────────────────────────────────
    try {
      const response = await fetch(GROK_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: GROK_MODEL, messages, stream: false, temperature: 0.3, max_tokens: 1024 }),
      });

      if (!response.ok) {
        const errText = await response.text();
        return { ok: false, error: `Grok ${response.status}: ${errText.slice(0, 200)}` };
      }

      const data: GrokResponse = await response.json();
      return {
        ok: true,
        agent: { id: targetId, naam: result.agent.naam, emoji: result.agent.emoji },
        antwoord: data.choices[0]?.message.content ?? "",
        tokens: data.usage,
      };
    } catch (err: unknown) {
      return { ok: false, error: `Grok request failed: ${(err as Error).message}` };
    }
  },
});
