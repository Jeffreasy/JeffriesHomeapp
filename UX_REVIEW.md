# Frontend UI/UX Review — JeffriesHomeapp

> **Status 2026-07-17: historisch en superseded als actuele backlog.** Dit bestand bewaart de oorspronkelijke point-in-time bevindingen, impact en voorgestelde fixes. Sinds deze audit zijn meerdere genoemde problemen gewijzigd of opgelost; oude regelnummers en present-tense claims beschrijven dus niet automatisch de huidige code.
>
> Gebruik FRONTEND_ARCHITECTURE.md voor de actuele frontendarchitectuur, docs/backend-api-overview.md voor de huidige trust boundaries en docs/testing.md voor uitvoerbare verificatie. Herverifieer een individuele finding tegen de working tree voordat je haar als open of opgelost rapporteert.


_Multi-agent audit (recon + 7 lenses, adversarially verified). 57 findings stand, 1 refuted._

## a11y (7)

### [HIGH] Modal has no focus trap, no initial focus, and no focus restoration
- area: - · loc: components/ui/Modal.tsx:70-120
- problem: The dialog renders with role="dialog" aria-modal="true" but does nothing about focus. There is no code to (a) move focus into the dialog on open, (b) trap Tab/Shift+Tab inside it, or (c) return focus to the trigger on close. The only effects are body-scroll lock and an Escape listener. Tabbing moves focus into the page behind the (visually-blurred but still focusable) backdrop and underlying nav/sidebar. The backdrop closes only on mouse onClick, never on keyboard.
- impact: Keyboard and screen-reader users open a modal but their focus stays on the page behind it; Tab walks through invisible background controls (sidebar links, page buttons) while the modal visually covers them. They cannot reliably reach or operate the modal's fields, and after closing, focus is lost to the top of the document. This affects every feature that uses Modal (laventecare company/contact/lead/project/workstream modals, schedule CreateEventModal, etc.).
- fix: On open, store document.activeElement, focus the first focusable element (or the close button), and trap Tab within the dialog (wrap from last to first focusable and back). On close, restore focus to the stored trigger. Mark background content inert/aria-hidden while open. A small shared useFocusTrap hook can serve Modal, ConfirmDialog and BottomSheet. _(effort: medium)_
- verify: partially-correct/high — The core defect is real and accurately located at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/ui/Modal.tsx. Verified against the actual code:

- Modal renders role="dialog" aria-moda

### [HIGH] Toasts are never announced to screen readers (no live region)
- area: - · loc: components/ui/Toast.tsx:62-92
- problem: The toast container is a plain <div> with no aria-live / role="status" / role="alert". A grep across the whole frontend finds exactly one live region in the entire app (a role="alert" in NoteEditor.tsx:1516). Toasts are the app's primary async-feedback channel (success/error after every mutation: 'Lamp bijgewerkt', 'Verwijderen mislukt', import results, etc.), and they auto-dismiss after 4s.
- impact: Blind and low-vision users get zero confirmation that an action succeeded or, more importantly, failed. Because the codebase surfaces almost all mutation outcomes via toast (error states are otherwise silent per the data layer), a screen-reader user deleting a device, saving a habit, or importing transactions has no idea whether it worked. The toast's own close button (line 81-86) also lacks an aria-label, exposing only the bare X icon.
- fix: Add role="region" aria-live="polite" (and aria-atomic) to the toast container, or split success/info (polite) from error (assertive) into two live regions. Add aria-label="Melding sluiten" to the dismiss button and give it a >=44px hit area. _(effort: low)_
- verify: confirmed/high — Verified against the actual code at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/ui/Toast.tsx. All substantive claims hold:

1. Toast container (line 66) is a plain `<div className="f

### [HIGH] Secondary-text design tokens fail WCAG AA color contrast
- area: - · loc: app/globals.css:23-24 (--color-text-muted #64748b, --color-text-subtle #475569)
- problem: Computed contrast ratios against the app backgrounds: --color-text-muted (#64748b) is 4.15:1 on --color-background, 3.92:1 on --color-surface, 3.62:1 on --color-surface-elevated — all below the 4.5:1 AA minimum for normal text. --color-text-subtle (#475569) is 2.61:1 on background, failing even the 3:1 large-text/non-text minimum. These tokens (and raw slate-500/600 literals that mirror them) are used pervasively for descriptions, timestamps, metadata, placeholders, nav sub-labels and badge counts.
- impact: A large fraction of the app's informational text — sidebar/bottom-nav item descriptions, card subtitles, transaction descriptions/dates, habit metadata, note counts, filter labels, input placeholders — is hard to read for low-vision users and effectively invisible in bright/outdoor conditions on this mobile PWA. Because these are tokens, the failure is system-wide.
- fix: Lighten the tokens: text-muted to roughly #94a3b8 (slate-400, ~7.7:1 on background) for body-level secondary text, and reserve anything darker than ~#8b98a9 strictly for large/bold (>=18.66px bold or 24px) or purely decorative text. Audit raw slate-500/600 literals to match. Re-check on surface and surface-elevated, not just the base background. _(effort: medium)_
- verify: confirmed/high — CONFIRMED — high severity. The contrast math and the usage claims both check out exactly against the actual code.

Tokens (app/globals.css:22-24): --color-text #f1f5f9, --color-text-muted #64748b (sla

### [MEDIUM] Tab-bar navigations expose no selected/current state to assistive tech
- area: - · loc: components/notes/NotesHeader.tsx:80-103 and components/laventecare/LaventeCarePortal.tsx:188-219
- problem: These are tab-style view switchers built as plain <button> lists. The active tab is conveyed only visually (an animated underline / colored background). There is no role="tablist"/role="tab", no aria-selected, and no aria-current on the active button; PortalNavigation also has no arrow-key roving focus. Only 2 files in the app use any tab/selected ARIA at all, and neither of these is one of them.
- impact: Screen-reader users hear an undifferentiated list of buttons with no indication of which view (Week Journal vs Collectie; Klanten vs Signalen vs Facturen, etc.) is currently active, and arrow-key tab navigation that sighted keyboard users expect doesn't work. They must guess current location from surrounding content.
- fix: Either add aria-pressed to each toggle button (minimal fix, matches the pattern already used correctly in AgendaCalendar's Maand/Week toggle at AgendaCalendar.tsx:158/169), or implement the full tablist pattern (role=tablist/tab/tabpanel + aria-selected + roving tabindex + ArrowLeft/Right). Apply the same fix to other untyped switchers in the laventecare views (BillingView, OperationsView, CustomerDossier). _(effort: medium)_
- verify: partially-correct/high — The core defect is REAL and correctly located. Verified in C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp:

1) components/notes/NotesHeader.tsx:80-103 — tab bar is a plain <button> list; active ta

### [MEDIUM] Inline category dropdown is a keyboard trap-free but un-dismissable custom menu
- area: - · loc: components/finance/TransactionList.tsx:14-47
- problem: CategorieEditor renders a custom dropdown (.cat-dropdown) of <button>s on click. It has no role="menu"/role="menuitem", no Escape-to-close handler, no outside-click/blur close, and no arrow-key navigation. The trigger has no aria-expanded/aria-haspopup. Once opened via keyboard, the only ways to close it are to pick an option or click the trigger again (mouse-centric).
- impact: On the finance transactions list (potentially hundreds of rows), a keyboard user who opens a category menu cannot dismiss it with Escape and gets no announced expanded/collapsed state. Tabbing past it leaves the dropdown visually open. Screen-reader users get no menu semantics, just loose buttons appended after the trigger.
- fix: Add aria-haspopup="listbox" + aria-expanded to the trigger, give the panel role="menu"/"listbox" with role="menuitem"/"option", close on Escape and on outside click/focusout, and restore focus to the trigger. The HabitCard 'more' menu (components/habits/HabitCard.tsx:77-86) has the same missing-Escape gap and can share the fix. _(effort: medium)_
- verify: confirmed/high — Verified against C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/finance/TransactionList.tsx lines 14-47 and components/habits/HabitCard.tsx.

CONFIRMED for TransactionList CategorieEdit

### [MEDIUM] BottomSheet and ConfirmDialog focus handling is incomplete
- area: - · loc: components/ui/BottomSheet.tsx:33-43 and components/ui/ConfirmDialog.tsx:69-133
- problem: BottomSheet focuses the first focusable element on open but never traps Tab (focus escapes to the page behind it) and never restores focus to the trigger on close; its backdrop closes on mouse onClick only. ConfirmDialog autofocuses the confirm button (good) but likewise has no focus trap and no focus restoration, and its backdrop is mouse-only. Both set aria-modal="true", which promises a trapped, isolated dialog that isn't delivered.
- impact: Keyboard users in the mobile lamp-control sheet or in any destructive confirm dialog (delete device/room/habit/note) can Tab out of the dialog into the obscured page, and on close their focus is dropped to the document top instead of returning to where they were. The aria-modal promise misleads screen readers about isolation.
- fix: Reuse the same useFocusTrap/return-focus hook recommended for Modal across BottomSheet and ConfirmDialog so all three dialog primitives behave consistently; optionally make the backdrop dismissable via keyboard is unnecessary if Escape already closes (it does), so focus the trap + restoration work. _(effort: medium)_
- verify: confirmed/high — All technical claims verified against the actual code.

BottomSheet.tsx (C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/ui/BottomSheet.tsx): The useEffect at lines 33-43 focuses only th

### [LOW] No skip link to bypass the persistent sidebar/nav
- area: - · loc: app/layout.tsx:28-38 and components/layout/ClientShell.tsx:18-41
- problem: Every page renders a fixed Sidebar (desktop) or BottomNav with ~10 navigation links, but there is no skip-to-content link as the first focusable element, and no programmatic focus reset on route change. Each per-page <main> landmark exists (good), but nothing lets a keyboard user jump to it.
- impact: On desktop, keyboard and screen-reader users must Tab through the entire sidebar navigation (logo, every section link, focus-mode controls, user button) on every single page before reaching page content. After client-side route changes, focus also stays on the clicked nav item rather than moving to the new page heading, so SR users aren't told the page changed.
- fix: Add a visually-hidden-until-focused 'Naar hoofdinhoud' skip link as the first child of <body> pointing to a #main-content id on each page's <main>. Optionally move focus to the main heading on pathname change. _(effort: low)_
- verify: partially-correct/high — All concrete code claims verified against the actual files. ClientShell.tsx:30,38 renders a persistent Sidebar (desktop) and BottomNav (mobile) on every non-auth/non-chromeless route. navigation.ts:23

## responsive (5)

### [HIGH] Toasts render behind the mobile bottom nav and ignore the iOS safe area
- area: global / all routes (toast feedback) · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/ui/Toast.tsx:66
- problem: The toast container is `fixed bottom-6 right-6` (24px from the viewport bottom) with no safe-area inset and no awareness of the mobile chrome. The BottomNav (components/layout/BottomNav.tsx:97) is a `fixed bottom-0` bar roughly 88px tall plus `env(safe-area-inset-bottom)`. At bottom-6 the toast sits inside the nav's footprint.
- impact: On phones every success/error toast appears underneath or visually merged with the bottom navigation bar, and on notched iOS devices the lower part is clipped by the home indicator. Because toasts are the app's only feedback channel for many mutations (the app surfaces almost no inline error state), users can miss confirmations and failures entirely.
- fix: Lift the container above the nav on mobile and respect the safe area, e.g. `bottom-[calc(96px+env(safe-area-inset-bottom,0px))] right-3 md:bottom-6 md:right-6`, and consider full-width centered toasts under `sm`. _(effort: low)_
- verify: confirmed/high — Verified against the actual code and confirmed real, then fixed.

Evidence:
- Toast.tsx:66 (original) — container was `fixed bottom-6 right-6 z-50` with no safe-area inset. `bottom-6` = 24px from the 

### [MEDIUM] Icon-only action buttons across several areas are 32px - below the 44px touch-target minimum
- area: automations, laventecare (business/billing), lampen, all modals · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/automations/AutomationCard.tsx:99
- problem: Multiple primary action clusters use `w-8 h-8` (32px) or `min-h-8` (32px) hit areas with 12-13px icons. AutomationCard's toggle/edit/delete trio (lines 95-120), LaventeCareBusinessCommandCenter document actions (LaventeCareBusinessCommandCenter.tsx:345/353/374), LampToolbar (LampToolbar.tsx:41), and LaventeCareBillingView row actions (LaventeCareBillingView.tsx:1141) are all 32px. The shared modal close buttons are also small: Modal `p-1.5` (~28px, Modal.tsx:107), BottomSheet `w-8 h-8` (BottomSheet.tsx:120), ConfirmDialog absolute close with no min size (ConfirmDialog.tsx:80).
- impact: On touch screens these are hard to hit accurately, and the destructive ones (delete automation, delete in billing) sit right next to non-destructive ones with only `gap-2`, raising mis-tap risk on exactly the actions where a wrong tap is costly. The app already adopted a 44px standard in AppIcon and NoteEditor, so this is an inconsistency, not an absent convention.
- fix: Bump these icon buttons to `h-11 w-11` (or `min-h-[44px] min-w-[44px]`) on touch, or keep the visual box small but expand the hit area with padding/`::before`. Apply the same to the three modal-family close buttons. _(effort: medium)_
- verify: confirmed/high — Every cited line was read and matches the claim. CONFIRMED touch-target violations (all below the 44px WCAG 2.5.5 AAA target): AutomationCard.tsx lines 99/110/117 — the toggle/edit/delete trio are eac

### [MEDIUM] Lamp colour-preset swatches use an 8-column grid, producing ~36px targets packed together
- area: lampen (color picker in mobile BottomSheet) · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/lamp/LampControl.tsx:197
- problem: `grid grid-cols-8 gap-1.5` renders eight aspect-square colour swatches per row with no mobile column reduction. This control is shown inside the mobile BottomSheet (LampCard renders LampControl in a BottomSheet under 768px). On a ~360px phone, after sheet padding the row is ~310px / 8 = 34-36px per swatch.
- impact: Selecting a specific preset colour on a phone means tapping a sub-40px square wedged between neighbours; adjacent-swatch mis-taps are likely, which is the opposite of the precise control a colour picker should give.
- fix: Drop to `grid-cols-4 sm:grid-cols-8` (or `grid-cols-6`) so each swatch clears ~44px on mobile while keeping the dense desktop layout. _(effort: low)_
- verify: confirmed/high — VERIFIED AND FIXED. The finding is accurate on all load-bearing points.

Code facts confirmed at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/lamp/LampControl.tsx:197 — the preset swa

### [LOW] Desktop sidebar is JS-gated, so wide viewports flash an empty gutter and no-JS gets no sidebar
- area: global layout shell (desktop/tablet) · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/layout/Sidebar.tsx:47
- problem: Sidebar returns `null` until both `mounted` and `useIsDesktop()` (a `window.matchMedia('(min-width: 768px)')` hook with a `setTimeout(...,0)` initializer) become true. The element itself also already has `hidden md:flex`. So the breakpoint is enforced twice - once in JS, once in CSS - and the JS gate delays the sidebar past first paint. ClientShell reserves the space with `md:ml-64` unconditionally (ClientShell.tsx:33).
- impact: On desktop/tablet the first paint shows a 64-unit-wide empty left gutter (from `md:ml-64`) with no sidebar in it until the effect runs - a visible layout flash on every load. With JS disabled or slow, the sidebar never appears at all even though the CSS `hidden md:flex` would have shown it correctly on its own.
- fix: Drop the `useIsDesktop`/`mounted` JS gate and rely on the existing `hidden md:flex` CSS for the breakpoint; only keep a JS guard for the Clerk UserButton portal concern (render a static placeholder server-side). This removes the flash and makes the shell work without JS. _(effort: medium)_
- verify: partially-correct/high — The core mechanism is accurately diagnosed against the real code. Sidebar.tsx:47 `if (!mounted || !isDesktop) return null;` gates rendering on two effect-set booleans (mounted via setTimeout line 43; 

### [LOW] Month calendar packs 7 columns with small event chips and a 28px day button on narrow phones
- area: agenda (month/week calendar) · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/AgendaCalendar.tsx:253
- problem: The month grid is a fixed `grid-cols-7` with `auto-rows-[minmax(112px,1fr)]` and `p-1` cells. On a 360px screen each column is ~48px. The day-number button is `h-7 min-w-7` (28px, line 317) and the compact mobile event chips plus the `+N` overflow button (`min-h-6`, line 360) are well under 44px. There is a dedicated mobile rendering path (sm:hidden compact chips), so it is not broken, just cramped.
- impact: Tapping a specific day number or an individual event chip on a small phone is fiddly; the 28px day button and 24px overflow toggle are easy to miss, though the whole-cell select softens this.
- fix: Enlarge the day-number button to h-8/min-w-8 on mobile and give the `+N` overflow button more height; optionally make the entire day cell the primary tap target on mobile so chip precision matters less. _(effort: medium)_
- verify: partially-correct/high — Verified against C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/AgendaCalendar.tsx. The core claim is real. Line 253: month grid is `grid grid-cols-7` with `auto-rows-[minmax(1

## design-consistency (11)

### [MEDIUM] No shared Input/Select/Textarea primitive — the same field class string is copy-pasted 80+ times
- area: - · loc: components/laventecare/LaventeCareCompanyModal.tsx (20×), LaventeCareCustomerDossier.tsx (18×), LaventeCareWorkstreamModal.tsx (17×), LaventeCareProjectModal.tsx, LaventeCareLeadModal.tsx, LaventeCareContactModal.tsx, settings/RoomRow.tsx
- problem: The exact string "mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-white outline-none ... focus:border-[var(--color-primary)]" is repeated 82 times across 7 files (grep count), with no Input/Select/Textarea component in components/ui/. Every form re-implements field styling by hand.
- impact: Any change to field padding, height, focus ring, disabled state, or error styling must be hand-edited in dozens of places; fields already drift (some have placeholder:text-slate-600, some don't). On a touch PWA, field height is also inconsistent (py-2 vs py-2.5 vs py-3) so tap targets vary between forms.
- fix: Add components/ui/Input.tsx, Select.tsx, Textarea.tsx (+ a Field/Label wrapper) wrapping the canonical class string with cn() and a consistent min-height for touch. Migrate laventecare modals and settings forms first since they hold the bulk of the duplication. _(effort: medium)_
- verify: confirmed/high — VERIFIED against the code. Core claims hold:

1) No shared field primitive exists. C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/ui/ contains only structural components (Modal, BottomS

### [MEDIUM] toneClasses color-map is duplicated across ~7 modules and the variants disagree with each other
- area: - · loc: components/dashboard/DashboardUtils.ts:12, components/settings/SettingsUtils.ts:133, components/laventecare/LaventeCareUtils.ts:3, components/notes/NotesUtils.ts, components/habits/HabitsUtils.ts, components/schedule/RoosterUtils.ts, components/ui/AppIcon.tsx:36
- problem: Each feature area defines its own `toneClasses: Record<Tone, {...}>` mapping tone names to slate/amber/sky/emerald/etc Tailwind literals. The maps drift: amber border is border-amber-500/20 in DashboardUtils but border-amber-500/25 in SettingsUtils and LaventeCareUtils; DashboardUtils maps tone "blue"→sky-300 while AppIcon has a real "blue" tone; tone key sets differ per file (some omit violet, some omit cyan).
- impact: The same semantic tone renders with slightly different border opacity depending on which screen you're on, so cards that should look identical across dashboard/settings/laventecare don't. Adding or recoloring a tone means editing 7 near-identical tables and risking further drift.
- fix: Extract one shared tone token map (e.g. lib/tones.ts) consumed by AppIcon and all *Utils files; or promote tones to CSS variables under @theme. Delete the per-feature copies. _(effort: medium)_
- verify: confirmed/high — CONFIRMED — every specific claim checks out against the actual code, and the duplication is even broader than stated (9 copies, not 7).

Amber-border drift (verified literal-by-literal):
- DashboardUt

### [MEDIUM] Four separate hand-rolled modal/dialog implementations instead of one shared primitive
- area: - · loc: components/ui/Modal.tsx, components/ui/BottomSheet.tsx, components/habits/HabitForm.tsx:178-208, components/schedule/CreateEventModal.tsx:270-283
- problem: There is a shared Modal (centered, AnimatePresence) and BottomSheet (mobile sheet, swipe-to-close, focus management), yet HabitForm.tsx and CreateEventModal.tsx each hand-build their own backdrop+dialog (their own z-index, rounded-t-3xl/rounded-2xl, backdrop-blur, role=dialog) rather than reusing them. HabitForm even sets background: "rgba(15,15,20,0.98)" inline, which matches no token (surface is #12121a).
- impact: Modal behavior is inconsistent per feature: BottomSheet has a focus trap, swipe-to-dismiss and safe-area padding; the habit and event modals reimplement a subset and miss pieces (e.g. focus handling, body-scroll lock parity). Corner radius and surface color visibly differ between the habit sheet and the shared Modal. Bug fixes (focus, Escape, scroll lock) must be made in 4 places.
- fix: Make BottomSheet/Modal flexible enough (title slot, size, desktop-centered vs mobile-sheet mode) and migrate HabitForm and CreateEventModal onto them. Remove the inline rgba background in favor of bg-[var(--color-surface)]. _(effort: high)_
- verify: confirmed/high — Verified against all cited files. The finding is real and well-grounded.

CONFIRMED facts:
- Shared primitives exist and are genuinely the intended pattern: components/ui/Modal.tsx (centered, AnimateP

### [MEDIUM] Brand amber is hardcoded as raw Tailwind literals in the layout chrome instead of the primary token
- area: - · loc: components/layout/Sidebar.tsx:55,89,96,104,108,162; components/layout/BottomNav.tsx:113-122,155-168,197-209; components/dashboard/DashboardPrimitives.tsx:61,71
- problem: The primary brand color exists as tokens (--color-primary, --color-primary-subtle, --color-primary-border, bg-primary-subtle, text-primary), but the navigation and dashboard primitives express the active/brand state with raw literals: amber-500/25, amber-500/[0.12], text-amber-300, text-amber-100, amber-500/[0.08]. SectionHeader hardcodes text-amber-300 for every icon regardless of the tone prop.
- impact: The single most visible brand surface (active nav item, logo tile, dashboard section icons) bypasses the token system, so re-theming the accent (or even nudging its opacity) requires hunting raw amber literals across layout + dashboard instead of editing one token. The literals (amber-500) also don't equal the token hex (#f59e0b is amber-500, but the /[0.12] and /25 opacities are ad-hoc and differ from --color-primary-subtle's 0.15).
- fix: Replace amber-* literals in Sidebar/BottomNav/DashboardPrimitives with primary-subtle/primary-border/text-primary utilities (or arbitrary var() values) so the accent is single-sourced. _(effort: medium)_
- verify: partially-correct/high — Core claim CONFIRMED, one sub-claim is factually wrong. Verified against the actual files.

TOKENS EXIST: app/globals.css uses Tailwind v4 @theme and defines --color-primary: #f59e0b, --color-primary-

### [MEDIUM] Status/semantic colors inlined as raw rgba/hex instead of --color-online/offline or new status tokens
- area: - · loc: components/ui/ConfirmDialog.tsx:92-97,123-125 (rgba(239,68,68,*) / #ef4444 / #f59e0b); components/ui/Toast.tsx:56-60 (green/red/blue-500 literals); app/globals.css:209-300 (#4ade80, rgba(239,68,68,*), #f87171, #fbbf24)
- problem: Success/error/warning colors are written as raw values in many places: ConfirmDialog computes danger styling with inline rgba(239,68,68,...) and #ef4444; the global transaction/uploader CSS uses #4ade80, #f87171, #fbbf24, rgba(239,68,68,...). The theme only defines --color-online (#22c55e) and --color-offline (#ef4444), and even those aren't reused — Toast uses green-500/red-500 literals, ConfirmDialog uses #ef4444 directly rather than var(--color-offline).
- impact: There is no single source of truth for success/error/warning, so the same 'error red' appears as #ef4444, red-500, red-400, rgba(239,68,68,...) and #f87171 in different components — subtly different reds for the same meaning. Adjusting the danger color is a scavenger hunt across TSX inline styles and globals.css.
- fix: Add semantic tokens (--color-success/-warning/-danger plus subtle/border variants) and replace the inline rgba/hex and red-500/green-500 literals in ConfirmDialog, Toast, and the .tx-*/uploader CSS with them. _(effort: medium)_
- verify: confirmed/high — All three cited locations verified verbatim. ConfirmDialog.tsx:92-97,123-125 computes danger/warning styling with inline rgba(239,68,68,0.15/0.30), #ef4444, rgba(245,158,11,*), #f59e0b. Toast.tsx:56-6

### [MEDIUM] Card/surface background has at least four competing values for the same elevation
- area: - · loc: app/globals.css:65 (.glass = rgba(255,255,255,0.04)); components/dashboard/DashboardPrimitives.tsx:35 (Panel = rgba(255,255,255,0.035)), :137,:165 (rgba(255,255,255,0.03)/0.025); @theme --color-surface #12121a / --color-surface-hover rgba(255,255,255,0.06)
- problem: 'A card' is expressed as rgba(255,255,255,0.04) (.glass), 0.035 (Panel), 0.03 (RouteTile), 0.025 (StatusRow), and separately as the solid --color-surface token elsewhere. There is no single Card primitive — DashboardPrimitives.Panel is the closest but is local to dashboard and uses its own translucency.
- impact: Panels that should sit at the same elevation render with marginally different translucency depending on which helper built them, producing an uneven, slightly-off card rhythm across screens. New surfaces get yet another arbitrary opacity because there's no canonical value to reuse.
- fix: Define one elevated-surface token (or 2-3 named elevation tokens) and a shared Card component; point .glass, Panel, RouteTile, StatusRow at it instead of bespoke rgba values. _(effort: medium)_
- verify: confirmed/high — Verified all cited values exactly in C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp. app/globals.css:65 .glass = rgba(255,255,255,0.04); @theme defines --color-surface #12121a (line 6) and --color

### [LOW] Input focus accent is inconsistent across forms — amber token vs amber literal vs orange vs sky
- area: - · loc: components/habits/HabitForm.tsx:237,281 (orange-500/30) and :510 (sky-500/30); components/settings/AddDeviceForm.tsx:62,75 (amber-500/50); components/laventecare/LaventeCareLeadModal.tsx:45 (var(--color-primary))
- problem: The brand accent is the amber --color-primary token, but form fields use four different focus colors: focus:border-[var(--color-primary)] (laventecare), focus:border-amber-500/50 (settings), focus:border-orange-500/30 and focus:border-sky-500/30 (habits). Orange and sky are not even the brand color.
- impact: Tabbing through forms produces visibly different focus highlights per route — the habit-creation sheet glows orange/blue while everything else glows amber, which reads as a bug to users and breaks the single-accent identity.
- fix: Standardize on the primary token (ideally via the new Input primitive). Replace orange-500/sky-500/amber-500 literal focus styles with focus:border-[var(--color-primary)] (or a token-based focus ring). _(effort: low)_
- verify: partially-correct/high — The inconsistency is real and the citations are accurate. Verified at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp: HabitForm.tsx:237 and :281 use focus:border-orange-500/30, :510 uses focus:bor

### [LOW] Radius tokens largely bypassed — rounded-2xl/3xl and rounded-[20px] literals used despite --radius-* tokens
- area: - · loc: 50 occurrences across 26 files incl. components/ui/Modal.tsx:91 (rounded-2xl), BottomSheet.tsx:93 (rounded-t-[20px]), habits/HabitForm.tsx:187 (rounded-t-3xl/rounded-2xl), schedule/CreateEventModal.tsx:283 (rounded-2xl), dashboard/DashboardPrimitives.tsx (rounded-2xl)
- problem: @theme defines --radius-sm/md/lg/xl (8/12/16/20px) but components mostly use Tailwind's default rounded-lg/xl/2xl scale and arbitrary rounded-[20px]/rounded-t-3xl. rounded-2xl (Tailwind 16px) and the xl token (20px) are used somewhat interchangeably for the same 'modal corner', and BottomSheet's rounded-t-[20px] equals --radius-xl but is written as a literal.
- impact: Modal/sheet/card corners don't follow a single radius scale — the habit sheet (rounded-t-3xl, 24px) is rounder than the shared Modal (rounded-2xl, 16px) and the BottomSheet (20px), so overlays look inconsistent side by side. The radius tokens are effectively dead because nothing maps to them.
- fix: Either delete the unused --radius-* tokens or (better) adopt them: standardize overlay corners on one token value and replace rounded-[20px]/rounded-t-3xl/rounded-2xl with the chosen rounded-* token across Modal/BottomSheet/HabitForm/CreateEventModal. _(effort: low)_
- verify: partially-correct/high — The cited literals are real and exact, but the finding's central claim is refuted by Tailwind v4 semantics. This project is Tailwind v4 (package.json: tailwindcss ^4, @tailwindcss/postcss ^4; globals.

### [LOW] Two parallel button systems (.btn global CSS vs Tailwind/IconButton) used inconsistently
- area: - · loc: app/globals.css:310-324 (.btn/.btn--primary/.btn--ghost/.btn--sm); used in components/finance/CsvUploader.tsx, salary/LoonstrookUploader.tsx, finance/FinanceInsights.tsx, schedule/AfsprakenView.tsx vs ad-hoc Tailwind buttons everywhere else; components/ui/AppIcon.tsx:139 (IconButton)
- problem: There is no Button primitive. Finance/salary/schedule areas use the BEM .btn/.btn--primary/.btn--ghost classes from globals.css, while most other areas write inline Tailwind button classes (e.g. ConfirmDialog's px-4 py-2 rounded-xl, laventecare submit buttons), and IconButton in AppIcon is a third pattern. The .btn radius (--radius-sm, 8px) differs from the inline buttons' rounded-xl (12px).
- impact: 'Primary button' looks different depending on the route: the finance import button is 8px-radius .btn--primary, the confirm dialog's primary action is a 12px inline amber button, and laventecare submit buttons are yet another inline style. Hover/disabled/loading behavior isn't shared, so states are implemented ad hoc per button.
- fix: Introduce components/ui/Button.tsx (variants: primary/ghost/danger, sizes sm/md, loading state) and converge the .btn CSS users and the inline-Tailwind buttons onto it; keep IconButton for icon-only actions. _(effort: medium)_
- verify: partially-correct/high — The core thesis is real and grounded in code, but several supporting details are wrong, and the "two cleanly parallel systems" model misdescribes the actual (messier) reality.

CONFIRMED:
- The BEM bu

### [LOW] Inconsistent touch-target sizing on close/icon buttons across overlays (PWA)
- area: - · loc: components/ui/Modal.tsx:107-113 (close button p-1.5, ~32px), Toast.tsx:81-85 (X size 14, no min size), ConfirmDialog.tsx:80-86 (absolute X, no min size), BottomSheet.tsx:120-126 (w-8 h-8 = 32px) vs AppIcon.tsx:163 IconButton (min-h-[44px] min-w-[44px])
- problem: The codebase has a 44px touch-target convention (IconButton enforces min-h-[44px] min-w-[44px], applied in ~16 files), but the shared overlay primitives ignore it: Modal/BottomSheet/ConfirmDialog/Toast close buttons are 28-32px with no min-w/min-h. Habit emoji buttons (HabitForm) do use min-h-[44px], so the rule is applied unevenly even within similar controls.
- impact: On mobile (this is a PWA), dismissing a modal/sheet/toast means hitting a sub-44px target while the rest of the app uses 44px, so close affordances feel fiddly and fail the WCAG 2.5.5 target-size guidance the app otherwise follows.
- fix: Apply the same min-h-[44px] min-w-[44px] (with centered icon) to close buttons in Modal, BottomSheet, ConfirmDialog and Toast — ideally by routing them through IconButton or a shared CloseButton. _(effort: low)_
- verify: partially-correct/high — The core problem is REAL and user-facing. All four close-button measurements are accurate as cited and confirmed by reading the files:
- Modal.tsx:107-113: close button is `p-1.5` (6px) around `X size

### [LOW] Modal theme variant uses a hardcoded hex that breaks the token-based theming pattern
- area: - · loc: components/ui/Modal.tsx:32 (emerald: "border-emerald-500/20 bg-[#022c22]/90")
- problem: Modal's themeClasses map is otherwise opacity-based literals (sky-500/10, rose-500/10) or the primary token, but the emerald variant injects an opaque custom hex bg-[#022c22]/90 — a one-off green that exists nowhere else in the token set or other tone maps (which use emerald-500/10).
- impact: An emerald-themed modal renders with a saturated dark-green panel that doesn't match emerald usage anywhere else in the app (cards, AppIcon, tone maps all use emerald-500/10-15), so the same semantic 'emerald' surface looks different in this one component.
- fix: Replace bg-[#022c22]/90 with the consistent emerald-500/10 (matching the other theme entries and tone maps), or move modal theming onto the shared tone map. _(effort: low)_
- verify: confirmed/high — Verified at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/ui/Modal.tsx:32. The finding is accurate on every claim:

1. Pattern break is real: every other entry in the `themeClasses` ma

## interaction-states (8)

### [HIGH] Query fetch errors are universally swallowed — a failed load is indistinguishable from an empty result
- area: - · loc: hooks/useTransactions.ts:144-149; hooks/useSchedule.ts:56-64; hooks/useHabits.ts:304-319; hooks/useLaventeCare.ts:39-67
- problem: Across every sampled data hook the read queries expose isLoading but never isError, and callers never read it. useTransactions wraps its fetch in a bare `catch {}` that resets to empty arrays. useSchedule/useHabits/useLaventeCare destructure only `{ data, isLoading }` from their useQuery/orval hooks (the only isError consumers in the whole app are HabitHeatmap and the LaventeCare dossier-advice panel). So when the backend is down or returns an error, the UI renders the normal empty state.
- impact: A backend outage in finance shows 'Geen transacties gevonden voor deze filters', in rooster shows 'Nog geen rooster gesynchroniseerd', in habits shows 'Habits instellen', in laventecare shows empty cockpit cards. The user believes their data is genuinely empty (and may re-import or recreate it) instead of seeing 'kon niet laden — opnieuw proberen'.
- fix: Destructure isError/error from the queries and render a distinct error state (reuse the ErrorBoundary fallback markup or an EmptyState variant with a retry button calling refetch). For useTransactions, surface the caught error via state instead of resetting silently. _(effort: medium)_
- verify: confirmed/high — Verified every cited claim against the actual code in C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp.

useTransactions.ts: The fetch effect (lines 144-149) has a bare `catch {}` that on any error 

### [HIGH] Habit toggle/increment/incident/pause/archive have no pending, disabled, optimistic, or error state
- area: - · loc: hooks/useHabits.ts:386-427; components/habits/DailyChecklist.tsx:101-104,121-124; components/habits/HabitsVandaagTab.tsx:93
- problem: The habit mutation methods are raw async functions: `await postHabitsIdToggle(...); invalidateAll();` with no try/catch and no optimistic update. The checklist item button (DailyChecklist HabitCheckItem and HabitsVandaagTab) calls `onToggle={() => toggle(habit._id)}` with no awaited pending/disabled handling. The checkbox does not flip until the network round-trip AND the refetch complete, the button is never disabled, and a failed toggle produces zero feedback.
- impact: On a phone with normal latency, tapping a habit feels broken — nothing happens for 300-800ms, so users double/triple-tap (firing duplicate toggles that flip the value back). If the request fails, the tick silently never appears and no toast warns them; the day looks incomplete.
- fix: Either convert these to TanStack useMutation with onMutate optimistic cache writes + onError rollback, or at minimum track a per-item pending id to disable the button and wrap in try/catch + error toast (the pattern the laventecare page already uses with processingLead/processingAction). _(effort: medium)_
- verify: confirmed/high — All material claims verified against the actual code.

1) Raw async mutations with no try/catch and no optimistic update — CONFIRMED. hooks/useHabits.ts:386-427: toggle, increment, incident, pause, ar

### [MEDIUM] ErrorBoundary component exists but is never mounted at the app/route level
- area: - · loc: components/ui/ErrorBoundary.tsx (defined); app/providers.tsx:49-80 and app/layout.tsx (not used). Only in-tree usage: app/rooster/page.tsx:438,446,454
- problem: The hand-rolled ErrorBoundary is only wrapped around the three rooster sub-tabs (StatsView/SalarisView/AfsprakenView). It is absent from providers.tsx, layout.tsx and the layout shell, and there are no route-level error.tsx/not-found.tsx/loading.tsx files anywhere under app/. Any render-time exception in finance, notes, habits, laventecare or the dashboard therefore unwinds to a blank white screen.
- impact: A single undefined-access render error (common given the loose `as` casts and optional chaining throughout these components) crashes the entire page to white with no recovery path, on a PWA that is meant to work offline-first on mobile.
- fix: Mount ErrorBoundary inside Providers (around {children}) and/or add app/error.tsx + app/global-error.tsx. Keep the per-tab boundaries for granularity. _(effort: low)_
- verify: partially-correct/high — The core structural claim is TRUE and verified. ErrorBoundary (C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/ui/ErrorBoundary.tsx) is NOT mounted in Providers (app/providers.tsx:49-80 

### [MEDIUM] Inline transaction category edit fails silently and never updates
- area: - · loc: hooks/useTransactions.ts:196-204; consumed via app/finance/page.tsx:64-67 and components/finance/TransactionList.tsx:35,129
- problem: updateCategorie does `await patchTransactionsTxID(id, ...)` and only THEN updates local state. There is no try/catch, so if the PATCH rejects the local optimistic update line never runs, the dropdown closes (CategorieEditor setOpen(false) fires immediately on click), and the row keeps its old category. No toast, no rollback indicator — the failure is completely invisible.
- impact: User recategorises a transaction, the dropdown closes as if it worked, but the category silently reverts on next render/refetch. Repeated 'it didn't save' confusion with no error shown.
- fix: Apply the local update optimistically before the await and roll back + show an error toast in a catch; or surface the rejection to the page so it can toast. _(effort: low)_
- verify: confirmed/high — Verified the full call chain and confirm the finding is real with genuine user-facing impact.

CODE FACTS (all confirmed):
1. useTransactions.ts:196-204 - updateCategorie does `await patchTransactions

### [MEDIUM] Habit delete confirmation fires the mutation un-awaited with no success/error feedback
- area: - · loc: app/habits/page.tsx:116-120 (handleDelete) vs the awaited+toasted handleCreate/handleEdit at 94-114
- problem: handleDelete calls `remove(confirmDelete); setConfirmDelete(null);` — no await, no try/catch, no toast. The custom delete dialog (lines 275-325) closes instantly on click regardless of outcome. This is inconsistent with handleCreate/handleEdit on the same page, which await and toast both success and failure.
- impact: After confirming a destructive delete (logs, streaks, badges are destroyed per the dialog copy), the user gets no confirmation it succeeded and no warning if it failed; a failed delete leaves the habit present with no explanation.
- fix: Make handleDelete async/await with try/catch, success('Habit verwijderd') and toastError on failure, matching the create/edit handlers. _(effort: low)_
- verify: confirmed/high — Verified against the actual code at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/habits/page.tsx and the hook at hooks/useHabits.ts.

Every claim in the finding is accurate:
- handleDelete (

### [LOW] All LaventeCare mutations define onSuccess but no onError at the hook layer
- area: - · loc: hooks/useLaventeCare.ts:80-200 (createLeadMut, updateLeadMut, createProjectMut, updateActionStatusMut, etc.)
- problem: Every useMutation in the LaventeCare hook only wires onSuccess (invalidate). Error handling is delegated entirely to callers. The app/laventecare/page.tsx callers do this well (try/catch + toastError + per-item processing state on every action), but any future caller of these shared mutations inherits silent-failure-by-default, and there is no centralized error reporting.
- impact: Low today because the single consumer (laventecare page) is diligent, but it's a latent trap: a new view reusing useLaventeCare mutations will fail silently unless it remembers to catch.
- fix: Add a default onError (e.g. a shared toast or logged error) to the mutations, so error surfacing is opt-out rather than opt-in. _(effort: low)_
- verify: confirmed/high — Verified against the actual code. CONFIRMED and accurately described.

1) Mutations omit onError: Every useMutation in C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/hooks/useLaventeCare.ts (lines

### [LOW] No optimistic updates with rollback anywhere — all mutations are wait-then-invalidate
- area: - · loc: Pattern across hooks/useHabits.ts, hooks/useSchedule.ts (toggleStatus:146-152), hooks/useLaventeCare.ts, app/laventecare/page.tsx action handlers
- problem: The prompt asks specifically about optimistic updates & rollback. Not a single mutation in the sampled areas uses TanStack onMutate/optimistic cache writes. Every action awaits the server then invalidates, so the UI shows stale values for the full round-trip. useSchedule.toggleStatus is additionally fire-and-forget (no error path). The laventecare page mitigates the latency perception with per-item processing spinners, but habits/finance inline edits do not.
- impact: On mobile/PWA with variable latency, status toggles and category edits feel laggy; there is no instant feedback and (in habits/finance) no spinner either.
- fix: Introduce optimistic onMutate + onError rollback for the highest-frequency toggles (habit completion, lead/project status, transaction category). Lower priority than wiring error states, hence low severity. _(effort: high)_
- verify: partially-correct/high — The per-area observations are accurate, but the headline claim "No optimistic updates with rollback anywhere" is false.

VERIFIED accurate sub-claims:
- hooks/useHabits.ts: all mutations (toggle/updat

### [LOW] Toast is the only error channel and is bottom-right fixed — easy to miss on mobile and overlaps the BottomNav
- area: - · loc: components/ui/Toast.tsx:66 (fixed bottom-6 right-6), auto-dismiss 4s at line 47
- problem: All success/error feedback funnels through one Toast container pinned bottom-right with a 4s auto-dismiss and max 5 stacked. On the mobile PWA the bottom-right position sits near/over the BottomNav 'More' area, and 4s is short for reading a Dutch error sentence. There is no inline error placement for page-level failures (only NoteEditor and CsvUploader render inline errors).
- impact: Error toasts can be visually occluded by the bottom navigation on phones and disappear before being read, so the very failures that ARE surfaced can still be missed.
- fix: Offset the toast container above the BottomNav safe-area on mobile, lengthen error-type dismiss to ~6-7s (or make errors require manual dismiss), and consider inline error banners for page-load failures. _(effort: low)_
- verify: confirmed/high — Verified against the actual code; the core defect is real and grounded, not generic advice.

CONFIRMED specifics:
- C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/ui/Toast.tsx:66 — cont

## performance-cls (7)

### [HIGH] LaventeCare loading skeleton does not match the real layout — large jump when cockpit data resolves
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/laventecare/page.tsx:1410-1423
- problem: While `cockpitLoading` is true the page shows a single `h-40` block plus four `h-28` tiles (a generic header + 4-card grid). The actual resolved layout is a full LaventeCareHeader, a PortalHero, a PortalNavigation strip, a 2-column grid with a 280px insight rail, and a tall workspace section. The skeleton occupies a fraction of the final height and a different shape.
- impact: On this data-heavy route (the app's largest screen) the viewport jumps substantially the moment the query resolves: the skeleton collapses and the real hero/nav/rail expand below the fold, shoving everything down. High CLS on the route most likely to be slow.
- fix: Make the skeleton mirror the real structure: reserve hero height, the nav row, the right rail width, and a workspace block of roughly the final min-height. Even a few fixed-height placeholder panels matching the grid would remove most of the shift. _(effort: medium)_
- verify: confirmed/high — Verified against the actual code at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/laventecare/page.tsx and the components it renders.

SKELETON (lines 1410-1423): a full-page early `return` w

### [MEDIUM] Desktop sidebar mounts after first paint (setTimeout + matchMedia gate) — late chrome shift
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/layout/Sidebar.tsx:36-50 (also ClientShell.tsx:33)
- problem: Sidebar returns null until BOTH a setTimeout(0)-driven `mounted` flag AND a `useIsDesktop()` matchMedia check (itself behind another setTimeout(0)) are true. So on desktop the 16rem (w-64) sidebar — logo, full nav, FocusModeShortcut, and the Clerk user block — is never present on the server-rendered/first-paint frame; it appears one tick later. ClientShell reserves the gutter via `md:ml-64`, but the sidebar contents (and on slow first render the layout decision itself) flash in after the page is interactive.
- impact: On every desktop load the left navigation visibly pops/fills in a frame after content, and the auth/user block at the bottom does a second pop when Clerk's isLoaded flips. Feels like the app 'assembles itself' instead of arriving complete.
- fix: Render the sidebar markup unconditionally on md+ via pure CSS (it already has `hidden md:flex`), and drop the JS `mounted`/`useIsDesktop` null-gate — use CSS media queries for the desktop/mobile split so the column is in the very first paint. Keep only the Clerk-dependent user block behind isLoaded (it already has a matching skeleton). _(effort: medium)_
- verify: partially-correct/high — The core mechanism is real and verified. In C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/layout/Sidebar.tsx line 47, `if (!mounted || !isDesktop) return null;` gates the entire `<asid

### [MEDIUM] Provider tree swaps from QueryClientProvider to PersistQueryClientProvider after async persister init — full remount / hydration flash
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/providers.tsx:35-79
- problem: `persister` starts null and is set inside a useEffect (idb-keyval async storage). Until it resolves, children render under a plain `QueryClientProvider`; once it resolves the entire subtree is re-rendered under `PersistQueryClientProvider`. Because the two branches are different component types at the same position, React unmounts and remounts the whole app shell + page on first load, and the persisted IndexedDB cache only hydrates into the query client on this second mount.
- impact: First load shows empty/`Laden...` states, then the tree remounts and the IndexedDB-cached data pops in — the persisted cache that should have eliminated the empty flash instead arrives only after a visible remount. Any in-progress animations/scroll position reset on that swap.
- fix: Render a single, stable `PersistQueryClientProvider` and pass the persister once it exists, rather than switching component types. Option: keep the persister creation synchronous-ish by initializing it in the same useState initializer, or render children under one provider and gate only the persist hydration, so the component identity at that tree position never changes. _(effort: medium)_
- verify: confirmed/high — The finding is technically accurate and grounded in the actual code at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/providers.tsx.

Verified facts:
1. Component-type swap is real (providers.

### [MEDIUM] Finance page reveals metrics/charts/insights only after `stats` resolves, with no reserved space
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/finance/page.tsx:353-414
- problem: FinanceMetricsGrid, the 'Maandelijks Verloop & Cashflow' CollapsibleSection (which contains a 320px chart), and the 'Abonnementen & Inzichten' section are each rendered behind `stats &&` / `hasData`. There is no skeleton for any of them — the page first renders header + period selector + uploader, then the metrics row, charts, and insights all inject themselves once useTransactions resolves.
- impact: After the transactions query returns, a tall metrics grid plus a 320px chart section and an insights section appear at once between the import card and the transaction list, pushing the transaction list far down. The user's eye/scroll position is disrupted right as data lands.
- fix: Render fixed-height skeleton placeholders for the metrics grid and the chart card while `isLoading`/`!stats` (the chart already has a stable 320px wrapper — reuse that height as a placeholder). Reserving the metrics-row height alone removes the largest jump. _(effort: medium)_
- verify: confirmed/high — Confirmed and accurately grounded in the code. In useTransactions.ts the stats state initializes to null (line 68) and isLoading to true (line 67); data is fetched in a client-side useEffect (lines 10

### [MEDIUM] No route-level loading.tsx / error.tsx / not-found.tsx; ErrorBoundary not mounted at app level
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/ (no loading.tsx/error.tsx/not-found.tsx in any route); ErrorBoundary at components/ui/ErrorBoundary.tsx is only used inside app/rooster/page.tsx
- problem: There are zero `loading.tsx`, `error.tsx`, or `not-found.tsx` files under app/. Because every data screen is a `"use client"` component that fetches via TanStack Query, navigating between routes shows no Suspense/loading fallback during the client transition — the new route renders its own internal empty/`Laden...` states instead. The class ErrorBoundary exists but is only wired into the rooster page, not the providers/layout/shell.
- impact: Route-to-route navigation has no instant skeleton frame: the user clicks a nav item and the destination renders bare (empty panels, 'Laden...') until its hooks resolve, which reads as a blank/janky transition rather than a smooth hand-off. A thrown render error anywhere outside rooster is uncaught at the app level.
- fix: Add a minimal `app/loading.tsx` (and per heavy route, e.g. laventecare/finance) that renders the page's skeleton shell so transitions show a stable placeholder immediately. Add `app/error.tsx` / `not-found.tsx`, and mount the existing ErrorBoundary in the provider/shell tree. _(effort: medium)_
- verify: partially-correct/high — The structural facts are real and verified. Zero loading.tsx/error.tsx/not-found.tsx/global-error.tsx/template.tsx files exist under app/ (confirmed via case-insensitive search across all 14 routes). 

### [LOW] recharts is statically imported into client bundles (no next/dynamic code-split)
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/finance/FinanceCharts.tsx:1-20; C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/MonthBalanceChart.tsx:7
- problem: recharts (a large dependency) is imported with a top-level static `import ... from "recharts"` inside client components that are themselves imported directly by the finance and rooster page trees. There is no `next/dynamic`/lazy boundary anywhere in the app (grep for next/dynamic returns nothing), so recharts ships in the initial JS for these routes even before any chart is visible (the finance chart lives inside a CollapsibleSection that may be collapsed, and MonthBalanceChart in a stats tab).
- impact: Larger initial JS download and parse on the finance and rooster routes delays time-to-interactive and the first meaningful render, worsening perceived load on mobile/PWA where these routes are common entry points.
- fix: Wrap the chart components in `next/dynamic(() => import(...), { ssr: false, loading: () => <fixed-height placeholder/> })` so recharts is fetched only when the chart section is actually shown, and the placeholder keeps the 320px slot stable. _(effort: low)_
- verify: partially-correct/high — The core technical claim is verified against the code. recharts ^3.8.0 (package.json:38, a large lib) is statically imported at the top of two "use client" components: C:/Users/jeffrey/Desktop/Project

### [LOW] Dashboard renders all metric tiles immediately with placeholder strings, then values swap in (intra-tile shift risk)
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/page.tsx:114-208
- problem: The dashboard renders immediately and shows a thin 'Dashboardgegevens worden bijgewerkt' banner plus MetricTiles seeded with fallbacks (`devices = []`, 'Geen lampen', 'Laden', 'Rustig', formatCurrency(undefined)). When the five independent queries (devices, schedule, salary, events, loonstroken) resolve at different times, each tile's value/sub text changes length. The banner itself (line 142-147) is conditionally inserted at the top of <main> only while loading, so it occupies a row that disappears on completion.
- impact: The top loading banner appears then vanishes, nudging the section grid up by its height once all queries finish; individual tile sub-labels reflow as numbers replace 'Laden'. Minor but visible on the most-visited screen, especially on mobile where the banner row is proportionally taller.
- fix: Reserve the banner's space (render it as a fixed-height row that fades content rather than collapsing), or move the 'updating' affordance into the header so the grid position never changes. Keep tile shells fixed-height (they mostly are) so only text content—not box size—changes. _(effort: low)_
- verify: partially-correct/high — Verified against C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/page.tsx (lines 141-208) plus the tile primitives in components/dashboard/DashboardPrimitives.tsx and DashboardOverviewPanel.tsx

## navigation-ia (9)

### [HIGH] Document detail viewer is wrapped in the app shell — double chrome and BottomNav overlaps the PDF
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/layout/ClientShell.tsx:9 (CHROMELESS_ROUTES) + app/laventecare/documenten/[documentKey]/page.tsx:188-256
- problem: CHROMELESS_ROUTES only contains '/focus'. The PDF/dossier viewer is clearly designed as a full-screen takeover: it renders its own min-h-[100dvh] container, its own sticky top-0 header with a back-arrow, Open/Screen/Print actions, and an iframe sized to calc(100dvh-…). But because it is not chromeless, ClientShell still wraps it with the desktop Sidebar (md:ml-64) and the fixed mobile BottomNav (z-[60]). On desktop two headers stack and the page's own back button duplicates the sidebar; on mobile the BottomNav covers the bottom of the iframe (the viewer's pb-28 collides with the shell's own pb-28), eating PDF viewport and putting a second nav over the page's own back affordance.
- impact: On mobile the PDF/iframe loses ~88px of height behind the bottom nav and the user sees two competing navigation systems; on desktop there are two headers and a redundant back control. The intended immersive document-reading experience is broken on exactly the platform (PWA/mobile) that matters most.
- fix: Add '/laventecare/documenten' (or the full prefix) to CHROMELESS_ROUTES so the viewer renders shell-free like /focus, and rely on its own ArrowLeft back-link for return navigation. _(effort: low)_
- verify: confirmed/high — Verified against the actual code. Root layout (app/layout.tsx:33) wraps all routes in ClientShell, and a Glob confirmed there is NO nested layout in the laventecare tree (only app/layout.tsx exists), 

### [MEDIUM] Document 'Preview' links use raw <a href> instead of next/link — full page reloads with no loading state
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/laventecare/LaventeCareKnowledgeView.tsx:126-127, 180-184, 391; URL built in lib/laventecare/pdf/registry.ts:98
- problem: Every link into the document viewer is a plain <a href={getLaventeCarePdfViewerUrl(...)}> (no next/link import in the file). The target page is a Server Component that fetches /laventecare/dossier-documents?limit=250 with cache:'no-store' before it can render. Because there is no loading.tsx for that route and the navigation is a full document load (not a client transition), the user gets a hard browser navigation followed by a blank wait while up to 250 dossier docs are fetched server-side.
- impact: Clicking 'Preview' on a knowledge document feels broken: white flash, lost SPA state, then a stall with no spinner/skeleton before the viewer appears. On a slow mobile connection the perceived latency is significant and there is zero feedback that anything is happening.
- fix: Either (a) keep RSC but add app/laventecare/documenten/[documentKey]/loading.tsx with a dark skeleton, or (b) switch the catalogue links to next/link for client-side transitions. Combine with the chromeless fix above. _(effort: medium)_
- verify: partially-correct/high — The structural claims are all confirmed by the code, but the headline impact is misattributed to the wrong link type, which inflates the severity.

CONFIRMED facts:
- C:/Users/jeffrey/Desktop/Projecte

### [MEDIUM] All in-page sub-views/tabs are local useState — nothing is deep-linkable, bookmarkable, or back/forward navigable
- area: - · loc: Whole app: only components/layout/FocusModeControl.tsx uses useRouter/useSearchParams. e.g. app/laventecare/page.tsx:188 (PortalView, 10 views), app/rooster/page.tsx:138 (Tab), app/habits/page.tsx:30 (TabId), app/notities/page.tsx:61-71 (NotesTab+viewMode+sort+scope), app/finance/page.tsx:46-47 (chartView/jaarFilter)
- problem: A grep for useSearchParams/useRouter across app/ + components/ returns exactly one file (FocusModeControl, used only for the focus redirect). Every feature page stores its active tab/sub-view in component-local useState. The most extreme case is LaventeCare: a 62KB cockpit with 10 sub-sections (overview/customers/signals/workstreams/commerce/mailbox/delivery/operations/knowledge/gaps) all behind setActiveView, none reflected in the URL.
- impact: Users cannot bookmark or share 'Finance 2025' or 'LaventeCare → Commerce'; the browser/Android back button never returns to a previous sub-view (it leaves the route entirely); a PWA reload always resets every page to its default tab. Round-tripping out to a document viewer and pressing back lands on LaventeCare 'overview', not the 'knowledge' tab the user came from — losing their place in the largest screen in the app.
- fix: Promote the primary sub-view selector on the heaviest pages (at minimum LaventeCare PortalView, finance year, habits/notities tabs) to a ?view= search param via useSearchParams + router.replace, so deep-links, back/forward, and PWA reloads preserve location. _(effort: high)_
- verify: confirmed/high — Every factual claim verified against the code. (1) Grep for useSearchParams/useRouter across the app returns exactly one file, C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/layout/Focu

### [MEDIUM] Auto-focus redirect yanks the user to /focus from any route, with only a 'back to dashboard' exit
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/layout/FocusModeControl.tsx:65-96 + app/focus/page.tsx:92-98
- problem: When 'Auto focus na 1 minuut' is enabled, FocusModeAutoRedirect does router.push('/focus') after 60s of idle from ANY non-excluded route. The focus page is chromeless and its only exit is a single 'App' Link that always goes to '/'. Because it is router.push (not replace) the history back button works, but the redirect itself silently abandons whatever page/scroll position the user was on.
- impact: A user who pauses to read on /finance or mid-form on /laventecare (forms are guarded, but plain reading is not) is teleported to the focus screen, and the in-page exit returns them to the dashboard rather than where they were. For a wall-mounted tablet this is intended, but on a phone it is an easy-to-mis-enable trap that loses navigational context.
- fix: Have the focus 'App' Link return to the previous pathname (capture it before redirect) instead of hard-coding '/', and/or surface a clearer mobile-only confirmation before the first auto-redirect. _(effort: medium)_
- verify: confirmed/high — Code confirms every load-bearing claim. FocusModeControl.tsx:65-96 — FocusModeAutoRedirect sets a 60s idle timer (FOCUS_IDLE_MS=60_000) reset by pointerdown/keydown/touchstart/wheel/scroll and, on exp

### [MEDIUM] Mobile: 4 of 10 nav targets (automations, finance, notities, habits, laventecare, settings) are all buried behind the 'Meer' sheet
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/layout/navigation.ts:116-117 (mobile:'primary' vs 'more') + components/layout/BottomNav.tsx:85-89
- problem: Only Dashboard/Lampen/Rooster/Agenda are mobile:'primary'; Automatisch, Finance, Notities, Habits, LaventeCare and Instellingen are all 'more'. Reaching any of those six on a phone is a 2-tap path (open 'Meer' sheet, then pick). The dashboard's quick-route grid ('Snel naar je belangrijkste modules', app/page.tsx:299) that could shortcut this is hidden md:block — desktop-only — and even it omits automations/habits/laventecare/settings. The settings routeTiles (components/settings/SettingsUtils.ts:172-179) also omit automations and laventecare.
- impact: On mobile, Finance and LaventeCare (the business cockpit) — both core, frequently-used areas — are never one tap away, while the dashboard's compensating shortcut grid doesn't render on mobile at all. There is no single-tap path to LaventeCare or Habits anywhere on a phone.
- fix: Reconsider which 4 routes are primary for a phone user (Finance and/or LaventeCare are strong candidates over Lampen), and/or make the dashboard RouteTile shortcut grid visible on mobile and include the buried routes. _(effort: medium)_
- verify: confirmed/high — All load-bearing claims verified against the actual code.

navigation.ts:116-117 — MOBILE_PRIMARY_ITEMS = items with mobile==="primary": exactly 4 (Dashboard, Lampen, Rooster, Agenda). The other 6 (au

### [MEDIUM] No loading.tsx for any route — navigations show no skeleton; data screens flash 'Laden…' fallbacks
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/ (no loading.tsx in any route segment) + app/page.tsx:142-147 (inline 'Dashboardgegevens worden bijgewerkt' banner)
- problem: There is no loading.tsx anywhere under app/, and no Suspense usage. Client pages render immediately with ad-hoc fallback strings ('Laden', 'Laden...', default = []), so route changes have no consistent skeleton. The one RSC route that does async work server-side (the document viewer, which fetches up to 250 dossier docs no-store) has no loading.tsx, so its navigation simply stalls (see also the <a href> finding).
- impact: Route transitions feel inconsistent — some screens pop in instantly with placeholder text, the document viewer hangs blank. There is no unified 'this route is loading' affordance, which on a PWA reads as sluggishness or breakage.
- fix: Add per-segment loading.tsx (at least for /laventecare/documenten/[documentKey], /finance, /laventecare) using the existing dark skeleton style (Sidebar already has animate-pulse blocks to reuse). _(effort: medium)_
- verify: confirmed/high — All core claims verified against the actual code in C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp.

1) No loading.tsx anywhere: Glob for app/**/loading.* and a find sweep returned zero files acro

### [LOW] No route-level not-found.tsx — unknown URLs drop the user out of the app shell entirely
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/ (no not-found.tsx / error.tsx / global-error.tsx anywhere)
- problem: A project-wide search confirms there is not a single not-found.tsx, error.tsx, or global-error.tsx in app/. The only 'missing' handling is MissingDocumentView inside app/laventecare/documenten/[documentKey]/page.tsx, which only covers unknown *document keys*, not unknown routes. Any mistyped/stale URL (e.g. /financ, an old bookmark, a shared deep link) renders Next.js's built-in default 404.
- impact: The default 404 is an un-styled white page with English text ('404 | This page could not be found'). In a permanently-dark, Dutch-only PWA this is a jarring brand break with no Sidebar/BottomNav — the user has no in-app way back and may think the app crashed. On an installed PWA this is especially disorienting.
- fix: Add app/not-found.tsx and app/global-error.tsx styled with the dark token palette + Dutch copy and a 'Terug naar dashboard' Link to '/'. Reuse the existing MissingDocumentView visual language for consistency. _(effort: low)_
- verify: partially-correct/high — The file-existence claims are all true and verified: there is no not-found.tsx, error.tsx, or global-error.tsx anywhere in C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/ (exhaustive find conf

### [LOW] Document viewer back-link and breadcrumbs always return to LaventeCare root, discarding origin context
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/laventecare/documenten/[documentKey]/page.tsx:192-198, 278-284, 368-374
- problem: All three viewer states (pdf / dossier / missing) provide a single back affordance: Link href='/laventecare' ('Terug naar LaventeCare'). There are no breadcrumbs and no indication of which sub-view (knowledge tab, a specific dossier, a project) the user came from. Combined with LaventeCare's tab being local-only state, returning lands on the default 'overview' view, not the knowledge/dossier context the document belongs to.
- impact: After viewing a document the user is dropped at the top of an unrelated default tab and must re-navigate to find where they were. The deep-link/detail flow is one-directional with no orientation cues (no breadcrumb showing LaventeCare › Kennis › <document>).
- fix: Add a lightweight breadcrumb in the viewer header (LaventeCare › Kennis › title) and make the back target return to the originating view (e.g. /laventecare?view=knowledge) once sub-views are URL-addressable. _(effort: low)_
- verify: confirmed/high — Verified against the cited file and the surrounding navigation plumbing. Both structural premises hold:

1. Single back affordance, hardcoded to root. All three viewer states use a back link to /laven

### [LOW] In-page tabs use aria-current='page' on <button> elements instead of a proper tablist pattern
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/habits/page.tsx:154-186 (nav of <button>s with aria-current) and app/rooster/page.tsx:27-33 (TabBar, aria-current on tabs)
- problem: Sub-view switchers are coded as a <nav> of <button>s that set aria-pressed plus aria-current='page'. aria-current='page' semantically denotes the current page within a set of navigable pages; these are in-page view toggles, not navigations. The correct ARIA is role='tablist' / role='tab' + aria-selected, or, if they were real routes, actual Links. Settings has no in-page section nav at all — it is one long scroll of CollapsibleSections.
- impact: Screen-reader users hear these in-page toggles announced as 'current page', which is misleading since the URL/page never changes. Minor but affects assistive-tech orientation on the two most tab-heavy screens.
- fix: Convert these button groups to the WAI-ARIA tabs pattern (tablist/tab/tabpanel + aria-selected + arrow-key roving tabindex), or — preferred — back them with a ?view= param and use aria-current legitimately. _(effort: low)_
- verify: confirmed/high — All cited code matches exactly. app/habits/page.tsx:154-186 is a <nav aria-label="Habit onderdelen"> of <button>s that set activeTab via onClick and apply both aria-pressed={activeTab===id} AND aria-c

## microcopy (10)

### [MEDIUM] "categorieen" missing diaeresis across finance (should be "categorieën")
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/finance/FinanceMetricsGrid.tsx:76,78; app/finance/page.tsx:171; components/finance/FinanceInsights.tsx:45; components/finance/FinanceCharts.tsx:144
- problem: The Dutch plural "categorieën" is spelled "categorieen" (no trema) in every user-facing finance string: the metric card label "Categorieen" and its empty meta "Nog geen categorieen" (FinanceMetricsGrid 76/78), the cockpit subtitle "... maanden - N categorieen" (finance/page.tsx:171), the insights subtitle (FinanceInsights:45) and a chart subtitle (FinanceCharts:144). The misspelling comes from reusing the API field name `aantalCategorieen` as display copy.
- impact: Native Dutch users immediately read this as a spelling error on a primary, repeated dashboard label and subtitle — it looks unpolished and undermines trust in the finance numbers next to it.
- fix: Render the literal label/copy as "categorieën" / "Categorieën" / "Nog geen categorieën" while keeping the `aantalCategorieen` data key unchanged. Fix all five occurrences for consistency. _(effort: low)_
- verify: confirmed/high — All five cited occurrences verified verbatim: FinanceMetricsGrid.tsx:76 (label="Categorieen") and :78 ("Nog geen categorieen"); app/finance/page.tsx:171 (cockpit subtitle ".. maanden - ${stats.aantalC

### [MEDIUM] Raw snake_case / English enum values leak into LaventeCare status text
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/laventecare/LaventeCareUtils.ts:77-80 (label()); used in LaventeCareOperationsView.tsx:437, LaventeCareBillingView.tsx:797,895, LaventeCareFunnelView.tsx:203, LaventeCareBusinessCommandCenter.tsx:103,124
- problem: The shared `label()` helper only does `value.replace(/_/g, " ")`, so DB enum values render verbatim. In the incident list meta (OperationsView:437 `${incident.prioriteit} - ${label(incident.status)} - ${label(incident.kanaal)}`) a status of `wacht_op_klant` shows as lowercase "wacht op klant" and `kanaal` of `manual` shows as English "manual" — yet the create-incident form (OperationsView:312-326) presents the exact same values as properly-cased Dutch ("Wacht op klant", "Handmatig"). Funnel/billing/command-center reuse the same helper for project/workstream/quote/invoice statuses.
- impact: Users see the same status/channel worded two different ways (capitalised Dutch in the form, lowercase/English in the lists), and untranslated technical values like "manual" surface in the business UI — looks like leaked database internals.
- fix: Replace `label()` for known enums with an explicit Dutch translation map (mirroring the dropdown option labels) covering incident status/kanaal/prioriteit and project/workstream/quote/invoice statuses, falling back to capitalised text for unknown values. _(effort: medium)_
- verify: confirmed/high — Verified all cited code. label() at LaventeCareUtils.ts:77-80 is exactly `value.replace(/_/g, " ")` — no casing, no translation, only "Onbekend" fallback for empty. Every cited call site renders raw e

### [LOW] "Financien" misspelled on dashboard route tile (should be "Financiën")
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/page.tsx:309
- problem: The dashboard "Snel naar je belangrijkste modules" tile for finance is labelled `label="Financien"` — missing the trema (correct: "Financiën"). The navigation source of truth (navigation.ts) labels the same route "Finance" (English brand), so the app also shows two different names for one route depending on surface.
- impact: A misspelled Dutch word sits on the home screen's primary navigation grid, the first thing a user sees. The label also disagrees with the sidebar/bottom-nav ("Finance"), so the section's name is inconsistent app-wide.
- fix: Either align with the nav label ("Finance") for consistency, or use correctly-spelled "Financiën" — but pick one spelling/term for the route across page.tsx and navigation.ts. _(effort: low)_
- verify: confirmed/high — Verified against the actual code. C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/page.tsx:309 read exactly as cited: `<RouteTile href="/finance" icon="finance" label="Financien" ... />`. "Fina

### [LOW] Inconsistent loading microcopy ("Laden..." vs "Laden" vs lowercase "laden")
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/finance/page.tsx:422 ("Laden..."); app/focus/page.tsx:313,409 ("Laden"); app/page.tsx:197 ("Laden"); app/lampen/page.tsx:236 ("laden")
- problem: The same "loading" concept is written four different ways: "Laden..." with ellipsis (finance), "Laden" capitalised no ellipsis (focus, dashboard tiles), and lowercase "laden" (lampen Live-status sub). Other surfaces use full sentences ("Agenda wordt geladen", "Dashboardgegevens worden bijgewerkt", "Transacties en cashflow laden").
- impact: Loading states feel ad-hoc and unpolished as the user moves between routes; the lowercase "laden" in particular reads like a missed capital next to its neighbours.
- fix: Standardise on one loading token (e.g. "Laden…" with a real ellipsis character) and apply it consistently for short inline placeholders; reserve full sentences for banners only. _(effort: low)_
- verify: confirmed/high — All four cited locations and exact strings verified against the code:
- C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/finance/page.tsx:422 -> "Laden..." (three ASCII dots), used as the Transa

### [LOW] Broken design token --text-muted in loonstrook table (no fallback)
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/salary/LoonstrookUploader.tsx:131,160,161,162,163,164,174
- problem: Seven inline styles set `color: "var(--text-muted)"`, but the actual token defined in globals.css is `--color-text-muted` — `--text-muted` is never declared. With no fallback the color resolves to inherit, so the preview-table headers (Periode/Netto/Salaris/ORT/FWP), the FWP cell, and the upload sub-text render in the inherited bright text colour instead of muted grey. SalaryCards.tsx:296-299 does the same but correctly uses `var(--text-muted, #64748b)` as a safety fallback, so the two salary tables don't match.
- impact: In the loonstrook import preview the column headers and helper text appear at full-strength text colour instead of the intended muted grey, flattening the visual hierarchy and diverging from the otherwise-identical salary history table.
- fix: Replace `var(--text-muted)` with the real token `var(--color-text-muted)` (or at minimum add the `#64748b` fallback) in all seven LoonstrookUploader occurrences. _(effort: low)_
- verify: partially-correct/high — The core technical claim is REAL and verified. In C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/globals.css:23 the token is declared as `--color-text-muted: #64748b` (with the `--color-` pref

### [LOW] Mixed Dutch/English microcopy in a single row ("Wachtrij … N pending")
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/RoosterOverview.tsx:267
- problem: The rooster status row uses Dutch label "Wachtrij" but its value mixes English: `${pendingEvents.length} pending` and the empty case "Geen pending acties". English "pending" sits inside otherwise-Dutch copy.
- impact: Code-switching inside one status row reads as untranslated/placeholder text to Dutch users on the rooster overview.
- fix: Use Dutch throughout, e.g. value "N in wachtrij" / "N openstaand" and empty "Geen openstaande acties". _(effort: low)_
- verify: confirmed/high — Verified at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/schedule/RoosterOverview.tsx lines 264-269. The StatusRow has Dutch label "Wachtrij" (line 266) but its value mixes English in

### [LOW] English "Send ready" badge among Dutch sibling states
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/laventecare/LaventeCareMailboxView.tsx:541
- problem: The internal verzendcheck badge renders "Send ready" for the ok state while its two siblings are Dutch: "Controleer" (warn) and "Niet klaar" (not ready). The section header right above it is Dutch ("Interne verzendcheck").
- impact: One of three mutually-exclusive status pills is in English, making the readiness indicator look inconsistent and half-translated.
- fix: Replace "Send ready" with a Dutch equivalent such as "Klaar om te versturen" or simply "Klaar" to match the Dutch warn/error labels. _(effort: low)_
- verify: confirmed/high — Verified at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/laventecare/LaventeCareMailboxView.tsx line 540-542. The badge ternary reads: status === "ok" ? "Send ready" : status === "war

### [LOW] "Capture" (English) used as Dutch label/sub for Notities
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/page.tsx:310; components/layout/navigation.ts:84
- problem: The Notities route tile sub is "Capture en lijsten" (page.tsx:310) and the nav description is "Capture, lijsten en geheugen" (navigation.ts:84). "Capture" is English jargon embedded in Dutch descriptions for the notes module.
- impact: Mixed-language descriptive copy in the dashboard navigation grid and the mobile More-menu descriptions; "Capture" is not idiomatic Dutch and reads as untranslated.
- fix: Swap "Capture" for Dutch wording such as "Snel vastleggen" (e.g. sub "Vastleggen en lijsten", description "Vastleggen, lijsten en geheugen"). _(effort: low)_
- verify: confirmed/high — Both cited strings exist verbatim and are user-facing. C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/app/page.tsx:310 renders a desktop RouteTile with sub="Capture en lijsten". C:/Users/jeffrey/D

### [LOW] Inconsistent missing-currency fallbacks in LaventeCare ("€0" vs "Nog geen waarde")
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/laventecare/LaventeCareUtils.ts:54-69
- problem: For an absent value `formatMoney()` returns the text "Nog geen waarde" while `formatCents()` returns "€0". The two helpers are used side by side across the same screens (formatMoney for project/workstream value indications, formatCents for invoice/quote amounts), so a missing amount sometimes reads as an explanatory placeholder and sometimes as a real €0,00 figure. They also use different precision (formatMoney `maximumFractionDigits: 0`, formatCents 2 decimals).
- impact: A missing monetary value rendered as "€0" is misleading — it looks like a genuine zero balance/total rather than 'unknown', and the precision/placeholder style is inconsistent between the two euro formatters in one feature area.
- fix: Decide per use whether absence should read as a placeholder or a true zero; if these are genuinely-zero amounts keep "€0,00", otherwise return a placeholder consistent with formatMoney (e.g. "Nog geen bedrag"). Align the fallback style across both helpers. _(effort: low)_
- verify: confirmed/high — The finding is real and grounded in the actual code at C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/laventecare/LaventeCareUtils.ts. Verified directly:

- Line 55: formatMoney() retur

### [LOW] "geimporteerde" / "geüpdatet"-style words missing diacritics in finance meta
- area: - · loc: C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/finance/FinanceMetricsGrid.tsx:50
- problem: The Saldo metric fallback meta reads "Laatste geimporteerde bankbalans" — "geimporteerde" should be "geïmporteerde" (trema on the i). Same class of issue as the categorieen/Financien spellings.
- impact: Another visible Dutch spelling slip on a finance metric card, reinforcing the pattern of dropped diacritics in this area.
- fix: Correct to "geïmporteerde". Worth a broader sweep for dropped trema/accents on -ie/-een/im- words in finance copy. _(effort: low)_
- verify: confirmed/high — Confirmed and fixed. C:/Users/jeffrey/Desktop/Projecten/JeffriesHomeapp/components/finance/FinanceMetricsGrid.tsx:50 contained the literal user-facing string "Laatste geimporteerde bankbalans", render


## Refuted
- (interaction-states) QuickNote dashboard capture swallows save failures :: The finding's core impact claim — "zero error indication," no message, looks like Enter did nothing, easy to lose the note — is refuted by the data layer. Quick
