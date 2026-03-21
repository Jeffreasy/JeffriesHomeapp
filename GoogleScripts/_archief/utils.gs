/**
 * ============================================================================
 * UTILS.GS — Gedeelde hulpfuncties (Singleton helpers)
 * ============================================================================
 * Bevat functies die door meerdere .gs bestanden worden gebruikt:
 *   safeToast()        — Toast wrapper (opgepakt door main.gs, Salaris.gs, DashboardBuild.gs, Todoist.gs)
 *   _formatDate()      — Datum naar  'yyyy-MM-dd' string (opgepakt door main.gs, Googleagenda.gs)
 *   setupDailyTrigger()  — Registreer een dagelijkse time-based trigger
 *   removeDailyTrigger() — Verwijder alle bestaande triggers
 *
 * ⚠️ Voeg hier GEEN business-logica toe. Alleen pure helpers.
 * ============================================================================
 */

// ============================================================================
// TOAST HELPER
// ============================================================================

/**
 * Veilige wrapper voor Spreadsheet toast-notificaties.
 * Vangt de fout af als er geen actief spreadsheet beschikbaar is
 * (bijv. bij trigger-runs zonder UI context).
 *
 * @param {string} title   - Toast titel
 * @param {string} msg     - Toast bericht
 * @param {number} seconds - Weergave duur in seconden
 */
function safeToast(title, msg, seconds) {
  try {
    SpreadsheetApp.getActiveSpreadsheet().toast(msg, title, seconds);
  } catch (e) {
    Logger.log(`[Toast] ${title}: ${msg}`);
  }
}

// ============================================================================
// DATUM HELPER
// ============================================================================

/**
 * Formatteer een Date object naar 'yyyy-MM-dd' string.
 * Gebruikt de tijdzone van het script om DST-problemen te voorkomen.
 *
 * @param {Date} d - Te formatteren datum
 * @returns {string} Datum in 'yyyy-MM-dd' formaat
 */
function _formatDate(d) {
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

// ============================================================================
// TRIGGER MANAGEMENT
// ============================================================================

/**
 * Registreert een dagelijkse time-based trigger voor syncCalendarToSheet().
 * Veilig om meerdere keren te draaien: verwijdert bestaande triggers eerst.
 *
 * Aanbevolen uur: 6:00 — vóór de werkdag, zodat het rooster altijd actueel is.
 * Run eenmalig via Menu → 🚀 Master Tools → ⏰ Stel Dagelijkse Trigger In.
 */
function setupDailyTrigger() {
  // Verwijder eerst alle bestaande triggers om duplicaten te voorkomen
  removeDailyTrigger();

  ScriptApp.newTrigger('syncCalendarToSheet')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  const msg = '✅ Dagelijkse trigger ingesteld: syncCalendarToSheet draait elke dag om 06:00.';
  Logger.log(msg);
  safeToast('⏰ Trigger Ingesteld', msg, 10);
}

/**
 * Verwijdert ALLE project-triggers die aan syncCalendarToSheet gekoppeld zijn.
 * Gebruik dit als je de trigger wilt resetten of handmatig wilt beheren.
 */
function removeDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let verwijderd = 0;

  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'syncCalendarToSheet') {
      ScriptApp.deleteTrigger(t);
      verwijderd++;
    }
  });

  if (verwijderd > 0) {
    Logger.log(`🗑️ ${verwijderd} bestaande sync-trigger(s) verwijderd.`);
  }
}

/**
 * Toon een overzicht van alle actieve triggers in de logs.
 * Handig voor diagnose.
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  if (triggers.length === 0) {
    Logger.log('ℹ️ Geen actieve triggers gevonden.');
    safeToast('Triggers', 'Geen actieve triggers.', 5);
    return;
  }
  triggers.forEach(t => {
    Logger.log(`Trigger: ${t.getHandlerFunction()} | Type: ${t.getEventType()} | Source: ${t.getTriggerSource()}`);
  });
  safeToast('Triggers', `${triggers.length} trigger(s) actief — zie logs.`, 6);
}
