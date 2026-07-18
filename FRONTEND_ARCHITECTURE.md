# JeffriesHomeapp — enterprise frontend architecture

> **Status: 2026-07-18.** Dit document is het actuele architectuurcontract. Oudere auditbestanden zijn historisch bewijsmateriaal, geen bron van waarheid.

Het uitvoerbare layout- en interactiecontract staat in [docs/interface-system.md](docs/interface-system.md). De verificatiegate staat in [docs/testing.md](docs/testing.md).

## 1. Architectuurprincipes

De Homeapp is een private, single-owner applicatie. Zes invarianten sturen iedere wijziging:

1. **Owner-first en fail-closed.** Een geldige Clerk-sessie is niet genoeg; iedere private route en serverresource vereist de geconfigureerde owner.
2. **Eén bron per domein.** Dashboard en featurepagina's delen dezelfde querykeys, selectors en mutations. Er komen geen pagina-eigen schaduwstores bij.
3. **Geen duurzame private payloads.** TanStack Query leeft alleen in memory. Onopgeslagen notitieconcepten blijven tijdelijk in de actuele tabsessie; `localStorage` bevat uitsluitend niet-gevoelige UI-voorkeuren. De serviceworker cachet geen API-, HTML- of RSC-responses.
4. **Begrensde operaties.** Browser- en serverrequests hebben deadlines, expliciete fouttypen en gecontroleerde retries.
5. **Privacyveilige diagnostiek.** Logs en client-events zijn allowlist-only en bevatten geen URL-query's, bodies, user-id's, foutmeldingen of stacks.
6. **Progressive loading.** Zware grafieken en PDF-parsers laden pas wanneer de gebruiker de bijbehorende workspace of actie opent.

## 2. Runtime en requestketen

De runtime bestaat uit Next.js 16, React 19, Clerk, TanStack Query, Serwist en de Go-API van JeffriesBackend.

~~~text
Browser
  -> Next.js App Router
  -> owner access-policy
  -> /api/backend/[...path]
  -> server-only backendconfiguratie en identity-rewriting
  -> JeffriesBackend /api/v1
  -> PostgreSQL en afgeschermde providers
~~~

Browsercode kent geen backend-API-key en roept de Go-API niet rechtstreeks aan. Gegenereerde Orval-clients en de handgeschreven client in `lib/api.ts` gebruiken beide dezelfde BFF-mutator.

## 3. Verantwoordelijkheden per map

| Locatie | Verantwoordelijkheid |
|---|---|
| `app/` | Routecompositie, serverresources en dunne pagina-entrypoints. |
| `components/layout/` | Canonieke app-shell, desktopsidebar, mobiele navigatie en paginaframe. |
| `components/ui/` | Gedeelde toegankelijke primitives, overlays en feedbackstates. |
| `components/<domain>/` | Domeinpresentatie en interactie; geen duplicaat transport of auth. |
| `hooks/` | Querycompositie, optimistic state en herbruikbare clientinteractie. |
| `lib/server/` | Server-only access-policy, configuratie, proxy- en privacygrenzen. |
| `lib/` | Pure domeinhelpers, transport, retries, presentatieprojecties en types. |
| `tests/` | Uitvoerbare architectuur-, security-, unit- en browsercontracten. |

Nieuwe routepagina's gebruiken `AppPageShell`. Bewust chromeless routes zijn beperkt tot sign-in, access-denied, focus en de documentviewer. De architectuurtest ontdekt pagina's automatisch en weigert een parallelle shell of nieuwe route-level client boundary zonder expliciete beslissing.

## 4. Identiteit en autorisatie

`lib/server/access-policy.ts` is de pure beslismatrix. `proxy.ts` koppelt die policy aan Clerk en Next.js.

| Situatie | Pagina | API |
|---|---|---|
| Publieke route (`/sign-in`, `/access-denied`) | Toestaan | n.v.t. |
| Geen sessie | Redirect naar sign-in | JSON `401` |
| Geldige sessie, geen owner | Redirect naar access-denied | JSON `403` |
| Owner | Toestaan | Toestaan |

`/sign-up` maakt geen tweede accountflow en verwijst naar sign-in. De Clerk sign-incomponent verbergt enrollment en schakelt overdracht van een mislukte sign-in naar sign-up uit; de provider verwijst ieder resterend sign-updoel terug naar `/sign-in`. Een return-URL bevat uitsluitend een veilige same-origin pathname; query- en fragmentdata worden nooit naar de identityprovider doorgestuurd. Het uitschakelen van self-service registratie in de Clerk-tenant blijft daarnaast de externe beheergrens die voorkomt dat buiten deze app om accounts worden aangemaakt.

Proxycontrole is UX én eerste verdedigingslaag, niet de enige trust boundary. De backend-BFF, telemetryroute, PDF-byte-route en server-side dossierlookup controleren zelf opnieuw de owner.

## 5. Backend-BFF contract

`app/api/backend/[...path]/route.ts`:

- injecteert de server-only API-key en een request-id;
- encodeert ieder padsegment en weigert upstreamredirects;
- herschrijft query- en JSON-identity naar de geverifieerde Clerk-owner;
- begrenst volledige requestbodies op 1 MiB/10 seconden en responsebodies op 16 MiB binnen de upstreamdeadline;
- accepteert voor mutaties alleen JSON-bodies;
- stuurt uitsluitend noodzakelijke requestheaders en allowlisted responseheaders door;
- gebruikt `private, no-store`, `Vary: Cookie` en `Server-Timing`;
- begrenst upstreamcalls standaard op 25 seconden;
- onderscheidt configuratiefouten (`503`), time-outs (`504`) en bereikbaarheid (`502`);
- logt alleen routecategorie, operatie, methode, status, duur, request-id en fouttype.

De clienttransportlaag heeft daarnaast een deadline van 30 seconden. Alleen tijdelijke netwerk- en serverfouten worden opnieuw geprobeerd; auth-, validatie- en overige clientfouten niet.

## 6. Sessies, querycache en PWA

`app/providers.tsx` maakt een nieuwe `QueryClient` per Clerk-identiteit. Een sign-in, sign-out of accountwissel remount de dataprovider en kan daardoor nooit cachedata uit de vorige identiteit hergebruiken.

Er is bewust geen IndexedDB- of `localStorage`-persistence voor querypayloads. Onopgeslagen notitieconcepten staan alleen in `sessionStorage`, zijn per gebruiker en notitie genamespaced en worden na opslaan of bewust weggooien verwijderd. `localStorage` bewaart uitsluitend niet-gevoelige booleans voor privacyweergave en focusmodus. Dit voorkomt dubbele cachecoördinatie, hydrationflitsen en cross-session datarestanten. Bij identiteitswissel en sessieverloop worden runtime serviceworkercaches ook gewist.

Een backend-`401` veroorzaakt geen stille redirect. De app toont een blokkerende hersteloverlay, behoudt open formulierstate en laat de gebruiker expliciet opnieuw inloggen. Een vroeg optredende `401` wordt gereplayd zodra de providerluisteraar beschikbaar is.

De PWA:

- cachet API-, navigatie-, HTML- en RSC-requests nooit;
- degradeert zonder runtimefout wanneer browserbeleid geen serviceworkerregistratie teruggeeft;
- toont netwerkverlies als persistente status;
- meldt een gereedstaande serviceworkerupdate zonder onverwachte autoreload;
- laat de gebruiker zelf het veilige reloadmoment kiezen.

## 7. Domeinstate: verlichting als referentiepatroon

Dashboard en `/lampen` gebruiken dezelfde `devices`-query, lampselectoren en `useLampCommand`-mutatie. Het dashboard bouwt geen tweede bedieningsmodel.

- `lib/lighting.ts` bepaalt canoniek online, aan/uit, helderheid en totalen.
- `lib/lampCommandJournal.ts` projecteert overlappende optimistic commands per device.
- `lib/lampCommandTransport.ts` serialiseert per lamp, houdt verschillende lampen parallel en coalescet snelle slider- en kleurupdates.
- Power-, modus- en scènecommando's zijn barrières; bediening heeft één totale deadline vanaf de interactie.
- Na de laatste mutation volgt één gedeelde reconciliatie-read.

De door de lamp gekozen kleur is functionele UI-context. `lib/lampPresentation.ts` zet de veilige kleurprojectie om in CSS-variabelen zoals `--lamp-accent`, `--lamp-ambient-soft`, `--lamp-ambient-border` en `--lamp-ambient-shadow`. Lampkaart, detailpaneel en controls gebruiken die variabelen voor subtiele ambient feedback. Contrastcorrectie en de aan/uit-status blijven leidend; kleur mag nooit de enige statusdrager zijn.

## 8. Layout- en componentcontract

`ClientShell` bezit de globale viewport, navigatie en mobile safe-area. `AppPageShell` bezit de paginabreedte, landmarks en consistente contentspacing. Pagina's voegen geen eigen tweede `main`, bottom-nav-padding of shellvariant toe.

Gedeelde primitives staan in `components/ui/`:

- `Button` voor varianten, loading, focus en minimale touchmaat;
- `ButtonLink` en `IconButton` voor link- en icoonacties zonder stijlduplicatie;
- `Surface` voor panelen en semantische surfaces;
- `SurfaceHeader` voor de gedeelde kopstructuur, metadata en surface-acties;
- `FormField`, `Input`, `Select`, `Textarea`, `Checkbox`, `Switch` en `Range` voor velden en validatie;
- `Tabs` voor het volledige keyboard- en tabpanelcontract;
- `Badge`, `Progress` en `Skeleton` voor compacte status en voortgang;
- `FeedbackState` voor loading, empty en error;
- `OverlaySurface`, `Modal`, `BottomSheet` en `ConfirmDialog` voor modale overlays;
- `Popover` voor verankerde desktopmenu's en pickers met dezelfde inhoud als mobiele sheet;
- `InputAnchoredListbox` voor portalled comboboxsuggesties met centrale viewport-collision;
- `ResponsiveActions` en `MobileActionDock` voor taakgerichte mobiele acties;
- `Toast` uitsluitend voor tijdelijke, niet-kritieke bevestiging of herstelactie.

Reusable components combineren classes met `cn()`. Semantische tonen staan in
`lib/ui/tones.ts`; domeinspecifieke betekenis blijft bij het domein. Legacy
`.glass`-, `.btn`-, finance-BEM-, domein-`Panel`- en losse TabBar-contracten
zijn verwijderd en worden door een architecture test geblokkeerd. Interactieve
touchdoelen blijven minimaal 44px hoog. Willekeurige nieuwe z-indexes, portals,
scroll-locks of modals buiten de centrale overlaylaag zijn niet toegestaan.
`text-micro`, `lib/ui/motion.ts` en de globale `MotionConfig` begrenzen
respectievelijk compacte typografie en animatie; losse 8–11px-klassen,
`transition-all` en fysieke featurekleuren worden door guardrails geweigerd.
Mobiel is taakgericht: kernacties en individuele lampbediening komen vóór samenvattingen. Desktop toont meer parallelle context. Beide viewports gebruiken dezelfde data- en actiecontracten.

## 9. Performancecontract

Zware code blijft buiten het initiële pad:

- roosterstatistieken, salaris en maandgrafieken zijn dynamische workspaces;
- loonstrook- en mailbijlage-PDF-parsers laden pas na een bestandsactie;
- routeprefetch gebeurt alleen waar navigatie-intentie dit rechtvaardigt.
- de persistente shell gebruikt een compacte `NavigationIcon`-registry; de volledige
  symboolpicker-registry is uitsluitend route- en editorcode.

`performance-budget.json` definieert een fail-closed gzipbudget voor gedeelde JS, CSS, iedere geproduceerde route en individuele chunks. `scripts/check-performance-budget.mjs` leest de echte Next.js buildmanifesten, weigert ontbrekende of ontsnappende assets en faalt CI bij overschrijding.

## 10. Observability en foutafhandeling

Serverevents zijn gestructureerde JSON en correleren op `X-Request-ID`. De BFF registreert start, resultaat, status en duur. Client error boundaries rapporteren een klein event met boundary en foutnaam; de server hasht een geldige digest tot een niet-omkeerbare correlatiesleutel en gebruikt uitsluitend zijn eigen build-id. Clientdeduplicatie en de proceslokale limiet remmen logstorms; distributed rate-limiting blijft een platform-firewallverantwoordelijkheid en nooit een applicatie-authgrens.

Verboden in telemetry:

- volledige URL's, querystrings en documentkeys;
- request- of responsebodies;
- namen, e-mailadressen, user-id's of CRM-context;
- raw `error.message`, stacktraces of browserconsole-inhoud.

Gebruikers krijgen veilige Nederlandse feedback en een herstelactie. Technische
details blijven in gecontroleerde, allowlisted diagnostiek. `app/global-error.tsx`
is bewust self-contained omdat deze noodgrens de rootlayout vervangt en dus niet
op diens CSS, providers of design-systemcomponenten mag vertrouwen.

## 11. LaventeCare PDF-privacy

Een PDF-link bevat uitsluitend een documentkey plus een dossierreferentie van het type `kind:id`. Klantnamen, samenvattingen, bedragen, notities en vervolgstappen worden niet meer in de URL of browserhistory opgenomen.

De server resolveert de opaque referentie tegen owner-scoped backenddata en construeert daar de rendercontext. Onbekende, niet-owner of ongeldige referenties falen gesloten. PDF-route en viewer doen beide een eigen ownercheck.

## 12. Serverconfiguratie

| Variabele | Zichtbaarheid | Contract |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | browser | Publieke Clerk-identifier. |
| `CLERK_SECRET_KEY` | server | Clerk-serverauthenticatie. |
| `HOMEAPP_OWNER_USER_ID` | server | Enige toegestane gebruiker; verplicht in production. |
| `BACKEND_API_URL` | server | Absolute HTTP(S)-URL; production vereist HTTPS behalve loopback. |
| `BACKEND_API_KEY` / `APP_SECRET_KEY` | server | Backendcredential; nooit public. |
| `BACKEND_PROXY_TIMEOUT_MS` | server | Optionele proxydeadline, begrensd op 1–60 seconden. |
| `NEXT_PUBLIC_BUILD_ID` | browser/build | Niet-gevoelige releasecorrelatie voor telemetry. |
| `LAVENTECARE_PDF_SOURCE_HOSTS` | server | Optionele exacte komma-lijst zonder scheme, pad, wildcard of poort; alleen HTTPS-links, nooit iframebronnen. |

Configuratie met URL-credentials, query, fragment, onveilig production-HTTP of ontbrekende productionwaarden faalt gesloten.

## 13. Uitvoerbare kwaliteitspoorten

De minimale gate is:

1. productie-dependencyaudit;
2. TypeScript zonder emit;
3. ESLint;
4. unit- en architectuurcontracten;
5. productiebuild;
6. performancebudget;
7. unauthenticated security-E2E;
8. geauthenticeerde read-only desktop-, tablet- en mobiele E2E met runtime- en accessibilitybewijs;
9. handmatige browsercontrole van gewijzigde kernflows.

Authenticated E2E gebruikt een testtenant, een ignored storage-statebestand en geblokkeerde backendmutaties. Traces, logs en rapporten mogen nooit sessiemateriaal of providercredentials bevatten.

## 14. Onderhoudsregels

- Wijzig een domeincontract op de bron, niet met een pagina-eigen uitzondering.
- Voeg een architectuur- of regressietest toe wanneer een nieuwe grens wordt geïntroduceerd.
- Houd pagina-entrypoints dun en laad optionele workspaces op intentie.
- Gebruik de BFF voor browserdata; voeg geen tweede transportpad toe.
- Voeg geen persistlaag, modalmanager, queryclient, tokenpalet of shellvariant toe zonder expliciet architectuurbesluit.
- Werk dit document en `docs/testing.md` bij wanneer een invariant werkelijk verandert.
