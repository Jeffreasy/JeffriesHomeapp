# JeffriesHomeapp

JeffriesHomeapp is de Next.js single-owner frontend voor JeffriesBackend: smart home, agenda en rooster, notities, habits, financiën, contacten en het LaventeCare CRM.

Lees vóór architectuur- of securitywerk:

- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) voor de actuele frontend- en trust-boundarykaart;
- [docs/backend-api-overview.md](docs/backend-api-overview.md) voor het BFF/backendcontract;
- [docs/testing.md](docs/testing.md) voor de uitvoerbare verificatie.

Oudere audit- en reviewbestanden blijven historisch bewijs. Gebruik hun oorspronkelijke bevindingen niet als actuele backlog zonder ze tegen de huidige code te herverifiëren.

## Architectuur in één regel

~~~text
Browser -> Next.js /api/backend BFF -> geconfigureerde JeffriesBackend /api/v1 -> PostgreSQL
~~~

Browsercode praat niet rechtstreeks met de Go-API en ontvangt nooit de backend API-key. proxy.ts verzorgt redirect-UX, maar de BFF en de PDF-/dossierresources doen daarnaast hun eigen Clerk- en ownercontrole.

Deze repository is een Next.js App Router-app. Een root-index.html hoort er niet bij; het oude gegenereerde artefact is verwijderd.

## Vereisten

- Node.js 22, gelijk aan CI;
- npm;
- een Clerk-app voor lokaal inloggen;
- een draaiende JeffriesBackend voor geauthenticeerde dataflows.

## Configuratie

Kopieer .env.example naar .env.local en vul minimaal de Clerk- en ownerconfiguratie in.

| Variabele | Doel |
|---|---|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | Publieke Clerk-identifier. |
| CLERK_SECRET_KEY | Server-only Clerk-secret. |
| BACKEND_API_URL | Server-only backendbasis, inclusief /api/v1. |
| BACKEND_API_KEY | Server-only X-API-Key voor JeffriesBackend. |
| HOMEAPP_OWNER_USER_ID | Enige Clerk-user die private data mag benaderen. |

Productie faalt gesloten wanneer BACKEND_API_URL, een backendkey of HOMEAPP_OWNER_USER_ID ontbreekt. Er is geen productie- of Renderfallback. Development mag zonder BACKEND_API_URL terugvallen op http://127.0.0.1:8000/api/v1; expliciet configureren via .env.local blijft aanbevolen.

## Lokaal ontwikkelen

~~~bash
npm install
npm run dev
~~~

Open daarna http://localhost:3000.

## Kwaliteitscontroles

~~~bash
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:e2e
~~~

De security-E2E draait zonder geauthenticeerde storage state. Zet E2E_AUTH_STATE naar een Playwright storage-statebestand om ook de niet-muterende ownernavigatie te testen. Zie [docs/testing.md](docs/testing.md).

## LaventeCare intakebridge

De publieke website stuurt een contactaanvraag eerst naar LaventeCareAuthSystems. AuthSystems zet die server-to-server door naar JeffriesBackend:

~~~http
POST /api/v1/laventecare/intake
Authorization: Bearer <LAVENTECARE_INTAKE_SECRET>
Idempotency-Key: <requestId>
Content-Type: application/json
~~~

requestId, name en email zijn verplicht. Idempotency-Key moet exact gelijk zijn aan requestId en 8–128 tekens uit de toegestane set A–Z, a–z, 0–9, punt, underscore, dubbele punt en koppelteken bevatten.

De overige intakevelden zijn optioneel: source, phone, companyName, website, projectType, budget, timeline, goal, message, pageUrl, origin en submittedAt.

Configureer de keten als volgt:

- JeffriesBackend: LAVENTECARE_INTAKE_SECRET;
- LaventeCareAuthSystems: HOMEAPP_LAVENTECARE_INTAKE_URL=https://backend.example/api/v1/laventecare/intake;
- LaventeCareAuthSystems: dezelfde waarde in HOMEAPP_LAVENTECARE_INTAKE_SECRET.

Een nieuwe intake retourneert 201. Een idempotente replay retourneert 200. Dezelfde key met een andere payload retourneert 409. Een gelijktijdig nog lopende aanvraag retourneert 503 met Retry-After.

De oude Convex-intakeroute is vervallen en hoort nergens geconfigureerd te zijn.
