# JeffriesHomeapp — actuele frontendarchitectuur

> **Status: actueel op 2026-07-17.** Dit document beschrijft de huidige working tree. De oudere review- en auditbestanden blijven als historisch bewijsmateriaal bestaan, maar zijn geen actuele backlog zonder herverificatie.

## 1. Doel en runtime

JeffriesHomeapp is een persoonlijke single-owner webapp voor smart-homebediening, agenda en rooster, notities, habits, financiën en het LaventeCare CRM. De runtime bestaat uit:

- Next.js 16.2.10 App Router en React 19.2.7;
- Clerk 7 voor sessies;
- TanStack Query 5 voor clientdata;
- Serwist 9 voor de PWA/serviceworker;
- een server-side Next.js BFF onder /api/backend;
- de Go-API van JeffriesBackend onder /api/v1.

De actuele requestketen is:

~~~text
Browser
  -> Next.js pagina of route handler
  -> /api/backend/[...path] (Clerk + ownercontrole + API-keyinjectie)
  -> geconfigureerde JeffriesBackend /api/v1
  -> PostgreSQL en afgeschermde integraties
~~~

De deploymentlocatie van de backend is configuratie, geen aanname in de code. In productie is BACKEND_API_URL verplicht. Alleen development heeft een lokale fallback naar http://127.0.0.1:8000/api/v1. Er is geen Render-default of browser-zichtbare backendfallback.

De oude root-index.html was een gegenereerd/statisch artefact en is verwijderd. Deze repository draait uitsluitend als Next.js App Router-app.

## 2. Trust boundaries en authenticatie

Security hangt niet af van één matcher. Elke bevoorrechte serverresource controleert zelf de relevante identiteit.

| Laag | Bestand | Verantwoordelijkheid |
|---|---|---|
| UX-routegate | proxy.ts | Redirectt niet-ingelogde paginabezoeken naar /sign-in en geeft voor niet-ingelogde /api-verzoeken JSON 401 terug. Alleen /sign-in en /sign-up zijn publiek. |
| Backend-BFF | app/api/backend/[...path]/route.ts | Voert zelf Clerk auth uit, accepteert alleen de geconfigureerde owner, injecteert de server-only backendkey en herschrijft identityvelden. |
| PDF-bytes | app/api/laventecare/pdf/[documentKey]/route.tsx | Voert zelf Clerk- en ownercontrole uit voordat een PDF wordt gerenderd. |
| Dossierviewer | app/laventecare/documenten/[documentKey]/page.tsx | Doet een ownercontrole vóór een lookup van echte dossierdocumenten en selecteert exact op documentKey. |
| Configuratie | lib/server/backend-config.ts en lib/server/owner-config.ts | Centraliseert fail-closed productieconfiguratie en voorkomt verspreide hardcoded securitybeslissingen. |

### proxy.ts is een UX-gate

In Next.js 16 is proxy.ts de juiste conventie. Het bestand gebruikt clerkMiddleware met een kleine native pathname-prefixcheck; de verouderde createRouteMatcher-helper wordt niet meer gebruikt.

De proxy is nuttig voor navigatie-UX, maar geldt niet als enige securitygrens. Een matcher kan bijvoorbeeld statische bestandsextensies overslaan. Daarom doen de BFF, de PDF-route en gevoelige server-side documentlookups hun eigen controle.

### Ownerconfiguratie

HOMEAPP_OWNER_USER_ID is in productie verplicht. Alleen development mag terugvallen op de lokaal bekende owner-id. isOwnerUserId faalt gesloten wanneer de configuratie ontbreekt of ongeldig is.

Er is dus geen duplicaat van de owner-id meer in iedere route. Wijzigingen horen via de centrale server-only configuratie te lopen.

### Backend-BFF

De browser roept alleen /api/backend aan. De route handler:

- vereist een Clerk-sessie en retourneert 401 zonder sessie;
- retourneert 403 voor een geldige sessie die niet de owner is;
- retourneert 503 bij ontbrekende of ongeldige productieconfiguratie;
- injecteert X-API-Key uit BACKEND_API_KEY of de server-only APP_SECRET_KEY;
- geeft nooit een NEXT_PUBLIC API-key of backendsecret aan de browser;
- encodeert ieder catch-all-padsegment;
- neemt van browserrequests alleen Content-Type en Accept over;
- verwijdert hop-by-hopheaders uit backendresponses;
- gebruikt cache: no-store;
- retourneert 502 als de backend niet bereikbaar is.

Clientgestuurde identity wordt niet vertrouwd:

- user_id wordt uit de query verwijderd;
- userId wordt altijd op de Clerk-owner gezet;
- JSON-objecten krijgen server-side userId en user_id;
- geneste userId- en user_id-velden worden eveneens herschreven;
- niet-lege mutatiebody's buiten application/json of een +json-mediatype worden met 415 geweigerd.

Clientfuncties mogen nog een userId gebruiken voor querykeys of een bestaand API-contract, maar die waarde is nooit autorisatie.

## 3. Serverconfiguratie

| Variabele | Zichtbaarheid | Gedrag |
|---|---|---|
| NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY | browser | Publieke Clerk-identifier. |
| CLERK_SECRET_KEY | server | Clerk-serverauthenticatie. |
| BACKEND_API_URL | server | Verplicht in productie; developmentfallback is localhost:8000/api/v1. |
| BACKEND_API_KEY | server | Voorkeurskey voor de Go-API; verplicht in productie tenzij APP_SECRET_KEY server-side is gezet. |
| HOMEAPP_OWNER_USER_ID | server | Verplicht in productie; enige toegestane Clerk-user. |
| NEXT_PUBLIC_BUILD_ID | browser/build | Optionele cache-buster voor de TanStack-persistlaag. |

BACKEND_API_URL moet een absolute HTTP(S)-URL zonder credentials, query of fragment zijn. Niet-loopback HTTP wordt in productie geweigerd.

## 4. Datalaag

Er bestaan twee API-oppervlakken, maar één transportpad:

| Oppervlak | Locatie | Gebruik |
|---|---|---|
| Handgeschreven client | lib/api.ts | LaventeCare, contacten, smart home, e-mail, privacy, focus, sync en verschillende aanvullende endpoints. |
| Orval-client | lib/api/generated en lib/api/model | Gegenereerde hooks en types voor onder meer habits, notes, schedule, salary, loonstroken en transactions. |
| Gedeelde mutator | lib/orvalMutator.ts | Leidt gegenereerde calls door apiFetchWithStatus en daarmee door dezelfde BFF en 401-afhandeling. |

apiFetchWithStatus verwerkt 204, valideert JSON-responses en activeert bij 401 de centrale sessie-verlopenflow. De Orval-mutator geeft de echte HTTP-status door, maar levert momenteel geen echte responseheaders door; functionaliteit die pagination- of ETag-headers nodig heeft moet dit eerst oplossen.

Querykeys worden per feature beheerd. LaventeCare- en contactenmutaties invalidateren op dit moment relatief grof; notes en diverse andere domeinen gebruiken gerichtere optimistic updates.

## 5. Contacten en pagination

De oude aanname “één array met limit 500” is niet meer geldig.

De actuele flow is:

~~~text
useContacten
  -> contactenApi.listAll
  -> fetchAllPages
  -> GET /contacts?limit=200&offset=0
  -> GET /contacts?limit=200&offset=200
  -> ... tot een korte pagina
~~~

Belangrijke eigenschappen:

- pageSize is 200, gelijk aan de backendmaximumgrens;
- de backend voert echte limit/offset-paginatie en stabiele sortering uit;
- listAll dedupliceert op contact-id;
- een guard van maximaal 100 volledige pagina's voorkomt een oneindige lus en weigert stille truncatie;
- AbortSignal wordt tot de fetch doorgegeven;
- includeArchived wordt op iedere pagina behouden;
- het contactenqueryprefix staat op de gevoelige persistence-denylist;
- gedeelde list-/selectieprimitives staan in components/contacts/ContactListPrimitives.tsx; featurelogica zit nog deels in app/contacten/page.tsx.

Backendsearch via q bestaat, maar de huidige hoofdweergave haalt met listAll de volledige verzameling op en kan daarop client-side filteren. Bij toekomstige server-side zoek-UI moet pagination per zoekquery behouden blijven.

## 6. Querypersistence en PWA-privacy

TanStack Query-data is private-by-default. lib/query-persistence.ts laat alleen persistence toe wanneer een query expliciet meta.persist === true heeft én niet onder een gevoelig prefix valt.

De gevoelige tweede verdedigingslaag omvat onder meer:

- notes;
- contacten;
- focus-notities en LaventeCare-acties;
- personal events en schedule;
- loonstroken en salary;
- LaventeCare;
- transactions;
- habits en syncdata.

In de huidige source staat geen query met meta.persist === true. De persistenceprovider en IndexedDB-infrastructuur zijn dus voorbereid, maar querypayloads worden niet stilzwijgend naar duurzame browseropslag geschreven.

De providerboom blijft stabiel: PersistQueryClientProvider wordt niet na mount verwisseld voor een ander providertype. Dit voorkomt de oude volledige remount/hydration-flash.

### Serviceworkerbeleid

app/sw.ts plaatst dezelfde-origin requests voor de volgende categorieën vóór Serwist defaultCache in NetworkOnly:

- /api/*;
- navigaties en documenten;
- RSC-requests en URLs met _rsc.

Daarmee komen private JSON-, HTML- en RSC-payloads niet in runtime Cache Storage. Statische app-shellassets en de offlinefallback mogen wel worden geprecached.

Bij sign-out en bij een backend-401 worden:

1. de QueryClient geleegd;
2. REACT_QUERY_OFFLINE_CACHE uit IndexedDB verwijderd;
3. runtime serviceworkercaches verwijderd via CLEAR_ALL_CACHES.

De precache blijft bewust staan, zodat de offline shell bruikbaar blijft. Een 401 opent eerst een blokkerende sessie-verlopenoverlay; open formulierinvoer wordt niet door een stille redirect weggegooid.

## 7. PDF- en dossierflow

PDF-generatie draait server-side op de Node-runtime met @react-pdf/renderer.

- De PDF-byte-route doet altijd een eigen ownercheck.
- De viewer doet vóór een echte dossierlookup een eigen ownercheck.
- Dossierlookup gebruikt documentKey als server-side filter en selecteert daarna nogmaals exact.
- De backendkey wordt alleen server-side toegevoegd.
- De documentviewer is chromeless in ClientShell zodat sidebar en mobiele bottomnav het PDF-viewport niet bedekken.

Een bekende catalogustemplate kan als shell/metadata worden gerenderd, maar de daadwerkelijke PDF-bytes blijven achter de owner-gated API-route.

## 8. LaventeCare bunq-flow

De frontendflow blijft bewust tweeledig:

1. POST invoices/{id}/payment-request maakt een bevestigingsactie;
2. de owner bevestigt via Settings of Telegram;
3. de backend maakt of reconcileert het bunq RequestInquiry;
4. payment-refresh haalt providerstatus op.

De oude “retry kan een dubbel betaalverzoek maken”-bevinding is backendmatig opgelost. De backend gebruikt nu:

- één database-reservering per owner en factuur;
- een stabiele bunq client-request-id afgeleid van invoice-id;
- een providerlookup op merchant reference vóór een nieuwe POST;
- status unknown bij een ambigue write, waarna automatisch opnieuw versturen wordt geblokkeerd;
- reconciliatie van een al bestaand providerverzoek.

De frontend hoeft hiervoor geen eigen idempotencykey te verzinnen, maar mag de bevestigingsflow niet omzeilen.

## 9. Belangrijkste featurepaden

| Domein | Pagina | Hoofddata |
|---|---|---|
| Dashboard | app/page.tsx | Samengestelde readmodellen uit meerdere hooks. |
| Agenda/rooster | app/agenda en app/rooster | Schedule, personal events, salary en loonstroken. |
| Notities | app/notities | Orval notes-hooks, optimistic concurrency en editorhelpers. |
| Habits | app/habits | Orval habits-hooks en lokale datum-/streaklogica. |
| Finance | app/finance | Transacties, stats, CSV-import en visualisaties. |
| Contacten | app/contacten | Handgeschreven contactenclient met volledige pagination. |
| LaventeCare | app/laventecare | Cockpit, CRM, billing, mailbox, dossiers en PDF-suite. |
| Smart home | app/lampen en app/automations | Devices, rooms, scenes en automations. |
| Settings | app/settings | Integratiestatus, sync, privacy en pending actions. |
| Focus | app/focus | Chromeless kioskdashboard met samengestelde data. |

## 10. Verificatie en onderhoud

De minimale lokale gate staat in docs/testing.md. CI voert daarnaast een productie-dependency-audit en een geredigeerde Gitleaks-scan uit.

Bij wijzigingen aan backendroutes:

1. pas handler, route en Swaggerannotatie in JeffriesBackend aan;
2. regenereer backend/docs/swagger.json;
3. regenereer Orval indien de frontend een gegenereerde client gebruikt;
4. werk docs/backend-api-overview.md bij;
5. test altijd via /api/backend, niet rechtstreeks vanuit browsercode.

## 11. Status van oudere AI-verslagen

De volgende bestanden zijn point-in-time audits of onderzoeksartefacten en blijven bewust bewaard:

- REVIEW.md;
- SIXPAGE_AUDIT.md;
- UX_REVIEW.md;
- AGENDA_REVIEW.md en AGENDA_REDESIGN.md;
- ROOSTER_AGENDA_UIUX_AUDIT.md;
- NOTES_UIUX_AUDIT.md;
- LAVENTECARE_MAIL_AUDIT.md;
- Codebase.md.

Hun oorspronkelijke bevindingstekst en oude regelnummers zijn historisch bewijs. Een item daar is niet automatisch nog open. Gebruik voor huidige architectuur dit document, voor de API docs/backend-api-overview.md en voor uitvoerbare checks docs/testing.md.
