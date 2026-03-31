/**
 * convex/ai/registry.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Agent Agency — Type definities + centraal register.
 *
 * Nieuwe agent toevoegen:
 *   1. Maak convex/ai/agents/{naam}.ts
 *   2. Exporteer een AgentDefinition
 *   3. Importeer hier en voeg toe aan AGENT_REGISTRY
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { QueryCtx } from "../_generated/server";

// ─── Types ──────────────────────────────────────────────────────────────────

/** JSON Schema-achtige parameter definitie voor Grok tool calling. */
export interface ToolParameter {
  naam:         string;
  type:         "string" | "number" | "boolean" | "array" | "object";
  beschrijving: string;
  verplicht:    boolean;
  enum?:        string[];               // Toegestane waarden
  default?:     unknown;
}

export interface AgentTool {
  naam:         string;
  type:         "query" | "mutation" | "action";
  beschrijving: string;
  endpoint?:    string;                  // HTTP route als die bestaat
  methode?:     "GET" | "POST";          // HTTP methode (default: GET voor queries)
  parameters:   ToolParameter[];         // Strikte parameter schema's
}

/** Context opties — voor delegation en token-limiet controle. */
export interface ContextOptions {
  lite?: boolean;                        // true = compact versie (voor dashboard delegation)
}

export interface AgentDefinition {
  id:           string;
  naam:         string;
  emoji:        string;
  beschrijving: string;
  domein:       string[];                // Convex tabellen die deze agent kent
  capabilities: string[];               // Wat kan deze agent doen
  tools:        AgentTool[];
  getContext:   (ctx: QueryCtx, userId: string, opts?: ContextOptions) => Promise<Record<string, unknown>>;
}

// Metadata-only versie (zonder getContext functie) voor API responses
export type AgentMeta = Omit<AgentDefinition, "getContext">;

export function toMeta(agent: AgentDefinition): AgentMeta {
  return {
    id:            agent.id,
    naam:          agent.naam,
    emoji:         agent.emoji,
    beschrijving:  agent.beschrijving,
    domein:        agent.domein,
    capabilities:  agent.capabilities,
    tools:         agent.tools,
  };
}

// ─── Agent Registry ─────────────────────────────────────────────────────────

// Core agents
import { dashboardAgent }   from "./agents/dashboard";
import { lampenAgent }      from "./agents/lampen";
import { roosterAgent }     from "./agents/rooster";
import { financeAgent }     from "./agents/finance";
import { automationsAgent } from "./agents/automations";

// Email agent (consolidated)
import { emailAgent }           from "./agents/email";

// Notes agent
import { notesAgent }           from "./agents/notes";

// Habits agent
import { habitsAgent }          from "./agents/habits";

export const AGENT_REGISTRY: AgentDefinition[] = [
  // ── Core ──────────────────────────
  dashboardAgent,
  lampenAgent,
  roosterAgent,
  financeAgent,
  automationsAgent,

  // ── Email ──────────────────────────
  emailAgent,

  // ── Notes ──────────────────────────
  notesAgent,

  // ── Habits ─────────────────────────
  habitsAgent,
];

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENT_REGISTRY.find((a) => a.id === id);
}
