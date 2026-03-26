/**
 * convex/ai/grok/tools/executor.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin router — maps tool names to domain-specific handlers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  handleLeesEmail, handleZoekEmails, handleMarkeerGelezen,
  handleVerwijderEmail, handleMarkeerSter, handleEmailVersturen,
  handleEmailBeantwoorden, handleBulkMarkeerGelezen,
  handleBulkVerwijder, handleInboxOpruimen,
} from "./email";
import { handleLampBedien } from "./smarthome";
import { handleDienstenOpvragen, handleSalarisOpvragen } from "./schedule";
import {
  handleSaldoOpvragen, handleTransactiesZoeken, handleUitgavenOverzicht,
  handleMaandVergelijken, handleVasteLastenAnalyse, handleCategorieWijzigen,
} from "./finance";
import {
  handleAfspraakBewerken, handleAfspraakMaken, handleAfspraakVerwijderen, handleAfsprakenOpvragen,
} from "./calendar";

// ─── Tool name → handler mapping ─────────────────────────────────────────────

type ToolHandler = (ctx: any, args: Record<string, unknown>, userId: string) => Promise<string>;

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  // Email
  leesEmail:          handleLeesEmail,
  zoekEmails:         handleZoekEmails,
  markeerGelezen:     handleMarkeerGelezen,
  verwijderEmail:     handleVerwijderEmail,
  markeerSter:        handleMarkeerSter,
  emailVersturen:     handleEmailVersturen,
  emailBeantwoorden:  handleEmailBeantwoorden,
  bulkMarkeerGelezen: handleBulkMarkeerGelezen,
  bulkVerwijder:      handleBulkVerwijder,
  inboxOpruimen:      handleInboxOpruimen,

  // Smart Home
  lampBedien:         handleLampBedien,

  // Schedule & Salary
  dienstenOpvragen:   handleDienstenOpvragen,
  salarisOpvragen:    handleSalarisOpvragen,

  // Finance
  saldoOpvragen:       handleSaldoOpvragen,
  transactiesZoeken:   handleTransactiesZoeken,
  uitgavenOverzicht:   handleUitgavenOverzicht,
  maandVergelijken:    handleMaandVergelijken,
  vasteLastenAnalyse:  handleVasteLastenAnalyse,
  categorieWijzigen:   handleCategorieWijzigen,

  // Calendar
  afspraakMaken:       handleAfspraakMaken,
  afspraakBewerken:    handleAfspraakBewerken,
  afspraakVerwijderen: handleAfspraakVerwijderen,
  afsprakenOpvragen:   handleAfsprakenOpvragen,
};

// ─── Public API ──────────────────────────────────────────────────────────────

export async function executeTool(
  ctx: any,
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<string> {
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    return JSON.stringify({ error: `Onbekende tool: ${toolName}` });
  }
  return handler(ctx, args, userId);
}
