# Initial review packet

## Assignment

Read-only audit of Inbox -> AI Reply -> Guest Profile -> service-sales boundary.
Do not implement changes, run production migrations, send messages or publish.

## Baseline

- Original Sites branch: main
- Original application commit: 450d7c96c467f3fb8464639110ae0a5d4fa22ca9
- Hosted version checked by Travis: 21
- Audit date: 18 October 2026, Vietnam
- This GitHub repository begins with a source snapshot plus handoff documents; its Git commit is different.
- Application-source hashes and export mapping: SOURCE_MANIFEST.json

## Read first

START_HERE.md, CURRENT_STATE.md, DECISIONS.md, BACKLOG_V1.md, docs/DEVELOPMENT.md.

## Code focus

- db/schema.ts
- app/api/ota/route.ts
- app/api/ota/ingest/route.ts
- app/api/ota/reconcile/route.ts
- lib/ota.ts, lib/ota-store.ts, lib/ota-stay.ts
- lib/ota-profile.ts, lib/ota-profile-store.ts, lib/ota-rewrite.ts
- app/ota-workspace.tsx, app/ota-guest-summary.tsx
- app/api/workspace/route.ts, app/api/quotes/route.ts
- lib/quotes.ts, lib/reception.ts, lib/luxe-knowledge.ts
- tests/ota.mjs, tests/ota-profile.mjs, tests/ota-stay.mjs

## Questions for Claude

1. Which implemented behaviors have direct code evidence?
2. Are approval, stale-context checks, property isolation and manual-send records consistently enforced?
3. Where could duplicate/reordered events, ambiguous source content or guest changes cause a wrong profile/draft?
4. Does the implementation preserve guest refusals and known details without making unsupported promises?
5. What is the smallest safe bridge from live OTA threads to real guest/requests/quotes, without mixing demo data?
6. Which V1 backlog items should be verification/extension rather than new development?

Return actionable findings with severity, path/line, trigger, observed or inferred behavior, impact and a test to validate. Label unexecuted tests and unavailable production evidence explicitly. Separate defects from feature gaps and suggestions. Do not mark business UAT complete based on static review.

## Subsequent review packets

Each implementation packet should name the issue, base/head commits, changed files, diff, actual test results, data/migration impact, rollback approach and remaining questions. Claude Chat's GitHub sync does not fetch PR metadata or history, so include review-relevant evidence in files or provide the diff explicitly. Never imply a PR was read solely because branch files were synced.
