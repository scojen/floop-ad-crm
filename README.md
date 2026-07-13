# Floop Ad CRM

React frontend for the Meta lead ads CRM. The backend is the `ad-manager-api`
sibling repo (NestJS microservice, `src/modules/crm/*`) — this app is UI only.

Product spec: `ad-manager-api/meta-leads-crm-spec.md` · wireframes:
`ad-manager-api/crm-wireframes.html`.

## Screens

| Route | Screen | Status |
|---|---|---|
| `/campaigns` | Read-only campaigns dashboard (status, spend, CTR, CPL, leads) | ✅ v0 |
| `/connections` | Platform connection health + sync log + Test button | ✅ v0 |
| `/inbox` | Lead triage queue (shared, oldest-unclaimed-first) | Phase 2 |
| `/pipeline` | Kanban board with claim/aging indicators | Phase 3 |
| `/leads/:id` | Lead detail: attribution + activity timeline + outcome | Phase 3 |
| `/my-day` | Rep task queue | Phase 4 |
| `/reports` | Funnel / cost-per-qualified-lead / creative performance | Phase 4 |
| `/automations` | When-X-do-Y rules + runs log | Phase 4 |

## Stack

Vite + React 19 + TypeScript, Tailwind CSS v4, react-router, TanStack Query,
@dnd-kit (pipeline board), oxlint.

## Run

```bash
cp .env.example .env   # then fill in:
# VITE_CRM_BASE_URL   ad-manager-api base URL (default http://localhost:3001)
# VITE_CRM_TOKEN      must equal ad-manager-api's SERVICE_AUTH_TOKEN
# VITE_CRM_CLIENT_ID  the single-tenant client UUID

npm install
npm run dev            # http://localhost:5173
```

The backend must allow this origin via its `CRM_CORS_ORIGINS` env var
(defaults to `http://localhost:5173`).

## Rep identity

On first load the app asks "who's working?" (users come from `GET /crm/users`,
seeded via `ad-manager-api/scripts/seed-crm-users.ts`). The selection is stored
in localStorage and sent as `X-Actor-Id` on every request — it attributes
claims/activities to a rep; it is **not** authentication. API access is gated
by the static bearer token, so don't host this UI publicly.

## Conventions

- `src/api/crmClient.ts` — single fetch client (mirrors frontend-floop's pattern)
- `src/api/queries.ts` — all TanStack Query hooks + query keys
- `src/types/*` — hand-mirrored backend DTOs; keep in sync with
  `ad-manager-api/src/modules/crm/**/dto` when the API changes
