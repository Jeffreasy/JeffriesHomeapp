# Agenda Page Review

> **Status 2026-07-17: historisch en superseded als actuele backlog.** Dit bestand bewaart de oorspronkelijke point-in-time bevindingen, impact en voorgestelde fixes. Sinds deze audit zijn meerdere genoemde problemen gewijzigd of opgelost; oude regelnummers en present-tense claims beschrijven dus niet automatisch de huidige code.
>
> Gebruik FRONTEND_ARCHITECTURE.md voor de actuele frontendarchitectuur, docs/backend-api-overview.md voor de huidige trust boundaries en docs/testing.md voor uitvoerbare verificatie. Herverifieer een individuele finding tegen de working tree voordat je haar als open of opgelost rapporteert.


_38 verified findings, 1 refuted._

## functional (5)

### [HIGH] Multi-day events vs diensten: conflict detection only checks the dienst's START day
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/lib/conflictDetection.ts:40 (detectConflict)
- problem: detectConflict gates overlap on a single dienst day: `if (event.startDatum > dienst.startDatum || getDisplayEndDate(event) < dienst.startDatum) return null;`. It compares the event's date span only against `dienst.startDatum`. It never considers the dienst's own end date (DienstRow has eindDatum, and getEndKey in lib/schedule.ts even rolls night shifts past midnight). So a dienst that itself spans/rolls to a second day, or any case where an event's window overlaps the dienst's later day but not its start day, produces no conflict. Conversely the time-overlap (timeRangesOverlap) is computed only with the event's own startTijd/eindTijd against the dienst times on that one calendar day, with no date pairing — for a multi-day event the times being compared may belong to different calendar days.
- impact: Real scheduling conflicts between an appointment and an overnight/multi-day dienst are silently missed: the 'Conflicten' metric card shows the wrong (too-low) count, the calendar/event rows don't get the rose conflict tone, and the user can double-book over a shift without warning.
- fix: Compute the dienst's effective end day (mirror getEndKey's night-shift roll) and require date-range intersection of [event.startDatum..getDisplayEndDate(event)] with [dienst.startDatum..dienstEndDate]; only run timeRangesOverlap when both fall on a shared calendar day, or treat any multi-day span overlap as at least a soft conflict. _(effort medium)_
- verify: confirmed/high

### [MEDIUM] eventsByDate day-walk throws RangeError on an event with empty start/end date, crashing the page
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/hooks/usePersonalEvents.ts:291-305 (eventsByDate) + addDaysIso:194-198
- problem: The while-loop `let day = e.startDatum; const end = getDisplayEndDate(e); while (day <= end) { ...; day = addDaysIso(day, 1); }`. getDisplayEndDate returns `eindDatum || startDatum`. fromRow maps these straight from the API (start_datum/eind_datum), which can be '' for a malformed row. If startDatum is '' then end is '' too, `'' <= ''` is true, the body runs once, then addDaysIso('') does `new Date('T12:00:00')` → invalid → setDate(NaN) → toISOString() throws 'Invalid time value' (verified). This is an uncaught exception inside a useMemo during render.
- impact: A single bad personal-event row (empty start date from the backend/sync) makes the entire Agenda page throw on render rather than degrade gracefully. Low probability but high blast radius.
- fix: Guard the loop: skip events without a valid startDatum, and add an iteration cap or validate `addDaysIso` input (return baseIso when Number.isNaN(date.getTime()), as lib/schedule.ts's addDaysIso already does). _(effort low)_
- verify: partially-correct/high

### [MEDIUM] Shift-duplicate de-dup is title-heuristic based and misses renamed shift copies / drops real appointments
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/hooks/usePersonalEvents.ts:119-142 (isScheduleDuplicateEvent)
- problem: Two-sided risk in the heuristic. (1) DROP a real appointment: the last clause `Boolean(team) && title.includes(team) && title.includes(shift)` plus the `plainShiftTitles` set ("dienst","vroeg","laat") match on text only when start/end times coincide with a dienst. A genuine personal appointment titled e.g. 'Vroeg overleg' or any title containing the team letter + shift word that happens to start and end exactly on a shift slot is removed from visibleEvents entirely (it never reaches upcoming/calendar/counts). (2) MISS a duplicate: the synced shift-shadow event must contain a shift-like word (isShiftLikeTitle requires \b(vroeg|laat|dienst)\b) AND exactly equal startTijd & eindTijd; if Google returns a shadow whose title was edited (e.g. 'Werk R.') or whose minutes differ, it is NOT de-duped and the same shift shows twice (once as Rooster dienst, once as Main appointment) because mergeTimelineEvents keys by `kalender:eventId` and they are on different calendars.
- impact: Either a legitimate appointment disappears from the agenda with no trace, or the same shift is shown twice in today/upcoming timelines and counted twice in the tab badges and metric cards.
- fix: Prefer a deterministic link (store the dienst eventId on the synced shadow event and de-dup by that) instead of title regex + exact time-string matching; at minimum tighten the title clauses so a normal appointment can't be silently dropped. _(effort high)_
- verify: confirmed/high

### [LOW] Past pending events are counted in BOTH the Wachtrij and Historie tabs
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/hooks/usePersonalEvents.ts:255-265 (pending / history memos)
- problem: `pending = visibleEvents.filter(isPending)` and `history = visibleEvents.filter(e => e.status === 'Voorbij' || isEventPast(e, now))`. normalizeTemporalStatus early-returns for pending events so a PendingCreate/PendingUpdate event keeps its pending status, but isEventPast is a pure time check independent of status. A pending event whose end time is in the past therefore satisfies BOTH filters.
- impact: A queued (PendingCreate/PendingUpdate) appointment scheduled in the past appears simultaneously in the Wachtrij tab and the Historie tab, and is counted in both the 'Wachtrij' and 'Historie' tab badges plus the Wachtrij metric card — inflated/duplicated counts and the same item shown twice.
- fix: Exclude pending items from history (`history = visibleEvents.filter(e => !isPending(e) && (e.status === 'Voorbij' || isEventPast(e, now)))`), matching how `upcoming` already special-cases pending. _(effort low)_
- verify: partially-correct/high

### [LOW] NextShiftCard inline conflict fallback compares times across different days (overnight shifts)
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/NextShiftCard.tsx:79-95 (resolveConflict)
- problem: When conflictMap has no entry, the fallback computes hard conflict via `evt.startTijd < dienst.eindTijd && evt.eindTijd > dienst.startTijd` — pure HH:MM string compare with no date check. The afspraken passed in are `eventsByDate[nextDienst.startDatum]` (events that merely touch the dienst's start day via the multi-day walk), and a 'Laat' dienst can have eindTijd < startTijd (rolls past midnight). For an overnight shift (e.g. 22:00–07:00) the string test `evt.eindTijd > dienst.startTijd` mislabels most daytime appointments, and any all-day event on the day is forced to 'soft' even when there is no real time overlap.
- impact: The 'volgende dienst' sidebar card shows wrong conflict colours/'— overlapt!' labels for appointments around overnight/late shifts. Cosmetic but misleading. (Note conflictMap-backed path is the same flawed cross-day logic from finding #1, so the fallback rarely saves it.)
- fix: Use the shared timeRangesOverlap and pair times with the correct calendar day (account for end<start meaning next-day), rather than raw HH:MM string comparison. _(effort low)_
- verify: partially-correct/high

## a11y (6)

### [HIGH] CreateEventModal bypasses the shared Modal: no dialog role, no focus trap, no Escape, no focus return
- loc: components/schedule/CreateEventModal.tsx:262-497 (overlay 267-272, dialog container 275-298); shared infra it skips: components/ui/Modal.tsx:51,66-72,102-104
- problem: The create/edit appointment modal is a hand-rolled framer-motion overlay. The container has no role="dialog", no aria-modal="true", and no aria-labelledby. It never calls useFocusTrap, so focus is not moved into the dialog on open, Tab/Shift+Tab walk straight out of the dialog into the calendar and page behind the dimmed backdrop, and focus is not returned to the triggering button (the header 'Nieuw' / a calendar day cell) on close. There is also no Escape-key handler. The shared components/ui/Modal already provides every one of these (useFocusTrap on line 51, Escape on 66-72, role/aria-modal/aria-labelledby on 102-104) — this modal reimplements the overlay and drops them all.
- impact: A keyboard or screen-reader user opening 'Nieuwe afspraak'/'Afspraak wijzigen' is not told a dialog opened, can Tab out onto the obscured page behind it and interact with hidden controls, cannot dismiss with Escape, and after saving/cancelling is dumped back at the top of the document instead of the control they came from. This is the most-used flow on the page (every create-on-click in the calendar routes here).
- fix: Either render the form inside the shared components/ui/Modal (or BottomSheet) so it inherits the focus trap, Escape, scroll-lock and dialog ARIA, or add the same three pieces inline: add role="dialog" aria-modal="true" aria-labelledby pointing at the existing h2 (line 287), give the container a ref + tabIndex={-1} and call useFocusTrap(open, ref), and add a keydown Escape handler that calls handleClose. _(effort medium)_
- verify: confirmed/high

### [MEDIUM] Calendar month/week grid has no grid semantics and no keyboard day navigation
- loc: components/schedule/AgendaCalendar.tsx:243-266 (grid wrapper + weekday header 245-251, day cells 253-265); CalendarDayCell 304-389
- problem: The calendar is built from plain <div> wrappers with grid-cols-7 — there is no role="grid"/"row"/"gridcell" and no rowheader/columnheader on the weekday strip (lines 246-250). There is no arrow-key navigation: each day-number button is an independent tab stop and every visible event chip inside a cell is also its own tab stop, so traversing a month is dozens of sequential Tab presses with no roving tabindex and no way to move up/down a week. A screen reader sees an unstructured pile of buttons, not a date grid, so it cannot announce row/column position or 'week of'.
- impact: Keyboard-only and screen-reader users cannot navigate the calendar the way the WAI-ARIA grid pattern leads them to expect (arrow keys); reaching a date late in the month requires tabbing past every preceding day and every event chip, and the spatial day/week relationship is lost entirely.
- fix: Apply the ARIA grid pattern: role="grid" on the days container, role="row" per week, role="gridcell" per day, role="columnheader" on the weekday labels. Implement roving tabindex (one tab stop into the grid, ArrowLeft/Right/Up/Down to move between days, updating selectedDate) and make event chips reachable via the cell rather than as parallel tab stops. The per-day aria-label/aria-current/aria-pressed already present (lines 326-328) is a good base to build on. _(effort high)_
- verify: partially-correct/high

### [MEDIUM] Icon-only sync button has title but no aria-label and no announced busy state
- loc: app/agenda/page.tsx:402-409
- problem: The header sync button renders only an icon (RefreshCw / spinning Loader2) and relies on title="Sync met Google Calendar" for its name. title is not reliably exposed as the accessible name by screen readers (and never on touch), so the button can be announced as just 'button'. When syncing, the icon swaps to a spinner but there is no aria-label change, aria-busy, or live-region text, so the in-progress state is silent.
- impact: Screen-reader users may not know what the button does, and after activating it get no spoken feedback that a sync is running. (Note: the green 'Nieuwe afspraak' button on line 415 does this correctly with aria-label — the sync button is the outlier.)
- fix: Add aria-label="Sync met Google Calendar" (keep title for sighted hover), and reflect progress, e.g. aria-busy={syncing} plus an aria-label that changes to 'Synchroniseren...' while syncing, or surface the result via an aria-live region. _(effort low)_
- verify: confirmed/high

### [MEDIUM] View tabs are not a tablist; active tab conveyed by color only
- loc: app/agenda/page.tsx:424-447
- problem: The four view switchers (Vandaag/Komend/Wachtrij/Historie) are plain <button>s in a scrolling row. There is no role="tablist" on the container, no role="tab"/aria-selected on the buttons, and no aria-controls linking them to the timeline region they govern. The selected tab is distinguished only by sky-tinted background/border and text color (lines 432-434) — there is no non-color indicator and no programmatic selected state.
- impact: Screen-reader users get four unrelated buttons with no indication of which view is active or that they form a single-select group; users who can't distinguish the low-contrast sky tint can't tell the current view.
- fix: Wrap in role="tablist", give each button role="tab" with aria-selected={active}, and add a non-color active affordance (e.g. an underline/indicator or aria-current). Implement arrow-key movement between tabs per the tabs pattern. The same applies to the Maand/Week toggle, which at least already uses aria-pressed (AgendaCalendar.tsx:158-176). _(effort medium)_
- verify: confirmed/high

### [MEDIUM] Hele-dag toggle is an unlabeled button with no switch role or checked state
- loc: components/schedule/CreateEventModal.tsx:329-339
- problem: The all-day toggle is a bare <button> styled as a pill switch (lines 333-338). It has no accessible name (the adjacent 'Hele dag' <label> on line 330-332 is not associated with it — label without htmlFor/wrapping does nothing), no role="switch", and no aria-checked, so its on/off state is invisible to assistive tech. The visual state is communicated purely by knob position and background color.
- impact: A screen-reader user hears an unlabeled 'button' and cannot tell whether all-day is on or off, making it impossible to reliably set an all-day appointment; toggling time fields (which appear/disappear based on this) becomes guesswork.
- fix: Add role="switch", aria-checked={heledag}, and an accessible name (aria-label="Hele dag" or wire the existing label to the control). Consider a real checkbox input visually styled as the toggle to get state and labeling for free. _(effort low)_
- verify: confirmed/high

### [LOW] Conflict metric card signals presence/absence of conflicts by color alone
- loc: app/agenda/page.tsx:474-482 (also the day-cell conflict dot AgendaCalendar.tsx:337-339)
- problem: The 'Conflicten' metric card shows only a number whose meaning flips entirely on color: amber when there are conflicts, emerald when zero (lines 479-481). There is no text like 'geen conflicten' / 'X conflicten' tied to the value, so the danger/ok distinction is color-only. The same pattern appears on the calendar day-cell conflict indicator, a rose dot exposed only via title="Conflict" (lines 337-339), which is not reliably announced.
- impact: Users with color-vision deficiency or screen-reader users get a bare number and cannot tell whether it represents a problem to act on; the calendar's per-day conflict signal is effectively invisible to them.
- fix: Pair the count with text (e.g. aria-label or visible 'X conflicten' / 'Geen conflicten') so the state is conveyed without color, and give the day-cell conflict marker a real text alternative rather than title only. Event chips already do this well via their text aria-label (AgendaCalendar.tsx:409) — mirror that approach. _(effort low)_
- verify: partially-correct/high

## mobile (9)

### [HIGH] CreateEventModal is NOT a focus-trapped bottom sheet and ignores Escape — it bypasses the shared Modal/BottomSheet primitives
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/CreateEventModal.tsx:262-497 (vs components/ui/BottomSheet.tsx + hooks/useFocusTrap.ts)
- problem: The modal is hand-rolled. On mobile it does become a bottom sheet visually (line 281: `fixed inset-x-0 bottom-0 ... sm:top-1/2`), and it does lock body scroll (line 116-123) and pad the footer for the home indicator (line 479). But unlike the shared BottomSheet/Modal it (a) never calls useFocusTrap, so focus is not moved into the sheet, Tab is not cycled, and focus is not restored to the trigger on close; (b) has no Escape-to-close handler; (c) has no swipe-down-to-dismiss and no drag handle. The form contains a long stack of inputs, a SymbolPicker grid and a BusinessContextPicker, so on a phone the user can Tab/scroll focus straight out of the sheet behind the backdrop.
- impact: Keyboard and screen-reader users on mobile can lose focus behind the open sheet; there is no Escape affordance and no swipe-to-dismiss that the rest of the app's sheets have, so the modal feels foreign and harder to dismiss one-handed than every other sheet in the PWA.
- fix: Either render the form inside the shared <BottomSheet> (mobile) / <Modal> on >=sm, or at minimum add useFocusTrap(open, contentRef) and an Escape keydown listener mirroring components/ui/Modal.tsx:50-72. Re-use the existing primitives rather than maintaining a third dialog implementation. _(effort medium)_
- verify: confirmed/high

### [HIGH] Form inputs use text-sm (14px) — iOS Safari auto-zooms the viewport on focus
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/CreateEventModal.tsx:309-394 (titel, start/eind date, van/tot time, locatie, beschrijving inputs)
- problem: Every text/date/time/textarea control in CreateEventModal is styled `text-sm` (14px). iOS Safari zooms the page whenever a focused input has a computed font-size below 16px. There is no global override forcing 16px on inputs in app/globals.css (the only @media (max-width:640px) blocks are finance-specific). Because the modal is bottom-anchored, the iOS zoom on a date/time field also shifts the sheet and the native date/time picker interaction becomes jumpy.
- impact: Tapping any field in 'Nieuwe afspraak' on an iPhone zooms the whole page in, then leaves it zoomed, forcing the user to pinch back out — happens on the most-used action on the page.
- fix: Bump the input/textarea font-size to >=16px on mobile (e.g. `text-base sm:text-sm`) or add a global rule `@media (max-width:640px){ input,select,textarea{font-size:16px} }`. Apply to all six controls. _(effort low)_
- verify: confirmed/high

### [HIGH] viewportFit:'cover' is missing, so env(safe-area-inset-*) resolves to 0 in the standalone PWA — modal footer & bottom nav sit in the home-indicator zone
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/layout.tsx:14-16 (viewport export)
- problem: manifest.ts sets display:'standalone' and layout.tsx sets appleWebApp.statusBarStyle:'black-translucent', but the Next viewport export only sets themeColor — there is no `viewportFit: 'cover'`. Without viewport-fit=cover the `env(safe-area-inset-bottom)` references resolve to 0. The agenda subtree depends on these insets: CreateEventModal pads its submit/cancel bar with `pb-[calc(0.875rem+env(safe-area-inset-bottom,0px))]` (CreateEventModal.tsx:479) and the BottomNav that the agenda page must clear uses the same inset (BottomNav.tsx:98).
- impact: On notched iPhones in installed-PWA mode the modal's Annuleren/Aanmaken buttons and the bottom tab bar render flush against the home indicator, making the primary submit button hard to tap — the safe-area padding the code carefully added is silently a no-op.
- fix: Add `viewportFit: 'cover'` to the viewport export in app/layout.tsx. This is app-wide but its most acute symptom is the agenda CreateEventModal footer and the nav clearance under the agenda timeline. _(effort low)_
- verify: confirmed/high

### [MEDIUM] Sidebar (next shift, next appointment, conflicts, sync) reflows to the BOTTOM of the page on mobile, below the entire timeline
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/agenda/page.tsx:513-732
- problem: The layout is `grid grid-cols-1 ... xl:grid-cols-[minmax(0,1fr)_300px]` with the timeline <div> as the first child and the <aside> as the second. The split only kicks in at xl (1280px). On every phone and tablet below 1280px the single-column stack renders the full timeline first, then NextShiftCard, NextEventCard, 'Notities vandaag', the conflict panel and Google-sync status last. The 'Komend' view timeline can be dozens of rows, so the highest-signal glance cards ('Volgende dienst', conflicts) are pushed far below the fold.
- impact: On mobile the user must scroll past the whole agenda list to see their next shift, next appointment, or whether there are conflicts — the at-a-glance summary cards are effectively buried on the device where glanceability matters most.
- fix: On mobile, hoist the high-signal sidebar cards (NextShiftCard / NextEventCard / conflict count) above the timeline, or move the aside before the timeline in source order and reorder with `order-*` at xl. The metric cards at the top (page.tsx:453) already cover counts, so at minimum surface the conflict/next-shift cards near the top on small screens. _(effort medium)_
- verify: confirmed/high

### [MEDIUM] Calendar's own SelectedDayPanel only splits at xl — on mobile the full 'Geselecteerde dag' panel renders under the grid, duplicating the mobile summary already shown above
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/AgendaCalendar.tsx:243-279 and 216-240
- problem: The calendar uses `grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px]` for grid + SelectedDayPanel. Below 1280px the SelectedDayPanel (full event list, three Ochtend/Middag/Avond quick-add buttons, dagnotities) stacks below the month/week grid. But there is ALSO a separate `sm:hidden` mobile summary block (lines 216-240) rendered inside the header that lists the first 3 events of the selected day. So on phones the selected day's events appear twice: once in the compact header summary and again in the full panel further down. On tablets (sm..xl, 640–1279px) the header summary is hidden but the panel is full-width below the grid, creating a very long calendar card.
- impact: Redundant duplicated content on phones (same events listed twice within one calendar card) and an unusually tall calendar section on tablets, pushing the timeline far down.
- fix: Pick one source of truth for the selected-day detail on mobile: either drop the in-header sm:hidden summary and let the stacked SelectedDayPanel serve, or collapse SelectedDayPanel into the header summary below xl. Avoid rendering both. _(effort medium)_
- verify: confirmed/high

### [MEDIUM] Day-cell number button and '+N more' control are below the 44px touch-target minimum
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/AgendaCalendar.tsx:313-331 (day number) and 356-364 ('+N')
- problem: The per-day date button — the primary way to select a day and open its detail panel — is `h-7 min-w-7` (28x28px) on mobile (sm:h-8 = 32px on >=640). The mobile '+N' overflow button is `min-h-6` (24px high). In month view at ~360px each grid column is ~46px wide with `p-1`, so these targets are cramped and sit close to adjacent day buttons.
- impact: Selecting a day or expanding the hidden-event count requires a precise tap on a sub-32px target on the smallest screens, where the calendar is the main navigation control — easy to mis-tap an adjacent day.
- fix: Raise the day-number button to at least 36–40px tall on mobile (e.g. h-9) and give the '+N' row min-h-8, or make the whole cell tappable-to-select so the small number button isn't the only hit area. _(effort low)_
- verify: confirmed/high

### [MEDIUM] Compact month event chips overflow the ~38px cell content width and clip the time+title
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/AgendaCalendar.tsx:413-435 (isCompactMonth chip)
- problem: In month mode the mobile chip stacks a `text-[9px]` start time line over a `text-[9px]` title line inside a cell whose inner content width is ~38px (360px viewport: ~328px grid /7 cols, minus p-1). Both lines are `truncate`, so a chip like '09:00' over 'Tandarts' shows '09:00' / 'Tand…'. With mobileMaxVisible=2 events plus the day number plus the '+N' button, a 112px-tall cell is tight and the 9px text is at the edge of legibility on a dark glass background.
- impact: On a phone in month view the event chips are barely legible — the title is almost always truncated to a few characters and the 9px type is hard to read, so the month grid conveys little beyond 'something is on this day'.
- fix: Consider dropping to dot/bar indicators (no text) in mobile month cells and relying on the selected-day panel/summary for detail, or show only the title (no separate time line) at a slightly larger size. Reserve the time+title two-line chip for week view where cells are wider. _(effort medium)_
- verify: confirmed/high

### [LOW] Sticky agenda header stacks with the global theme but does not account for translucent status bar; tab row can scroll-clip count badges
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/agenda/page.tsx:391-448
- problem: The header is `sticky top-0 z-30` with `top-0`. In the installed PWA with statusBarStyle 'black-translucent' and no safe-area top padding on the header, the header title row can sit under the iOS status bar / dynamic island on first paint (content is drawn under the translucent bar). The view-tab row uses `overflow-x-auto` (good — it scrolls), but each tab is `min-w-max` with an inner count pill; with four Dutch labels (Vandaag/Komend/Wachtrij/Historie) plus icons and count badges the row overflows ~360px and must be horizontally scrolled, with no scroll affordance/edge fade so the 4th tab's badge is easy to miss.
- impact: Header title may be partially occluded by the status bar in standalone mode, and the rightmost view tab/badge is hidden until the user discovers the horizontal scroll.
- fix: Add `pt-[env(safe-area-inset-top)]` (after enabling viewportFit:cover) to the sticky header, and add an edge fade or reduce tab padding so all four tabs fit ~360px without horizontal scroll. _(effort low)_
- verify: confirmed/high

### [LOW] Metric-cards 2-col grid truncates the 'X afspraken · Y diensten' sub-line on narrow screens
- loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/agenda/page.tsx:453-490
- problem: The four metric cards use `grid-cols-2 ... md:grid-cols-4`. At 360px each card is ~(328-8)/2 ≈ 160px wide with px-3 padding → ~136px content. The sub-line `{todaySplit.appointments} afspraken · {todaySplit.shifts} diensten` at text-[10px] is `truncate`, so with double-digit counts it renders e.g. '12 afspraken · 8 di…'. The third card ('Conflicten') and fourth ('Wachtrij') have no sub-line, so the 2-col grid looks unbalanced (two tall cards, two short) on mobile.
- impact: The contextual breakdown under 'Vandaag' and '30 dagen' is clipped on phones, and the 2x2 grid has uneven card heights.
- fix: Shorten the sub-line for mobile (e.g. '12 afspr · 8 dnst' or stack count over label) and/or give all four cards a consistent min-height so the 2x2 grid is even. _(effort low)_
- verify: partially-correct/high

## interaction (7)

### [MEDIUM] "Conflicten" metric card is a dead button when there are 0 conflicts
- loc: app/agenda/page.tsx:474-482
- problem: The Conflicten card is a <button> with onClick={() => setActiveView(withConflicts.length > 0 ? "upcoming" : activeView)}. When withConflicts.length === 0 (the common, healthy case) it sets activeView to its current value, i.e. it does nothing. The card still has hover:bg, cursor-pointer and the full button affordance, so it looks clickable and gives feedback on hover but produces no result. Even when conflicts DO exist, clicking sends the user to the generic "upcoming" tab rather than scrolling to / filtering the conflicting events, so the affordance under-delivers in both states.
- impact: Users repeatedly click the green "0" Conflicten card expecting something (a conflicts view, a detail) and nothing happens — a confusing, broken-feeling affordance on the most-looked-at row of the page.
- fix: When withConflicts.length === 0 render the conflict metric as a non-interactive <div> (no cursor-pointer / hover). When > 0, either scroll to the sidebar conflicts panel or, better, add a real conflicts filter/view instead of dumping the user on the unfiltered "Komend" tab. _(effort low)_
- verify: confirmed/high

### [MEDIUM] CreateEventModal has no Escape-to-close and no focus trap; overlay click silently discards unsaved input
- loc: components/schedule/CreateEventModal.tsx:262-298 (overlay onClick={handleClose}), 116-123 (only sets body overflow)
- problem: The modal rolls its own framer-motion overlay rather than the shared Modal/BottomSheet primitive (which the brief says now has a focus trap via hooks/useFocusTrap.ts — note: neither components/ui/Modal* nor hooks/useFocusTrap.ts actually exist in this repo, so there is no shared trap to inherit). There is no keydown handler for Escape, so the standard "press Esc to close" does nothing. There is no focus trap, so Tab walks out of the dialog into the page behind it, and focus is never moved into the dialog on open. The backdrop onClick calls handleClose() unconditionally, so a mis-click on the dim area throws away a half-filled new appointment with no "discard changes?" guard. The dialog also lacks role="dialog"/aria-modal.
- impact: Keyboard and screen-reader users cannot dismiss the dialog the conventional way and can tab into hidden background controls; mouse users lose a partially-entered appointment with one stray click. This is the primary create/edit surface of the page.
- fix: Use the shared Modal primitive if one is reintroduced, or add: Escape handler that calls handleClose, focus-trap + initial focus on the title input, role="dialog" aria-modal="true", and gate the overlay-click close behind an isDirty check (only prompt/confirm when fields changed). _(effort medium)_
- verify: confirmed/high

### [MEDIUM] Initial loading skeleton covers only the timeline; calendar, metric cards and sidebar flash empty/zero state
- loc: app/agenda/page.tsx:544-553 (skeleton guarded inside timeline only), 453-490 (metric cards), 492-511 (AgendaCalendar)
- problem: The isLoading || scheduleLoading branch only swaps the timeline column for skeleton rows. The 4 metric cards, the AgendaCalendar, and the whole sidebar (NextShiftCard, NextEventCard, notes, sync details) render immediately with the still-empty query data: Vandaag/30 dagen/Wachtrij all show "0", Conflicten shows a green "0", the calendar paints with no event bars, and NextShiftCard shows "Geen aankomende diensten". A moment later TanStack resolves and everything repopulates.
- impact: On every cold load (and PWA resume on mobile) the user sees a fully-rendered "empty agenda" — zero counts, no conflicts, no next shift — for a beat before real data appears. That false-empty flash reads as "my agenda is gone" and is jarring on the metric row and calendar, which have no skeletons at all.
- fix: Drive a loading state for the metric cards (skeleton numbers), the calendar grid, and the NextShift/NextEvent cards off the same isLoading/scheduleLoading flags, or render the whole page behind a single skeleton until the first events+diensten resolve. At minimum suppress the "Geen aankomende diensten" / green-0-conflicts copy while loading. _(effort medium)_
- verify: confirmed/high

### [MEDIUM] Create/edit/delete have no optimistic update — list only changes after a full refetch round-trip
- loc: app/agenda/page.tsx:742 (onSuccess={() => refetchEvents()}), 356-364 (note save), components/schedule/PersonalEventItem.tsx:52-78 (delete awaits refetch), hooks/usePersonalEvents.ts:230-234 (reload = refetchRows, no cache mutation)
- problem: All mutations resolve by awaiting refetchEvents()/onRefetch() rather than optimistically updating the TanStack cache. On create/edit the modal closes immediately (handleClose runs right after await onSuccess) but the new/edited event does not appear in the timeline or calendar until the list query re-resolves. On delete, PersonalEventItem shows an inline spinner, but the row stays in place (and in the calendar, sidebar conflict list, and counts) until the network refetch completes; on a slow connection the just-deleted item lingers fully visible. There is no error boundary on the page-level refetch either.
- impact: Every mutation has a visible lag where the UI contradicts the action the user just confirmed (deleted item still showing, new appointment missing from the list they're staring at). On mobile/PWA with flaky connectivity this gap is seconds long and feels broken.
- fix: Add optimistic cache updates (queryClient.setQueryData on ["/personal-events", userId]) for create/edit/delete with rollback on error, then reconcile via the existing refetch. At minimum, optimistically remove the deleted row from the local list immediately. _(effort high)_
- verify: confirmed/high

### [LOW] Sync produces only a transient toast; no inline pending text, and a 4s-auto-dismissing toast is the sole channel for the partial-failure path
- loc: app/agenda/page.tsx:402-409 (sync button), 366-383 (handleSync), components/ui/Toast.tsx:43-50 (4000ms auto-remove)
- problem: The sync button correctly disables and swaps to a spinner while syncing (good). But the only result feedback is a toast that auto-dismisses after 4s. The important partial-failure case — result.pendingError, i.e. "Agenda opgeloaded; wachtrij faalde: <reason>" — is an info toast that vanishes in 4 seconds with no persistent trace in the UI; the sidebar "Google Calendar" panel only surfaces syncStatus.lastError from the separately-polled status query (refetchInterval 10s), not the just-returned pendingError. The StatusPill and "Laatste sync" timestamp also update only on the 10s poll, so right after a manual sync the header pill can still read the pre-sync status.
- impact: A user who looks away for 5 seconds misses that the Google Calendar queue failed, and there's nowhere to re-read it; the manual-sync result and the polled status panel are out of step, so the page can show "OK"/old timestamp immediately after a sync that just partially failed.
- fix: Surface the manual-sync outcome in the persistent sidebar "Google Calendar" panel (e.g. set a local lastManualSyncResult), keep error/partial-failure toasts until dismissed (or longer than 4s), and refetch sync-status immediately after handleSync so the pill/timestamp reflect the action just taken. _(effort medium)_
- verify: confirmed/high

### [LOW] Calendar day cells are not create-on-click — clicking a day only selects it, with no empty-day create affordance in the grid
- loc: components/schedule/AgendaCalendar.tsx:312-331 (date button onClick={onSelect}), 305-388 (cell has no onClick), 567-583 (create only via quick-slot buttons in side panel)
- problem: Despite the cell having hover:bg feedback, clicking anywhere in a day cell (or its date number) only calls selectDate — it never opens CreateEventModal. Event creation from the calendar is possible only via the +Afspraak header button, the per-day Plus/StickyNote buttons in the SelectedDayPanel, or the Ochtend/Middag/Avond quick-slot buttons — all of which live in the right-hand panel, not the grid. The month-grid cells themselves give no "click to add" path, and an empty selected day shows "Geen afspraken of diensten" with no inline create button in that empty block.
- impact: The natural gesture (click an empty day square to add an event) does nothing beyond highlighting it, and on mobile the selected-day panel is below the fold, so users tapping empty days get hover/selection feedback but no obvious way to create — the create affordance is hidden away from where the click lands.
- fix: Either make an empty day cell click open the create modal for that date (onCreateEvent(day.date)) or add a small +Afspraak action inside the cell on hover / inside the empty "Geen afspraken of diensten" block, so the create path lives where the user clicks. _(effort medium)_
- verify: confirmed/high

### [LOW] Compact PersonalEventItem rows expose keyboard 'edit' role but no visible action buttons and no delete path
- loc: components/schedule/PersonalEventItem.tsx:43 (keyboardEditable = canEdit && compact), 110-111 (role/tabIndex on compact), 212 (actions gated by !compact)
- problem: When compact, the row gets role="button" + tabIndex=0 and Enter/Space triggers edit, but the entire actions cluster (edit pencil + delete trash, plus the confirm-delete flow) is rendered only when !compact. So compact rows (used by NextShiftCard's afspraken and any compact consumer) are announced to assistive tech as an actionable button yet show no edit/delete affordance and provide no way to delete at all. Mouse users get a cursor-pointer + hover but only the whole-row edit, with the delete capability silently dropped.
- impact: Inconsistent affordance: a screen-reader/keyboard user is told the compact row is a button (edit) but sighted users see no controls, and deletion is impossible from compact contexts even though it works in the full row — confusing for anyone who can edit but not delete the same item depending on where it's shown.
- fix: Either give compact rows a minimal action set (at least a delete affordance consistent with the full row) or drop the keyboard role/edit on compact rows so the announced affordance matches the visible one. _(effort low)_
- verify: partially-correct/high

## microcopy (11)

### [MEDIUM] Two view-switchers compete: 4 metric cards + 4 tabs both call setActiveView, but disagree on labels, counts and behaviour
- loc: app/agenda/page.tsx:303-308 (tabs) and :453-490 (cards)
- problem: The header tabs and the metric-card row are two parallel control sets that both drive the same `activeView` state, yet they are inconsistent. (1) The card labelled '30 dagen' (line 468) and the tab labelled 'Komend' (line 305) navigate to the SAME view ('upcoming') but use different words AND show different numbers: the card shows `monthEvents.length` (window-capped to today..+30d, line 469) while the tab badge shows `upcomingTimelineEvents.length` (uncapped, line 305). So the same destination advertises two different totals. (2) The 'Conflicten' card (line 474) has no tab counterpart and, when there are zero conflicts, its onClick is a no-op (`setActiveView(activeView)`) — a button that looks clickable but does nothing, and even when it fires it lands on 'upcoming', not a conflict-filtered list. (3) 'Vandaag' and 'Wachtrij' are duplicated verbatim across both rows.
- impact: Users see two rows of buttons that look like different features but mostly do the same thing, with mismatched numbers for one concept ('30 dagen' card says e.g. 12, 'Komend' tab says e.g. 47 for the same click target). The dead 'Conflicten' card erodes trust in what is clickable.
- fix: Pick one primary navigator. Demote the metric cards to non-interactive stats (or remove them) and keep the 4 tabs as the single view-switcher; OR keep cards as the switcher and drop the tabs. If both stay, make them agree: rename the '30 dagen' card to 'Komend' and feed it the same count as the tab, give 'Conflicten' its own filtered view (or render it as a passive stat with no hover/cursor-pointer when count is 0), and de-duplicate 'Vandaag'/'Wachtrij'. _(effort medium)_
- verify: confirmed/high

### [MEDIUM] 'Wachtrij' is opaque jargon for the Google-Calendar sync backlog
- loc: app/agenda/page.tsx:306, :487, :590-592; components/schedule/AgendaCards.tsx:74
- problem: The tab/card label 'Wachtrij' and the in-list banner '{n} in Google Calendar wachtrij' (line 590) expose an internal concept — events that haven't yet been pushed to Google. The empty-state copy for this view, 'Geen wachtrij / Alles is verwerkt' (page.tsx:149-150), reinforces a queue/processing mental model that a personal calendar user has no reason to hold. 'Wachtrij' literally reads as 'waiting line' and gives no hint that these are YOUR unsynced changes.
- impact: Users can't tell what 'Wachtrij' contains or why it matters; the count looks like an error/notification badge rather than 'changes still syncing to Google'.
- fix: Rename to something outcome-oriented: 'Niet gesynct' / 'Nog niet in Google' / 'Synct nog'. Empty state: title 'Alles gesynchroniseerd', text 'Geen wijzigingen wachten op Google Calendar.' The banner becomes '{n} wijziging(en) nog niet in Google Calendar'. _(effort low)_
- verify: confirmed/high

### [MEDIUM] StatusPill labels for Google sync are cryptic ('OK', 'Check', 'Sync', 'Geen status')
- loc: components/schedule/AgendaCards.tsx:84-104
- problem: The sync status pill maps states to one-to-two word labels with no context: running→'Sync', success→'OK', any other non-empty status→'Check', undefined→'Geen status'. 'Check' (English imperative? Dutch 'controleren'?) is ambiguous, and a bare 'OK'/'Sync' pill sitting next to the refresh icon in the header (page.tsx:411) doesn't say what is OK or syncing. The pill is also shown twice — header (411) and sidebar 'Google Calendar' panel (688) — with no label in the header context.
- impact: The most important trust signal on the page (is my calendar actually in sync with Google?) is reduced to an unlabelled two-letter chip; 'Check' in particular gives no actionable meaning.
- fix: Use explicit Dutch states: running→'Synct…', success→'Gesynct', error→'Sync mislukt', unknown→'Nog niet gesynct'. In the header, either add an aria-label/tooltip 'Google Calendar synchronisatie' or rely on the sidebar panel (which already has the 'Google Calendar' heading) and drop the redundant header pill. _(effort low)_
- verify: confirmed/high

### [MEDIUM] Sidebar is a stack of many tiny, visually-similar uppercase micro-panels with weak hierarchy
- loc: app/agenda/page.tsx:598-732
- problem: The aside renders up to six stacked blocks — NextShiftCard, NextEventCard, 'Notities vandaag', conflicts, 'Google Calendar' sync, 'Recent voorbij', plus a 'Geen conflicten' chip — most using the same treatment: `text-[10px] font-semibold uppercase tracking-wider text-slate-500/600` headings on `bg-white/[0.02]` cards. Several are near-duplicates of the main column: 'Recent voorbij' (line 709) duplicates the Historie tab, the conflicts panel duplicates the Conflicten card/banner, and 'Notities vandaag' overlaps the calendar's selected-day notes. Everything is the same size and muted colour, so nothing reads as primary.
- impact: On desktop the sidebar looks like undifferentiated noise; on the PWA/mobile width these collapse below the timeline into a long scroll of tiny grey panels with repeated information, hurting scannability.
- fix: Establish hierarchy: keep the two 'next' cards (shift + appointment) as the visually prominent items, collapse 'Recent voorbij' (redundant with Historie) and the standalone 'Geen conflicten' chip, and fold the sync details behind the existing StatusPill (expand-on-demand). Reserve the loud amber/rose treatments for the conflict panel so it actually stands out, and reduce the count of always-visible uppercase eyebrow labels. _(effort medium)_
- verify: confirmed/high

### [LOW] '30 dagen' card label has no unit and conflicts with its own sublabel
- loc: app/agenda/page.tsx:468-472
- problem: The card caption is just '30 dagen' (a bare duration, not a noun) over a big number, with a sublabel 'X afspraken · Y diensten'. Meanwhile the page header subtitle and the InlineStats component (AgendaCards.tsx:60) use the phrase 'deze maand' for a similar concept, so the same 'next 30 days' window is described two different ways in the same product. '30 dagen' also collides conceptually with the 'history(diensten, 30)' 30-day history window elsewhere, where 30 means 'past 30 days'.
- impact: A glanceable KPI card reads as 'thirty days' with no indication of what is being counted; users may not realise it means 'upcoming 30 days' and not 'this calendar month'.
- fix: Use a consistent noun phrase across the surface: 'Komende 30 dagen' on the card (or align everything to 'Deze maand'). Whichever you choose, use the identical wording in the header subtitle, the card, and InlineStats. _(effort low)_
- verify: partially-correct/high

### [LOW] Week-range title uses a hyphen while every time range uses an en-dash
- loc: components/schedule/AgendaCalendar.tsx:844 vs hooks/usePersonalEvents.ts:77,96 and conflictDetection.ts:57,94
- problem: The week header formats its date range as `${start} - ${end}` with a spaced ASCII hyphen (line 844: e.g. '15 jun - 21 jun 2026'), but every time range and multi-day date range in the same subtree uses the typographic en-dash '–' (getTimeLabel '09:00–10:00', formatDateRange '15 jun – 21 jun', conflict 'Vroeg 07:00–14:30', NextShiftCard line 121). The full-card NextShiftCard further mixes styles by writing 'tot {eindTijd}' (line 224) for the very same start/end pair the compact card renders as '07:00–14:30' (line 121).
- impact: Inconsistent dash glyphs and an inconsistent 'tot' vs '–' convention make ranges look hand-typed/unpolished and read slightly differently from view to view.
- fix: Standardise on the en-dash for all ranges: change line 844 to `${start} – ${end}`. Decide one convention for shift start/end (either '07:00–14:30' everywhere, or 'tot 14:30' everywhere) and apply it in both the compact and full NextShiftCard branches. _(effort low)_
- verify: confirmed/high

### [LOW] History tab badge count overstates what the view actually renders
- loc: app/agenda/page.tsx:307 vs :284
- problem: The 'Historie' tab badge shows `historyTimelineEvents.length` (full count, line 307), but the history view slices to the first 60 (`historyTimelineEvents.slice(0, 60)`, line 284) with no 'showing 60 of N' affordance. With a long history the badge can read e.g. 142 while the list silently stops at 60.
- impact: Users see a count they cannot reach in the list and get no indication that older items are truncated; looks like missing data.
- fix: Either badge the capped number, or keep the full count but add a footer like 'Eerste 60 van 142 getoond' / a 'Meer laden' affordance at the bottom of the history timeline. _(effort low)_
- verify: confirmed/high

### [LOW] Empty-state copy is inconsistent in tone and doesn't guide the next action
- loc: app/agenda/page.tsx:144-155; components/schedule/AgendaCalendar.tsx:560-564
- problem: The four timeline empty states (viewEmptyCopy) mix registers: 'Je dag is vrij.', 'Alles is verwerkt.', 'Er zijn nog geen afgeronde afspraken.', 'Je agenda is rustig.' — two casual reassurances, one technical ('verwerkt'), one neutral. None offers an action even though creating an event is the obvious next step. By contrast the calendar's own empty state (AgendaCalendar:562-563) DOES guide: 'Geen afspraken of diensten / Maak een afspraak of leg alvast een dagnotitie vast.' So the two empty states for effectively the same situation read differently.
- impact: Inconsistent voice across empty states feels unpolished, and the timeline empty states are dead ends (no CTA) where the calendar version invites action.
- fix: Unify the voice and add a CTA to the 'today'/'upcoming' empty states, e.g. title 'Geen afspraken vandaag', text 'Je dag is vary — plan iets nieuws.' with the existing 'Nieuw' action surfaced. Match the helpful tone already used in AgendaCalendar's selected-day empty state. (Replace 'verwerkt' per the Wachtrij rename above.) _(effort low)_
- verify: confirmed/high

### [LOW] Long titles truncate inconsistently — desktop truncates, mobile wraps, calendar chips clip mid-word
- loc: components/schedule/PersonalEventItem.tsx:144; components/schedule/AgendaCalendar.tsx:430-432,451-454; components/schedule/AgendaCards.tsx:279
- problem: Title overflow is handled three different ways. In the timeline row the title uses `break-words ... sm:truncate` (PersonalEventItem:144) — so it wraps to multiple lines on mobile but single-line-truncates on desktop. Calendar month chips hard-truncate with no tooltip-equivalent on touch (the `title` attr at AgendaCalendar:424 is desktop-hover only). NoteChip caps at `max-w-[180px]` (AgendaCards:279). There is no consistent rule, and on the dense month grid a roster chip shows only the shiftType (line 410) while the appointment chip shows the title, so two adjacent chips truncate by different rules.
- impact: The same appointment looks different across views; on mobile (PWA) calendar chips clip long titles with no way to see the full text, while the list below wraps them fully — confusing when scanning for one event.
- fix: Decide one truncation policy per surface and apply it: single-line truncate with ellipsis in dense grid chips (already done) but ensure the selected-day panel / tap target always shows the full title (the SelectedDayPanel already does — make that the guaranteed 'full text' affordance and document it). Consider truncating (not wrapping) the timeline title on mobile too for a consistent one-line scan, since the full title is reachable by opening the event. _(effort low)_
- verify: partially-correct/high

### [LOW] Calendar header overloads one subtitle with three counts in cramped jargon ('zichtbare items')
- loc: components/schedule/AgendaCalendar.tsx:138-140
- problem: The calendar subtitle reads e.g. 'juni 2026 · 37 zichtbare items · 4 notities'. 'Zichtbare items' is internal-sounding (why would a user think about which items are 'visible'?), and packing month + item count + note count into one ellipsis-truncated line means on narrow widths the counts get cut. The legend directly below (lines 144-149) already encodes the item types with coloured dots, so the numeric breakdown is partly redundant.
- impact: The KPI in the calendar header is hard to parse and uses developer-facing wording; truncates awkwardly on mobile.
- fix: Simplify to '{maand} · {n} items · {m} notities' (drop 'zichtbare'), or move the counts to the selected-day panel which already summarises per-day. Keep the header to the month/week title plus the legend. _(effort low)_
- verify: partially-correct/high

### [LOW] Delete confirmation and pending-state wording leaks backend names ('Render-wachtrij') and shifts terminology
- loc: components/schedule/CreateEventModal.tsx:470-475; components/schedule/PersonalEventItem.tsx:64-69
- problem: The modal info line tells users 'blijft de actie in de Render-wachtrij' (lines 472-473) — 'Render' is the hosting provider's name, meaningless to an end user. Meanwhile the same queue is called the 'Google Calendar wachtrij' in delete toasts (PersonalEventItem:68) and the page banner (page.tsx:590), and just 'wachtrij' on the tab. Three names for one queue. The inline delete confirm 'Zeker?' (PersonalEventItem:227) is terse next to the otherwise full-sentence toasts.
- impact: Exposes infrastructure naming to users and uses three labels for the same sync queue, undermining the mental model the rest of the UI tries to build.
- fix: Replace 'Render-wachtrij' with the same user-facing term chosen for the Wachtrij rename (e.g. '… blijft de wijziging in de wachtrij staan tot Google weer reageert'). Use one consistent name for the queue everywhere. Optionally soften 'Zeker?' to 'Verwijderen?'. _(effort low)_
- verify: confirmed/high

## Refuted
- (functional) Create/edit modal omits eind_tijd <= start_tijd validation for SAME-day all-day → timed edits and cross-day timed events :: REFUTED. The finding describes no reachable defect; the existing two-line guard already covers every case that could produce a genuinely backwards dat
