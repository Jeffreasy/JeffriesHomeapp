/**
 * convex/ai/grok/chat.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Grok AI Chat Action. This is internal-only; public callers must enter through
 * Telegram or authenticated HTTP routes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { AGENT_REGISTRY } from "../registry";

import {
  GROK_API_URL, GROK_MODEL, OWNER_USER_ID, MAX_TOOL_ROUNDS,
  safeJsonParse,
  type GrokMessage, type GrokResponse, type AgentContextResult,
} from "./types";
import { executeTool } from "./tools/executor";
import { buildSystemPrompt } from "./prompt";
import {
  describePendingAction,
  getToolsForAgent,
  isMutatingTool,
  isToolAllowed,
  requiresConfirmation,
} from "./tools/policy";

const MAX_QUESTION_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 2500;

type GrokChatResult = {
  ok: boolean;
  agent?: { id: string; naam: string; emoji: string };
  antwoord?: string;
  tokens?: GrokResponse["usage"];
  error?: string;
  beschikbaar?: Array<{ id: string; naam: string }>;
};

type PendingAction = {
  _id: Id<"aiPendingActions">;
  agentId: string;
  toolName: string;
  argsJson: string;
  summary: string;
  code: string;
  expiresAt: string;
};

function parsePendingIntent(text: string): { intent: "confirm" | "cancel" | null; code?: string } {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const code = trimmed.match(/\b([a-z0-9]{6})\b/i)?.[1]?.toUpperCase();

  if (/\b(annuleer|cancel|stop|laat maar)\b/i.test(lower)) {
    return { intent: "cancel", code };
  }
  if (/\b(bevestig|confirm|akkoord|goedgekeurd|uitvoeren|voer uit|doe maar|ja)\b/i.test(lower)) {
    return { intent: "confirm", code };
  }
  if (code) return { intent: "confirm", code };
  return { intent: null };
}

function cleanHistory(history: Array<{ role: "user" | "assistant"; content: string }> | undefined) {
  return (history ?? [])
    .slice(-MAX_HISTORY_MESSAGES)
    .map((msg) => ({
      role: msg.role,
      content: msg.content.slice(0, MAX_HISTORY_CHARS),
    }));
}

function toolResultSummary(result: string): string {
  const parsed = safeJsonParse(result);
  if (parsed?.error) return `Fout: ${String(parsed.error)}`;
  if (parsed?.beschrijving) return String(parsed.beschrijving);
  if (parsed?.ok === true) return "Actie uitgevoerd.";
  return result.slice(0, 500);
}

async function handlePendingIntent(
  ctx: ActionCtx,
  userId: string,
  currentAgentId: string,
  vraag: string,
): Promise<GrokChatResult | null> {
  const intent = parsePendingIntent(vraag);
  if (!intent.intent) return null;

  const pending = await ctx.runQuery(internal.ai.grok.pendingActions.listPending, { userId }) as PendingAction[];
  if (!pending.length) return null;

  const matching = intent.code
    ? pending.filter((action) => action.code === intent.code)
    : pending.filter((action) => action.agentId === currentAgentId);

  const candidates = matching.length ? matching : pending;
  if (candidates.length > 1 && !intent.code) {
    const regels = candidates
      .slice(0, 5)
      .map((action) => `${action.code}: ${action.summary}`)
      .join("\n");
    return {
      ok: true,
      antwoord: `Ik heb meerdere open acties. Bevestig met de code:\n${regels}`,
    };
  }

  const action = candidates[0];
  if (!action) {
    return { ok: true, antwoord: "Ik zie geen open actie met die code." };
  }

  if (intent.intent === "cancel") {
    await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
      id: action._id,
      status: "cancelled",
    });
    return { ok: true, antwoord: `Geannuleerd: ${action.summary}` };
  }

  const claimedAction = await ctx.runMutation(internal.ai.grok.pendingActions.claimForUser, {
    id: action._id,
    userId,
  }) as PendingAction | null;
  if (!claimedAction) {
    return { ok: false, error: "Deze actie is verlopen of wordt al uitgevoerd." };
  }

  if (!isToolAllowed(claimedAction.agentId, claimedAction.toolName)) {
    await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
      id: claimedAction._id,
      status: "failed",
      error: "Tool is niet toegestaan voor deze agent.",
    });
    return { ok: false, error: "Deze actie is niet meer toegestaan voor deze agent." };
  }

  const args = safeJsonParse(claimedAction.argsJson);
  if (!args) {
    await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
      id: claimedAction._id,
      status: "failed",
      error: "Ongeldige opgeslagen tool arguments.",
    });
    return { ok: false, error: "De opgeslagen actie is ongeldig en is niet uitgevoerd." };
  }

  try {
    const result = await executeTool(ctx, claimedAction.toolName, args, userId);
    const parsed = safeJsonParse(result);
    const status = parsed?.error ? "failed" : "confirmed";
    await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
      id: claimedAction._id,
      status,
      ...(status === "confirmed" ? { result } : { error: String(parsed?.error ?? result) }),
    });

    if (status === "failed") {
      return { ok: false, error: toolResultSummary(result) };
    }
    return { ok: true, antwoord: `Uitgevoerd: ${toolResultSummary(result)}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await ctx.runMutation(internal.ai.grok.pendingActions.markStatus, {
      id: claimedAction._id,
      status: "failed",
      error: message,
    });
    return { ok: false, error: `Uitvoeren mislukt: ${message}` };
  }
}

async function createPendingToolResult(
  ctx: ActionCtx,
  userId: string,
  agentId: string,
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const summary = describePendingAction(toolName, args);
  const pending = await ctx.runMutation(internal.ai.grok.pendingActions.create, {
    userId,
    agentId,
    toolName,
    argsJson: JSON.stringify(args),
    summary,
  });

  return JSON.stringify({
    ok: false,
    confirmationRequired: true,
    code: pending.code,
    summary,
    instructie: `Vraag de gebruiker expliciet om te bevestigen met: bevestig ${pending.code}. Zeg duidelijk dat de actie nog NIET is uitgevoerd.`,
  });
}

// ─── Chat Action ─────────────────────────────────────────────────────────────

export const chat = internalAction({
  args: {
    vraag:    v.string(),
    agentId:  v.optional(v.string()),
    history:  v.optional(v.array(v.object({
      role:    v.union(v.literal("user"), v.literal("assistant")),
      content: v.string(),
    }))),
  },
  handler: async (ctx, { vraag, agentId, history }): Promise<GrokChatResult> => {
    const startTime = Date.now();
    const apiKey = process.env.GROK_API_KEY;
    if (!apiKey) return { ok: false, error: "GROK_API_KEY niet geconfigureerd" };

    const cleanVraag = vraag.trim();
    if (!cleanVraag) return { ok: false, error: "Vraag ontbreekt" };
    if (cleanVraag.length > MAX_QUESTION_CHARS) {
      return { ok: false, error: `Vraag is te lang (${cleanVraag.length}/${MAX_QUESTION_CHARS})` };
    }

    const userId = OWNER_USER_ID;
    const targetId = agentId ?? "dashboard";
    const toolsUsed: string[] = [];
    let mutatingToolRequested = false;

    const pendingResult = await handlePendingIntent(ctx, userId, targetId, cleanVraag);
    if (pendingResult) return pendingResult;

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

    const availableTools = getToolsForAgent(targetId);

    // ── Build messages ────────────────────────────────────────────────────
    const messages: GrokMessage[] = [
      { role: "system", content: buildSystemPrompt(result.agent, result.context, availableTools) },
    ];
    for (const msg of cleanHistory(history)) messages.push(msg);
    messages.push({ role: "user", content: cleanVraag });

    // ── Chat loop met tool calling ────────────────────────────────────────
    let totalTokens: GrokResponse["usage"] | undefined;

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const requestBody: Record<string, unknown> = {
          model: GROK_MODEL,
          messages,
          stream: false,
          temperature: 0.3,
          max_tokens: 2500,
        };
        if (availableTools.length) requestBody.tools = availableTools;

        const response = await fetch(GROK_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(requestBody),
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

        if (choice.finish_reason !== "tool_calls" || !msg.tool_calls?.length) {
          const duration = Date.now() - startTime;
          console.log(`[Grok] OK | ${targetId} | ${duration}ms | ${round + 1} round(s) | tools: [${toolsUsed.join(", ") || "none"}] | tokens: ${totalTokens?.total_tokens ?? "?"}`);
          return {
            ok: true,
            agent: { id: targetId, naam: result.agent.naam, emoji: result.agent.emoji },
            antwoord: msg.content ?? "",
            tokens: totalTokens,
          };
        }

        const toolResults: GrokMessage[] = [];
        for (const toolCall of msg.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = safeJsonParse(toolCall.function.arguments);
          if (!toolArgs) {
            toolResults.push({
              role: "tool",
              content: JSON.stringify({ error: `Ongeldige JSON in tool arguments: ${toolCall.function.arguments.slice(0, 100)}` }),
              tool_call_id: toolCall.id,
            });
            continue;
          }

          if (!isToolAllowed(targetId, toolName)) {
            toolResults.push({
              role: "tool",
              content: JSON.stringify({ error: `Tool ${toolName} is niet toegestaan voor agent ${targetId}` }),
              tool_call_id: toolCall.id,
            });
            continue;
          }

          if (isMutatingTool(toolName)) {
            if (mutatingToolRequested) {
              toolResults.push({
                role: "tool",
                content: JSON.stringify({ error: "Er is al een wijzigende actie in deze beurt. Rond eerst die actie af." }),
                tool_call_id: toolCall.id,
              });
              continue;
            }
            mutatingToolRequested = true;
          }

          const toolStart = Date.now();
          const toolResult = requiresConfirmation(toolName)
            ? await createPendingToolResult(ctx, userId, targetId, toolName, toolArgs)
            : await executeTool(ctx, toolName, toolArgs, userId);
          const toolDuration = Date.now() - toolStart;
          toolsUsed.push(`${toolName}(${toolDuration}ms)`);
          toolResults.push({
            role: "tool",
            content: toolResult,
            tool_call_id: toolCall.id,
          });
        }

        for (const tr of toolResults) messages.push(tr);
      }

      const duration = Date.now() - startTime;
      console.log(`[Grok] MAX_ROUNDS | ${targetId} | ${duration}ms | tools: [${toolsUsed.join(", ")}] | tokens: ${totalTokens?.total_tokens ?? "?"}`);
      const lastMsg = messages[messages.length - 1];
      return {
        ok: true,
        agent: { id: targetId, naam: result.agent.naam, emoji: result.agent.emoji },
        antwoord: (lastMsg.content as string) ?? "Ik heb te veel data moeten ophalen. Probeer een specifiekere vraag.",
        tokens: totalTokens,
      };
    } catch (err: unknown) {
      const duration = Date.now() - startTime;
      console.error(`[Grok] ERROR | ${targetId} | ${duration}ms | tools: [${toolsUsed.join(", ")}] | ${(err as Error).message}`);
      return { ok: false, error: `Grok request failed: ${(err as Error).message}` };
    }
  },
});
