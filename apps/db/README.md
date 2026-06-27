# @linga/db

Local Supabase database for Linga. Holds all Supabase code: schema migration, the
batch-import RPC, and the Supabase CLI config. The frontend (`apps/app`) reads data
from this database via PostgREST.

## Data model

`Units → (Vocab + Challenges)`, each row keyed by its own UUID:

- **units** — `id`, `title`, `position`, `created_at`
- **vocab** — `id`, `unit_id` → units, `ka`, `ru`
- **challenges** — `id`, `unit_id` → units, `type` (`fill_choice` | `order` | `fill_type`), `data` (jsonb)

Reads are public (anon `SELECT`). Writes happen only through the import RPC below.

## Prerequisites

- **Docker** must be installed and running (the Supabase CLI starts the stack in Docker).
- Dependencies installed from the repo root: `npm install`.

## Run

From this directory (`apps/db`):

```bash
npm run start    # supabase start  — boots Postgres + REST + Studio in Docker
npm run status   # prints the local URLs and anon / service_role keys
npm run stop     # supabase stop
npm run reset    # supabase db reset — drop + re-apply migrations (empty DB)
```

Or from the repo root: `npm run db:start`, `npm run db:stop`, `npm run db:reset`.

Local URLs (defaults): API `http://127.0.0.1:54321`, Studio `http://127.0.0.1:54323`,
Postgres `127.0.0.1:54322`. The exact anon / service_role keys are printed by
`npm run status`.

## Batch import (a single HTTP POST)

Load units by POSTing a JSON body **in the exact shape of `data/units.json`**
(a top-level array of `{ title, vocab: [{ ka, ru }], challenges: [{ type, data }] }`)
to the `import_units` RPC. The function has a single unnamed `jsonb` parameter, so
PostgREST passes the raw request body straight to it — no wrapper object and no
special headers needed.

Seed the database with the bundled dataset:

```bash
curl -X POST http://127.0.0.1:54321/rest/v1/rpc/import_units \
  -H "apikey: $SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  --data-binary @data/units.json
```

The response is the number of units imported. Import appends; run `npm run reset`
first if you want to start from an empty database. Use the **service_role** key
(`npm run status`) — the anon key is read-only and cannot import.

## Generate TypeScript types (optional)

```bash
npm run gen:types   # writes ../app/src/types/database.ts from the live local schema
```
