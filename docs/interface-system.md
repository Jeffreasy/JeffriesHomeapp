# Homeapp interface system

> **Status: actueel op 2026-07-17.** Dit is het uitvoerbare contract voor nieuwe
> schermen en voor wijzigingen aan bestaande schermen.

## Doel

De Homeapp is een bedienings- en besliscockpit. De interface moet daarom:

- de primaire handeling vóór analyses en secundaire informatie tonen;
- op een telefoon met één hand bedienbaar blijven;
- op tablet geen desktoplayout in een te smalle contentkolom persen;
- op desktop extra context benutten zonder mobiele content eindeloos uit te rekken;
- alleen JavaScript laden voor live data of echte interactie;
- één component en één datacontract per terugkerend probleem gebruiken.

Nieuwe code gebruikt Engelstalige identifiers en bestandsnamen. Zichtbare tekst
blijft Nederlands. Businesslogica hoort in domeinhooks en pure helpers, niet in
layoutprimitives.

## Canonieke lagen

| Laag | Canonieke locatie | Verantwoordelijkheid |
|---|---|---|
| Appchrome | components/layout/ClientShell.tsx | Navigatie, responsive offset, safe-area en het enige standaard-main-landmark |
| Paginastructuur | components/layout/AppPageShell.tsx | Breedte, paginagutter, header en toolbar |
| Interactie | components/ui | Modals, sheets, bevestigingen, collapsibles en feedback |
| Domeinpresentatie | components/(domain) | Featurecompositie zonder een tweede globale shell |
| Domeinlogica | hooks en lib | Querykeys, commands, projecties, validatie en pure beslislogica |
| API-transport | lib/api.ts en gegenereerde client | JSON-contract via /api/backend; nooit rechtstreeks naar de Go-API |

components/ui is de bestaande core-componentlaag. Er komt geen parallelle
components/core-boom met duplicaten.

## Responsive app-shell

De shell gebruikt contentruimte, niet alleen de viewport, als besliscontext.

| Beschikbare breedte | Navigatie | Gedrag |
|---:|---|---|
| < 768px | Vijfdelige bottomnav | Vier primaire routes plus een intern scrollende Meer-sheet |
| 768–1199px | Rail van 80px | Alleen herkenbare iconen; pagina houdt genoeg werkbreedte |
| >= 1200px | Sidebar van 288px | Volledige labels, secties, focusactie en account |

De shell reserveert de mobiele navigatiehoogte precies één keer, inclusief
safe-area-inset-bottom. Routepagina's voegen daarom geen pb-24 of pb-28 toe.
ClientShell bezit op standaardroutes de enige main met id main; routepagina's
gebruiken een gewone contentcontainer.

Zware workspaces worden pas na pointer- of keyboardintentie geprefetcht.
Primaire lichte routes mogen de automatische Next.js-prefetch behouden.

## Paginaopbouw

Elke standaardroute composeert:

1. AppPageShell met een bewuste breedte:
   - narrow: formulieren en compacte registers;
   - standard: dashboards en dagelijkse workspaces;
   - wide: datadichte bedrijfsworkspaces.
2. AppPageHeader met één titel, optionele korte context en maximaal één
   zichtbare primaire actie op mobiel.
3. PageToolbar voor zoeken, tabs en filters die bij de huidige taak horen.
4. primaire content;
5. secundaire analyses, geschiedenis of instellingen in een rail,
   collapsible of sheet.

Sticky headers blijven compact. Lange uitleg, statusdetails en filtersets horen
in de content. Touchcontrols zijn minimaal 44 bij 44 CSS-pixels.

Horizontaal scrollende tabs mogen alleen wanneer de set niet zinvol in een menu
past. Ze gebruiken roving tabindex, pijltjestoetsen, Home/End en gekoppelde
tabpanels.

## Overlays

Alle gewone dialogs, responsive sheets en drawers lopen via
components/ui/OverlaySurface.tsx en de composities Modal, BottomSheet en
ConfirmDialog.

De overlaylaag verzorgt centraal:

- portalrendering in #app-overlay-root;
- unieke ids en correcte naam/beschrijving;
- eerste focus, focus containment en focusherstel;
- Escape en backdropgedrag;
- gestapelde overlays;
- scroll-lock zonder layoutverschuiving;
- inert en aria-hidden voor de achtergrond;
- 100dvh, safe-area en interne scroll voor lange content.

Een domeincomponent bouwt geen eigen backdrop, body-lock of focus trap. Alleen
een editor met aantoonbaar afwijkend virtual-keyboardgedrag mag een gedocumenteerde
specialisatie behouden.

## Visuele tokens en lampkleur

Statische layout- en themakleuren komen uit app/globals.css en Tailwindtokens.
Nieuwe componenten hardcoden geen willekeurige hexkleuren of layout-inline-style.

De gekozen fysieke lampkleur is runtime data en vormt één expliciete uitzondering.
lib/lampPresentation.ts valideert en projecteert die kleur naar begrensde CSS
custom properties:

- --lamp-accent;
- --lamp-text (minimaal 4.5:1 voor kleine tekst);
- --lamp-ambient-soft;
- --lamp-ambient-medium;
- --lamp-ambient-border;
- --lamp-ambient-ring;
- --lamp-ambient-shadow;
- --lamp-brightness.

Componenten lezen uitsluitend deze properties. Ze bouwen geen losse rgba-strings
of alternatieve kleurstatus. Donkere RGB-kleuren worden contrastveilig opgelicht.
Decoratie gebruikt --lamp-accent; kleine tekst gebruikt uitsluitend --lamp-text
met minimaal WCAG AA-contrast. Offline en uit blijven neutraal.

## Data- en JavaScriptgrenzen

Nieuwe routes zijn servercomponenten tenzij browserstate of live interactie
nodig is. Een clientcomponent is een zo klein mogelijk island. Zware editors,
grafieken en detailcontrols laden dynamisch wanneer ze pas na een actie zichtbaar
worden.

TanStack Query gebruikt per domein canonieke querykeys. Een picker importeert
geen volledige cockpit-hook met alle mutaties. Gesloten modals starten geen
queries. Optimistische lampcommands blijven via useLampCommand en de gedeelde
["devices"]-cache lopen.

Privacy faalt gesloten: zolang identiteit of de servervoorkeur onbekend is,
blijven gevoelige waarden gemaskeerd.

## Review- en verificatiecontract

Een interfacewijziging is pas gereed na:

- TypeScript, ESLint, unit-tests en productiebuild;
- git diff --check;
- desktop-Chromium en mobiele Chromium-E2E;
- visuele controle op ongeveer 390px, tablet/rail en brede desktop;
- geen horizontale pagina-overflow;
- exact één standaard-main en één zichtbare paginatitel;
- keyboardtest van tabs, sheets, drawers en bevestigingen;
- console- en requestcontrole op onverwachte fouten of dubbele fetches;
- controle dat primaire bediening vóór secundaire analyse staat.
