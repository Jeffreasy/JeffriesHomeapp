# Homeapp interface system

> **Status: actueel op 2026-07-18.** Dit is het uitvoerbare contract voor nieuwe
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

De persistente navigatie gebruikt de kleine `components/layout/NavigationIcon`
registry. `AppIcon` en de volledige editor/symboolregistry mogen daardoor niet via
`ClientShell` in iedere routebundle terechtkomen.

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
in de content. Touchcontrols zijn minimaal 44 bij 44 CSS-pixels. Alleen cellen in
een dicht datagrid mogen op een aantoonbaar fijne pointer tot 24 bij 24 pixels
comprimeren; coarse pointers behouden altijd 44 pixels.

Horizontaal scrollende tabs mogen alleen wanneer de set niet zinvol in een menu
past. Ze gebruiken roving tabindex, pijltjestoetsen, Home/End en gekoppelde
tabpanels.

## Overlays

Alle gewone dialogs, responsive sheets en drawers lopen via
components/ui/OverlaySurface.tsx en de composities Modal, BottomSheet en
ConfirmDialog. Verankerde niet-modale menu's en compacte pickers lopen via
`Popover`: desktop krijgt één portalled, viewport-begrensde surface; op telefoon
wordt dezelfde inhoud een canonieke `BottomSheet`. Doorzoekbare single-selects
composeren `SearchablePicker` bovenop diezelfde `Popover`. `Popover` bezit
outside-click, Escape, positionering en focusherstel. `SearchablePicker` bezit de
zoekinput met combobox-ARIA, stabiele option-id's, actieve optie en ArrowUp,
ArrowDown, Home, End en Enter; groepering, filtering en optionrendering blijven
bij het domein. Suggesties die tijdens vrije tekstinvoer ontstaan gebruiken
`InputAnchoredListbox`: dezelfde portal- en stackinglaag, automatische viewport-
collision en niet-tabbare opties zodat focus op de combobox blijft.

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

`NoteEditor` blijft binnen dit contract: hij composeert `OverlaySurface` en bouwt
geen eigen portal, backdrop, focus-trap, scroll-lock of stackinglaag. De enige
specialisatie is dat de bestaande `OverlaySurface`-laag op smalle iOS-viewports
imperatief de positie en maat van `visualViewport` volgt. Daarmee blijven de
tekstcursor en footer boven het soft keyboard zonder de complete editor bij elke
viewport-scroll opnieuw te renderen.

Escape blijft editor-lokaal omdat inline link- en templatepickers eerst sluiten.
De handler draait alleen wanneer `OverlaySurface` de editor als topmost markeert;
backdrop-close, focusherstel, inert en `aria-hidden` blijven centraal.

## Visuele tokens en lampkleur

Statische layout- en themakleuren komen uit app/globals.css en Tailwindtokens.
Nieuwe componenten hardcoden geen willekeurige hexkleuren of layout-inline-style.

De gekozen fysieke lampkleur is runtime data en vormt één expliciete uitzondering.
lib/lampPresentation.ts valideert en projecteert die kleur naar begrensde CSS
custom properties. `--lamp-accent` verzorgt decoratie, `--lamp-text` is de
contrastveilige tekstkleur en de `--lamp-ambient-*` properties sturen uitsluitend
de subtiele gloed, rand en schaduw. Helderheid loopt via `--lamp-brightness`.

## Design-system API

De publieke componentlaag is `components/ui`. Componenten worden rechtstreeks
uit hun bestand geïmporteerd; een barrelbestand en een tweede `components/core`
laag zijn niet toegestaan. Zo blijven clientgrenzen en bundels zichtbaar.

| Probleem | Canonieke primitive | Contract |
|---|---|---|
| Actie | Button, ButtonLink, IconButton | Minimaal 44px, expliciet type, loading en focus centraal |
| Formulier | FormField + Input, Select, Textarea | Label, beschrijving en fout-id zijn gekoppeld |
| Invoersuggesties | InputAnchoredListbox | Portalled, viewport-begrensd en focus blijft op de combobox |
| Keuze | Checkbox, Switch, Range | Native semantiek of correct ARIA-patroon |
| Container | Surface + SurfaceHeader | Gedeelde radius, border, padding, elevation en heading |
| Kernmetric | MetricCard | Eén semantische kaartlayout voor label, waarde, context en icoon |
| Status | Badge, Progress, Skeleton, FeedbackState | Semantische tonen en toegankelijke live-status |
| Navigatie | Tabs | Roving tabindex, pijlen, Home/End en gekoppeld tabpanel |
| Overlay | Modal, BottomSheet, ConfirmDialog | Eén focus-, stacking-, scroll-lock- en herstelimplementatie |
| Verankerd menu of compacte picker | Popover | Desktopportal, mobiele sheet, outside-click, Escape en focusherstel |
| Doorzoekbare single-select | SearchablePicker + Popover | Combobox/listbox-ARIA, stabiele option-id's en volledig toetsenbordmodel |
| Feedback | Toast | Dedupe, pauze bij hover/focus, actie en reduced motion |
| Responsive acties | ResponsiveActions, MobileActionDock | Eén primaire mobiele actie; bulkacties boven bottomnav |

`Button`, `Surface` en form controls accepteren een `className`, maar
varianten lopen via CVA en `cn()`. `Button` bezit ook de semantische `info`,
`infoSolid` en `successSolid` varianten; features reconstrueren die combinaties
niet met losse kleurklassen. Een feature maakt geen alias als `Panel`, `CardBase`,
`btn` of `glass` voor hetzelfde probleem.

## Semantische visuele taal

Features gebruiken uitsluitend deze betekenissen:

- `neutral`: gewone informatie of inactieve toestand;
- `accent`: primaire merkactie of geselecteerde toestand;
- `info`: informatief, zonder oordeel;
- `success`: voltooid, gezond of positief resultaat;
- `warning`: aandacht nodig, nog niet fout;
- `danger`: fout, destructie of geblokkeerde toestand.

De betekenis bepaalt de kleur; een feature kiest niet zelfstandig amber, green
of rose. Compatibiliteitsnamen mogen alleen in een bestaande datacontract-map
voorkomen en worden bij aanraking naar de semantische toon vertaald.

`--color-text`, `--color-text-muted` en `--color-text-subtle` zijn de enige
standaard tekstniveaus. `text-slate-500` en `text-slate-600` zijn verboden
omdat ze op de donkere achtergrond onvoldoende contrast boden. Alle radii,
elevation, controlhoogtes en motionduren komen uit de centrale tokens. Dichte
metadata gebruikt uitsluitend `text-micro`; willekeurige `text-[8px]` tot en
met `text-[11px]`-varianten zijn niet toegestaan.

`MotionConfig reducedMotion="user"` omvat de volledige applicatie, inclusief
PWA-feedback. Framer Motion gebruikt `lib/ui/motion.ts`; CSS-transities benoemen
hun properties. Zonder expliciete duur erven ze centraal
`--default-transition-duration: var(--motion-fast)` en de standaard easing;
langere interacties kiezen `--motion-standard` of `--motion-slow`.
`transition`, `transition-all` en losse duration-schalen zijn verboden. De
`--layer-*`-tokens ordenen sticky content, shell, popovers, navigatie, status, skip-link en toast; alleen
`OverlaySurface` bezit de numerieke modal-stack.

## Formulieren en validatie

Een regulier veld composeert `FormField` met één centrale control. De
render-prop van `FormField` levert `id`, `aria-describedby`,
`aria-errormessage` en `aria-invalid`; de control verspreidt die props.
Validatiefouten staan direct bij het veld. Een fout-toast mag dit aanvullen,
maar vervangt de inline fout niet.

Native inputs blijven toegestaan voor aantoonbaar gespecialiseerde browser-UI,
zoals file, color en time, of in datadichte editors waar een centrale wrapper
geen semantische winst geeft. Ook dan gelden tokenstyling, een gekoppeld label,
zichtbare focus en minimaal 44px bedieningsruimte. Tekstinvoer blijft op smalle
viewports minimaal 16px om ongewenste iOS-zoom te voorkomen; de compacte schaal
wordt pas vanaf `sm` toegepast.

## Modals, acties en mobiele ergonomie

Op mobiel staat de primaire taak in de header of direct boven de content.
Secundaire headeracties gaan via `ResponsiveActions` naar een BottomSheet.
Contextuele bulkacties gebruiken `MobileActionDock`; die respecteert
safe-area en de gereserveerde bottomnavhoogte.

Een modalfooter gebruikt Button en ModalCancelButton. Destructieve acties vragen
ConfirmDialog wanneer herstel niet vanzelfsprekend is. Een modal mag geen eigen
fixed backdrop, Escape-handler, body-lock of sluitknop implementeren. Bij lange
actie- en formuliermodals blijven annuleren en de primaire actie in `Modal.footer`;
een externe submitknop verwijst via een vaste `form`-id naar het formulier in de
scrollbody. Zo blijven Enter-submit, loading en validatie intact terwijl de acties
op mobiel bereikbaar blijven.

Puur informatieve previews krijgen bewust geen lege footer of tweede sluitactie.
De volledige mailpreview en verzonden read-only mail zijn daar voorbeelden van:
de gelabelde headersluitknop volstaat. Zodra dezelfde surface een keuze zoals
versturen, beantwoorden of extern openen aanbiedt, verschijnt wel de canonieke
footer.

Lang scrollen wordt voorkomen door:

- samenvattingen boven details te plaatsen;
- secundaire analytics te collapsen of naar een detailroute/sheet te verplaatsen;
- compacte toolbars en tabs te gebruiken;
- modals intern te laten scrollen binnen 100dvh;
- op mobiel maximaal één dominante actie per context te tonen.

Programmatic smooth scrolling loopt via `lib/ui/scroll.ts`, zodat de voorkeur
voor reduced motion automatisch wordt gerespecteerd.

## Toegestane runtime-styling

Inline style is alleen toegestaan wanneer de waarde echte runtime-data is die
niet als statische Tailwindklasse bestaat. De huidige categorieën zijn:

- gevalideerde lampkleurprojecties via de centrale `--lamp-*` properties;
- gevalideerde notitie-, habit-, contactlabel- en roosterprojecties uit hun
  centrale typed datapaletten;
- grafiekgeometrie, datasetkleuren en voortgangspercentages uit centrale helpers;
- door de browser vereiste positionering van virtuele of documentgerichte UI.

Componenten lezen uitsluitend deze properties. Ze bouwen geen losse rgba-strings
of alternatieve kleurstatus. Donkere RGB-kleuren worden contrastveilig opgelicht. Dynamische volle
achtergrondkleuren kiezen hun voorgrond uitsluitend via `lib/ui/colorContrast.ts`;
de centrale donkere en lichte kandidaat blijven daardoor meetbaar en WCAG-AA
geborgd. Decoratie gebruikt --lamp-accent; kleine tekst gebruikt uitsluitend
--lamp-text met minimaal WCAG AA-contrast. Offline en uit blijven neutraal.

`app/global-error.tsx` is de enige self-contained noodgrens: die vervangt de
rootlayout en mag daarom niet afhankelijk zijn van globale CSS, providers of primitives.
De tijdelijke factuurplaceholder in een nieuw browserdocument deelt om dezelfde reden
uitsluitend de vastgelegde noodpaletwaarden totdat gegenereerde HTML hem vervangt.

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
