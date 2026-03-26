/**
 * convex/ai/grok/chat.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Grok AI Chat Action — the public API for the AI system.
 * Clean orchestrator: receives a question, routes through tools, returns answer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { action } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { AGENT_REGISTRY } from "../registry";

import {
  GROK_API_URL, GROK_MODEL, OWNER_USER_ID, MAX_TOOL_ROUNDS,
  safeJsonParse,
  type GrokMessage, type GrokResponse, type AgentContextResult,
} from "./types";
import { TOOLS } from "./tools/definitions";
import { executeTool } from "./tools/executor";
import { buildSystemPrompt } from "./prompt";

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
            stream: false, temperature: 0.3, max_tokens: 2500,
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
          const toolArgs = safeJsonParse(toolCall.function.arguments);
          if (!toolArgs) {
            messages.push({
              role: "tool",
              content: JSON.stringify({ error: `Ongeldige JSON in tool arguments: ${toolCall.function.arguments.slice(0, 100)}` }),
              tool_call_id: toolCall.id,
            });
            continue;
          }
          const toolResult = await executeTool(ctx, toolCall.function.name, toolArgs, userId || OWNER_USER_ID);
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
