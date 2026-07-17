# Homeapp-verificatie

> **Actueel op 2026-07-17.** Deze checks horen bij de huidige Next.js 16/React 19 working tree.

## Lokale gate

Voer vanaf de repositoryroot uit:

~~~bash
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:e2e
~~~

Gebruik Node.js 22 om lokaal dezelfde majorversie als CI te testen.

## Wat de suites bewijzen

### Unit

npm run test:unit gebruikt playwright.unit.config.ts, start geen webserver en test onder meer:

- fail-closed backend- en ownerconfiguratie;
- querypersistence en gevoelige prefixes;
- serviceworker NetworkOnly-classificatie;
- contactenpagination en deduplicatie;
- server-side ownerquery/body-rewriting;
- request-generationguards;
- CSV- en domeinhelpers;
- salarykalibratie en transactiestatsscope;
- exacte dossierdocumentlookup.

### E2E

npm run test:e2e gebruikt de Chromium-projectconfiguratie en start lokaal npm run dev. In CI wordt eerst gebouwd en daarna npm run start gebruikt.

De altijd actieve securitychecks bewijzen dat:

- private pagina's zonder sessie naar sign-in gaan;
- /api/backend zonder sessie JSON 401 retourneert;
- een BFF-request wordt afgewezen voordat een onbereikbare backend kan worden aangeroepen.

De niet-muterende geauthenticeerde navigatiespec draait alleen wanneer E2E_AUTH_STATE verwijst naar een geldige Playwright storage-statefile:

~~~powershell
$env:E2E_AUTH_STATE = 'C:\veilig\owner-storage-state.json'
npm run test:e2e
~~~

Een storage-statebestand bevat sessiemateriaal. Commit het nooit en deel het niet in logs of rapporten.

### Build

De productiebuild heeft door het fail-closed ontwerp serverconfiguratie nodig:

- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
- CLERK_SECRET_KEY;
- BACKEND_API_URL;
- BACKEND_API_KEY of een server-only APP_SECRET_KEY;
- HOMEAPP_OWNER_USER_ID.

CI gebruikt een bewust onbereikbaar loopback-backendadres. Dat is correct: build en unauthenticated security-E2E mogen geen echte backend nodig hebben.

## Secret scan

CI installeert Gitleaks 8.28.0 en scant de tracked repository met redactie:

~~~bash
gitleaks dir . --redact --no-banner --verbose
~~~

Draai dit ook lokaal na wijzigingen aan envvoorbeelden, workflows, scripts of documentatie. Een schone huidige tree vervangt geen rotatie van een secret dat eerder openbaar of gecommit is geweest.

## Browsercontrole na UI-wijzigingen

Automatische tests vervangen geen visuele controle. Controleer minimaal:

- desktop en mobiel viewport;
- sign-inredirect en terugkeer naar de bedoelde route;
- browserconsole zonder onverwachte errors;
- geauthenticeerde BFF-dataflow;
- offlinefallback zonder private data in Cache Storage;
- PDF-viewer zonder dubbele appchrome;
- sign-out en 401-purge van QueryClient, IndexedDB en runtimecaches.

Playwright maakt lokaal playwright-report en test-results aan. Deze directories zijn gegenereerd, ignored en mogen na inspectie worden verwijderd.
