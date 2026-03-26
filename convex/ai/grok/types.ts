/**
 * convex/ai/grok/types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared types, constants, and helpers for the Grok AI system.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { JEFFREY_USER_ID } from "../../lib/config";

export const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
export const GROK_MODEL   = "grok-4-1-fast";
export const OWNER_USER_ID = JEFFREY_USER_ID;
export const MAX_TOOL_ROUNDS = 5;

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface GrokMessage {
  role: string;
  content?: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export interface GrokResponse {
  choices: Array<{ message: GrokMessage; finish_reason: string }>;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface AgentContextResult {
  ok: boolean;
  agent?: import("../registry").AgentMeta;
  context?: Record<string, unknown>;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** CET/CEST-aware date: returns YYYY-MM-DD in Amsterdam timezone. */
export function todayCET(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Amsterdam" });
}

/** Safe JSON.parse: returns parsed object or null on failure. */
export function safeJsonParse(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(str);
  } catch {
    try {
      const cleaned = str.replace(/,\s*([}\]])/g, "$1");
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }
}

/** ISO week number helper. */
export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// ─── Shared Constants ────────────────────────────────────────────────────────

export const MAAND_NAMEN = ["", "Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli", "Augustus", "September", "Oktober", "November", "December"];
export const WEEKDAYS = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

// ─── Finance Constants ───────────────────────────────────────────────────────

export const IBAN_LABELS: Record<string, string> = {
  "NL41RABO0348147740": "Spaarrekening",
  "NL20RABO0198574215": "Betaalrekening",
};

export const DB_CATEGORIEEN = [
  "Boodschappen", "Brandstof", "Coffeeshop", "Crypto", "Familie", "Fastfood",
  "Gaming", "Geldopname", "Interne Overboeking", "Online Winkelen", "Persoonlijk",
  "SaaS", "SaaS Abonnementen", "Salaris", "Sport", "Streaming", "Telecom",
  "Toeslagen", "Vakantie", "Vaste Lasten", "Vervoer", "Verzekeringen",
  "Vrienden", "Vrije Tijd", "Zakelijk", "Zorgverzekering",
] as const;
