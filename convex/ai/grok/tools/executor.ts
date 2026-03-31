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
  handleBulkCategoriseren, handleOngelabeldAnalyse,
} from "./finance";
import {
  handleAfspraakBewerken, handleAfspraakMaken, handleAfspraakVerwijderen, handleAfsprakenOpvragen,
} from "./calendar";
import {
  handleNotitieMaken, handleNotitiesZoeken, handleNotitiePinnen,
  handleNotitieBewerken, handleNotitieArchiveren, handleNotitiesOverzicht,
  handleBulkArchiveer,
} from "./notes";
import { handleHabitTool } from "./habits";

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
  bulkCategoriseren:   handleBulkCategoriseren,
  ongelabeldAnalyse:   handleOngelabeldAnalyse,

  // Calendar
  afspraakMaken:       handleAfspraakMaken,
  afspraakBewerken:    handleAfspraakBewerken,
  afspraakVerwijderen: handleAfspraakVerwijderen,
  afsprakenOpvragen:   handleAfsprakenOpvragen,

  // Notes
  notitieMaken:        handleNotitieMaken,
  notitiesZoeken:      handleNotitiesZoeken,
  notitiePinnen:       handleNotitiePinnen,
  notitieBewerken:     handleNotitieBewerken,
  notitieArchiveren:     handleNotitieArchiveren,
  notitiesOverzicht:     handleNotitiesOverzicht,
  bulkArchiveerNotities: handleBulkArchiveer,

  // Habits
  habitAanmaken:       (ctx, args, userId) => handleHabitTool(ctx, "habitAanmaken", args, userId),
  habitVoltooien:      (ctx, args, userId) => handleHabitTool(ctx, "habitVoltooien", args, userId),
  habitIncident:       (ctx, args, userId) => handleHabitTool(ctx, "habitIncident", args, userId),
  habitsOverzicht:     (ctx, args, userId) => handleHabitTool(ctx, "habitsOverzicht", args, userId),
  habitStreaks:        (ctx, args, userId) => handleHabitTool(ctx, "habitStreaks", args, userId),
  habitBadges:         (ctx, args, userId) => handleHabitTool(ctx, "habitBadges", args, userId),
  habitRapport:        (ctx, args, userId) => handleHabitTool(ctx, "habitRapport", args, userId),
  habitNotitie:        (ctx, args, userId) => handleHabitTool(ctx, "habitNotitie", args, userId),
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
