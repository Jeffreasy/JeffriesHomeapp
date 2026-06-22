# Six-page audit — Agenda/Rooster/Notities/Habits/Finance/Automations

_70 verified findings, 7 refuted. NOTE: verifier agents auto-applied some fixes to the working tree._

## agenda (12)

### [MEDIUM/functional] Historie tab badge counts more than it ever renders (60-cap), with no "meer" affordance
- loc: app/agenda/page.tsx:284, 307 (viewEvents history branch + viewTabs count)
- The "Historie" tab badge shows historyTimelineEvents.length (the full merged history), but the timeline only renders historyTimelineEvents.slice(0, 60). When a user has more than 60 past appointments+shifts, the tab claims e.g. "87" yet only 60 rows are ever shown, and there is no "toon meer" button or any indication that the list is truncated.
- impact: User sees a count they cannot reconcile with the visible list and silently loses access to older history items. Erodes trust in the numbers across the page.
- fix: Either cap the badge to match (Math.min(length, 60)) and add a "+N ouder" / load-more control, or render all history with virtualization. At minimum show a footer row like "+27 oudere items" when sliced. _(effort low)_
- verdict: confirmed/high

### [MEDIUM/interaction] New-event default flips to all-day depending on entry point, surprising for header/calendar "+ Afspraak"
- loc: components/schedule/CreateEventModal.tsx:97 (reset: setHeledag(!initialTime)) ; app/agenda/page.tsx:416 (header Nieuw) ; AgendaCalendar.tsx:241,296,320,606 (Afspraak buttons pass no time)
- reset() sets heledag = !initialTime. The header "Nieuw", the calendar toolbar "Afspraak", the mobile per-day "Afspraak", and the SelectedDayPanel "+" all call onCreateEvent with a date but no time, so the modal opens with "Hele dag" ON and the time fields hidden. Only the three quick-slots (Ochtend/Middag/Avond) pass a time and open with heledag OFF. There is no visual hint why one entry point yields a timed appointment and another an all-day one.
- impact: A user clicking the prominent "Nieuw" / "Afspraak" buttons to make a normal timed appointment lands on an all-day form, must notice and toggle "Hele dag" off, then fill times. Easy to accidentally create all-day events. Inconsistent behaviour between near-identical buttons.
- fix: Default heledag to false for explicit "new appointment" actions and only default to all-day when there is a clear reason, or make the toggle state obvious on open. At minimum keep the default consistent across all create entry points. _(effort medium)_
- verdict: confirmed/high

### [LOW/microcopy] "30 dagen" stat counts items but its sub-label hardcodes singular "afspraken/diensten" wording
- loc: app/agenda/page.tsx:464-466, 472-476, 502-504
- The Vandaag and 30-dagen stat tiles render fixed strings "{n} afspraken · {n} diensten" with no singular/plural agreement, so 1 item reads "1 afspraken · 1 diensten". This is inconsistent with formatSplitCounts() used elsewhere on the same page (header, section subtitle) which correctly produces "1 afspraak" / "1 dienst".
- impact: Grammatically wrong Dutch microcopy on the most prominent summary tiles, visibly inconsistent with the correctly-pluralized counts directly above/below them.
- fix: Reuse formatSplitCounts (or a small pluralize helper) for the tile sub-labels so 1 → "afspraak"/"dienst". Also note the "Conflicten" tile already pluralizes via aria-label, so only these two tiles are inconsistent. _(effort low)_
- verdict: confirmed/high

### [LOW/a11y] Three of four summary tiles are unlabeled <button>s announcing only raw numbers to screen readers
- loc: app/agenda/page.tsx:458-505 (Vandaag / 30 dagen / Wachtrij tiles)
- The Vandaag, 30-dagen and Wachtrij tiles are clickable <button> elements with no aria-label and no type="button"; their accessible name is the concatenation of inner text ("Vandaag 3 1 afspraken · 2 diensten"). The Conflicten tile by contrast has a clean aria-label. So screen-reader users hear inconsistent, run-on names, and because the buttons lack type, they default to type=submit (harmless here since no form, but fragile).
- impact: Screen-reader users get verbose, confusing button names and no clear indication these tiles are navigational filters. Inconsistent with the deliberately-labelled Conflicten tile.
- fix: Add aria-label to each tile (e.g. "Vandaag bekijken: 3 items") and type="button". Mark the decorative number/sublabel text aria-hidden so the label is the single source of truth. _(effort low)_
- verdict: partially-correct/high

### [LOW/interaction] Conflicten stat-tile is keyboard-unreachable and gives no feedback when count is 0
- loc: app/agenda/page.tsx:478-497
- When withConflicts.length === 0 the Conflicten tile is disabled (cursor-default, no hover), so keyboard/tab users skip it and mouse users get no affordance, yet it still looks like the other three actionable tiles. When >0 it navigates to the Komend view, but the Komend view does not scroll to or filter only the conflicting events, so the user lands on a long list with the conflicts buried.
- impact: Inconsistent affordance (one of four tiles silently inert) and, when there ARE conflicts, clicking it doesn't take the user to the conflicts in an obvious way — they must hunt through the upcoming list.
- fix: Keep the disabled state but make the click-through on >0 either switch to the conflicts and scroll the sidebar Conflicten panel into view, or filter the timeline to conflicting events. Consider keeping it focusable with aria-disabled rather than the disabled attribute so SR users still hear "geen conflicten". _(effort medium)_
- verdict: partially-correct/high

### [LOW/microcopy] Sync "wachtrij faalde" toast is the only place the pending error surfaces and it is truncated mid-word
- loc: app/agenda/page.tsx:373-377, 804-806 (shortSyncError)
- On manual sync, if result.pendingError is set the user gets an info toast "Agenda opgehaald; wachtrij faalde: <error>" where the error is hard-truncated at 137 chars with "...". Raw backend error strings (often English/technical) are shown verbatim to a Dutch end-user, and the toast auto-dismisses, so the only detail about a failed queue is fleeting and possibly cut off mid-sentence.
- impact: User is told something failed but gets an unactionable, possibly English, possibly truncated technical string that disappears. The persistent sync panel (lastError) only reflects status query errors, not this pendingError.
- fix: Map common pendingError causes to a short Dutch explanation, and/or also surface the pendingError in the persistent Google Calendar sync panel so it doesn't vanish with the toast. _(effort medium)_
- verdict: confirmed/high

### [LOW/mobile] Mobile agenda list only shows events/notes for the cursor MONTH, but month navigation is hidden in agenda view
- loc: components/schedule/AgendaCalendar.tsx:104-108, 889-906 (buildAgendaList uses cursorDate month) ; 162-186 (mobile toggle) ; 213-237 (prev/next arrows)
- On phones the default mobileView is "agenda", and buildAgendaList enumerates only the cursorDate's calendar month (monthStart..monthEnd). The only way to change month is the </> chevrons, but those chevrons sit in the same toolbar and in agenda view there is no month title shown for the agenda list itself — the section header text ("Kalender · <month>") is the desktop title. A user scrolling the agenda list to the end of the month has no in-list cue that they've hit the month boundary, and tapping next requires finding the chevrons. Items in the following month simply don't appear in the list.
- impact: On the primary (mobile) surface, the agenda list silently stops at month end with no "next month" boundary marker, so upcoming appointments early next month look missing until the user discovers the chevrons. Easy to believe the agenda is emptier than it is.
- fix: Show the current month label above the mobile agenda list and add an end-of-list "Volgende maand" affordance, or have the agenda list span a rolling N days from today rather than a strict calendar month. _(effort medium)_
- verdict: partially-correct/high

### [LOW/mobile] Mobile month-dots cell collapses event types to ≤3 deduped color dots, hiding per-day load and conflict precedence
- loc: components/schedule/AgendaCalendar.tsx:840-887 (MobileMonthDotsCell)
- MobileMonthDotsCell builds a Set of tone.dot colors and renders at most 3. Because getEventTone returns the rose tone for ANY conflicting event, a day with one conflict shows a rose dot but a busy day with five appointments shows a single emerald dot — identical visual weight to a day with one. There is no count, and aria-label says "<n> items" which is good, but the visual gives no sense of how full a day is. A conflict dot can also crowd out a notitie dot since notes add a 4th dot only after the 3 tone dots.
- impact: On the month overview the busiest day and a one-item day can look the same; users can't visually scan for heavy days. Minor since the aria-label and tap-through compensate.
- fix: Show a small count (e.g. a number badge for 4+ items) or scale dot density with event count, and ensure the notitie dot isn't dropped when 3 tones are already present. _(effort low)_
- verdict: partially-correct/high

### [LOW/interaction] Delete confirm uses a 3s timeout with no visible countdown; reopening another row doesn't reset the first
- loc: components/schedule/PersonalEventItem.tsx:52-57, 219-234
- Clicking the trash icon switches that row's actions to a "Zeker?" confirm that silently reverts after 3000ms via setTimeout. There is no visual indication of the countdown, and each row owns its own confirmDelete state, so a user can put multiple rows into "Zeker?" mode at once. On small screens the confirm controls (Check/X at ~16px hit area inside a hover-only action group) are tiny. Also the whole action group is sm:opacity-0 / group-hover only on desktop but opacity-100 on mobile — fine — yet the Check/X buttons are p-0.5 around a 12px icon, well under the 44px touch target the modal otherwise respects.
- impact: Destructive confirmation can disappear unexpectedly mid-decision, and the confirm/cancel tap targets are far below the 44px minimum the rest of the app uses, making accidental deletes or mis-taps likely on touch.
- fix: Enlarge the Check/X confirm targets to >=40px on touch, and either show a countdown or drop the auto-revert in favor of an explicit cancel. Consider the shared ConfirmDialog primitive for parity with the rest of the app. _(effort medium)_
- verdict: confirmed/high

### [LOW/interaction] AgendaListRow whole row is one button, but it links events to the EDIT modal even for shift rows that can't be edited
- loc: components/schedule/AgendaCalendar.tsx:273-281 (onClick={() => onEditEvent(event)}) ; PersonalEventItem canEdit excludes Rooster
- In the mobile agenda list, every AgendaListRow (including Rooster/dienst rows) has onClick → onEditEvent(event) → openEditEvent → CreateEventModal with editEvent set. But Rooster events are not user-editable elsewhere (PersonalEventItem sets canEdit=false for isRooster). Opening the edit modal on a dienst lets the user change a dienst-derived title/time and submit it as a Main-calendar PendingUpdate (handleSubmit uses kalender: editEvent?.kalender ?? "Main", which for a Rooster event would be "Rooster"), creating an inconsistent edit path for roster items that the desktop UI deliberately blocks.
- impact: Inconsistent capability between mobile and desktop: on phone a tap on a dienst opens a full edit form; on desktop dienst rows are read-only. At best confusing, at worst lets users push edits to roster-sourced events that the rest of the app treats as imported/read-only.
- fix: In AgendaListRow, branch on event.kalender === 'Rooster' to open a read-only detail or the dienst view instead of the edit modal, matching desktop behaviour. _(effort medium)_
- verdict: partially-correct/high

### [LOW/a11y] Mobile Agenda/Maand toggle uses aria-pressed but has no group role/label and no keyboard-distinct active styling beyond color
- loc: components/schedule/AgendaCalendar.tsx:162-186 (mobile) and 188-211 (desktop Maand/Week)
- The Agenda/Maand (mobile) and Maand/Week (desktop) segmented controls are two independent buttons with aria-pressed. They are not wrapped in a role="group" with an accessible name, so a screen reader announces two unrelated toggle buttons with no context of being a view switcher. The inactive button on mobile is text-slate-500 with no hover style (the desktop variant adds hover:text-slate-300 but the mobile one omits it), so on touch there's no pressed feedback besides the final color change.
- impact: SR users get ambiguous controls ("Agenda, toggle button" / "Maand, toggle button") with no grouping; sighted touch users get no transient feedback on the mobile toggle.
- fix: Wrap each segmented control in role="group" aria-label (e.g. "Weergave") and give the mobile buttons an active/pressed transition consistent with the desktop pair. _(effort low)_
- verdict: confirmed/high

### [LOW/functional] groupByDate forces past-but-ongoing events onto today only in non-today views, creating duplicate-looking placement
- loc: app/agenda/page.tsx:126-142 (groupByDate key logic) and 290-301 (timelineGroups)
- In groupByDate, an event whose startDatum < todayIso but which still covers today (getDisplayEndDate >= todayIso) is keyed under todayIso instead of its real start date — except in the 'today' view, where forcedDate=todayIso already forces everything to today. So in the Komend view, a multi-day event that started yesterday appears under today's header, while the calendar/SelectedDayPanel (which uses eventCoversDate) shows it on every covered day. The same ongoing event therefore appears under 'today' in the timeline but spanning multiple days in the calendar, with no range hint in the timeline group header.
- impact: A multi-day event's placement differs between the timeline (single 'today' group) and the calendar (all covered days), which can read as the event being on the wrong day or as missing from its actual start date in the upcoming list.
- fix: Either key ongoing multi-day events under their real start date in the upcoming view, or annotate the timeline row that it's an ongoing multi-day item (it already renders 'meerdaags', but the day grouping under 'today' is the confusing part). _(effort medium)_
- verdict: partially-correct/high

## rooster (12)

### [HIGH/functional] MonthBalanceChart toont lopende en toekomstige maanden vals als groot tekort
- loc: components/schedule/MonthBalanceChart.tsx:16-29
- Elke maand wordt vergeleken met een hardgecodeerde norm van 69,3u (delta = totalHours - 69.3), inclusief de huidige (half afgewerkte) maand en toekomstige maanden waarvoor nog nauwelijks diensten gepland staan. groupByMonth bevat ook deze maanden, dus de lopende/komende maand staat standaard diep in het rood (bv. -50u). 69,3u klopt bovendien niet exact bij 16u/week (16×4,345≈69,5) en negeert maanden met 4 vs 5 weken.
- impact: De gebruiker ziet structureel rode balken voor de lopende/komende maand en concludeert ten onrechte een enorm uren-tekort. De grafiek is alleen zinvol voor volledig afgesloten maanden.
- fix: Bereken de norm per maand op basis van het werkelijke aantal ISO-weken in die maand (analyzeContract levert al week-deltas), of sluit de lopende en toekomstige maanden uit / markeer ze visueel als 'lopend' zonder rode delta. _(effort medium)_
- verdict: confirmed/high

### [MEDIUM/functional] Voltooide diensten verschijnen nooit in Historie (status nooit herberekend)
- loc: lib/schedule.ts:361-366 getHistory(); app/rooster/page.tsx:179
- getHistory(diensten) filtert op d.status === "Gedraaid" tegen de RAW diensten-array. De runtime-statusberekening (withRuntimeStatus, die een al-verstreken "Opkomend" dienst naar "Gedraaid" promoot) wordt ALLEEN binnen getUpcoming() toegepast, nooit op de volledige diensten-set. CSV-geïmporteerde diensten dragen vrijwel altijd de opgeslagen status "Opkomend". Zodra ze in het verleden liggen blijven ze "Opkomend" in de ruwe data.
- impact: De Historie-sectie ("Gedraaide diensten") in de Overzicht-tab blijft permanent leeg of toont alleen de enkele diensten die toevallig al als "Gedraaid" zijn opgeslagen. De gebruiker ziet zijn werkverleden niet terug ondanks honderden verstreken diensten.
- fix: Bereken runtime-status op de volledige set voordat je filtert: filter in getHistory op withRuntimeStatus(d, nowKey).status === "Gedraaid" (of map de diensten door withRuntimeStatus zoals getUpcoming dat doet) i.p.v. de ruwe d.status. _(effort low)_
- verdict: confirmed/high

### [MEDIUM/functional] ContractWidget kopt op de laatste week mét data, niet de huidige week
- loc: components/schedule/ContractWidget.tsx:16-20
- currentOrNextWeek = stats.weeklyBalances[length-1] pakt de chronologisch LAATSTE week die diensten bevat. Met diensten die ver vooruit gepland staan is dat een toekomstige week, terwijl het label 'Contracturen · week {weeknr}' en de grote 'x/16'-teller suggereren dat dit de huidige week is.
- impact: De gebruiker leest een uren-balans van een willekeurige toekomstweek af als 'deze week'. Een toekomstweek met 1 ingeroosterde dienst toont bv. 8/16 met -8 tekort, wat alarmerend en onjuist is voor de actuele situatie.
- fix: Selecteer expliciet de week die de huidige Amsterdam-datum bevat (match op normalizeWeekNr van vandaag), met fallback naar de eerstvolgende week; toon anders duidelijk 'week X (vooruit)'. _(effort medium)_
- verdict: confirmed/high

### [MEDIUM/mobile] Contractwidget en maandbalans-grafiek volledig verborgen op mobiel
- loc: components/schedule/RoosterOverview.tsx:162-165
- ContractWidget en MonthBalanceChart staan in een wrapper met className "hidden space-y-4 md:block" — ze renderen uitsluitend vanaf de md-breakpoint. Op ~380px (de primaire doelgroep, mobile-first PWA) zijn beide volledig onzichtbaar.
- impact: De twee kern-inzichten van het rooster — contracturen-balans (16u/week doel) en maandelijkse urentrend — zijn op de telefoon nergens te zien. Voor een mobile-first app ontbreken zo de belangrijkste analytics-features voor de meeste gebruikers.
- fix: Maak een mobiele variant van ContractWidget/MonthBalanceChart (compactere layout) zichtbaar binnen de Overzicht-tab op mobiel, of verplaats ze naar de Statistieken-tab die wel mobiel rendert. _(effort medium)_
- verdict: partially-correct/high

### [MEDIUM/microcopy] Uren met decimalen tonen punt i.p.v. nl-NL komma
- loc: components/schedule/DienstItem.tsx:84,140; NextShiftCard.tsx:121,238; StatsView.tsx:71,113,130,165; ContractWidget.tsx:64-65,123; RoosterUtils.ts:70-72 formatHours
- Duuren worden gerenderd als `{dienst.duur}u` / `${Math.round(hours*10)/10}u`, wat bij halve diensten '7.5u' oplevert (Engelse punt). De hele UI is Nederlandstalig; in nl-NL hoort dit '7,5u' te zijn. Alleen valuta (SalaryUtils fmt) gebruikt correcte Intl-formatting; alle uren niet.
- impact: Inconsistente, niet-Nederlandse getalnotatie door de hele roosterweergave heen (tijdlijn-badges, NextShiftCard, statistieken, contractwidget). Oogt onverzorgd en wijkt af van de salaris-tab die wél komma's gebruikt.
- fix: Centraliseer urennotatie via Intl.NumberFormat("nl-NL", { maximumFractionDigits: 1 }) in formatHours en gebruik die overal i.p.v. losse `{duur}u`-interpolaties. _(effort low)_
- verdict: confirmed/high

### [MEDIUM/interaction] CSV-import geeft geen voortgangs-/bezig-feedback tijdens upload
- loc: app/rooster/page.tsx:239-247 handleFile; useSchedule.ts:114-144 importCsv
- Tijdens importCsv() (await file.text() + await postScheduleImport, kan seconden duren bij grote CSV) toont niets dat er iets gebeurt. De CSV-knop is alleen disabled op de query-`isLoading` (laden van bestaande data), niet op de import-mutatie. Er is geen pending-state, spinner of disabled-knop voor de daadwerkelijke POST.
- impact: De gebruiker klikt CSV, kiest een bestand, en ziet dan niets — geen spinner, geen disabled knop. Bij trage upload lijkt de actie genegeerd; men kan opnieuw klikken en een tweede import triggeren. De toast verschijnt pas na afronding.
- fix: Voeg een lokale `importing`-state toe in handleFile, disable de CSV-knop en toon een spinner zolang importCsv loopt (analoog aan calSyncing voor de Sync-knop). _(effort low)_
- verdict: confirmed/high

### [MEDIUM/functional] Nachtdienst-overlap op de volgende kalenderdag valt weg in NextShiftCard
- loc: app/rooster/page.tsx:190-192 nextShiftEvents
- nextShiftEvents = eventsByDate[nextDienst.startDatum] pakt alleen afspraken op de STARTdatum van de dienst. getEndKey() rolt nachtdiensten echter naar de volgende dag (eindKey <= startKey ⇒ +1 dag). Een afspraak die op die tweede dag valt en hard overlapt met de nachtdienst wordt niet in eventsByDate[startDatum] gevonden en dus niet getoond in de kaart.
- impact: Bij een nachtdienst (bv. 22:00–07:00) wordt een conflicterende afspraak in de vroege ochtend van de volgende dag niet als overlap-waarschuwing op de 'Eerstvolgende dienst'-kaart getoond, terwijl conflictMap ze elders wél als hard conflict telt. Inconsistente conflictsignalering.
- fix: Verzamel de afspraken voor zowel nextDienst.startDatum als de berekende einddatum (uit getEndKey), of filter upcomingEvents op overlap met de dienst-datetime-range i.p.v. op één enkele datumsleutel. _(effort medium)_
- verdict: confirmed/high

### [LOW/functional] Huidige-maand/dag-bepaling gebruikt UTC i.p.v. Amsterdam-tijd
- loc: components/schedule/StatsView.tsx:202; AfsprakenView.tsx:48; hooks/useSalary.ts:83-84
- StatsView gebruikt new Date().toISOString().slice(0,7) (UTC) om de 'huidige maand' groen te markeren; AfsprakenView gebruikt new Date().toISOString().slice(0,10) (UTC) voor de 'Deze maand'-telling; useSalary bouwt huidigKey met lokale new Date(). De rest van de app standaardiseert bewust op Europe/Amsterdam (getAmsterdamTodayIso / getAmsterdamParts).
- impact: Rond middernacht (en de eerste/laatste uren van een maand) wijst UTC een andere dag/maand aan dan Amsterdam. Op de 1e van de maand vóór 01:00/02:00 Amsterdam telt 'Deze maand' nog de vorige maand, en de huidige-maand-highlight in statistieken kan op de verkeerde maand staan.
- fix: Gebruik consequent de bestaande Amsterdam-helper (getAmsterdamTodayIso().slice(0,7) / .slice(0,10)) op alle drie de plekken i.p.v. toISOString of lokale new Date(). _(effort low)_
- verdict: confirmed/high

### [LOW/interaction] Wissen-bevestiging: geen bezig-state, dubbelklik op 'Ja' mogelijk
- loc: app/rooster/page.tsx:228-237,287-293 handleClearSchedule / 'Ja'-knop
- Bij klik op 'Ja' roept handleClearSchedule async clear() aan zonder pending-state: de 'Ja'-knop wordt niet disabled en toont geen spinner tijdens de POST. setConfirmClear(false) gebeurt pas ná de await, dus tot dat moment blijft 'Ja' klikbaar.
- impact: Bij een trage verbinding kan de gebruiker 'Ja' meerdere keren indrukken en meerdere clear-POSTs versturen; er is geen visuele bevestiging dat het wissen loopt. Feedbackloze interactie voor een destructieve actie.
- fix: Voeg een lokale `clearing`-state toe, disable de 'Ja'-knop en toon een spinner zolang clear() loopt; sluit de bevestiging pas daarna. _(effort low)_
- verdict: confirmed/high

### [LOW/a11y] Tabbladen missen tablist/tabpanel-koppeling voor schermlezers
- loc: app/rooster/page.tsx:25-47 TabBar; 414-462 tab-panels
- TabBar is een <nav> met losse <button>s en aria-current="page"; de getoonde tab-inhoud (Overzicht/Statistieken/Salaris/Beheer) is niet via role="tablist"/role="tab"/role="tabpanel" + aria-controls/aria-selected aan de knoppen gekoppeld. Pijltjestoets-navigatie tussen tabs ontbreekt ook. aria-current="page" is semantisch bedoeld voor navigatielinks, niet voor in-page tabs.
- impact: Schermlezergebruikers krijgen geen 'tab 2 van 4 geselecteerd'-context en kunnen niet met pijltjestoetsen tussen tabs schakelen zoals bij een echte tablist. De relatie tussen knop en getoond paneel is onhoorbaar.
- fix: Geef de container role="tablist", elke knop role="tab" + aria-selected + aria-controls dat naar het bijbehorende paneel (role="tabpanel", id, aria-labelledby) wijst, implementeer pijltjestoets-navigatie, en vervang aria-current door aria-selected. _(effort medium)_
- verdict: confirmed/high

### [LOW/microcopy] Pending-rij in Beheer-tab heeft geen actie ondanks 'Klik om...'-tekst
- loc: components/schedule/AfsprakenView.tsx:108-129
- In de wachtrij-sectie staat onder de pending-items de tekst 'Klik om direct naar Google Calendar te sturen', maar de individuele pending-rijen (div met titel + PENDING-badge) zijn niet klikbaar — alleen de aparte knop 'Verwerk nu' rechtsonder voert de actie uit.
- impact: De microcopy belooft een klik-actie op de rijen die niet bestaat; gebruikers klikken op een item, er gebeurt niets, en de werkelijke knop ('Verwerk nu') staat elders. Verwarrende affordance.
- fix: Maak óf de rijen daadwerkelijk klikbaar (handleVerwerk), óf herschrijf de tekst naar bv. 'Gebruik "Verwerk nu" om direct naar Google Calendar te sturen'. _(effort low)_
- verdict: partially-correct/high

### [LOW/mobile] Geen 'Alles open/Compact'-controls op mobiele tijdlijn
- loc: components/schedule/RoosterOverview.tsx:174-189; app/rooster/page.tsx:249 isWeekOpen
- De 'Alles open' / 'Compact' knoppen staan in een container met 'hidden items-center gap-2 sm:flex' en zijn dus alleen vanaf de sm-breakpoint zichtbaar. Op mobiel (compactTimeline=true) staat standaard alleen de eerste week open (index < 1) en heeft de gebruiker geen knop om in één keer alle weken uit/in te klappen.
- impact: Mobiele gebruikers moeten elke week afzonderlijk aantikken om de tijdlijn te openen en missen de snelle bulk-toggle die desktopgebruikers wel hebben. Asymmetrische functionaliteit ten nadele van het primaire (mobiele) platform.
- fix: Toon de 'Alles open'/'Compact'-knoppen ook op mobiel (verwijder de sm:-only verberging of voeg een mobiele variant toe). _(effort low)_
- verdict: confirmed/high

## notities (9)

### [MEDIUM/functional] Two incompatible deadline formats (date-only vs full ISO) break deadline sort and 'soon/today/overdue' bucketing
- loc: components/notes/DayColumn.tsx:50-54 vs components/notes/NoteEditor.tsx:2062-2073 (localDateTimeToIso/normalizeDeadlineForSave); sort in app/notities/page.tsx:147-153; getDeadlineState in NotesUtils.ts:102-124
- DayColumn quick-add writes deadline as date-only 'YYYY-MM-DD' (date.toLocaleDateString('sv-SE')). The editor writes a full UTC ISO string ('...T..:..:..Z') via toISOString(). The collection 'deadline' sort does a raw string localeCompare on a.deadline vs b.deadline (page.tsx:152). '2026-06-22' sorts BEFORE '2026-06-22T07:00:00.000Z' lexically, so a date-only deadline always orders ahead of any timed deadline on the same day regardless of actual time. Separately, getDeadlineState does new Date('2026-06-22') which parses as UTC midnight; for a user in Europe/Amsterdam (UTC+2 in June) that instant is 02:00 local on the 22nd — still same day, ok — but new Date('2026-06-22') vs new Date(full-ISO) means 'today/overdue' thresholds compare a UTC-midnight instant against now, so a date-only deadline for 'today' reads as overdue for the first 2 hours of the local day is avoided by the isSameLocalDate guard, yet the soon-window (timestamp <= now+7d) treats the date-only entry as 02:00, shifting which day it falls in near week boundaries.
- impact: Deadline sort visibly mis-orders items created via the week-journal quick-add against editor-created ones; deadline 'soon' counts on the metrics row and the 'planned' board column can flip a note in/out near midnight/week edges. Inconsistent and surprising for a planning surface.
- fix: Normalize on write to a single representation (store all deadlines as full ISO, or all as a date+time the backend echoes consistently). At minimum, in the sort and in getDeadlineState, canonicalize both operands (parse to a Date / pad date-only to a fixed local time) before comparing instead of raw string compare. _(effort medium)_
- verdict: confirmed/high

### [MEDIUM/functional] WeekJournal buckets notes by browser-local date while the rest of notes uses Europe/Amsterdam — notes can land in the wrong day
- loc: components/notes/WeekJournal.tsx:32-34 (isoDate uses local tz) and 70-82 (notesByDate); contrast components/notes/NoteAgendaUtils.ts:3-9 (getNoteDateKey pins Europe/Amsterdam)
- WeekJournal.isoDate is d.toLocaleDateString('sv-SE') with NO timeZone, so it uses the device timezone. Notes are bucketed with new Date(note.deadline || note.aangemaakt) -> isoDate(). aangemaakt is a full UTC ISO timestamp; for a note created at 23:30 UTC, a Europe/Amsterdam user (UTC+2) sees it on the next local day, but a user/device in a westerly timezone sees it the prior day. NoteAgendaUtils.getNoteDateKey deliberately forces timeZone:'Europe/Amsterdam' for the same job, so the two grouping paths disagree. DayColumn quick-add writes a date-only deadline keyed off date.toLocaleDateString('sv-SE') (also local), compounding drift.
- impact: A note created late in the evening can appear under the wrong day column in the Week Journal, and the per-day open/total counters and weekStats are computed off that mis-bucketing. For a Dutch single-user app the app already standardizes on Europe/Amsterdam elsewhere, so this is an inconsistency the user will notice when traveling or if the device tz drifts.
- fix: Make WeekJournal reuse the Europe/Amsterdam-pinned getNoteDateKey from NoteAgendaUtils for both the day grid keys and the note bucketing, instead of a local-tz isoDate. _(effort low)_
- verdict: confirmed/high

### [MEDIUM/functional] Editor auto-adds tags from typed text, so 'Onopgeslagen' never clears and notes silently gain tags the user never chose
- loc: components/notes/NoteEditor.tsx:562-568 (tag auto-merge effect) and 466-473 (isDirty/canSave)
- An effect re-derives tags on every title/content change: nextTags = mergeTags(tags, selectedEventContextTags, extractHashTags(title+inhoud), contextTags). Typing '#idee' or any text that detects a workspace/business context injects tags into state. Because tags are part of currentSnapshot and baseline, this flips isDirty=true even when the user only viewed the note, and on save enriched.tags are persisted. There is no way to remove an auto-injected context tag permanently — removeTag deletes it but the effect re-adds it on the next keystroke if the trigger text is still present.
- impact: Opening an existing note and clicking into the body can mark it 'Onopgeslagen' and, on save, append tags the user did not intend. Removing such a tag is futile while the triggering word remains. Confusing and makes the dirty indicator untrustworthy.
- fix: Only auto-suggest tags (show them as dismissible suggestions) rather than mutating committed tag state, or track user-removed tags so the effect does not re-add them; do not let pure auto-derivation flip isDirty for an otherwise-unchanged note. _(effort medium)_
- verdict: partially-correct/high

### [MEDIUM/a11y] Note card root is role=button but nests interactive checkboxes, action buttons and backlink chips — invalid/inaccessible nesting
- loc: components/notes/NoteCard.tsx:92-118 (role=button tabIndex=0 wrapper) containing 183-273 (action buttons), 339-377 (role=checkbox spans), 277-293 (clickable backlink spans)
- The entire card is role='button' tabIndex=0 with onClick=onEdit and an Enter/Space handler. Inside it are real <button>s (complete/pin/archive/delete), role='checkbox' spans, and clickable backlink <span>s. Nesting interactive controls inside a role=button is invalid ARIA and produces a confusing screen-reader tree (button announcing 'Notitie...' then nested buttons). Keyboard users tabbing reach the inner buttons fine, but the checkboxes (role=checkbox on a span) have no tabIndex so are keyboard-unreachable, and the backlink chips are spans with onClick only — not keyboard operable at all. Pressing Space anywhere also scrolls/activates the card-open handler.
- impact: Screen-reader and keyboard-only users cannot tick checklist items or follow backlinks from a card, and hear a malformed nested-button structure. This is the primary mobile interaction surface.
- fix: Make the card a non-button container with a dedicated 'open' affordance, or keep the clickable card but give the checkboxes role=checkbox + tabIndex=0 + key handlers and make backlinks real <button>/<a>. Avoid interactive descendants inside a role=button. _(effort medium)_
- verdict: confirmed/high

### [LOW/interaction] Quick-note capture swallows create errors with no feedback when the toast path is bypassed
- loc: app/notities/page.tsx:241-263 (handleQuickCreate) and components/notes/DayColumn.tsx:44-59 (handleQuickSave)
- Both quick-capture flows do try { await create(...) ; setText('') } finally { setSaving(false) } with NO catch. They rely entirely on useNotes' createMut.onError toast. But onError only fires for the mutation; the input is cleared in the finally regardless of success. If create rejects, the finally re-enables the input but the typed text was NOT cleared (clear is inside try after await, so on throw it is skipped) — good — yet there is no inline error and no retry affordance; the user just sees the spinner stop with their text still present and a transient toast they may miss. In DayColumn there is additionally no error toast wiring shown for the day-level create beyond the shared hook, and no aria-live region.
- impact: On a flaky connection the user presses Enter, the row appears (optimistic), then silently rolls back; the only signal is a toast that auto-dismisses. On the quick bar there is no persistent 'kon niet opslaan' state, unlike the full editor which renders a role=alert banner.
- fix: Surface a persistent inline error state on the quick-capture card/day input (mirroring the editor's saveError banner with role=alert) in addition to the toast, and keep focus on the input for immediate retry. _(effort low)_
- verdict: partially-correct/high

### [LOW/a11y] Tag privacy mask is only visual: real tag text leaks via DOM title/aria-label and the unmasked search still matches hidden tags
- loc: components/notes/NoteEditor.tsx (n/a) — components/notes/NotesFilters.tsx:204,335 (tagLabel masks visible text) but NotesUtils.tsx:98-100 tagLabel returns 'Tag N'; NoteCard.tsx:215-223 tag chips are hidden under masked but app/notities/page.tsx:131-137 search haystack always includes note.tags
- With privacy on, tag buttons show 'Tag N' but the underlying filtering/sort and the global search (page.tsx displayed memo) build the haystack from real note.tags and titel/inhoud. The masking is cosmetic. Also the masked card still renders aria-hidden Tag icons but the screen reader announces nothing useful, while the desktop Tags section subtitle reveals 'verborgen tag' yet the active tagFilter value itself is the real tag in state. Anyone with DOM access or a screen reader navigating the search results sees/matches real content the mask claims to hide.
- impact: Privacy toggle gives a false sense of confidentiality: real tag/title/content text remains queryable and present in the accessibility tree even while the UI shows dots.
- fix: If privacy is meant to be more than a glance-shield, also suppress matching on masked content (or clearly document it as glance-only). At minimum do not expose real tag strings in title/aria-label while masked. _(effort medium)_
- verdict: partially-correct/high

### [LOW/interaction] Editor focus trap and visualViewport handlers run with no dependency on note identity and can target the wrong modal element
- loc: components/notes/NoteEditor.tsx:603-621 (visualViewport effect) and 858-905 (Tab/Escape global keydown)
- The visualViewport effect sets modal.style.maxHeight on scrollRef.current?.parentElement — but the parent of the scroll container is the dialog's inner div; this couples layout to DOM structure and runs once on mount with empty deps, so if the keyboard opens before scrollRef is wired it silently does nothing. The Tab focus-trap is hand-rolled here even though the prompt notes a shared useFocusTrap exists on Modal/ConfirmDialog/BottomSheet; this bespoke trap recomputes focusable elements on every Tab and uses getComputedStyle in isFocusableElement which forces layout. It also does not restore focus to the trigger on close.
- impact: On mobile, when the soft keyboard appears the dynamic max-height resize can fail to apply for the first interaction; focus is not returned to the originating card/button after closing the editor, hurting keyboard flow.
- fix: Reuse the shared useFocusTrap (returns focus on unmount) instead of the bespoke trap, and key the viewport effect off a stable ref to the dialog element rather than parentElement traversal. _(effort medium)_
- verdict: partially-correct/high

### [LOW/microcopy] 'Afronden' button in editor is disabled whenever the note is dirty, with only a tooltip explaining why — no visible inline hint on mobile
- loc: components/notes/NoteEditor.tsx:775-786 (handleCompleteClick early-returns if isDirty) and 1563-1579 (button disabled={actionBusy || isDirty})
- When there are unsaved edits the Afronden/Heropenen button is disabled and only a title attribute ('Sla wijzigingen eerst op') explains it. Title tooltips do not appear on touch devices (the primary platform). So a mobile user sees a greyed-out 'Klaar' button with no reason given, while the Opslaan button is enabled — the relationship ('save first, then complete') is invisible.
- impact: Mobile users perceive the complete action as broken/unresponsive when they have pending edits; there is no on-screen Dutch explanation.
- fix: Show a small inline note near the action row when isDirty (e.g. 'Sla eerst je wijzigingen op om af te ronden') instead of relying on a hover-only title, or auto-save then complete. _(effort low)_
- verdict: confirmed/high

### [LOW/mobile] Desktop note-card action buttons (archive/delete) are hover-only and hidden on touch, while mobile hides archive/delete entirely
- loc: components/notes/NoteCard.tsx:233-272 (action group opacity-0 sm:group-hover, archive/delete have 'hidden ... sm:flex')
- The action button group is opacity-0 until group-hover on sm+ (fine for desktop) but the Archive and Delete buttons carry 'hidden ... sm:flex', so on mobile (<640px) only Complete and Pin are reachable from a card; archiving/deleting requires opening the full editor. That is a defensible choice, but combined with the hover-reveal it means on a touch device with a wide viewport (tablet ~700px in landscape, still 'sm') the buttons are present but require a hover that never fires on touch, leaving them effectively unusable until a tap-focus.
- impact: On touch tablets the archive/delete affordances exist in the DOM but are visually hidden (opacity-0, no hover), so users cannot discover them; on phones they are entirely absent.
- fix: Drive the reveal off a pointer:fine media query rather than sm breakpoint, and keep the action group visible (not opacity-0) on any touch/coarse-pointer device so archive/delete are reachable. _(effort low)_
- verdict: confirmed/high

## habits (13)

### [HIGH/interaction] Main habits page gives no pending/disabled feedback on toggle, stepper, incident, pause and archive
- loc: app/habits/page.tsx (lines 42-57, 196-212, 223-238) + components/habits/HabitsVandaagTab.tsx + HabitsOverzichtTab.tsx + HabitCard.tsx
- useHabits exposes pendingHabitId and runHabitAction blocks concurrent actions with `if (pendingHabitId) return;`. DailyChecklist consumes pendingHabitId (already fixed), but the main habits page never destructures it (the destructure on lines 42-57 omits it) and never passes it down, so HabitCard renders no pending/disabled/aria-busy state. While a toggle/increment/incident/pause/archive request is in flight, the user gets zero visual change, AND a second tap is silently swallowed by the in-flight guard. On a quantitative stepper this is especially bad: every +/- tap waits a full network round-trip (invalidate+refetch, no optimistic update) before the number moves, with no spinner, so it feels broken on mobile/slow networks.
- impact: On the primary surface (the habits page itself, mobile-first), the core daily interactions feel unresponsive and double-taps appear to do nothing. The fix already shipped to the dashboard widget did not reach the main page.
- fix: Destructure pendingHabitId in page.tsx, thread it through HabitsVandaagTab/HabitsOverzichtTab to HabitCard, and have HabitCard set disabled + aria-busy + reduced opacity on the check/stepper/incident buttons when habit._id === pendingHabitId (mirror DailyChecklist's HabitCheckItem). Consider an optimistic value bump for the quantitative stepper so the number moves immediately. _(effort medium)_
- verdict: confirmed/high

### [HIGH/functional] Habit delete fails silently — no error handling, no toast, no await
- loc: hooks/useHabits.ts (remove, lines 475-478) + app/habits/page.tsx (handleDelete, lines 116-120)
- Unlike create/update (wrapped in try/catch with toasts in page.tsx) and toggle/increment/incident/pause/archive (wrapped in runHabitAction with error toasts), `remove` calls deleteHabitsId with no try/catch and no error toast. handleDelete invokes `remove(confirmDelete)` without await or catch, then immediately closes the confirm dialog. If the DELETE request fails (offline, 500, auth), the dialog closes, the habit stays in the list, and the user sees no error — they believe it was deleted.
- impact: Destructive action that silently no-ops on failure; user thinks data is gone when it isn't, or retries and gets confused. Inconsistent with every other mutation on the page.
- fix: Make remove return its promise (it already is async) and have handleDelete `await` it inside try/catch, showing toastError('Habit verwijderen is mislukt') on failure and only closing the dialog on success — or route it through runHabitAction like the other per-habit actions. _(effort low)_
- verdict: confirmed/high

### [HIGH/a11y] Delete confirmation dialog is a hand-rolled modal with no focus trap, no Escape, no dialog ARIA
- loc: app/habits/page.tsx (lines 275-325)
- The 'Habit verwijderen?' confirmation is built inline from raw motion.div elements. It has no role="dialog", no aria-modal, no aria-labelledby, no focus trap, and no Escape-to-close handler (only a backdrop click). The codebase already has a shared ConfirmDialog with useFocusTrap + Escape (per the fixed-list), but this destructive confirmation bypasses it. Keyboard focus stays behind the backdrop, so a keyboard or screen-reader user cannot reliably reach Annuleren/Verwijderen and cannot dismiss with Escape.
- impact: The single most destructive action on the page (deletes logs, streaks, badges) is inaccessible by keyboard and to screen readers, and behaves inconsistently with the rest of the app's dialogs.
- fix: Replace the inline dialog with the shared ConfirmDialog primitive (or wrap it with useFocusTrap, add role="dialog"/aria-modal/aria-labelledby tied to the h3, focus the Annuleren button on open, and close on Escape). _(effort medium)_
- verdict: confirmed/high

### [MEDIUM/functional] Heatmap rows do not align to weekday labels (Ma/Wo/Vr) — labels can be wrong
- loc: components/habits/HabitHeatmap.tsx (lines 23, 58-82, 151-183)
- Weeks are built by slicing the flat day array in fixed 7-element chunks from index 0 (`days.slice(i, i+7)`), and each chunk is rendered top-to-bottom against the fixed day labels DAYS = ['','Ma','','Wo','','Vr','']. This only lines up if days[0] is exactly the weekday that row 0 represents. If the 365-day window does not start on that weekday (the typical case — a 365-day window starting 'today minus 364' starts on an arbitrary weekday), every cell is shifted into the wrong row and the Ma/Wo/Vr labels mislabel the rows. The month labels have the same problem: month is taken from week[0].datum regardless of weekday offset.
- impact: A GitHub-style heatmap whose weekday rows and month markers can be off, so users misread which day a given square represents.
- fix: Pad the leading edge so the first column starts on the label's day-0 (compute getDay() of days[0] and prepend empty cells), or derive the row index per cell from new Date(day.datum).getDay() instead of array position. Confirm what weekday the backend's first element represents and align DAYS accordingly. _(effort medium)_
- verdict: confirmed/high

### [MEDIUM/mobile] Heatmap and stepper rely on native title tooltips — no touch/keyboard access on mobile
- loc: components/habits/HabitHeatmap.tsx (lines 171-177, title attr on cells)
- The per-day data (date, count/due, completion %) is exposed only via the HTML `title` attribute on 12x12px non-interactive divs. title tooltips do not appear on touch (no hover), and the cells aren't focusable, so on mobile — the primary platform — there is no way to read any day's value. The squares are also 12px with 3px gaps, far below the 44px touch target if they were ever made tappable.
- impact: On phones the heatmap is purely decorative; the actual numbers are unreachable.
- fix: Make cells focusable buttons with an accessible label and show the day detail in an on-tap popover/inline readout, or render a small selected-day summary line below the grid that updates on tap. _(effort medium)_
- verdict: partially-correct/high

### [MEDIUM/interaction] HabitCard 'more actions' menu closes only on mousedown — not touch, not Escape, not scroll
- loc: components/habits/HabitCard.tsx (lines 77-86, 264-274, 545-588)
- The dropdown menu (Bewerken/Pauzeren/Archiveer/Verwijder) opens via MoreVertical, but the outside-click handler only listens for 'mousedown'. On touch devices there is no mousedown for taps outside, so tapping elsewhere (or another card's menu) often won't dismiss it; multiple menus can stay open. There is also no Escape handler and no close-on-scroll. The menu is also not a real ARIA menu (the trigger uses aria-expanded but the panel has no role="menu"/menuitem and no focus management).
- impact: On the mobile-primary surface the action menu is sticky/awkward to dismiss, and it's not announced as a menu to assistive tech.
- fix: Listen for 'pointerdown' (covers mouse+touch) instead of 'mousedown', add Escape-to-close, and give the panel role="menu" with the buttons as role="menuitem". _(effort low)_
- verdict: confirmed/high

### [MEDIUM/interaction] Paused habits in Overzicht render fully interactive-looking cards whose actions are no-ops
- loc: components/habits/HabitsOverzichtTab.tsx (lines 138-161) + HabitCard.tsx
- In the 'Gepauzeerd' section each HabitCard is passed onToggle/onIncrement/onIncident as `() => undefined`. HabitCard still renders the full check button / stepper +/- / incident button with active:scale-90 press animations and enabled styling. The buttons visually depress on tap but do nothing — there is no disabled state and no explanation. The container only sets opacity-75.
- impact: Users tap to complete/increment a paused habit, get tactile press feedback, and nothing happens with no indication why. Looks broken.
- fix: Pass an explicit `disabled`/paused flag into HabitCard so it renders the controls as disabled (or hides the check/stepper/incident controls entirely for paused habits) and surfaces a 'Gepauzeerd' affordance to resume. _(effort medium)_
- verdict: confirmed/high

### [LOW/functional] Privacy mask leaks the goal unit and incident-trigger emoji
- loc: components/habits/HabitCard.tsx (lines 314-317 stepper goal, 466-496 trigger buttons)
- When masked (privacy mode), the quantitative stepper hides the numbers ('••') but still prints the unit: `/ {masked ? '••' : ...}` masks the value, yet the surrounding label and `habit.eenheid` plumbing means the goal line reveals structure; more concretely, the incident-trigger buttons set aria-label to a generic 'Trigger N' when masked but the visible text uses `${t.emoji} ${t.label}` only when not masked — that part is fine — however the doelTijd time badge (lines 242-247) is correctly hidden, while the detail panel still renders frequency/rooster labels. The clearest leak: in masked mode the stepper still shows the real unit via `habit.eenheid` is suppressed too, but the 'Vermijden' type badge and difficulty label (MOEILIJKHEID) remain visible, partially de-anonymising a 'Verborgen habit'.
- impact: Privacy mode is advertised as hiding habit details, but type (Vermijden), difficulty, frequency and streak metadata stay on screen, weakening the privacy guarantee in front of onlookers.
- fix: Audit every field rendered in HabitCard against `masked` and suppress type badge, difficulty label, frequency and streak text (or replace with neutral placeholders) consistently, the way name/emoji/value are already masked. _(effort medium)_
- verdict: partially-correct/high

### [LOW/a11y] Tab bar uses generic <nav> with aria-pressed/aria-current instead of tablist semantics
- loc: app/habits/page.tsx (lines 154-186)
- The Vandaag/Overzicht/Statistieken switcher is a set of buttons in a <nav> using aria-pressed + aria-current="page" and aria-label="Tab {label}". These control in-page sections (AnimatePresence panels), not navigation, so screen readers announce them as toggle buttons / page links rather than tabs. There is no role="tablist"/tab/tabpanel wiring and no arrow-key roving between tabs.
- impact: Assistive-tech users don't get tab semantics or arrow-key navigation for what is clearly a tab control; aria-current="page" is misleading since nothing navigates.
- fix: Either give the container role="tablist" with role="tab"/aria-selected/aria-controls on the buttons and role="tabpanel" on the sections (with arrow-key roving), or keep buttons but drop the misleading aria-current="page". _(effort medium)_
- verdict: confirmed/high

### [LOW/interaction] Quantitative habits cannot be marked complete except via the goal value — no manual check
- loc: components/habits/HabitCard.tsx (lines 152-166, 321-333)
- For a quantitative habit the emoji tile (lines 152-166) is a non-interactive <div>, not a button — completion is driven only by the +/- stepper reaching the goal. The plus button is disabled once isCompleted. There is no way to tap the main tile to toggle/complete, and a user who wants to just mark it done in one tap (rather than pressing + repeatedly, e.g. 8 presses for an 8-glass goal at step 1) has no shortcut.
- impact: Logging a quantitative habit is tedious on mobile (many taps), and the prominent emoji tile looks tappable but isn't.
- fix: Either make the quantitative tile a button that jumps to the goal value (one-tap complete) or add a 'klaar' shortcut; at minimum give the non-interactive tile no button affordance so it doesn't look tappable. _(effort medium)_
- verdict: confirmed/high

### [LOW/a11y] Low-contrast muted text (text-slate-600 / [9px]-[10px]) on dark surfaces fails AA
- loc: components/habits/HabitCard.tsx (difficulty label line 239-241 text-slate-600, doelTijd, detail meta), HabitHeatmap.tsx (day/legend labels text-slate-600 at [8px]-[9px], lines 154-160, 186-195)
- Several meaningful labels use text-slate-600 (~#475569) at 8-10px on the near-black background. text-slate-600 on #0b0f17-ish surfaces is well below the 4.5:1 AA threshold (and below 3:1 for the 8-9px non-large text in the heatmap legend and weekday labels). The MEMORY note flags --color-text-muted #94a3b8 as the AA-safe muted token, but these spots hardcode darker slate-600/slate-700.
- impact: Difficulty, created-date, heatmap weekday/month/legend labels are hard to read, particularly for low-vision users and in bright ambient light on mobile.
- fix: Bump these muted labels to at least slate-500/--color-text-muted (#94a3b8) and avoid 8px text for information-bearing labels; reserve slate-600/700 for purely decorative elements. _(effort low)_
- verdict: confirmed/high

### [LOW/microcopy] Empty-state copy says 'vandaag ... afvinken' even when viewing a past/other day
- loc: components/habits/HabitsVandaagTab.tsx (lines 60-67)
- When there are no habits for the selected day and activeCount === 0, emptyText is always 'Maak je eerste habit aan om vandaag te kunnen afvinken.' regardless of isToday. While navigating to a past or future date (Dagstatus arrows), the title correctly reads 'Geen habits op deze dag' but the body still says 'vandaag', which contradicts the chosen date. Also the action button to add a habit only appears when isToday && activeCount===0, so on a non-today empty day the user gets dead-end copy with no CTA.
- impact: Minor confusion: copy references 'vandaag' while the date control shows e.g. 'Gisteren', and there's no way forward from the empty state.
- fix: Make emptyText conditional on isToday (e.g. for non-today: 'Geen geplande habits voor deze dag.'), and consider showing the 'Habit toevoegen' CTA regardless of selected day since adding is date-independent. _(effort low)_
- verdict: confirmed/high

### [LOW/microcopy] Incident 'Annuleren' resets selection but the inline form has no clear required-note signal until submit
- loc: components/habits/HabitCard.tsx (lines 499-538)
- The note input appears once any trigger is selected, with placeholder 'Optionele notitie...' — except when trigger === 'anders', where the note becomes required (submit disabled until non-empty) and placeholder switches to 'Beschrijf de trigger...'. The required-ness for 'anders' is only communicated by a disabled (opacity-30) submit button; there's no inline 'verplicht' hint or error, so a user who picks 'Anders', leaves the note blank, and taps the dimmed 'Incident loggen' gets no feedback explaining why nothing happens.
- impact: Dead-button confusion when logging an 'Anders' incident without a note; the disabled state has no explanation.
- fix: Add a short helper/error line under the input when trigger==='anders' and note is empty (e.g. 'Beschrijving verplicht bij Anders'), and/or mark the field required visually. _(effort low)_
- verdict: confirmed/high

## finance (12)

### [HIGH/a11y] Category dropdown is a non-dismissible, non-keyboard-trappable custom menu with no outside-click / Escape close
- loc: components/finance/TransactionList.tsx:14-47 (CategorieEditor)
- The inline categorie editor toggles `open` purely on the trigger button. There is no outside-click handler, no Escape-to-close, no `aria-expanded`/`aria-haspopup`/`role="menu"`, and focus is not moved into or returned from the popover. The opener button has no accessible name beyond its visible text (just the category + a chevron icon). Opening one row's dropdown and clicking elsewhere (or opening another row) leaves the first one open since each instance manages its own local state.
- impact: Keyboard and screen-reader users cannot perceive this as a menu or escape it predictably; mouse users can get multiple stacked dropdowns. On the mobile-primary layout the absolutely-positioned `cat-dropdown` (min-width 160px, right:0) can also overflow the viewport edge with no repositioning.
- fix: Add `aria-haspopup="listbox"`/`aria-expanded`, close on Escape and outside-click (reuse the existing useFocusTrap/overlay pattern already used by Modal/BottomSheet), and move focus into the list when opened. Consider rendering the picker as a BottomSheet on mobile. _(effort medium)_
- verdict: confirmed/high

### [MEDIUM/functional] Transaction date headers omit the year, ambiguous in the "Alles" (all-years) view
- loc: components/finance/TransactionList.tsx:93-101; app/finance/page.tsx:228-237 ("Alles" year option)
- The grouped date header formats with `{ weekday: "long", day: "numeric", month: "long" }` — no year. The page exposes an "Alles" period button (empty jaarFilter) that loads transactions across multiple years, and the search/category filters can return rows spanning year boundaries. Two rows dated 2025-03-14 and 2026-03-14 both render an identical header "vrijdag 14 maart".
- impact: In the all-years or cross-year filtered views the user cannot tell which year a group of transactions belongs to, and duplicate-looking headers appear far apart in the list.
- fix: Include the year in the header (or only when the visible range spans more than one year). Given there's a deliberate "Alles" option, always showing the year is the safe fix. _(effort low)_
- verdict: confirmed/high

### [LOW/functional] CSV import always reports "0 bijgewerkt" (updated) — backend has no such field
- loc: components/finance/CsvUploader.tsx:84,181,199-202; lib/api/model/handlerTransactionImportResponse.ts
- The import response model only returns {inserted, skipped, total, ok} — there is no `updated`/`bijgewerkt` field. CsvUploader hardcodes `bijgewerkt += 0` and then surfaces it in both the live progress line ("+X nieuw · 0 bijgewerkt · Y al bekend") and the done screen as a dedicated stat tile labelled "bijgewerkt". When a user re-imports a CSV that overlaps existing rows, the rows that were actually upserted/changed are all bucketed into either `skipped` or `inserted`; the "bijgewerkt" column is permanently 0 and the wording "al bekend" (already known) for skipped rows may be wrong if the backend actually updated them.
- impact: User gets a misleading import receipt — a column that is structurally always zero and a count split that may not reflect what the backend did. Erodes trust in the importer for the app's primary data-entry path.
- fix: Either remove the `bijgewerkt`/"bijgewerkt" stat entirely (cleanest, since the API can't populate it) or, if the Go backend can distinguish updates, add an `updated` field to the response and map it. At minimum stop rendering a hardcoded-0 metric tile. _(effort low)_
- verdict: partially-correct/high

### [LOW/functional] `loadMore` and the fetch effect both write `offset`, risking a duplicated or skipped page on rapid filter changes
- loc: hooks/useTransactions.ts:100-102,145,165-191
- Pagination offset lives in three places: a `setOffset(0)` reset effect keyed on filterKey, the fetch effect's `setOffset(pageItems.length)`, and `loadMore`'s `setOffset(prev => prev + pageItems.length)`. `loadMore` captures `offset` and `filter` in its closure/deps. If the user clicks "Meer laden" while a filter change is in flight (the fetch effect re-running), `loadMore` can fire with a stale `offset`/stale `filter`, appending a page computed against the old query into the new result set (or re-fetching offset 0..50 again). There is no in-flight guard on `loadMore` and no cancellation token shared with the effect.
- impact: Rapid interaction (change filter, immediately load more) can duplicate rows in the list or drop a page, and the appended rows may belong to the previous filter — wrong/duplicated data in the transaction list.
- fix: Guard `loadMore` against running while `isLoading` is true, and/or tag each fetch with the current filterKey and ignore `loadMore` results whose key no longer matches. Consider consolidating pagination into TanStack Query's useInfiniteQuery to get this for free. _(effort medium)_
- verdict: partially-correct/high

### [LOW/functional] CsvUploader instantiates a second, throwaway `useTransactions()` — `resetPagination()` it calls is a no-op
- loc: components/finance/CsvUploader.tsx:32,89; hooks/useTransactions.ts
- `useTransactions` is a plain stateful hook (not React Query / not a shared store). CsvUploader calls `const { importBatch, resetPagination } = useTransactions();`, creating an independent instance with its own transactions/offset state separate from the FinancePage instance. After import it calls `resetPagination()` which mutates only this orphan instance's offset; the page's actual list is refreshed solely via `onImported?.()` → page `refresh()`.
- impact: Dead code that implies a side effect it doesn't have; also fires an extra transactions+stats fetch on mount of the uploader (two parallel network round-trips for the same data) because the orphan instance runs its own fetch effect.
- fix: Drop the `resetPagination()` call and, ideally, give the uploader a lean hook that only exposes `importBatch` without spinning up the full fetch effect, to avoid the duplicate initial network load. _(effort low)_
- verdict: confirmed/high

### [LOW/interaction] Bedragbereik Min/Max accept inverted ranges and only step in increments of 10
- loc: components/finance/FilterPanel.tsx:150-178
- Min and Max are independent `type=number step=10` inputs with no cross-validation: a user can set Min 500 / Max 100 (yielding zero results with no hint why), and there's no decimal allowance signalled — `step={10}` makes the spinner jump by tens while users often filter on amounts like €12,50. The chips show "Min: €500 / Max: €100" without flagging the contradiction.
- impact: Silent empty result set when the range is inverted; clunky stepping for everyday euro amounts. The empty list just says "Geen transacties gevonden voor deze filters" with no indication the range is the cause.
- fix: Clamp/swap or validate min<=max (show an inline hint), and use a finer step (or `step="any"`) so cent-level filtering works. _(effort low)_
- verdict: confirmed/high

### [LOW/interaction] Search/category jump from insights and the merchant list silently no-op when the matching section is collapsed or not data-changing
- loc: components/finance/FinanceInsights.tsx:69-84 (merchant → setZoekterm); app/finance/page.tsx:90-95 (toggleCategoryFilter)
- Clicking a top-merchant row calls `setZoekterm(merchant.naam)` and clicking a category sets `categorieFilter`, but these controls live inside the "Abonnementen & Inzichten" CollapsibleSection and the charts section, while the transaction list they affect is far below. There's no scroll-to-list, no visual confirmation near the click, and the search input/filter chips that reflect the change are also elsewhere. On mobile the user taps a merchant and sees nothing change in the viewport.
- impact: The interaction appears to do nothing — the feedback (updated search box, filtered list) is off-screen. Users may tap repeatedly or assume it's broken.
- fix: After setting the search/category from an insight, scroll the Transacties section into view (or surface a small toast/active-filter indicator at the point of interaction). _(effort medium)_
- verdict: partially-correct/high

### [LOW/interaction] Empty-state "Verder zoeken" button can fire while a fetch is already loading
- loc: components/finance/TransactionList.tsx:72-83
- The empty state renders when `transactions.length === 0 && !isLoading`, and offers a "Verder zoeken" button gated only on `!isDone` (no `disabled={isLoading}`, unlike the bottom "Meer laden" button which is correctly disabled). Because `loadMore` has no in-flight guard, a fast double-tap (likely on touch) triggers two overlapping `getTransactions` calls.
- impact: Double-firing pagination from the empty state compounds the offset race noted above and gives no pressed/loading feedback on tap.
- fix: Disable the button while loading and show a spinner, mirroring the "Meer laden" button; combine with the `loadMore` in-flight guard. _(effort low)_
- verdict: partially-correct/high

### [LOW/a11y] Transaction rows are visually colour-coded but interactive only via a tiny category chip; whole row has no semantics
- loc: components/finance/TransactionList.tsx:103-136; app/globals.css:188-244
- Credit/debit/stornering/intern state is conveyed almost entirely by colour (green text, rose left-border, 0.4 opacity for intern) with no text/icon equivalent for the stornering and intern *amount* — the only non-colour cue for credit vs debit is the TrendingUp/Down icon. Interne overboekingen are rendered at `opacity:0.4`, which pushes the already-muted text below comfortable contrast, and the "↔ Interne overboeking" label plus amount become hard to read. The negative amount uses `--color-text` (default body colour) rather than a distinct debit colour, so a −€50 looks like neutral text next to a green +€50.
- impact: Low-vision users and anyone in bright conditions (mobile-primary) struggle to read interne rows at 40% opacity and to distinguish debit amounts, which carry no colour and only a small down-arrow.
- fix: Raise the intern row opacity (or mute via colour token instead of opacity), and give debit amounts a distinct (e.g. rose/red) colour so the sign isn't the only cue. _(effort low)_
- verdict: partially-correct/high

### [LOW/microcopy] "Go API live" badge and "Rabobank CSV naar PostgreSQL" expose backend internals as user-facing copy
- loc: app/finance/page.tsx:221-224,322
- The period card shows a "Go API live" pill and the import card subtitle reads "Rabobank CSV naar PostgreSQL". These leak implementation/stack details (Go, PostgreSQL) into the primary UI of a personal finance dashboard.
- impact: Confusing/irrelevant to the end user and slightly unprofessional; the "Go API live" badge in particular looks like a debug artifact in production.
- fix: Replace with user-meaningful copy (e.g. "Live verbinding" / "Rabobank CSV importeren") or remove the stack references. _(effort low)_
- verdict: confirmed/high

### [LOW/functional] Year filter list can render a duplicate/locale-collapsed set and an unlabelled "" option mapped to "Alles"
- loc: app/finance/page.tsx:101-104,228-237
- `yearOptions = Array.from(new Set([...years, ""]))` appends an empty string for the "Alles" tab. If `stats.jaren` already contains an empty string or the fallback `["2026","2025"]` overlaps real data only partially, the Set dedupes by string but the render keys use `year || "all"`. More importantly, the default `jaarFilter` is hardcoded to `"2026"` (line 48) regardless of whether 2026 data exists; if the user only has 2025 data, the page opens on an empty 2026 view until they manually switch.
- impact: On first load a user whose latest data is e.g. 2025 sees empty metrics/charts and "0 transacties" until they discover the year tabs — a confusing empty initial state.
- fix: Default `jaarFilter` to the most recent year present in `stats.jaren` once stats load (or to "" / Alles), instead of a hardcoded "2026". _(effort low)_
- verdict: partially-correct/high

### [LOW/functional] Storneringen alert and metric can disagree because they count over different scopes
- loc: app/finance/page.tsx:333-353 (alert from stats.storneringen, gated on selected period) and FinanceMetricsGrid storneringen tile
- The rose alert banner says stornering(en) were "gevonden in de geselecteerde periode" and toggles `onlyStorneringen`, but `stats` is fetched with only `{ibanFilter, jaarFilter}` (useTransactions.ts:135) — it ignores maandFilter, categorieFilter, richting, date range, search, etc. So after the user narrows to a single month or category, the banner and the "Storneringen" metric still reflect the whole year, while the transaction list reflects the narrow filter. Clicking "Alleen storneringen" then filters the list to a possibly-empty set even though the banner claimed storneringen exist "in de geselecteerde periode".
- impact: Metric cards (saldo, inkomsten, storneringen, categorieën, etc.) and the storneringen banner do not update when month/category/amount/search filters are applied — they only respond to year and IBAN. Users reasonably expect the headline numbers to track their active filters; the "in de geselecteerde periode" wording actively asserts a scope the data doesn't honour.
- fix: Either pass the full active filter set to getTransactionsStats so the metrics track the selection, or change the copy to make clear the cards summarise the whole year/account (not the filtered list) and that only the transaction list below is filtered. _(effort medium)_
- verdict: confirmed/high

## automations (12)

### [HIGH/functional] Mutaties worden niet ge-await; 'success'-toast verschijnt ook bij een mislukte API-call
- loc: app/automations/page.tsx:26-47 (handleSave, handleDelete) en :164-166 (onToggle); hooks/useAutomations.ts:52-96
- add/update/toggle/remove zijn async (apiFetch gooit een Error bij !res.ok), maar de page roept ze aan zonder await en toont onvoorwaardelijk een succes-toast. handleSave doet `add(data); success('... aangemaakt')` — de toast verschijnt ook als de POST faalt. Voor toggle wordt zelfs helemaal geen feedback of error afgehandeld; remove toont 'Automatisering verwijderd' los van het resultaat. Een gefaalde mutatie produceert een unhandled promise rejection en geen enkele zichtbare fout.
- impact: Gebruiker krijgt een groene bevestiging ('aangemaakt'/'verwijderd') terwijl er niets is opgeslagen op de Go-backend. Bij verbroken verbinding lijkt alles te werken; pas na refetch (of helemaal niet) merkt de gebruiker dat de automatisering ontbreekt. Stille datafout op een veiligheidsgevoelige wekker-feature.
- fix: Maak handleSave/handleDelete/onToggle async, await de mutatie in try/catch, en toon een error-toast bij falen. Verplaats de success-toast naar na een geslaagde await. Overweeg useMutation met onError voor consistente foutafhandeling. _(effort low)_
- verdict: confirmed/high

### [HIGH/interaction] Geen laad- of foutstatus voor de lijst; backend-down toont 'Nog geen automatiseringen'
- loc: hooks/useAutomations.ts:35-43,132 (query exposeert geen isLoading/isError) en app/automations/page.tsx:195-212 (empty state)
- useAutomations geeft alleen { automations } terug; isLoading/isError/refetch worden niet doorgegeven. De page rendert bij een lege/gefaalde fetch direct de empty-state met de tekst 'Nog geen automatiseringen' en de DienstWekkerSection als '0/3 profielen, niet ingesteld'. Er is geen skeleton tijdens het laden en geen ErrorState+retry als de proxy/Go-backend faalt.
- impact: Bij trage of mislukte fetch ziet de gebruiker dat al zijn wekkers en automatiseringen 'verdwenen' zijn en wordt aangespoord opnieuw te beginnen. Risico dat hij een Dienstwekker-profiel opnieuw opslaat terwijl de echte data nog op de server staat. Inconsistent met de elders al toegevoegde ErrorState-aanpak.
- fix: Exposeer isLoading en isError uit de useQuery en render in de page een loading-skeleton en een ErrorState met retry. Onderscheid 'echt leeg' van 'kon niet laden'. _(effort medium)_
- verdict: confirmed/high

### [MEDIUM/interaction] Kleurtemperatuur-slider: gradient is omgekeerd t.o.v. de mireds-waarde
- loc: components/automations/AutomationForm.tsx:298-306
- De range loopt min={153} (lage mireds = koel/blauw) tot max={455} (hoge mireds = warm/oranje). De achtergrond-gradient is `linear-gradient(to right, #ff9329, #fff4e6, #cce4ff)` — dus warm-oranje links, koel-blauw rechts. Dat is precies omgekeerd: bij de laagste waarde (links, 153) staat de thumb op het oranje uiteinde terwijl 153 mireds juist het koelste/blauwste licht is.
- impact: Gebruiker die de schuif naar het 'oranje' (linker) deel sleept om warm licht in te stellen, krijgt het koudste licht. De ingestelde sfeer is het tegenovergestelde van wat de slider visueel suggereert.
- fix: Draai de gradient om naar `to right, #cce4ff, #fff4e6, #ff9329`, of keer het waardebereik om zodat links=warm overeenkomt met de kleur. Toon ook de berekende Kelvin-waarde als label (zoals actionLabel al doet). _(effort low)_
- verdict: confirmed/high

### [MEDIUM/functional] Triggershift en uitsluitingsshift kunnen identiek zijn → automatisering vuurt nooit
- loc: components/automations/AutomationForm.tsx:217-235 (Kies de Dienst) en :329-346 (Slimme Uitsluitingen)
- In rooster-modus kies je een shiftType waarop de automatisering moet afgaan (bv. 'Vroeg'), maar in 'Slimme Uitsluitingen' kun je diezelfde shift ook aanvinken. De engine vuurt alleen op een 'Vroeg'-dienst maar slaat over als vandaag een 'Vroeg'-dienst is — een logische tegenstrijdigheid die de regel permanent dood maakt. Er is geen waarschuwing of disabling.
- impact: Gebruiker maakt een ogenschijnlijk geldige, ingeschakelde wekker die nooit afgaat, zonder enige indicatie. Bijzonder erg voor een dienstwekker: je vertrouwt op een wekker die structureel zwijgt.
- fix: Disable in de uitsluitingsrij de knop die gelijk is aan de gekozen triggershift, of toon een inline-waarschuwing wanneer trigger- en uitsluitingsshift overlappen. _(effort low)_
- verdict: confirmed/high

### [MEDIUM/mobile] Toggle/edit/delete-knoppen zijn 32px — onder de minimale touch-target op mobiel
- loc: components/automations/AutomationCard.tsx:94-120 (w-8 h-8 knoppen)
- De drie actieknoppen per kaart (pauzeren/starten, bewerken, verwijderen) zijn w-8 h-8 = 32×32px met slechts gap-2 ertussen. Op ~380px staan drie 32px-targets dicht naast elkaar rechts van een kaart. Dat is ruim onder de aanbevolen 44×44px en de naast elkaar geplaatste pauze/bewerk/verwijder-targets zitten te dicht op elkaar.
- impact: Op mobiel (de primaire vorm) is per ongeluk 'Verwijderen' raken naast 'Pauzeren' waarschijnlijk. Verwijderen heeft weliswaar een confirm, maar de toggle (pauzeren van een wekker) niet — een misklik kan stil een dienstwekker uitzetten.
- fix: Vergroot de tap-targets naar minimaal 40-44px (bv. h-10 w-10 of een grotere padding-hitbox) en/of vergroot de tussenruimte op mobiel. _(effort low)_
- verdict: confirmed/high

### [MEDIUM/a11y] Modal-formulier mist focus-trap, aria-modal/role=dialog en Escape-sluiten
- loc: components/automations/AutomationForm.tsx:91-121 (eigen overlay i.p.v. gedeelde Modal-primitive)
- AutomationForm rendert een eigen fixed overlay i.p.v. de gedeelde Modal (die volgens de projectstatus al useFocusTrap + Escape + a11y heeft). Er is geen role="dialog"/aria-modal, geen focus-trap, geen autofocus op het eerste veld, en geen Escape-handler — alleen een klik op de backdrop sluit. Toetsenbordfocus kan achter de overlay in de pagina belanden.
- impact: Toetsenbordgebruikers en screenreader-gebruikers kunnen uit de dialog 'wegtabben' naar de header/lijst eronder, en kunnen de dialog niet met Escape sluiten zoals overal elders in de app. Inconsistente, ontoegankelijke ervaring vergeleken met de reeds gefixte modals.
- fix: Herbouw AutomationForm bovenop de gedeelde Modal-primitive (focus-trap, Escape, role/aria-modal), of voeg dezelfde useFocusTrap + Escape-handler + role="dialog" aria-modal="true" toe. _(effort medium)_
- verdict: confirmed/high

### [LOW/functional] Optimistische save vervangt geheel profiel server-side maar UI vertrouwt blind op refetch-timing
- loc: hooks/useAutomations.ts:98-120 (addDienstWekkerPack) en components/automations/DienstWekkerSection.tsx:131-133,141
- addDienstWekkerPack doet deleteByGroup gevolgd door N parallelle create-calls, dan één refetch. Er is geen rollback als deleteByGroup slaagt maar een of meer creates falen (Promise.all faalt bij de eerste reject, maar de al-geslaagde creates blijven staan en de gefaalde ontbreken). De DienstWekkerSection synchroniseert draftTimes alleen via useEffect op `automations`, dus een half-mislukte save laat een inconsistent profiel achter (bv. 2 van de 3 stappen) zonder dat de 'dirty'-detectie dat als fout markeert.
- impact: Bij een netwerk-hapering midden in het opslaan van een Vroeg-wekker (3 stappen) kan de gebruiker eindigen met een onvolledige wekkerset — bv. wel 'opstaan' maar geen 'vertrek/lampen uit'. Voor een dienstwekker is dat een reëel risico (lampen blijven aan / wekker mist). De toast meldt wel het werkelijke count, maar er is geen waarschuwing dat het profiel incompleet is.
- fix: Voer de create-calls niet met Promise.all 'fire en vergeet' uit maar verzamel resultaten; bij gedeeltelijk falen toon een duidelijke foutmelding en behoud de dirty-status zodat opnieuw opslaan mogelijk is. Idealiter een transactionele bulk-endpoint server-side. _(effort high)_
- verdict: partially-correct/high

### [LOW/a11y] Dag-/shift-/scène-keuzeknoppen vormen geen groep en missen rolsemantiek (aria-pressed losse buttons)
- loc: components/automations/AutomationForm.tsx:148-172 (triggerType toggle), :192-209 (dagen), :217-234 (dienst), :240-255 (actie), :259-277 (scènes)
- Deze keuzes zijn wederzijds-exclusieve segmented controls (triggerType, dienst, actietype, scène) maar geïmplementeerd als losse buttons met aria-pressed. Voor exclusieve keuzes communiceert aria-pressed geen 'gekozen uit een set'; er is geen role=radiogroup/radio of aria-label op de groep, en de fieldset-legends zijn sr-only zonder dat de buttons als één geheel worden aangekondigd. De snelkoppelingen 'Alle/Doordeweeks/Weekend' (:179-190) zijn platte tekst-buttons zonder aria-pressed/teruggekoppelde status.
- impact: Screenreader-gebruikers horen losse aan/uit-knoppen i.p.v. 'optie 2 van 3, geselecteerd', wat de keuze-context onduidelijk maakt. De Alle/Doordeweeks/Weekend-snelkoppelingen geven geen feedback welke actief is.
- fix: Gebruik role="radiogroup"/role="radio" met aria-checked voor exclusieve keuzes, of een zichtbaar gegroepeerde labelstructuur. Geef de snelkoppelingen een actieve-status indicatie. _(effort medium)_
- verdict: partially-correct/high

### [LOW/microcopy] 'Default'-knop reset alleen lokale draft maar lijkt direct opslaan; geen onderscheid concept vs. opgeslagen
- loc: components/automations/DienstWekkerSection.tsx:235-242 (Default-knop) en :154-159 (resetDefaults)
- De 'Default'-knop zet alleen de lokale draftTimes terug naar de standaardtijden; er wordt niets opgeslagen tot je apart op 'Opslaan' klikt. De labeling ('Default' met RotateCcw-icoon) suggereert echter een directe reset/herstel-actie. Combineer dat met de 'Preview'-kolom die de draft toont en het is onduidelijk of de wijziging al live is. Er is geen 'niet-opgeslagen wijzigingen'-indicatie behalve dat de Opslaan-knop enabled wordt.
- impact: Gebruiker drukt 'Default', ziet de tijden veranderen in de UI en denkt dat het profiel is gereset, terwijl de server-side wekker ongewijzigd blijft tot 'Opslaan'. Verwarrend op een feature waar 'is mijn wekker nu echt gewijzigd?' kritisch is.
- fix: Hernoem naar bv. 'Standaardtijden' en/of toon een expliciete 'niet-opgeslagen wijzigingen'-badge wanneer dirty. Maak duidelijk dat opslaan nog nodig is. _(effort low)_
- verdict: confirmed/high

### [LOW/interaction] 'Save'-knop voor wekker is uitgeschakeld zonder zichtbare reden wanneer niets gewijzigd is
- loc: components/automations/DienstWekkerSection.tsx:254-262 (disabled={busy || (!dirty && installedCount > 0)})
- De Opslaan-knop is disabled wanneer er geen wijzigingen zijn en het profiel al geïnstalleerd is. Er is geen tooltip/uitleg; de knop is alleen wat vager (opacity-45). De gebruiker die opnieuw wil 'forceren'/herinstalleren krijgt geen feedback waarom de knop niet reageert.
- impact: Op touch geeft een disabled knop geen enkele reactie bij tikken — de gebruiker weet niet of de app hangt of dat er bewust niets te doen is. Lichte verwarring, vooral omdat de status-badges ('Actief'/'Pauze') los staan van de knopstatus.
- fix: Voeg een title/aria-describedby of korte hint toe ('Geen wijzigingen om op te slaan'), of houd de knop enabled en maak save idempotent met bevestiging. _(effort low)_
- verdict: confirmed/high

### [LOW/functional] Kaart-subtekst kan dubbelzinnig 'undefined dienst' tonen bij schedule-trigger zonder shiftType
- loc: components/automations/AutomationCard.tsx:74-82 (Alleen op {automation.trigger.shiftType} dienst)
- De kaart rendert onvoorwaardelijk `Alleen op {automation.trigger.shiftType} dienst` zodra triggerType === 'schedule'. shiftType is optioneel in het type (AutomationTrigger.shiftType?). Een rij met triggerType 'schedule' maar ontbrekende/lege shiftType (mogelijk via legacy data of een toekomstige 'any') rendert 'Alleen op  dienst' of 'Alleen op undefined dienst'.
- impact: Bij onvolledige of legacy serverdata toont de UI een kapotte/onbegrijpelijke zin i.p.v. een fallback. Klein maar zichtbaar bij echte data-edge-cases.
- fix: Voeg een fallback toe: bij ontbrekende shiftType toon iets als 'Op dienstdagen' of de generieke daysLabel. Valideer shiftType bij het lezen van de rij. _(effort low)_
- verdict: confirmed/high

### [LOW/microcopy] Engine-statusblok toont altijd 'actief' (groen, pulserend) zonder echte status
- loc: app/automations/page.tsx:131-141 ('Automation Engine actief (Go)') en :94-97 ('Engine elke 15s'); hooks/useAutomations.ts:132 (lastCheck: null)
- Het groene, pulserende statusblok meldt hard-coded 'Automation Engine actief (Go)' en 'Draait 24/7' ongeacht of de backend bereikbaar is. De header zegt 'Engine elke 15s' terwijl de DienstWekkerSection-copy 'elke 15s' niet noemt en de hook lastCheck altijd null teruggeeft (de '· {lastCheck}'-tak rendert dus nooit). Er is geen echte healthcheck.
- impact: Als de Go-engine of proxy down is, blijft de UI 'engine actief' tonen — een vals geruststellend signaal precies wanneer de gebruiker zou moeten weten dat zijn wekkers niet draaien. De 'elke 15s' versus de elders genoemde 'engine elke 15s' is bovendien losgekoppeld van de werkelijkheid (dode lastCheck-code).
- fix: Koppel het statusblok aan een echte health/last-check waarde, of verwijder de dode lastCheck-tak en formuleer de tekst voorwaardelijk. Toon minstens een neutrale staat wanneer de status onbekend is. _(effort medium)_
- verdict: confirmed/high

## Refuted
- (agenda) Calendar event bars and mobile rows are buttons with no focus-visible ring on the permanently-dark theme
- (agenda) isLoading gate hides the whole timeline whenever schedule OR events is loading, even if one already has cached data
- (notities) Checklist toggle on a note card silently corrupts content when the note has a blank line or other text before the first 4 lines is wrong-indexed
- (notities) Restore-revision optimistic write uses the raw backend row, bypassing toRecord normalization and risking camel/snake field mismatch in the UI
- (finance) Per-IBAN balance row renders "geen peildatum" as a value when no peildatum exists
- (finance) CSV export drops description newlines/embedded line breaks and uses raw stored amount sign without locale
- (automations) Naam-conflict/duplicaat-detectie ontbreekt; identieke namen leveren verwarrende toasts
