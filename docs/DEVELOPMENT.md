# Development and validation

## Stack and environment

React 19, TypeScript, Vinext/Vite, Cloudflare Worker and D1/SQLite with Drizzle migrations. package-lock.json pins dependencies. Node >=22.13 is declared in package.json.

A clean clone defaults to the portable execution profile. The original Windows ARM machine used a local x64 Node/runtime for workerd; this runtime is not distributed. Use a compatible Node/OS environment and record it. Fresh-clone reproducibility has not been independently verified during this handoff.

## Install and build

Run from repository root, with network access for package installation:

```sh
npm run install:ci
npx tsc --noEmit --incremental false
npm run build
```

Do not alter the lockfile just to hide an environment failure. If network or native runtime support is unavailable, report the exact blocker and do not claim tests passed.

## Isolated tests

The following scripts build small local bundles and create ephemeral Miniflare D1 databases or inspect snapshot JSON. They write local .quote-tests/ artifacts but should not contact the production CRM:

```sh
node tests/ota.mjs
node tests/ota-profile.mjs
node tests/ota-stay.mjs
node tests/ota-draft-notice.mjs
node tests/quotes.mjs
node tests/reception.mjs
node tests/replies.mjs
node tests/source-data.mjs
node tests/review-queue.mjs
node tests/analysis.mjs
```

Run sequentially because generated paths may overlap. Read tests before running them. AI tests use mocked providers; they are not the 60-case business quality evaluation. Some fixture dates and catalog expiry are fixed in October 2026 and may become stale. No aggregate npm test script or CI certification is provided yet.

tests/local-flow.mjs is a separate browser-server integration script hard-coded to localhost:5174. It resets that local demo database and has outdated 20-record expectations. Do not use it unchanged as a release gate or redirect it at production.

## Local UI

npm run dev uses port 5173 in the portable profile. The Vite config binds a local D1 placeholder; local migrations must be applied to the local database before exercising APIs. Do not paste the production database ID into a local reset workflow.

After npm run build, npm run start starts local wrangler from dist/server/wrangler.json with state under .wrangler/state. Any local migration command must explicitly use local mode and the same state directory. Verify the generated configuration and database binding before applying it. `npm run db:local:migrate` applies drizzle/ to that local database via wrangler.local-db.jsonc (placeholder ID, --local, .wrangler/state); see docs/LOCAL_SETUP.md for start/stop/reset steps and the synthetic OTA seed.

## Environment variables

OPENAI_API_KEY: optional for a live AI call; synthetic test suites do not require a production key.
CRABS_INGEST_TOKEN: server-side intake secret.
CRABS_POLLING_ENABLED: UI/configuration flag; not independent proof Make is healthy.

Use ignored local environment files or the host's secret manager. Never copy production secrets into Claude Chat, GitHub documents or test fixtures. No real credentials are included here.

## Production boundaries

getChatGPTUser trusts headers from the Sites authentication layer. Production runs behind Sites; do not assume a standalone Worker deployment has equivalent access protection.
GET /api/workspace may seed/import demo rows; GET /api/ota?id=<thread> may write an AI profile cache. Inspect routes before treating a GET as read-only.
The real ingest endpoint, Make and live database must not be used for tests.
