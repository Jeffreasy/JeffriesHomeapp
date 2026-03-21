/**
 * ============================================================================
 * PERSONALCALENDAR.GS — Persoonlijke Agenda Conflict Detectie
 * ============================================================================
 * Verantwoordelijk voor:
 *   - Ophalen van events uit de persoonlijke Main kalender (primary)
 *   - Tijdoverlap detectie tussen diensten en persoonlijke afspraken
 *   - Standalone conflict rapport (menu-functie)
 *   - Diagnose functie om kalender-toegang te verifiëren
 *
 * Hoe het werkt:
 *   De Main kalender (laventejeffrey@gmail.com) wordt eenmalig per
 *   sync-run opgehaald. Voor elke dienst wordt gecontroleerd of er
 *   een persoonlijke afspraak is die tijdelijk overlapt.
 *   Overlappen worden opgeslagen in de 'Conflict' kolom van DienstenData.
 *
 * Overlap definitie:
 *   persoonlijkStart < dienstEind  EN  persoonlijkEind > dienstStart
 * ============================================================================
 */

// ============================================================================
// KALENDER OPHALEN (ROBUUST)
// ============================================================================

/**
 * Haal de persoonlijke (Main) kalender op via meerdere fallback-strategieën.
 *
 * Strategie 1: getDefaultCalendar() — werkt altijd als toestemming is verleend
 * Strategie 2: getOwnedCalendarsByName('Main') — expliciete naam opzoeken
 *
 * @returns {GoogleAppsScript.Calendar.Calendar|null}
 */
function _getMainCalendar() {
  // Strategie 1: standaard primaire kalender
  try {
    const cal = CalendarApp.getDefaultCalendar();
    if (cal) return cal;
  } catch (e) {
    Logger.log(`⚠️ getDefaultCalendar fout: ${e.message}`);
  }

  // Strategie 2: kalender opzoeken op naam 'Main'
  try {
    const byName = CalendarApp.getOwnedCalendarsByName('Main');
    if (byName && byName.length > 0) return byName[0];
  } catch (e) {
    Logger.log(`⚠️ getOwnedCalendarsByName fout: ${e.message}`);
  }

  // Strategie 3: kalender opzoeken op naam 'Agenda' (NL interface)
  try {
    const byNL = CalendarApp.getOwnedCalendarsByName('Agenda');
    if (byNL && byNL.length > 0) return byNL[0];
  } catch (e) {
    Logger.log(`⚠️ getOwnedCalendarsByName('Agenda') fout: ${e.message}`);
  }

  Logger.log('❌ Kon de Main kalender niet vinden via getDefaultCalendar of naam-lookup.');
  return null;
}

// ============================================================================
// EVENTS OPHALEN
// ============================================================================

/**
 * Haalt alle events op uit de primaire (Main) kalender voor een gegeven periode.
 * Filtert automatisch SDB/dienst-keywords eruit om dubbele detectie te voorkomen.
 *
 * @param {Date} startDate - Begin van de scan-periode
 * @param {Date} endDate   - Einde van de scan-periode
 * @returns {Array<{title: string, start: Date, end: Date, isAllDay: boolean}>}
 */
function _getPersonalEvents(startDate, endDate) {
  try {
    const cal = _getMainCalendar();
    if (!cal) {
      Logger.log('⚠️ _getPersonalEvents: geen kalender gevonden — conflict detectie uitgeschakeld.');
      return [];
    }

    Logger.log(`📅 Kalender gevonden: "${cal.getName()}" (${cal.getId()})`);
    const events = cal.getEvents(startDate, endDate);
    Logger.log(`📅 ${events.length} totale events in kalender (voor filter).`);

    const dienstKeywords = CONFIG.KEYWORDS_INCLUDE;
    const ignoreKeywords = CONFIG.CONFLICT_KEYWORDS_IGNORE || [];

    const filtered = events.filter(e => {
      const titleLower = e.getTitle().toLowerCase();

      // Filter SDB/dienst-events eruit (staan mogelijk ook in Main via sync)
      if (dienstKeywords.some(k => titleLower.includes(k))) return false;

      // Filter expliciet genegeerde keywords
      if (ignoreKeywords.some(k => titleLower.includes(k.toLowerCase()))) return false;

      return true;
    });

    Logger.log(`✅ ${filtered.length} persoonlijke events na filter.`);
    filtered.forEach(e => Logger.log(`  📌 ${e.getTitle()} | ${e.getStartTime().toISOString()} → ${e.getEndTime().toISOString()}`));

    return filtered.map(e => ({
      title:       e.getTitle(),
      start:       e.getStartTime(),
      end:         e.getEndTime(),
      isAllDay:    e.isAllDayEvent(),
      location:    e.getLocation()    || '',
      description: e.getDescription() || '',
    }));

  } catch (e) {
    Logger.log(`❌ _getPersonalEvents fout: ${e.message}\n${e.stack}`);
    return [];
  }
}

// ============================================================================
// CONFLICT DETECTIE
// ============================================================================

/**
 * Controleert of een dienst overlapt met persoonlijke events.
 * Overlap formule: A.start < B.end  EN  A.end > B.start
 *
 * @param {Date}   dienstStart    - Start van de dienst (GAS Date object)
 * @param {Date}   dienstEnd      - Einde van de dienst (GAS Date object)
 * @param {Array}  personalEvents - Output van _getPersonalEvents()
 * @returns {string} Conflict label of '' (geen conflict)
 */
function _detectConflict(dienstStart, dienstEnd, personalEvents) {
  if (!personalEvents || personalEvents.length === 0) return '';

  const tz = Session.getScriptTimeZone();

  const conflicts = personalEvents.filter(p => {
    if (p.isAllDay) {
      // Hele-dag events: dag-niveau overlap
      const dienstDag = new Date(dienstStart); dienstDag.setHours(0, 0, 0, 0);
      const pDag      = new Date(p.start);     pDag.setHours(0, 0, 0, 0);
      const pEindDag  = new Date(p.end);       pEindDag.setHours(0, 0, 0, 0);
      return dienstDag >= pDag && dienstDag < pEindDag;
    }
    // Timed events: exacte tijdoverlap
    return p.start < dienstEnd && p.end > dienstStart;
  });

  if (conflicts.length === 0) return '';

  return conflicts.map(p => {
    if (p.isAllDay) return `⚠️ ${p.title} (hele dag)`;
    const s = Utilities.formatDate(p.start, tz, 'HH:mm');
    const e = Utilities.formatDate(p.end,   tz, 'HH:mm');
    return `⚠️ ${p.title} (${s}–${e})`;
  }).join(' | ');
}

// ============================================================================
// DIAGNOSE — VERPLICHT ALS CONFLICTS NIET WERKEN
// ============================================================================

/**
 * Diagnose functie: toont precies welke kalender gevonden wordt en welke
 * events erin zitten. Voer dit uit via het menu als conflicten niet werken.
 * Kijk daarna in GAS > Uitvoeren > Logboek voor de output.
 */
function debugPersonalCalendar() {
  Logger.log('=== DIAGNOSE: PERSOONLIJKE KALENDER ===');

  // Stap 1: Kalender rechten check
  try {
    const allCals = CalendarApp.getAllCalendars();
    Logger.log(`✅ Stap 1: OAuth OK — ${allCals.length} kalenders beschikbaar:`);
    allCals.forEach(c => Logger.log(`  • "${c.getName()}" | ID: ${c.getId()} | Eigen: ${c.isOwnedByMe()}`));
  } catch (e) {
    Logger.log(`❌ Stap 1 MISLUKT: ${e.message}`);
    Logger.log('💡 Oorzaak: Script heeft GEEN toestemming voor CalendarApp.');
    Logger.log('💡 Fix: Ga naar GAS-editor → Uitvoeren → debugPersonalCalendar → Toestemming verlenen.');
    safeToast('🔑 Hertoestemming nodig', 'Voer debugPersonalCalendar uit via de editor om toestemming te verlenen.', 15);
    return;
  }

  // Stap 2: Default kalender
  try {
    const def = CalendarApp.getDefaultCalendar();
    Logger.log(`✅ Stap 2: Default kalender = "${def.getName()}" (${def.getId()})`);
  } catch (e) {
    Logger.log(`⚠️ Stap 2: getDefaultCalendar fout: ${e.message}`);
  }

  // Stap 3: Events ophalen
  const now = new Date();
  const scanEnd = new Date(now);
  scanEnd.setDate(scanEnd.getDate() + 30);

  const events = _getPersonalEvents(now, scanEnd);
  Logger.log(`✅ Stap 3: ${events.length} persoonlijke events gevonden (komende 30 dagen na filter).`);

  // Stap 4: Rapport aan gebruiker
  let rapport = `Kalenders: zie Logboek.\n\nPersonlijke events (komende 30 dagen): ${events.length}`;
  if (events.length > 0) {
    rapport += '\n\n' + events.slice(0, 10)
      .map(e => `• ${e.title} (${Utilities.formatDate(e.start, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')})`)
      .join('\n');
    if (events.length > 10) rapport += `\n... en ${events.length - 10} meer.`;
  } else {
    rapport += '\n\n⚠️ Geen events gevonden. Controleer het logboek voor de oorzaak.';
  }

  Logger.log('--- RAPPORT ---\n' + rapport);
  Logger.log('=== EINDE DIAGNOSE ===');

  // UI is alleen beschikbaar als de functie via het spreadsheet-menu wordt aangeroepen.
  // Bij editor-run: zie uitvoeringslogboek hierboven voor het rapport.
  let ui;
  try { ui = SpreadsheetApp.getUi(); } catch (_) {}
  if (ui) ui.alert('🔍 Kalender Diagnose', rapport, ui.ButtonSet.OK);
  else Logger.log('ℹ️ Geen UI beschikbaar (editor-run) — bekijk het rapport hierboven in de logs.');
}

// ============================================================================
// STANDALONE MENU FUNCTIE — CONFLICT RAPPORT
// ============================================================================

/**
 * Scant alle toekomstige diensten en toont conflicten met persoonlijke afspraken.
 * Aanroepbaar via het menu zonder volledige sync te draaien.
 */
function checkCalendarConflicts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let ui;
  try { ui = SpreadsheetApp.getUi(); } catch (_) {}

  Logger.log('🔍 Start persoonlijk agenda conflict scan...');

  try {
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_ROSTER);
    if (!sheet || sheet.getLastRow() < 2) {
      safeToast('Conflict Scan', 'Geen data in DienstenData. Voer eerst een sync uit.', 8);
      return;
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const data    = sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).getValues();
    const hi      = {};
    headers.forEach((h, i) => hi[h] = i);

    const now     = new Date();
    const scanEnd = new Date(now);
    scanEnd.setDate(scanEnd.getDate() + CONFIG.SYNC_DAYS_FORWARD);

    const personalEvents = _getPersonalEvents(now, scanEnd);
    Logger.log(`📅 ${personalEvents.length} persoonlijke events geladen voor conflict scan.`);

    if (personalEvents.length === 0) {
      const msg = '⚠️ Geen persoonlijke events gevonden. Voer "debugPersonalCalendar" uit om de oorzaak te achterhalen.';
      if (ui) ui.alert('Conflict Scan', msg, ui.ButtonSet.OK);
      else safeToast('Conflict Scan', msg, 10);
      return;
    }

    const tz = Session.getScriptTimeZone();
    const conflicten = [];

    data.forEach(row => {
      const status = String(row[hi['Status']] || '').trim();
      if (status === 'VERWIJDERD' || status === 'Gedraaid') return;

      const startDatum = row[hi['Start Datum']];
      const startTijd  = row[hi['Start Tijd']];
      const eindTijd   = row[hi['Eind Tijd']];
      const titel      = String(row[hi['Titel']] || '');

      if (!startDatum) return;

      // GAS geeft datumcellen terug als Date objecten — verwerk beide gevallen
      const datumStr = startDatum instanceof Date
        ? Utilities.formatDate(startDatum, tz, 'yyyy-MM-dd')
        : String(startDatum).slice(0, 10);

      // Tijd: GAS geeft tijdcellen terug als Date-object op 30-12-1899
      const sStr = startTijd instanceof Date
        ? Utilities.formatDate(startTijd, tz, 'HH:mm')
        : String(startTijd || '00:00').slice(0, 5);
      const eStr = eindTijd instanceof Date
        ? Utilities.formatDate(eindTijd, tz, 'HH:mm')
        : String(eindTijd || '00:00').slice(0, 5);

      const [sH, sM] = sStr.split(':').map(Number);
      const [eH, eM] = eStr.split(':').map(Number);

      const dienstStart = new Date(`${datumStr}T${String(sH||0).padStart(2,'0')}:${String(sM||0).padStart(2,'0')}:00`);
      const dienstEnd   = new Date(`${datumStr}T${String(eH||0).padStart(2,'0')}:${String(eM||0).padStart(2,'0')}:00`);

      if (isNaN(dienstStart.getTime())) return;

      const conflict = _detectConflict(dienstStart, dienstEnd, personalEvents);
      if (conflict) {
        conflicten.push(`• ${datumStr} — ${titel}: ${conflict}`);
        Logger.log(`⚠️ Conflict: ${datumStr} ${titel} → ${conflict}`);
      }
    });

    if (conflicten.length === 0) {
      const msg = '✅ Geen conflicten gevonden — agenda is vrij!';
      Logger.log(msg);
      if (ui) ui.alert('🔍 Conflict Scan', msg, ui.ButtonSet.OK);
      else safeToast('Conflict Scan', msg, 8);
    } else {
      const rapport = `⚠️ ${conflicten.length} conflict(en) gevonden:\n\n${conflicten.join('\n')}`;
      Logger.log(rapport);
      if (ui) ui.alert('⚠️ Agenda Conflicten Gevonden', rapport, ui.ButtonSet.OK);
      else safeToast('⚠️ Conflicten', `${conflicten.length} conflict(en) — zie logs.`, 12);
    }

  } catch (e) {
    Logger.log(`❌ checkCalendarConflicts fout: ${e.message}\n${e.stack}`);
    safeToast('Conflict Scan Fout', e.message, 10);
  }
}

// ============================================================================
// SHEET SYNC — PERSOONLIJKE AFSPRAKEN
// ============================================================================

/**
 * Zet de headers op voor de PersoonlijkeAfspraken sheet.
 * Voegt ontbrekende kolommen toe aan een bestaande sheet (migratie-safe).
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @returns {string[]} De volledige headers array
 */
function _setupPersonalSheet(sheet) {
  const headers = [
    'Event ID', 'Titel', 'Start Datum', 'Start Tijd', 'Eind Datum', 'Eind Tijd',
    'Hele Dag', 'Locatie', 'Beschrijving', 'Status', 'Kalender',
    'Conflict Met Dienst', 'Laatst Bijgewerkt',
  ];

  if (sheet.getLastRow() === 0) {
    const hRow = sheet.getRange(1, 1, 1, headers.length);
    hRow.setValues([headers]);
    hRow.setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  } else {
    // Migratie: voeg ontbrekende kolommen toe rechts van bestaande
    const current = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    headers.forEach(h => {
      if (!current.includes(h)) {
        const col = sheet.getLastColumn() + 1;
        sheet.getRange(1, col).setValue(h).setFontWeight('bold');
      }
    });
  }

  // Kolombreedtes
  const widths = [220, 200, 110, 80, 110, 80, 70, 150, 200, 90, 80, 200, 150];
  widths.forEach((w, i) => { try { sheet.setColumnWidth(i + 1, w); } catch (_) {} });

  return headers;
}

/**
 * Hoofdfunctie: synchroniseert persoonlijke agenda events naar de
 * PersoonlijkeAfspraken sheet en pushed daarna naar Convex.
 *
 * Flow:
 *   1. Main kalender events laden voor scan-window
 *   2. Bestaande sheet rijen lezen (voor dedup via Event ID)
 *   3. Nieuwe / gewijzigde events upserten
 *   4. Events die niet meer in de kalender staan → 'VERWIJDERD'
 *   5. Convex push aanroepen
 */
function syncPersonalEventsToSheet() {
  Logger.log('📅 Start PersoonlijkeAfspraken sync...');
  const stats = { added: 0, updated: 0, removed: 0 };

  try {
    const ss    = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME_PERSONAL)
               || ss.insertSheet(CONFIG.SHEET_NAME_PERSONAL);

    const headers = _setupPersonalSheet(sheet);

    // Scan window: zelfde als de diensten sync
    const now   = new Date();
    const start = new Date(now); start.setDate(start.getDate() - CONFIG.SYNC_DAYS_BACK);  start.setHours(0,0,0,0);
    const end   = new Date(now); end.setDate(end.getDate()   + CONFIG.SYNC_DAYS_FORWARD);

    Logger.log(`📅 Scan: ${start.toDateString()} → ${end.toDateString()}`);

    // Persoonlijke events ophalen
    const calEvents = _getPersonalEvents(start, end);
    Logger.log(`📌 ${calEvents.length} events geladen uit Main kalender.`);

    const tz = Session.getScriptTimeZone();
    const now_iso = Utilities.formatDate(now, tz, "yyyy-MM-dd'T'HH:mm:ss");

    // Bestaande sheet-rijen indexeren op Event ID
    const hi = {};
    headers.forEach((h, i) => hi[h] = i);

    const lastRow    = sheet.getLastRow();
    let   sheetData  = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, headers.length).getValues() : [];
    const existingMap = new Map(); // eventId → {rowIdx (0-based in sheetData), row}
    sheetData.forEach((row, i) => {
      const eid = String(row[hi['Event ID']] || '').trim();
      if (eid) existingMap.set(eid, { rowIdx: i, row });
    });

    const calEventIds = new Set(calEvents.map(e => {
      // getEventId() geeft de volledige iCal ID terug (bijv. abc@google.com)
      // We halen de events op via CalendarApp en slaan de ID op die we later terug kunnen lezen.
      // CalendarApp events geven geen .getId() via _getPersonalEvents — we hashhen de titel+datum als ID.
      // Gebruik title+startISO als stabiele sleutel voor persoonlijke events.
      return `${e.title}::${e.start.toISOString()}`;
    }));

    // Upsert: verwerk elke event
    calEvents.forEach(e => {
      const eventId    = `${e.title}::${e.start.toISOString()}`;
      const startDatum = Utilities.formatDate(e.start, tz, 'yyyy-MM-dd');
      const eindDatum  = Utilities.formatDate(e.end,   tz, 'yyyy-MM-dd');
      const startTijd  = e.isAllDay ? '' : Utilities.formatDate(e.start, tz, 'HH:mm');
      const eindTijd   = e.isAllDay ? '' : Utilities.formatDate(e.end,   tz, 'HH:mm');
      const status     = e.start > now ? 'Aankomend' : 'Voorbij';

      const newRow = new Array(headers.length).fill('');
      newRow[hi['Event ID']]          = eventId;
      newRow[hi['Titel']]             = e.title;
      newRow[hi['Start Datum']]       = startDatum;
      newRow[hi['Start Tijd']]        = startTijd;
      newRow[hi['Eind Datum']]        = eindDatum;
      newRow[hi['Eind Tijd']]         = eindTijd;
      newRow[hi['Hele Dag']]          = e.isAllDay ? 'Ja' : 'Nee';
      newRow[hi['Locatie']]           = e.location  || '';
      newRow[hi['Beschrijving']]      = e.description || '';
      newRow[hi['Status']]            = status;
      newRow[hi['Kalender']]          = 'Main';
      newRow[hi['Conflict Met Dienst']] = existingMap.get(eventId)?.row[hi['Conflict Met Dienst']] || '';
      newRow[hi['Laatst Bijgewerkt']] = now_iso;

      if (existingMap.has(eventId)) {
        // Bijwerken
        const { rowIdx } = existingMap.get(eventId);
        sheetData[rowIdx] = newRow;
        stats.updated++;
      } else {
        // Nieuw toevoegen
        sheetData.push(newRow);
        stats.added++;
      }
    });

    // Verwijderde events markeren (staan niet meer in kalender maar wel in sheet)
    sheetData.forEach((row, i) => {
      const eid    = String(row[hi['Event ID']] || '').trim();
      const status = String(row[hi['Status']]   || '').trim();
      if (eid && status !== 'VERWIJDERD' && !calEventIds.has(eid)) {
        sheetData[i][hi['Status']]           = 'VERWIJDERD';
        sheetData[i][hi['Laatst Bijgewerkt']] = now_iso;
        stats.removed++;
      }
    });

    // Sorteren: Aankomend ↑ (dichtstbij bovenaan) → Voorbij ↓ (meest recent bovenaan) → Verwijderd onderaan
    const statusOrder = { 'Aankomend': 0, 'Voorbij': 1, 'VERWIJDERD': 2 };
    sheetData.sort((a, b) => {
      const sA = String(a[hi['Status']] || '');
      const sB = String(b[hi['Status']] || '');
      const oA = statusOrder[sA] ?? 1;
      const oB = statusOrder[sB] ?? 1;
      if (oA !== oB) return oA - oB;

      const dA = String(a[hi['Start Datum']] || '');
      const dB = String(b[hi['Start Datum']] || '');
      // Aankomend: oplopend (eerste afspraak bovenaan)
      // Voorbij:   aflopend (meest recente bovenaan)
      return sA === 'Aankomend' ? dA.localeCompare(dB) : dB.localeCompare(dA);
    });

    // Schrijf alles terug naar de sheet
    if (sheetData.length > 0) {
      if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, headers.length).clearContent();
      sheet.getRange(2, 1, sheetData.length, headers.length).setValues(sheetData);
    }

    const msg = `📅 Persoonlijke afspraken: +${stats.added} nieuw | ↻${stats.updated} bijgewerkt | 🗑️${stats.removed} verwijderd`;
    Logger.log(msg);
    safeToast('📅 Persoonlijke Sync', msg, 8);

    // Push naar Convex
    try {
      const pushResult = pushPersonalEventsToConvex(sheet, headers);
      Logger.log(`☁️ Convex personal push: ${pushResult}`);
      safeToast('☁️ Afspraken Sync', pushResult, 5);
    } catch (pushErr) {
      Logger.log(`⚠️ Convex personal push mislukt: ${pushErr.message}`);
      safeToast('⚠️ Afspraken Push', pushErr.message, 8);
    }

  } catch (e) {
    Logger.log(`❌ syncPersonalEventsToSheet fout: ${e.message}\n${e.stack}`);
    safeToast('Persoonlijke Sync Fout', e.message, 12);
  }
}

// ============================================================================
// PENDING EVENTS VERWERKEN — Aanmaken in Google Calendar vanuit Homeapp
// ============================================================================

/**
 * Haalt PendingCreate events op uit Convex en maakt ze aan in Google Calendar.
 * Wordt automatisch aangeroepen aan het einde van syncPersonalEventsToSheet,
 * en ook beschikbaar als aparte menu-actie.
 */
function processPendingEvents() {
  const props   = PropertiesService.getScriptProperties();
  const syncKey = props.getProperty('HOMEAPP_SYNC_KEY');
  const userId  = props.getProperty('HOMEAPP_USER_ID');
  const baseUrl = props.getProperty('HOMEAPP_CONVEX_URL')
                  || 'https://adorable-mink-458.eu-west-1.convex.site';

  if (!syncKey || !userId) {
    Logger.log('⚠️ processPendingEvents: credentials niet ingesteld — skip');
    return;
  }

  // ── Stap 1: Haal PendingCreate events op uit Convex ──────────────────────
  let pendingResp;
  try {
    pendingResp = UrlFetchApp.fetch(
      `${baseUrl}/personal-events/pending?userId=${encodeURIComponent(userId)}`,
      {
        method:  'get',
        headers: { Authorization: `Bearer ${syncKey}` },
        muteHttpExceptions: true,
      }
    );
  } catch (e) {
    Logger.log(`❌ processPendingEvents GET fout: ${e.message}`);
    safeToast('⚠️ Pending Events', `Ophalen mislukt: ${e.message}`, 8);
    return;
  }

  const responseCode = pendingResp.getResponseCode();
  let pendingBody = {};
  try { pendingBody = JSON.parse(pendingResp.getContentText() || '{}'); } catch (_) {}

  if (responseCode !== 200 || !pendingBody.ok) {
    Logger.log(`❌ processPendingEvents: HTTP ${responseCode} — ${JSON.stringify(pendingBody)}`);
    return;
  }

  const pending = pendingBody.pending || [];
  if (pending.length === 0) {
    Logger.log('✅ processPendingEvents: geen pending events');
    return;
  }

  Logger.log(`📅 processPendingEvents: ${pending.length} events verwerken...`);

  // ── Stap 2: Maak elk event aan in Google Calendar ─────────────────────────
  const calendar = _getMainCalendar();
  if (!calendar) {
    Logger.log('❌ processPendingEvents: kalender niet gevonden');
    safeToast('⚠️ Kalender', 'Kan de Main kalender niet vinden', 8);
    return;
  }

  let aangemaakt = 0;
  let gefaald    = 0;

  pending.forEach(function(event) {
    try {
      const startDate = new Date(event.startDatum + 'T00:00:00');
      const eindDate  = new Date(event.eindDatum  + 'T00:00:00');

      let googleEvent;

      if (event.heledag) {
        // Hele-dag event: Google Calendar verwacht EXCLUSIEVE eindatum
        const eindExclusief = new Date(eindDate);
        eindExclusief.setDate(eindExclusief.getDate() + 1);
        googleEvent = calendar.createAllDayEvent(
          event.titel,
          startDate,
          eindExclusief,
          {
            description: event.beschrijving || '',
            location:    event.locatie      || '',
          }
        );
      } else {
        // Getimed event
        const startDateTime = new Date(event.startDatum + 'T' + (event.startTijd || '09:00') + ':00');
        const eindDateTime  = new Date(event.eindDatum  + 'T' + (event.eindTijd  || '10:00') + ':00');
        googleEvent = calendar.createEvent(
          event.titel,
          startDateTime,
          eindDateTime,
          {
            description: event.beschrijving || '',
            location:    event.locatie      || '',
          }
        );
      }

      const googleId = googleEvent.getId();
      Logger.log(`✅ Aangemaakt: "${event.titel}" (${event.startDatum}) → Google ID: ${googleId}`);

      // ── Stap 3: Status update naar Convex ─────────────────────────────────
      try {
        UrlFetchApp.fetch(`${baseUrl}/personal-events/status`, {
          method:      'patch',
          contentType: 'application/json',
          payload:     JSON.stringify({
            userId,
            eventId:  event.eventId,
            status:   'Aankomend',
            googleId,
          }),
          headers:     { Authorization: `Bearer ${syncKey}` },
          muteHttpExceptions: true,
        });
      } catch (patchErr) {
        Logger.log(`⚠️ Status update mislukt voor "${event.titel}": ${patchErr.message}`);
      }

      aangemaakt++;
    } catch (err) {
      Logger.log(`❌ Fout bij aanmaken "${event.titel}": ${err.message}`);
      gefaald++;
    }
  });

  const msg = `📅 ${aangemaakt} afspraak(en) aangemaakt in Google Calendar${gefaald > 0 ? ` (${gefaald} mislukt)` : ''}`;
  Logger.log(msg);
  safeToast('📅 Agenda Bijgewerkt', msg, 8);
}
