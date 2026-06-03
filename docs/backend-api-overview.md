# Backend API Overview For Codex

This file is the first place to read when working on frontend code that calls the Go backend.

## Runtime Topology

```text
Browser/React
  -> Next.js route handler: /api/backend/[...path]
  -> Render backend: https://jeffriesbackend.onrender.com/api/v1
  -> Render Postgres
  -> optional local engine bridge for WiZ UDP lamp commands
```

The browser must call the local frontend proxy, not Render directly.

| Context | Base URL to use | Auth behavior |
|---|---|---|
| React components/hooks | `/api/backend` | No API key in browser code |
| Next.js proxy | `BACKEND_API_URL` or `NEXT_PUBLIC_API_URL` | Injects `X-API-Key` server-side |
| Direct backend debugging | `https://jeffriesbackend.onrender.com/api/v1` | Requires `X-API-Key` except public routes |

## Files To Read

| Purpose | File |
|---|---|
| Frontend proxy | `app/api/backend/[...path]/route.ts` |
| Manual frontend client | `lib/api.ts` |
| Orval mutator for generated clients | `lib/orvalMutator.ts` |
| Generated React Query clients | `lib/api/generated/**` |
| Generated API models | `lib/api/model/**` |
| Orval input config | `orval.config.ts` |
| Machine-readable route map | `docs/backend-api-map.json` |
| Backend route source of truth | Prefer `../JeffriesBackend-render-fix/backend/internal/server/routes.go`; fallback `../JeffriesBackend/backend/internal/server/routes.go` |
| Backend Swagger contract | Prefer `../JeffriesBackend-render-fix/backend/docs/swagger.json`; fallback `../JeffriesBackend/backend/docs/swagger.json` |

## Auth Rules

- Public direct backend routes:
  - `GET /`
  - `HEAD /`
  - `GET /api/v1/health`
  - `GET /api/v1/swagger/*`
- Every other `/api/v1` route is private when called directly and requires `X-API-Key`.
- Frontend code should never read or send `NEXT_PUBLIC_API_KEY`.
- The proxy injects the key from `BACKEND_API_KEY`, `APP_SECRET_KEY`, or the old fallback `NEXT_PUBLIC_API_KEY`.
- Prefer server-only env vars in production: `BACKEND_API_URL` and `BACKEND_API_KEY`.

## How To Call The API From Frontend Code

Use the manual client when the feature already uses `lib/api.ts`:

```ts
import { devicesApi } from "@/lib/api";

const devices = await devicesApi.list();
```

Use generated clients when the feature already imports from `lib/api/generated/...`:

```ts
import { useGetSettingsOverview } from "@/lib/api/generated/settings/settings";

const { data } = useGetSettingsOverview();
```

Both paths go through `apiFetch`, which prefixes `/api/backend`.

## Route Groups

All paths below are frontend paths. Direct backend paths are the same after replacing `/api/backend` with `/api/v1`.

| Group | Methods and paths | Notes |
|---|---|---|
| System | `GET /health` | Public on direct backend. |
| Rooms | `GET/POST /rooms`, `GET/PATCH/DELETE /rooms/{roomID}` | Room CRUD. Supports `skip`, `limit` on list. |
| Devices | `GET /devices`, `GET/PATCH/DELETE /devices/{deviceID}`, `POST /devices/register`, `POST /devices/{deviceID}/command` | Lamp/device CRUD and command queue entrypoint. |
| Scenes | `GET/POST /scenes`, `GET/DELETE /scenes/{sceneID}`, `POST /scenes/{sceneID}/activate` | Scene activation queues or sends WiZ commands depending backend mode. |
| Automations | `GET/POST /automations`, `PUT/DELETE /automations/{id}`, `POST /automations/{id}/toggle`, `DELETE /automations/group` | Uses `userId`; group delete also uses `group`. |
| Schedule | `GET /schedule`, `GET /schedule/meta`, `GET /schedule/date/{date}`, `POST /schedule/import` | Uses `userId`; date format is `YYYY-MM-DD`. |
| Transactions | `GET /transactions`, `GET /transactions/stats`, `POST /transactions/import`, `PATCH /transactions/{txID}` | Uses `userId` and finance filters. |
| Salary | `GET/POST /salary`, `GET /salary/periode` | Uses `userId`; periode endpoint uses `periode`. |
| Loonstroken | `GET /loonstroken`, `POST /loonstroken/import` | Uses `userId`. |
| Personal events | `GET/POST /personal-events`, `GET /personal-events/upcoming`, `GET /personal-events/date/{date}`, `PATCH /personal-events/{eventID}/status` | Uses `userId`; date format is `YYYY-MM-DD`. |
| Emails | `GET /emails`, `GET /emails/search`, `GET /emails/stats`, `PATCH /emails/read`, `PATCH /emails/delete` | Uses `user_id`; search uses `q`. |
| Privacy | `GET /privacy`, `PUT /privacy` | Uses `userId`. |
| Notes | `GET/POST /notes`, `GET /notes/search`, `GET /notes/tags`, `GET/PATCH/DELETE /notes/{id}`, `GET /notes/{id}/backlinks` | Uses `userId`; search uses `q` and optional `limit`. |
| Habits | `GET/POST /habits`, `GET /habits/for-date`, `GET /habits/stats`, `GET /habits/heatmap`, `GET /habits/badges`, `GET/PATCH/DELETE /habits/{id}`, `POST /habits/{id}/toggle`, `POST /habits/{id}/incident`, `POST /habits/{id}/pause`, `POST /habits/{id}/archive`, `POST /habits/reorder` | Uses `userId`; `for-date` uses `datum`; heatmap uses optional `days`. |
| LaventeCare | `GET /laventecare/cockpit`, `GET /laventecare/documents`, `GET/POST /laventecare/leads`, `PATCH /laventecare/leads/{id}`, `POST /laventecare/leads/{id}/convert`, `GET/POST /laventecare/projects`, `PATCH /laventecare/projects/{id}`, `GET/POST /laventecare/actions`, `PATCH /laventecare/actions/{id}/status`, `POST /laventecare/signals/convert-lead`, `POST /laventecare/documents/seed` | Uses backend-configured homeapp user ID instead of Clerk query params. List endpoints support `limit` where implemented. |
| Settings | `GET /settings/overview`, `GET /settings/backup`, `GET /settings/telegram/status` | Overview includes device queue counts and runtime status. Backup uses `userId`. |
| Sync | `GET /sync/status`, `POST /sync/calendar`, `POST /sync/gmail` | Manual sync endpoints use `userId`; Gmail sync is currently a placeholder response. |

## Common Query Parameters

| Param | Used by | Notes |
|---|---|---|
| `userId` | automations, schedule, transactions, salary, loonstroken, personal-events, privacy, notes, habits, backup, sync mutations | Usually Clerk user ID. |
| `user_id` | emails | Legacy snake-case email routes. |
| `skip`, `limit` | rooms, devices, scenes | Pagination-style list controls. |
| `limit`, `offset` | emails | Email paging. |
| `q` | emails/search, notes/search, laventecare/documents | Search query. |
| `datum` | habits/for-date | Date string, normally `YYYY-MM-DD`. |
| `days` | habits/heatmap | Number of days to include. |
| `ibanFilter`, `jaarFilter`, `categorieFilter`, `richting`, `datumVan`, `datumTot`, `zoekterm` | transactions | Finance filtering. |

## Render And Lamp Bridge Notes

- Render keeps the API, background jobs, Telegram, sync, and Postgres online.
- WiZ lamps are LAN/UDP devices, so cloud commands are written into `device_commands`.
- A local engine bridge can claim queued commands from Render Postgres and send UDP to the lamps.
- Settings overview exposes queue status:
  - `bridge.commandsPending`
  - `bridge.commandsProcessing`
  - `bridge.commandsFailed`
  - `automations.commands.processing`

## Regenerating Typed Clients

Backend Swagger is generated from Go comments:

```bash
cd C:\Users\jeffrey\Desktop\Projecten\JeffriesBackend-render-fix\backend
go run github.com/swaggo/swag/cmd/swag@v1.16.6 init -g cmd/api/main.go
```

Frontend clients are generated from that Swagger file:

```bash
cd C:\Users\jeffrey\Desktop\Projecten\JeffriesHomeapp
npx orval
```

`orval.config.ts` resolves Swagger in this order:

1. `BACKEND_SWAGGER_PATH`
2. `../JeffriesBackend-render-fix/backend/docs/swagger.json`
3. `../JeffriesBackend/backend/docs/swagger.json`

After changing backend routes, regenerate Swagger first, then Orval clients.

## Adding Or Changing Endpoints

1. Add or update the Go handler and Swagger annotations.
2. Mount the route in `backend/internal/server/routes.go`.
3. Regenerate `backend/docs/swagger.json`.
4. Regenerate frontend Orval clients if the endpoint is used through generated hooks.
5. Update `docs/backend-api-map.json` and this overview.
6. Use `/api/backend/...` in browser-facing code.
