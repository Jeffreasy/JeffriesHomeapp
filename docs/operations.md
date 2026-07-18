# Homeapp operations runbook

> Dit runbook beschrijft diagnose en herstel. Het geeft geen toestemming om te mergen, productie te promoten, credentials te wijzigen of data te migreren.

## 1. Gezondheidsbeeld

Controleer incidenten altijd in deze volgorde:

1. deployment- en buildstatus;
2. ratio en duur van `/api/backend`-responses;
3. status van de Go-backend en database;
4. Clerk-sign-in en ownerconfiguratie;
5. client error-events per build-id;
6. alleen daarna domeinspecifieke providers.

Een request is end-to-end te volgen via `X-Request-ID`. De BFF geeft dezelfde id terug en stuurt hem naar de backend. Gebruik nooit een URL, querystring, body, e-mailadres of user-id als correlatiesleutel.

## 2. Betekenis van statussen

| Status | Betekenis | Eerste controle |
|---|---|---|
| `401` | Geen of verlopen Clerk-sessie. | Sign-inflow en sessiecookie; niet automatisch opnieuw proberen. |
| `403` | Geldige sessie, maar niet de owner. | `HOMEAPP_OWNER_USER_ID` en gebruikte Clerk-tenant. |
| `400` / `415` | Ongeldige of niet-JSON mutatiebody. | Clientcontract en gegenereerde types. |
| `408` | Requestbody overschreed de volledige ontvangstdeadline. | Clientverbinding en payloadstream; verhoog de limiet niet blind. |
| `413` | Request- of responsebody overschrijdt de veilige bytecap. | Contract/payloadgrootte; stuur geen onbegrensde body door. |
| `502` | Backend niet bereikbaar of transportfout. | Backenddeployment, DNS/TLS en request-id. |
| `503` | Fail-closed serverconfiguratie ontbreekt. | Server-only envvars; geen fallbacksecret toevoegen. |
| `504` | BFF- of clientdeadline overschreden. | Backendduur en afhankelijkheden; geen blinde timeoutverhoging. |

`5xx` wordt alleen beperkt opnieuw geprobeerd wanneer de operatie veilig en tijdelijk is. Auth-, validatie- en mutationfouten worden niet stil herhaald.

## 3. Privacyveilige telemetry

Toegestane servervelden:

- timestamp en severity;
- vaste eventnaam en vaste routecategorie;
- HTTP-methode, status en duur;
- allowlisted operatiecategorie;
- request-id en foutklasse.

Toegestane clientvelden:

- boundary (`route`, `global`, `component`, `pwa`);
- foutnaam;
- optionele Next.js digest;
- niet-gevoelige build-id.

Log nooit raw foutmeldingen of stacks. Download geen browser storage-state, Clerkcookies of requestbodies voor analyse.
Een clientdigest wordt server-side gehasht en de build-id komt uit de serverbuild. De modulelimiet van 20 events per minuut is alleen best-effort backpressure per warme instance; configureer distributed misbruikbescherming in de platform-firewall en behandel deze limiter nooit als autorisatie.


## 4. Sessieverloop en cacheherstel

Bij een backend-`401` toont de Homeapp een blokkerende herlogin-overlay. Dat is verwacht gedrag:

1. de in-memory QueryClient wordt geleegd;
2. private runtimecaches worden gewist;
3. open formulierstate blijft gemount;
4. de gebruiker kiest expliciet wanneer opnieuw wordt ingelogd.

Bij accountwissel maakt de provider een nieuwe QueryClient. Als data van een vorige identiteit zichtbaar lijkt, behandel dit als security-incident en stop promotie.

## 5. PWA-update en offline gedrag

Een gereedstaande serviceworkerupdate toont een banner. De app herlaadt niet automatisch, zodat open werk niet verloren gaat. Na `Nu herladen` moet de banner verdwijnen en hoort de nieuwe build-id actief te zijn.

Offline mogen statische shellassets werken, maar private API-, HTML- en RSC-data mogen niet uit Cache Storage komen. Controleer dit bij iedere wijziging aan `app/sw.ts`.

## 6. Performance regressie

Voer na een productiebuild uit:

~~~bash
npm run check:performance
~~~

De check meet gegenereerde assets, niet bronbestanden. Een overschrijding wordt niet opgelost door het budget zonder onderbouwing te verhogen. Zoek eerst naar:

- een zware statische import in een route-entrypoint;
- een parser of grafiek die vóór gebruikersintentie laadt;
- een onbedoelde route-level client boundary;
- duplicatie van UI-, query- of transportinfrastructuur.

## 7. LaventeCare PDF-context

PDF-links mogen alleen `kind:id` als dossierreferentie dragen. Bij een onbekende referentie hoort de server gesloten te falen. Klantnaam, samenvatting, bedrag, notitie of vervolgstap in een PDF-URL is een privacyregressie.

`LAVENTECARE_PDF_SOURCE_HOSTS` is optioneel en server-only. Vul uitsluitend exact geïnventariseerde hostnames in, komma-gescheiden en zonder scheme, pad, wildcard of poort. Leeg betekent dat externe bronlinks verborgen blijven. Alleen HTTPS-links zijn toegestaan en externe bronnen worden nooit in een iframe geladen.

Controleer deze allowlist afzonderlijk in Preview en Production. Een onbekende dossiercontext, volle onbeslisbare backendlijst, secondary lookupfout of ongeldig dossierdocumentcontract hoort als tijdelijk niet beschikbaar te verschijnen, nooit als een onvolledige PDF.

## 8. Release- en rollbackbeslissing

Voor iedere promotie moeten typecheck, lint, unit, build, performance, security-E2E en de geauthenticeerde read-only browsermatrix groen zijn. Controleer daarnaast:

- production envvars zijn aanwezig zonder ze te printen;
- owner-id hoort bij dezelfde Clerk-tenant;
- preview heeft geen onverwachte console- of `5xx`-events;
- er zijn geen echte backendmutaties vanuit E2E uitgevoerd;
- PWA-update en sign-out wissen private runtimecache;
- de vorige stabiele deployment is als rollbackdoel bekend.

Rollback de frontenddeployment wanneer auth, shell, BFF of private-cache-invarianten breken. Database- of provideracties vallen buiten een frontendrollback en vereisen hun eigen gecontroleerde procedure.
