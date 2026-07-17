# Backend-API-overzicht voor de Homeapp

> **Status: actueel op 2026-07-17.** Dit document beschrijft het frontend-BFF-contract. De bron van waarheid voor routes blijft ../JeffriesBackend/backend/internal/server/routes.go en voor schema's ../JeffriesBackend/backend/docs/swagger.json.

docs/backend-api-map.json is een oudere machine-readable snapshot. Gebruik die niet als enige bron voor security, nieuwe routes of queryparameters.

## Runtime-topologie

~~~text
Browser/React
  -> Next.js route handler /api/backend/[...path]
  -> BACKEND_API_URL, inclusief /api/v1
  -> JeffriesBackend
  -> PostgreSQL en afgeschermde integraties
~~~

De browser roept nooit rechtstreeks een productiedomein van JeffriesBackend aan. De backendhost is deploymentconfiguratie en staat niet hardcoded in de frontend.

| Context | Basis | Auth |
|---|---|---|
| Reactcomponenten en hooks | /api/backend | Browser stuurt geen backend API-key. |
| Next.js BFF | BACKEND_API_URL | Clerk + ownercheck; injecteert X-API-Key server-side. |
| Lokale developmentfallback | http://127.0.0.1:8000/api/v1 | Alleen wanneer BACKEND_API_URL in development ontbreekt. |
| Direct backenddebuggen | Expliciet gekozen backend-URL | Gebruik de credential die bij het specifieke routegebied hoort. |

In productie is BACKEND_API_URL verplicht. Er is geen Render-default. Een ontbrekende of ongeldige BFF-configuratie levert 503 op en valt niet terug naar een publieke host.

## Relevante frontendbestanden

| Doel | Bestand |
|---|---|
| UX-routegate | proxy.ts |
| Backend-BFF | app/api/backend/[...path]/route.ts |
| Backendconfig | lib/server/backend-config.ts |
| Ownerconfig | lib/server/owner-config.ts |
| Identity-rewriting | lib/server/proxy-owner.ts |
| Handgeschreven client | lib/api.ts |
| Orval-mutator | lib/orvalMutator.ts |
| Gegenereerde clients | lib/api/generated/** |
| Gegenereerde modellen | lib/api/model/** |
| Orvalconfiguratie | orval.config.ts |
| Actuele frontendarchitectuur | FRONTEND_ARCHITECTURE.md |
| Backendroutes | ../JeffriesBackend/backend/internal/server/routes.go |
| Backend-Swagger | ../JeffriesBackend/backend/docs/swagger.json |

## Frontendauthenticatie

proxy.ts is een navigatie- en UX-gate:

- alleen /sign-in en /sign-up zijn publiek;
- een niet-ingelogde pagina wordt naar /sign-in gestuurd;
- een niet-ingelogd /api-verzoek krijgt JSON 401;
- proxy.ts gebruikt geen createRouteMatcher meer.

Security hangt daar niet alleen van af. /api/backend voert opnieuw Clerk auth uit en accepteert uitsluitend HOMEAPP_OWNER_USER_ID. De PDF-byte-route en gevoelige dossierviewerlookups hebben eveneens een eigen ownercontrole.

### BFF-responses vóór de backend

| Status | Betekenis |
|---|---|
| 401 | Geen Clerk-sessie. |
| 403 | Wel een sessie, maar niet de owner. |
| 415 | Niet-lege mutatiebody is geen JSON/+json. |
| 503 | Backend- of ownerproductieconfiguratie ontbreekt of is ongeldig. |
| 502 | De geconfigureerde backend kon niet worden bereikt. |

## BFF-configuratie

| Variabele | Regel |
|---|---|
| BACKEND_API_URL | Absolute HTTP(S)-URL, zonder credentials, query of fragment; verplicht in productie. |
| BACKEND_API_KEY | Voorkeursbron voor X-API-Key. |
| APP_SECRET_KEY | Alleen server-side compatibiliteitsbron wanneer BACKEND_API_KEY ontbreekt. |
| HOMEAPP_OWNER_USER_ID | Verplicht in productie en centraal gecontroleerd. |
| NEXT_PUBLIC_API_URL | Wordt niet gebruikt om de backendtarget te kiezen. |
| NEXT_PUBLIC_API_KEY | Is geen toegestane backendcredential. |

Niet-loopback HTTP wordt in productie geweigerd. Zet BACKEND_API_URL inclusief /api/v1, bijvoorbeeld http://127.0.0.1:8000/api/v1 in development.

## BFF-rewriting en headers

Voor ieder request naar /api/backend:

- catch-all-padsegmenten worden afzonderlijk URL-gecodeerd;
- de browserquery wordt overgenomen, daarna wordt user_id verwijderd;
- userId wordt altijd vervangen door de Clerk-owner-id;
- JSON-mutaties krijgen top-level userId en user_id;
- geneste velden met die namen worden ook herschreven;
- alleen Content-Type en Accept worden van de browser naar de backend gekopieerd;
- X-API-Key wordt uitsluitend server-side toegevoegd;
- hop-by-hopheaders worden niet aan de browser doorgegeven;
- fetch gebruikt cache: no-store.

Daarom is een client userId alleen contract-/cachekeydata en nooit autorisatie.

## Directe backend trust boundaries

JeffriesBackend gebruikt verschillende, bewust niet-uitwisselbare credentials.

| Routegebied | Credential |
|---|---|
| GET en HEAD / | Publieke healthcheck. |
| GET /api/v1/health | Publieke healthcheck. |
| /api/v1/swagger/* | Alleen gemount in development. |
| POST /api/v1/laventecare/intake | Dedicated Bearer LAVENTECARE_INTAKE_SECRET. |
| /api/v1/bridge/* | Dedicated bridge X-API-Key. |
| Overige /api/v1-routes | Owner/app X-API-Key. |

Een lege verwachte key faalt gesloten. De intake-, bridge- en appkeys horen verschillend te zijn.

Frontendbrowsercode gebruikt alleen de owner-BFF. De intake- en bridgeroutes zijn server-to-server/LAN-integraties en horen niet via algemene UI-fetches te worden aangeroepen.

## API-clients

### Handgeschreven client

Gebruik lib/api.ts wanneer het domein daar al op gebouwd is:

~~~ts
import { devicesApi } from "@/lib/api";

const devices = await devicesApi.list();
~~~

### Gegenereerde client

Gebruik de Orval-hooks wanneer het domein al gegenereerde clients gebruikt:

~~~ts
import { useGetSettingsOverview } from "@/lib/api/generated/settings/settings";

const { data } = useGetSettingsOverview();
~~~

Beide paden komen via apiFetchWithStatus op /api/backend uit. De Orval-mutator bewaart de echte HTTP-status, maar geeft momenteel geen echte responseheaders door.

## Belangrijkste routegroepen

De tabel is een wegwijzer, geen vervanging voor routes.go of Swagger.

| Groep | Voorbeelden | Opmerking |
|---|---|---|
| Rooms/devices/scenes | /rooms, /devices, /scenes | Smart-home CRUD en commando's. |
| Automations | /automations | CRUD, toggle en group-delete. |
| Schedule/events | /schedule, /personal-events | Rooster, import, agenda en statussen. |
| Finance/salary | /transactions, /salary, /loonstroken | Filters, stats, import en salarisdata. |
| Notes/habits | /notes, /habits | Search, revisions, context, toggles en stats. |
| E-mail | /emails | Legacy mailreadmodel met user_id-contract. |
| Contacts | /contacts | Volledige contactmodule met labels, channels, facts, dates, organizations, interactions en WhatsApp. |
| LaventeCare | /laventecare | Cockpit, CRM, billing, mailbox, dossiers, governance en AI-advies. |
| Settings/focus | /settings, /focus | Runtime-/integratiestatus en focusreadmodel. |
| Pending actions | /ai/pending | Bevestigen of annuleren van gevoelige acties. |
| Sync | /sync | Calendar, Gmail en Todoist; beschikbaarheid hangt van backendconfig af. |

## Contactencontract

GET /contacts retourneert één JSON-arraypagina en ondersteunt:

| Parameter | Gedrag |
|---|---|
| limit | Default en maximum 200. |
| offset | Default 0, begrensd door de backend. |
| q | Zoekt in naam, e-mail, notities en toegewezen labelnamen. |
| type | Filtert relationship type. |
| includeArchived | Neemt gearchiveerde contacten mee. |

De sortering is stabiel op display name. De Homeapp gebruikt contactenApi.listAll met pagina's van 200, offsetstappen, deduplicatie op id en een harde maxPages-guard. Daardoor is de oude limit-500-truncatie niet meer van toepassing.

Childroutes controleren dat zowel contact als childobject bij dezelfde owner horen voordat ze lezen of muteren.

## Publieke LaventeCare-intake

POST /api/v1/laventecare/intake gebruikt niet de app API-key, maar een dedicated Bearer-secret plus Idempotency-Key.

~~~http
Authorization: Bearer <LAVENTECARE_INTAKE_SECRET>
Idempotency-Key: <requestId>
Content-Type: application/json
~~~

Belangrijkste responses:

- 201 voor de eerste succesvolle verwerking;
- 200 voor een identieke replay;
- 409 wanneer dezelfde key een andere payload krijgt;
- 503 met Retry-After zolang dezelfde key nog in-flight is;
- 401 bij ontbrekende of ongeldige Bearer-authenticatie.

De publieke website praat via LaventeCareAuthSystems server-to-server met deze route. De Homeapp-browser doet dat niet.

## Typed clients regenereren

Genereer eerst Swagger in de canonical backendcheckout:

~~~powershell
Set-Location C:\Users\jeffrey\Desktop\Projecten\JeffriesBackend\backend
go run github.com/swaggo/swag/cmd/swag@v1.16.6 init -g cmd/api/main.go
~~~

Genereer daarna de frontendclients:

~~~powershell
Set-Location C:\Users\jeffrey\Desktop\Projecten\JeffriesHomeapp
npx orval
~~~

BACKEND_SWAGGER_PATH mag expliciet een ander contract aanwijzen. Zonder override is ../JeffriesBackend/backend/docs/swagger.json de canonical input.

## Endpointwijzigingen

1. Pas handler en route in JeffriesBackend aan.
2. Werk de Swaggerannotaties bij.
3. Voeg store/handler/servertests toe voor auth, owner scope en foutpaden.
4. Regenereer backend/docs/swagger.json.
5. Regenereer Orval als een gegenereerde frontendclient het endpoint gebruikt.
6. Werk dit overzicht bij.
7. Test browsercalls uitsluitend via /api/backend.
