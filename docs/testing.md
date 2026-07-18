# Homeapp-verificatie

> **Actueel op 2026-07-18.** Deze checks horen bij de huidige Next.js 16/React 19 working tree.

## Lokale gate

Voer vanaf de repositoryroot uit:

~~~bash
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run check:performance
npm run test:e2e
~~~

Gebruik Node.js 22 om lokaal dezelfde majorversie als CI te testen. De productiebuild heeft de serverconfiguratie uit de sectie **Buildconfiguratie** nodig.

## Wat de suites bewijzen

### Unit

`npm run test:unit` gebruikt `playwright.unit.config.ts`, start geen webserver en test onder meer:

- fail-closed backend-, owner- en toegangsconfiguratie;
- identity-scoped, memory-only querygedrag, transient retries en requesttimeouts;
- serviceworker `NetworkOnly`-classificatie voor private data;
- veilige client- en servertelemetrie zonder gevoelige payloads;
- contactenpagination en deduplicatie;
- server-side ownerquery/body-rewriting;
- request-generationguards;
- CSV- en domeinhelpers;
- salarykalibratie en transactiestatsscope;
- exacte dossierdocumentlookup;
- canonieke online/on/helderheidselectors voor verlichting;
- immutable devicecommandsimulatie;
- per-device optimistic journals bij overlappende successen en fouten;
- per-device requestserialisatie met parallelisme tussen verschillende lampen;
- coalescing, commandbarrières en totale abort-deadlines vanaf de gebruikersinteractie;
- behoud van optimistic state én versere metadata bij een late refresh;
- kamerfallbacks, filters en consistente online/on-tellingen.
- het centrale design-systemcontract, inclusief verbannen legacyaliases en feature-CSS;
- expliciete button-types, touch-safe raw controls en semantische teksttokens;
- één Surface- en Tabs-contract zonder domein-`Panel` of tweede TabBar;
- reduced-motion-safe programmatic scrolling en app-brede `MotionConfig`;
- echte WCAG-AA-contrastberekening van teksttokens;
- geen lege/NUL-bronbestanden, `transition-all`, vaste duration- of 8–11px-klassen;
- geen fysieke featurekleuren buiten gevalideerde dataprojecties.

Browserquerydata wordt niet persistent opgeslagen. Iedere Clerk-identiteit krijgt een eigen in-memory `QueryClient`; bij een identiteitswissel ontstaat een nieuwe cache. Dit voorkomt dat private data van een eerdere sessie terugkomt uit IndexedDB of localStorage.

### Altijd actieve security-E2E

`npm run test:e2e` draait uitsluitend het geïsoleerde `security-chromium`-project. Lokaal start Playwright `npm run dev`; in CI wordt eerst gebouwd en daarna `npm run start` gebruikt.

De suite bewijst dat:

- private pagina's zonder sessie naar sign-in gaan;
- `/api/backend` zonder sessie JSON 401 retourneert;
- een BFF-request wordt afgewezen voordat een onbereikbare backend kan worden aangeroepen.

Deze gate gebruikt geen Clerk-sessie en heeft geen tenantcredentials nodig naast de buildconfiguratie.

### Geauthenticeerde owner- en non-owner-E2E

`npm run test:e2e:authenticated` gebruikt de officiële Clerk Playwright-flow:

1. de afhankelijke `clerk-owner-setup` en `clerk-non-owner-setup` voeren `clerkSetup()` uit;
2. de setups melden twee verschillende testaccounts aan via `clerk.signIn({ emailAddress })`;
3. de tijdelijke storage states worden geschreven naar de ignored bestanden `playwright/.clerk/owner.json` en `playwright/.clerk/non-owner.json`;
4. `auth-desktop`, `auth-tablet` (834 × 1194) en `auth-mobile` (Pixel 5) gebruiken uitsluitend de owner-state;
5. `auth-non-owner` gebruikt uitsluitend de non-owner-state en bewijst de afwijzing van een private pagina en API;
6. gekoppelde teardown-projecten verwijderen beide statebestanden na de afhankelijke tests.

De setup staat bewust in een Playwright-project en niet in een functionele `globalSetup`: Clerk moet de testing-tokenomgeving aan de afhankelijke workers kunnen doorgeven. Gebruik uitsluitend een Clerk development/test-tenant, nooit een productie-tenant.

De states worden vóór schrijven op POSIX-systemen afgeschermd met directorymodus `0700` en bestandsmodus `0600`; na het schrijven wordt de bestandsmodus opnieuw afgedwongen. Op ieder platform verwijderen de setup-errorpaden en teardown-projecten de bestanden. Een hard afgebroken proces kan teardown niet uitvoeren, daarom verwijdert iedere volgende setup eerst een eventueel achtergebleven eigen state.

Vereiste lokale variabelen:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`;
- `CLERK_SECRET_KEY`;
- `E2E_CLERK_OWNER_EMAIL`;
- `E2E_CLERK_NON_OWNER_EMAIL` van een geldig tweede account in dezelfde testtenant;
- `HOMEAPP_OWNER_USER_ID` van exact dezelfde test-owner;
- de normale buildvariabelen voor de backend-BFF.

De owner- en non-owner-e-mailadressen moeten verschillend zijn. De non-owner mag niet overeenkomen met `HOMEAPP_OWNER_USER_ID`. Voor een gerichte controle van alleen de toegangsgrens kan `npm run test:e2e:non-owner` worden gebruikt; die flow vereist geen `E2E_CLERK_OWNER_EMAIL`, maar de build blijft wel de owner-user-id nodig hebben.

Plaats deze waarden in een ignored `.env.local` of in de procesomgeving en voer daarna uit:

~~~powershell
npm run build
npm run test:e2e:authenticated
~~~

De geauthenticeerde suite:

- bezoekt alle elf routes uit de centrale hoofdnavigatie op desktop, tablet en mobiel;
- bewaakt één `main#main`, het gedeelde page-contract en horizontale overflow;
- controleert op alle routes alle gerenderde mobiele buttons en form controls,
  ook onder de fold, op de minimale 44px touchmaat en bewaakt het focusherstel van de Meer-sheet;
- opent de automatiseringsmodal en het responsive lampdetail zonder op te slaan of lampcommando's te sturen;
- voert Axe WCAG A/AA-scans uit op alle elf hoofdroutes;
- onderschept alle `/api/backend/**`-requests met deterministische, synthetische GET-data;
- blokkeert en faalt op iedere backendmutatie;
- meldt een echte, geldige non-owner aan en controleert de redirect naar `/access-denied`;
- controleert met dezelfde non-owner-sessie dat `/api/backend/health` JSON 403 retourneert;
- faalt op first-party page errors, console errors, 5xx-responses en onverwachte request failures.

Runtime-evidence bevat alleen categorie, HTTP-methode/status en resource-type. Het bevat geen URL, querystring, request/responsebody, consolebericht of stacktrace. Axe-fouten worden teruggebracht tot rule-id, impact en aantal nodes; selectors, HTML en rendered ownerdata komen niet in de assertionoutput. Voor de setup, teardown en alle auth-projecten zijn trace, screenshots en video uitgeschakeld, omdat browserartefacts sessiemateriaal kunnen bevatten.

De storage-statebestanden bevatten sessiemateriaal. Commit ze nooit, deel ze niet en upload geen browserartefacten van authenticated tests zonder expliciete veiligheidsreview.

### Geauthenticeerde CI-gate

De job `authenticated-e2e` is opt-in en gebruikt de protected GitHub Environment `homeapp-e2e`. De job draait alleen wanneer repository variable `HOMEAPP_AUTH_E2E_ENABLED` exact `true` is en een pull request niet uit een fork komt.

Configureer in die Environment uitsluitend test-tenantsecrets:

- `E2E_CLERK_PUBLISHABLE_KEY`;
- `E2E_CLERK_SECRET_KEY`;
- `E2E_CLERK_OWNER_EMAIL`;
- `E2E_CLERK_OWNER_USER_ID`;
- `E2E_CLERK_NON_OWNER_EMAIL`.

De job bouwt opnieuw met de test-tenant, handhaaft de performancebudgetten en draait daarna de drie read-only ownerprojecten plus de non-owner-toegangstest. Environment approvals en branch protection bepalen wanneer deze kostbare gate verplicht wordt.

### Performance

`npm run check:performance` vergelijkt de productiebuild met `performance-budget.json`. Draai deze gate altijd direct na `npm run build`; de controle gebruikt de zojuist gegenereerde `.next`-artefacten.

### Buildconfiguratie

De productiebuild heeft door het fail-closed ontwerp serverconfiguratie nodig:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`;
- `CLERK_SECRET_KEY`;
- `BACKEND_API_URL`;
- `BACKEND_API_KEY` of een server-only `APP_SECRET_KEY`;
- `HOMEAPP_OWNER_USER_ID`.

De gewone CI-job gebruikt een bewust onbereikbaar loopback-backendadres. Dat is correct: build, performancegate en unauthenticated security-E2E mogen geen echte backend nodig hebben.

## Secret scan

CI installeert Gitleaks 8.28.0 en scant de tracked repository met redactie:

~~~bash
gitleaks dir . --redact --no-banner --verbose
~~~

Draai dit ook lokaal na wijzigingen aan envvoorbeelden, workflows, scripts of documentatie. Een schone huidige tree vervangt geen rotatie van een secret dat eerder openbaar of gecommit is geweest.

## Browsercontrole na UI-wijzigingen

Automatische tests vervangen geen visuele controle. Controleer minimaal:

- desktop, tablet en mobiel viewport;
- sign-inredirect en terugkeer naar de bedoelde route;
- browserconsole zonder onverwachte errors;
- geauthenticeerde BFF-dataflow;
- offlinefallback zonder private data in Cache Storage;
- PDF-viewer zonder dubbele appchrome;
- sign-out en 401-purge van de identity-scoped QueryClient en runtimecaches;
- individuele lampkaarten vóór globale metrics en scènes;
- één device-toggle die uitsluitend het bedoelde device-id verstuurt;
- offline lampen die geen commando versturen;
- gerichte rollback van uitsluitend de mislukte lampoperatie;
- de gedeelde bridgestatus voor controleren, onbekend en offline queue-modus.

Playwright maakt lokaal `playwright-report` en `test-results` aan. Deze directories zijn gegenereerd, ignored en mogen na inspectie worden verwijderd. Behandel authenticated uitvoer altijd als potentieel gevoelig, ook wanneer de gesanitiseerde runtime-evidence zelf geen secrets bevat.
