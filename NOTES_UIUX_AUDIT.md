# Notes UI/UX & layout audit — 2026-06-23

_Deep read-only multi-agent audit (5 lenses: visual, responsive, interaction/motion, a11y, IA/flows), each finding adversarially verified. 27 confirmed._

> **Status: RESOLVED.** All 4 highs + the substantive mediums + actionable lows fixed (tsc + eslint + next build green). The biggest win shipped — the board now respects the active scope (no more scope-vs-column contradiction), search spans all three buckets, the metric tiles became the functional scope filter, reduced-motion is honored, metric meta stays on phone, safe-area header, AA-contrast on completed cards, full keyboard/ARIA on cards/checkboxes/tabs/toggles, and an error state. **#19 (above-the-fold)** was then fixed directly: the "Zoeken en ordenen" panel is now a single ~52px toolbar (search + view + one "Filters" disclosure; sort/board/scope/tags collapsed by default), and the metrics are a horizontal snap-strip on phone — so the note list sits right under the toolbar. **Deliberately left:** #17 (the journal's 09:00 stamp IS the day-anchor it buckets by) and a few micro-polish lows (#22 spacing, #23 hover desync, #24 panel anim) judged not worth the churn/risk.

**Totaal:** 🟠 4 hoog · 🟡 17 medium · ⚪ 6 laag

## Verdict
The notes UI is well-built but over-engineered at the surface, and that's its core tension. The visual craft is genuinely high — the glass-card system, tone tokens, deadline/checklist micro-states, empty-state copy that adapts to the actual reason the list is empty, and per-platform action-button reveal (always-on touch, hover-reveal on pointer) are all the work of someone who cares. But the feature carries two competing organizational systems on its core surface (scope chips AND auto-grouped board columns expressing the same five categories), and they can visibly contradict each other. That redundancy, layered on a NoteCard that already stacks 6-8 distinct visual elements (icon, prio dot, completed badge, deadline badge, linked-event chip, preview, checklist bar, tags, age, 4 action buttons, backlinks), makes the app feel busier and more decision-heavy than the content warrants. It is not overloaded to the point of being unusable, but it is overloaded relative to how clean the underlying components are. Separately, the responsive/accessibility layer is the weakest dimension: metric meta lines vanish on phone leaving contextless numbers, the sticky header clips under the PWA status bar, reduced-motion is honored nowhere, and the card's whole-body click target is keyboard-invisible. The single biggest UX win is to collapse the two-taxonomy problem on the Collection tab — make the board columns BE the filter (or make grouping respect the active scope) — because it simultaneously removes a redundant control row, eliminates an on-screen contradiction, and lowers cognitive load on the surface the user touches most. The second-biggest, and cheapest, is fixing search to span all three view buckets so the knowledge-base half stops silently failing as the archive grows.

**Biggest win:** Collapse the two parallel taxonomies on the Collection tab — make the board column headers act as the filter (and demote only the orthogonal scopes the board has no column for, like checklists/untagged), or at minimum make board grouping respect an active scope. This single change removes a redundant control row, eliminates the visible scope-vs-column contradiction, and meaningfully lowers cognitive load on the surface the user touches most — the highest-leverage clarity gain available.

## Top plan
1. 🟠 **Collapse the dual taxonomy: make board columns the filter, or make grouping respect the active scope** _(larger)_ — `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesList.tsx:298-359`
   - Scope chips and auto-grouped board columns are the same five categories expressed twice; a pinned-with-deadline note matches scope 'Deadlines' yet lands in the 'Vastgezet' column, a visible contradiction on the most-used surface. Unifying them removes a whole redundant control AND the contradiction. Highest-leverage win, but a real IA redesign, not a one-liner.
2. 🟠 **Make search/scope span all three buckets so completed+archived notes are findable** _(medium)_ — `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/notities/page.tsx:108-142`
   - Search only sees the current viewMode, so a note completed since you last saw it returns 'Geen notities gevonden' — the retrieval flow silently fails as the archive grows. handleNavigateToNote (page.tsx:299-317) already does the cross-bucket lookup, so the fix is cheap: an 'Alles' pseudo-view for search, or a one-tap 'zoek ook in afgerond + archief' chip in the empty state.
3. 🟠 **Keep metric-tile meta visible (truncated) on phone instead of hiding it** _(quick-win)_ — `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesPrimitives.tsx:30`
   - `hidden ... sm:block` drops the explanatory meta below 640px, so the phone-first core renders contextless numbers — 'Deadlines: 3' loses 'Volgende: <date>', 'Checklists: 0/12' loses its meaning. Swap to line-clamp-1 (always rendered) so number+meta stay paired. Quick win, high impact on the primary device.
4. 🟠 **Honor prefers-reduced-motion across the notes tree** _(quick-win)_ — `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/JeffriesHomeapp/app/globals.css:135`
   - The CSS reset only zeroes CSS transitions; the JS springs (editor modal fly-up, tab underline, every framer-motion layout reflow) are untouched, so motion-sensitive users get the full experience with no opt-out. Wrap the tree in <MotionConfig reducedMotion="user"> — a single, near-trivial change that fixes an accessibility gap on the core feature.
5. 🟡 **Add top safe-area inset to the sticky header so it clears the PWA status bar** _(quick-win)_ — `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesHeader.tsx:39`
   - With viewportFit:cover + black-translucent status bar set app-wide, the sticky header draws the title, privacy toggle and Nieuw button partly under the notch/status bar. Add pt-[max(0.75rem,env(safe-area-inset-top))], mirroring the pattern already in NoteEditor.tsx:1046. Quick win that affects every PWA launch.
6. 🟡 **Fix completed-card contrast: stop dimming text via container opacity** _(medium)_ — `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NoteCard.tsx:104`
   - Preview body is already only 3.92:1 (slate-500 on surface, below AA 4.5:1); the container-level opacity-80 composites it down to ~2.9:1 — sub-3:1 body text a user actually reads in the completed view (repeats on DayColumn.tsx:296/310). Express 'completed' via per-element tokens (line-through title is enough) and reserve opacity for non-text chrome, or pair it with a lighter body token.
7. 🟡 **Give the whole-card click target keyboard focus + activation (or drop it)** _(quick-win)_ — `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NoteCard.tsx:96`
   - The card motion.div has onClick but no role/tabIndex/onKeyDown and no focus-visible ring, so the large affordance is invisible to keyboard/AT and diverges from DayColumn.tsx:286-298 which does it correctly. The title button is still reachable, so this is consistency+focus polish: either mirror DayColumn or rely solely on the title button.
8. 🟡 **Add tab semantics and a status role to header tabs + loading spinner** _(quick-win)_ — `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesHeader.tsx:80-103`
   - Tabs are plain buttons with no aria-current/role=tab, so AT users can't tell which view is active (state is color + a motion underline only); separately the loading spinner (NotesList.tsx:83) has no role=status/aria-live and no skeleton. Group these two small a11y/announcement fixes — add aria-current to the active tab and role=status + sr-only label to the spinner.
9. 🟡 **Fix the density inversion: cap the 2xl board at 4 columns or widen the container** _(quick-win)_ — `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesList.tsx:174`
   - The board jumps to 5 columns at 2xl while main stays max-w-7xl, so card width drops ~373px (xl, 3-col) to ~209px (2xl, 5-col) — cards get cramped on a BIGGER screen. Step down to 2xl:grid-cols-4 or widen the board container so density grows with the viewport. Quick win, friction not breakage.
10. 🟡 **Reduce framer-motion layout churn: gate per-card layout/popLayout to small lists** _(medium)_ — `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesList.tsx:150`
   - Every NoteCard carries bare `layout` and each column wraps cards in popLayout, so toggling/pinning one card re-springs every sibling — worst in the large 'Overig' bucket and the 2xl 5-col board, and jankiest on phone. Remove per-card layout and animate only enter/exit, or gate popLayout to small lists. Perf polish, bites only at higher card counts.

## Themes
- Two organizational systems on one surface: scope chips and auto-grouped board columns are the same five categories expressed twice, doubling cognitive load and occasionally contradicting each other on the core Collection tab — the central IA problem to resolve.
- The NoteCard is visually overloaded: a single compact card can stack icon, priority dot, completed badge, deadline badge, linked-event chip, multi-line preview, checklist progress bar, two tags + overflow, age, four action buttons and backlinks — each element is well-made, but the sum reads as busy relative to the content.
- Phone-first promise vs phone-last execution: the app's primary device is where it degrades most — metric meta lines vanish, the header clips under the status bar, and the heaviest framer-motion layout churn lands on the weakest hardware.
- Reduced-motion and focus states are missing across the tree: JS springs ignore prefers-reduced-motion entirely, the whole-card target has no focus ring or keyboard path, tabs lack aria-current, and the loading state isn't announced — an accessibility layer applied inconsistently on top of otherwise careful components.
- Retrieval silently fails: search and scope only see the current view bucket, so the knowledge-base half returns false-empty results exactly as the archive grows — a correctness-flavored UX defect, not mere polish.
- Contrast erodes through compositing: marginal text colors (slate-500) plus container-level opacity dims push completed-note body text below the 3:1 floor — dimming chrome and dimming text are conflated.

## Notably solid
- Adaptive empty states (NotesList.tsx:87-139): the message and CTA branch on the real reason the list is empty — narrowed filters vs empty archive vs nothing-completed vs first-run — instead of a blanket 'no notes'. This is thoughtful, above-average product work.
- Platform-aware action buttons (NoteCard.tsx:237): always-visible on touch, hover-reveal only on hover-capable pointers via `sm:[@media(hover:hover)]:opacity-0` — correctly solves the 'hover actions are invisible on phones' trap most apps fall into.
- Checklist micro-interaction (NoteCard.tsx:362-377): a small visual checkbox wrapped in a ~28px touch hit-area with full role=checkbox/aria-checked, Enter/Space keyboard support, and stopPropagation so toggling never opens the note — genuinely well-considered touch a11y.
- Deadline + completion semantics are computed on the Europe/Amsterdam calendar (NoteCard.tsx:320-334) so 'Vandaag'/'Verlopen' agree with the backend — correctness baked into the visual layer.
- The glass-card + tone-token system (NotesPrimitives.tsx, toneClasses) gives the whole feature a coherent, consistent visual language; spacing and typography scale cleanly between compact and comfortable densities.
- Privacy masking is handled consistently and gracefully — every text surface (title, preview, tags, backlinks) has a masked branch, so the privacy toggle produces a clean, intentional redacted state rather than leaking fragments.
- Per-card progress, age formatting, and the wiki-link/backlink chips (renderLineWithLinks, NoteCard.tsx:280-299) give the Zettelkasten/journaling use case real first-class affordances rather than bolted-on extras.

## All confirmed findings

### 🟠 HIGH (4)

**1. Metric tiles hide their meta line on phone, contextless numbers**  
- _Responsive & layout (breakpoints, overflow, mobile board, editor modal)_ · `responsive` · `components/notes/NotesPrimitives.tsx:30`
- **Impact:** On a phone (<640px) each metric tile renders only its uppercase label + a bare value; the explanatory meta line is dropped. "Deadlines" shows just the soon-count (e.g. 3) and loses its meta "Volgende: <date>"; "Checklists" shows "0/12" with no hint it means open checklist items; "Aandacht" shows a bare count without "Hoog, vandaag of verlopen". On the phone-first app core these read as ambiguous or error-like.
- **Fix:** Keep the meta visible but truncated on small screens, e.g. replace `hidden ... sm:block` with `line-clamp-1` (always rendered), or stack to a single column at base so the number+meta stay paired. At minimum keep the most load-bearing meta (next deadline date) visible on phone.

**2. Reduced motion not honored anywhere**  
- _Interaction & motion (hover/focus/active, loading, optimistic, framer-motion)_ · `motion` · `JeffriesHomeapp/app/globals.css:135`
- **Impact:** prefers-reduced-motion users still get the full JS-spring experience: the editor modal flies up and scales in (NoteEditor.tsx:1027-1032, transition spring damping 28 stiffness 300), the tab underline springs across (NotesHeader.tsx:95-98, spring stiffness 400 damping 30), and every card reflows via framer-motion layout/popLayout. None of this is reachable by the CSS reset.
- **Fix:** Wrap the notes tree in <MotionConfig reducedMotion="user"> (or read useReducedMotion()) to drop spring transitions and disable layout animations when the user opts out.

**3. noteScope filters and the board's auto-groups are the same taxonomy expressed twice and can visibly contradict each other**  
- _Information architecture & user flows (tabs, view/scope/sort, states, journal)_ · `information-architecture` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesList.tsx:298-359`
- **Impact:** On the Collection tab every user juggles two parallel mental models of the same 5 categories. Selecting scope 'Deadlines' (non-exclusive noteMatchesScope) still routes a pinned-with-deadline note into the board's 'Vastgezet' column (exclusive priority chain pinned>attention>deadline>linked>other), so the filtered result visibly contradicts the column the note lands in. Doubles cognitive load on the app's core surface.
- **Fix:** Pick one surface. Best: make each board column header the filter and demote only the orthogonal scopes the board has no column for (checklists, untagged) into the disclosure/overflow. If scope must stay, make board grouping respect an active scope: render a single column matching the scope instead of re-bucketing by the exclusive priority chain.

**4. Search and scope only see the current viewMode, so completed/archived notes return a false-empty result**  
- _Information architecture & user flows (tabs, view/scope/sort, states, journal)_ · `information-architecture` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/notities/page.tsx:108-142`
- **Impact:** The knowledge-base half breaks exactly as the archive grows. Searching for a note that has since been completed/archived returns 'Geen notities gevonden' while in the default Actief view, even though the note exists — the user concludes it is gone. The only escape is knowing to flip viewMode; the header counts that would hint at it (NotesHeader.tsx:45-49) are plain text, not links.
- **Fix:** When a query yields 0 in the current view, search across all three buckets and either auto-widen with a banner or offer a one-tap 'Zoek ook in afgerond + archief' chip in the empty state. handleNavigateToNote (page.tsx:299-317) already does the cross-bucket lookup; reuse it. Cheapest: an 'Alles' pseudo-view concatenating active+completed+archived for search.

### 🟡 MEDIUM (17)

**1. Completed-card opacity-80 dim compounds with already-low text contrast**  
- _Visual design & hierarchy (spacing, typography, color, contrast, density)_ · `color-contrast` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NoteCard.tsx:104`
- **Impact:** The completed-card preview body (text-xs text-slate-500, 12px normal text) is already only 3.92:1 on the card surface — below WCAG AA's 4.5:1. The container-level opacity-80 (NoteCard.tsx:104, and the same on the DayColumn completed group at :296/:310) drops the effective preview contrast to ~2.9:1, under even the 3:1 large-text floor. Completed notes' body text becomes the least legible text in the feature.
- **Fix:** Don't apply opacity to the whole container for the dim. Express 'completed' via AA-safe per-element tokens (e.g. title already uses line-through; keep the preview body at a contrast-safe color like --color-text-muted #94a3b8 which is ~7.3:1) and reserve opacity only for non-text chrome, or pair the opacity with a lighter body token so the composited result still clears ~4.5:1.

**2. 2xl 5-col board capped by max-w-7xl inverts density as screen grows**  
- _Responsive & layout (breakpoints, overflow, mobile board, editor modal)_ · `responsive` · `components/notes/NotesList.tsx:174`
- **Impact:** The desktop board grid jumps to 5 columns at 2xl while the page `main` stays capped at max-w-7xl (~1216px inner after lg:px-8). Per-group column width drops from ~373px at xl (3-col) to ~209px at 2xl (5-col) — cards get noticeably tighter on a *bigger* screen, an unintuitive density inversion. Not a breakage; compact NoteCards still render, just cramped.
- **Fix:** Either widen the board container to max-w-screen-2xl (or remove the cap on this grid) so the extra columns have room, or step down to 2xl:grid-cols-4 so card width keeps growing with the viewport.

**3. Sticky header lacks top safe-area inset, content clips under status bar in PWA**  
- _Responsive & layout (breakpoints, overflow, mobile board, editor modal)_ · `responsive` · `components/notes/NotesHeader.tsx:39`
- **Impact:** The Notes header is `sticky top-0` with a py-3 title/buttons row and no top safe-area padding. With viewportFit:cover and statusBarStyle:black-translucent set app-wide, the standalone PWA draws content into the status-bar/notch zone, so the "Notities" title, privacy toggle and Nieuw button render partly under the device status bar / notch. Affects any device with a translucent status bar, not only physically-notched phones.
- **Fix:** Add `pt-[env(safe-area-inset-top)]` (or `pt-[max(0.75rem,env(safe-area-inset-top))]`) to the header so the top row clears the inset, mirroring the pattern already used in NoteEditor.tsx:1046.

**4. Whole-card click target has no keyboard focus or activation**  
- _Interaction & motion (hover/focus/active, loading, optimistic, framer-motion)_ · `focus-management` · `JeffriesHomeapp/components/notes/NoteCard.tsx:96`
- **Impact:** The card body (motion.div, onClick -> onEdit at 111-113) exposes no role/tabIndex/onKeyDown, so the large click affordance gets no focus ring and is invisible to keyboard/AT. It also diverges from DayColumn.tsx:286-298 which does role=button tabIndex=0 onKeyDown correctly.
- **Fix:** Either drop the root onClick (rely on the title button) or mirror DayColumn: role="button" tabIndex={0} onKeyDown for Enter/Space, with a focus-visible ring on the card.

**5. Loading spinner is bare and un-announced (no role=status, no skeleton)**  
- _Interaction & motion (hover/focus/active, loading, optimistic, framer-motion)_ · `loading-state` · `JeffriesHomeapp/components/notes/NotesList.tsx:83`
- **Impact:** The loading branch renders only a spinning border div inside a min-h-[260px] glass box (84-86) with no role="status"/aria-live and no hidden label, so screen readers get no "loading" feedback; on resolve the box swaps to the full board in one frame with no skeleton.
- **Fix:** Add role="status" aria-live="polite" with an sr-only "Notities laden" label, or render skeleton columns matching the board layout.

**6. Per-card layout + popLayout animates whole columns on any single toggle**  
- _Interaction & motion (hover/focus/active, loading, optimistic, framer-motion)_ · `motion` · `JeffriesHomeapp/components/notes/NotesList.tsx:150`
- **Impact:** Every NoteCard carries layout (NoteCard.tsx:97) and each board column wraps its cards in AnimatePresence mode="popLayout" (NotesList.tsx:150, 183, and grid view 215). Toggling/pinning/deleting one card triggers a layout spring on every sibling in the column; on the 2xl 5-column board (174) and large "Overig" bucket this can drop frames, more so on a phone.
- **Fix:** Gate popLayout/layout to small lists, or remove per-card layout and animate only enter/exit, to avoid re-springing the whole column on a single mutation.

**7. Tab bar has no tab semantics and no aria-current on the active view**  
- _Accessibility (focus management, ARIA, keyboard, contrast, reduced-motion)_ · `aria` · `components/notes/NotesHeader.tsx:80-103`
- **Impact:** A screen-reader user hears two generic buttons with no indication of which view is active; the active state is conveyed only by a color shift and a motion.div underline (layoutId notes-tab-indicator).
- **Fix:** Add aria-current="page" on the active tab button, or convert to a real tablist (role=tablist on the wrapper, role=tab+aria-selected on each button, role=tabpanel+aria-labelledby on the content).

**8. SegmentedButton (view/scope/sort/board/tag toggles) lacks aria-pressed**  
- _Accessibility (focus management, ARIA, keyboard, contrast, reduced-motion)_ · `aria` · `components/notes/NotesPrimitives.tsx:78-92`
- **Impact:** Across the entire filter row (view, board/grid, scope, sort) a screen-reader user hears a plain button with no on/off state; the active state is conveyed only by the amber-fill className. The mobile tag-filter buttons (NotesFilters.tsx:179-208) and desktop tag buttons (311-340) have the same gap.
- **Fix:** Add aria-pressed={active} to SegmentedButton, and add aria-pressed to the bespoke tag-filter button blocks in NotesFilters.tsx (179-208 and 311-340) which are hand-rolled rather than using SegmentedButton.

**9. Note card is a clickable div with no keyboard role or handler**  
- _Accessibility (focus management, ARIA, keyboard, contrast, reduced-motion)_ · `affordance` · `components/notes/NoteCard.tsx:96-114`
- **Impact:** The whole-card hit target (motion.div with cursor-pointer + onClick={onEdit}) is mouse/touch only. Keyboard users must Tab to the small inner title <button> (139-149) to open the note, while cursor-pointer on the full card advertises an affordance keyboard users cannot use. DayColumn's JournalNoteButton does this correctly.
- **Fix:** Either drop cursor-pointer from the card and rely on the inner title button, or mirror DayColumn: give the card role=button, tabIndex=0, onKeyDown (Enter/Space), aria-label, and demote the inner title <button> to a <span> to avoid a nested interactive element.

**10. Editor inputs (deadline, tag, search, title, body) lack programmatic labels**  
- _Accessibility (focus management, ARIA, keyboard, contrast, reduced-motion)_ · `aria` · `components/notes/NoteEditor.tsx:1288-1293`
- **Impact:** A screen reader announces these edit fields with no name (or only the native control type). The datetime-local deadline (1288), the 'Nieuwe tag' input (1437), the EventLinkPicker search (1792), the title input (1112) and the body textarea (1212) rely on placeholders only, which vanish on input and are not reliable accessible names.
- **Fix:** Add an explicit aria-label to each (e.g. Deadline, Nieuwe tag, Zoek afspraak, Titel, Notitie-inhoud); alternatively give PanelSection's <h3> (1993) an id and point the Planning input at it via aria-labelledby.

**11. Metric tiles look like a clickable dashboard but are inert divs that mirror the scope filters without wiring to them**  
- _Information architecture & user flows (tabs, view/scope/sort, states, journal)_ · `affordance` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesPrimitives.tsx:21-34`
- **Impact:** The five tone-bordered, colored stat cards on the most prominent row (Totaal/Aandacht/Checklists/Deadlines/Koppelingen) read as actionable but do nothing on tap. Four map exactly onto a scope chip sitting in the filter card below, so the relationship the user wants (show me those N) exists one component away but is never connected — a dead affordance.
- **Fix:** Make each tile a button that sets the matching scope (Aandacht->attention, Checklists->checklists, Deadlines->deadlines, Koppelingen->linked, Totaal->clearFilters), with hover:border, active:scale and aria-pressed bound to noteScope. This also collapses the metrics and scope rows into one control. If tiles must stay read-only, drop the tone borders so they read as a stat strip, not buttons.

**12. The n and Ctrl-K shortcuts have zero discoverability, and n fires on every tab including Journal**  
- _Information architecture & user flows (tabs, view/scope/sort, states, journal)_ · `discoverability` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/notities/page.tsx:85-106`
- **Impact:** Power features the owner paid complexity for are invisible — no kbd badge, tooltip, or hint anywhere. Worse, the n handler is not gated on activeTab (unlike Ctrl-K, which guards on activeTab==='collection' at line 98), so pressing n while on the Journal tab pops a Collection editor with no visible cause — a confusing, seemingly-spontaneous modal.
- **Fix:** Add a muted kbd badge (hidden sm:inline-flex pill) in the search field's right edge and on the New button. Gate the n handler on activeTab==='collection' to match Ctrl-K, or repurpose it to the per-day add when on Journal. Optionally a one-line tip in the first-run empty state.

**13. The per-day Journal quick-add silently stamps a 09:00 deadline on every entry, conflating note with task**  
- _Information architecture & user flows (tabs, view/scope/sort, states, journal)_ · `information-architecture` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/DayColumn.tsx:44-68`
- **Impact:** Anything typed into a day's 'Schrijf iets...' input becomes a deadlined note. For TODAY's column that deadline is today, so isAttentionNote returns true and the entry inflates the Aandacht metric tile, the rose Aandacht board column, and (via deadlineSoon) the Deadlines tile — eroding trust in the one signal meant to mean urgent. Future-day entries land in Gepland/Deadlines rather than as plain notes. The placeholder gives no signal it creates a deadlined task.
- **Fix:** Bucket journal entries by creation date (note.aangemaakt), not a synthetic deadline — WeekJournal.tsx:71 already falls back to aangemaakt, so dropping the deadline keeps the entry on the right day without marking it urgent. If a deadline is wanted, make it opt-in and clarify the placeholder. At minimum, do not let a bare journal line count as Aandacht.

**14. Desktop tags are duplicated into a second full-width section with three overlapping clear actions, and render dead 0-count chips**  
- _Information architecture & user flows (tabs, view/scope/sort, states, journal)_ · `consistency` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesFilters.tsx:291-343`
- **Impact:** Desktop (sm:block) gets a standalone 'Tags' glass section below the filter card (291-343) with its own 'Alle' reset AND a 'Wissen' action, while the card's 'Reset' (81-91) also clears tagFilter — three clear paths for one filter, plus a full-width band of redundant chrome. The desktop chips iterate allTags (all views) but counts come from tagCounts (current view), so a tag absent in the current view renders with '0' and is a dead target that yields an immediate empty result.
- **Fix:** Fold the desktop tags into the main filter card as a single horizontal-scroll row mirroring the scope row (260-273) and delete the standalone section. Drive the visible tag list from tagCounts (like visibleScopeOptions at 65-67) so 0-count tags hide. Keep one clear path (the card Reset).

**15. Five filter bands plus capture card plus metrics stack above the note list, pushing content well below the fold on a phone**  
- _Information architecture & user flows (tabs, view/scope/sort, states, journal)_ · `information-architecture` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesFilters.tsx:216-288`
- **Impact:** On desktop the filter card stacks search + 3-col viewMode + 2-col board/grid + scrollable scope + 4-col sort (five bands, lines 216-288), above which sit the capture card (page.tsx:360-366) and 5 metric tiles (368-381). The list header (NotesList.tsx:61-81) then repeats a 'Nieuwe notitie' button and a summary line. Primary content sits behind a wall of controls mostly at defaults. Note: on MOBILE the secondary controls (board/grid, scope, sort, tags) are ALREADY collapsed into the details/summary disclosure (NotesFilters.tsx:129-213), so the worst stacking is desktop-only.
- **Fix:** Reuse the existing mobile disclosure pattern on desktop: keep search + viewMode visible and move board/grid, sort and scope behind 'Filters en sortering'. Remove the duplicated 'Nieuwe notitie' button and summary from the list header (NotesList.tsx:71-79) since the page header and capture card already offer New.

**16. Journal week view has no loading or today-empty state and no per-day full-editor path**  
- _Information architecture & user flows (tabs, view/scope/sort, states, journal)_ · `loading-state` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/WeekJournal.tsx:126-209`
- **Impact:** On a slow first load the journal renders 7 empty columns indistinguishable from an empty week (isLoading is never threaded in — page.tsx:344-355 passes it only to NotesList). Today's column shows nothing when empty because DayColumn's empty message is gated on !isToday (DayColumn.tsx:182). And the only per-day creation path is the quick-add input (DayColumn.tsx:227-243) which always deadlines at 09:00 — there is no 'open full editor for this day' affordance, so a structured entry needs a bare line then a reopen, two steps where Collection's capture card offers both quick and Editor in one place.
- **Fix:** Thread isLoading into WeekJournal and show a skeleton before notes arrive. Render today's empty state too (drop the !isToday guard at DayColumn.tsx:182). Add a per-day 'editor openen' affordance that calls onEdit with a pre-dated draft, matching the Collection capture card's dual split.

**17. No error state for a failed notes load: a fetch failure renders the cheerful empty state, hiding a data error as emptiness**  
- _Information architecture & user flows (tabs, view/scope/sort, states, journal)_ · `loading-state` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesList.tsx:83-139`
- **Impact:** NotesList's render is binary: isLoading->spinner, else displayed.length===0->empty-state, else list. There is no error branch, and useNotes never even surfaces an error to branch on. On a failed request isLoading flips false, displayed is empty, and the user sees 'Nog geen notities — Maak je eerste notitie', interpreting a backend failure as 'you have no notes' and potentially creating duplicates. Same on the Journal tab.
- **Fix:** Surface error/isError from useNotes (destructure it from useGetNotes/useGetNotesTags at hooks/useNotes.ts:246-247 and add to the return at 389-398), thread it into NotesList/WeekJournal, and add an error branch with a retry. Distinguish 'leeg' from 'kon niet laden'.

### ⚪ LOW (6)

**1. Vertical spacing rhythm inconsistent across sibling panels**  
- _Visual design & hierarchy (spacing, typography, color, contrast, density)_ · `spacing` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesList.tsx:149`
- **Impact:** The 2.5 / 3 / 4 mix across panels gives a subtly uneven vertical rhythm. The single 2.5 step (space-y-2.5 / gap-2.5) sits oddly between an otherwise 2/3/4 scale. Real but minimal usability cost — the panels still read as a clear hierarchy.
- **Fix:** Optional polish: drop the lone 2.5 step (NotesList.tsx:149 mobile card list, NotesPrimitives.tsx:23 MetricTile inner gap) and standardize on a 2/3/4 scale — one card gap, one panel-inner gap, one section gap. Keep the responsive widening (mobile gap-2/3 -> desktop gap-3/4) since that is intentional density, not a defect.

**2. Reveal-on-hover desync between Collection card and Journal item**  
- _Visual design & hierarchy (spacing, typography, color, contrast, density)_ · `affordance` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/DayColumn.tsx:344`
- **Impact:** On a touch device at >=sm width (e.g. a touch laptop or large tablet), the journal 'Afronden' button renders at opacity-0 with no visual affordance, while the equivalent Collection card actions stay visible because they ARE hover-guarded. The timestamp (DayColumn:333) is also hover-only with no touch fallback. The button is still present/tappable in the layout and completing is also reachable by opening the note in the editor, so it is degraded-but-not-unreachable, not a hard block.
- **Fix:** Reuse the same sm:[@media(hover:hover)]:opacity-0 guard from NoteCard.tsx:237 on the DayColumn complete button (DayColumn.tsx:344) so it only hides on hover-capable pointers, and show the journal timestamp on touch (drop the unconditional opacity-0 at :333 or gate it on hover-capable too).

**3. Editor side-panels use AnimatePresence mode="wait" so the aside empties between switches**  
- _Interaction & motion (hover/focus/active, loading, optimistic, framer-motion)_ · `motion` · `JeffriesHomeapp/components/notes/NoteEditor.tsx:1276`
- **Impact:** With mode="wait" (1276) the Details/Stijl/Historie panels must finish their exit (opacity->0, y:8/-8) before the next panel enters (1277-1284, 1361-1366, 1463-1468), so switching tabs shows a brief empty aside and a serial out-then-in stutter rather than a crossfade.
- **Fix:** Drop mode="wait" for a crossfade, or keep it but shorten to an opacity-only tween (~0.12s, no y-translate) so the gap is imperceptible.

**4. Header privacy toggle (and editor pin button) lack aria-pressed/role=switch**  
- _Accessibility (focus management, ARIA, keyboard, contrast, reduced-motion)_ · `aria` · `components/notes/NotesHeader.tsx:53-66`
- **Impact:** The privacy button is a sticky on/off state but exposes no pressed/checked state; its title/aria-label flip between 'Notities tonen' and 'Notities verbergen', describing the next action rather than the current state. The editor pin button (NoteEditor.tsx:1083-1097) has the same pattern.
- **Fix:** Add aria-pressed={privacyOn} (or role=switch + aria-checked) to the privacy toggle, and aria-pressed={isPinned} to the editor pin button.

**5. Checklist toggle nests role=button around role=checkbox**  
- _Accessibility (focus management, ARIA, keyboard, contrast, reduced-motion)_ · `aria` · `components/notes/NoteCard.tsx:359-377`
- **Impact:** The focusable hit-area span (tabIndex 0, role=button, aria-label, onClick, onKeyDown) wraps an inner span with role=checkbox/aria-checked. A button containing a checkbox is invalid role nesting, and the checked state lives on the inner, non-focusable node, so it may not be announced when the outer button receives focus.
- **Fix:** Collapse to a single node: put role=checkbox, aria-checked={done}, tabIndex 0, aria-label, onClick and onKeyDown on one element, and mark the inner visual box aria-hidden.

**6. Board view's header subtitle reports the active sort label even though the board groups rather than orders by it**  
- _Information architecture & user flows (tabs, view/scope/sort, states, journal)_ · `consistency` · `C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/notes/NotesList.tsx:56-68`
- **Impact:** The subtitle reads e.g. '12 zichtbaar - board - deadline' in board mode, which can suggest a global deadline ordering that the board's 5-column grouping overrides. The 4-option Sort control stays fully interactive in board mode while its cross-board effect is replaced by grouping.
- **Fix:** Make the subtitle honest in board mode (e.g. 'gegroepeerd' instead of the sort label), or grey the sort control with a 'geldt in grid-weergave' hint. Lowest effort and already mostly true: leave it, since sort IS honored within each column.
