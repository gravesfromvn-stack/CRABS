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

## Local setup packet (18 October 2026)

- Implementer: Claude (Claude Code desktop), branch claude/local-setup, base 37c816b. Not pushed, merged or deployed.
- Environment: Windows 11 ARM64, Node v22.23.3 x64, npm 10.9.9, workerd 2026-05-15. No OPENAI_API_KEY. Local-only random CRABS_INGEST_TOKEN in ignored .env.
- Changed files: package.json (adds db:local:migrate), wrangler.local-db.jsonc (local D1 config, placeholder ID), scripts/local-seed-ota.mjs (5 synthetic OTA emails to 127.0.0.1 only), docs/LOCAL_SETUP.md, links in README.md and docs/DEVELOPMENT.md, CURRENT_STATE.md, this section, BACKLOG_V1.md notes. No application code, auth or migration changed.
- Data/migration impact: local .wrangler/state only; rollback = delete .wrangler/state/v3/d1 and rerun db:local:migrate.

Executed and passed: tsc --noEmit; npm run build; npm run db:local:migrate (8 migrations); npm run dev with mock sign-in (anonymous / -> 307, /api/workspace -> 401, signed-in UI loads); the nine isolated suites (118 checks, see CURRENT_STATE.md). npm run start runs on 127.0.0.1:8787 but has no local sign-in (/signin-with-chatgpt 404, API 401) - expected, not bypassed.

Not run: tests/local-flow.mjs (fixed port 5174, resets demo DB, stale 20-contact expectation); live AI paths; Make/Gmail intake; any production check.

UI flows checked with synthetic/demo data: OTA inbox counters; booking matching (same booking ID at a different property -> separate thread; same guest name, different booking -> separate thread; DMARC fail -> needs_match outside threads; replay -> duplicate); conversation header shows guest name and check-in/out; profile shows room request as "chưa xác nhận đáp ứng" and transfer refusal as "Khách từ chối"; draft does not re-offer the refused transfer and promises no room/price; edit -> save (v3 pending) -> approve -> copy -> confirmed manual-sent record (v3 sent, one ota_sent row; approval alone did not record a send). Reception, service sales and quotes screens load the 20 sample + 151 anonymized profiles without console errors.

Observed defects (not fixed in this session):
1. Low/medium - lib/ota-profile.ts:24: rule-based arrival extraction skips any sentence that also mentions a flight or landing, so "We land at 13:30 on flight VN 123 and expect to reach the hotel around 15:00" leaves "Dự kiến đến: Chưa có giờ đến". Hotel impact: without an AI key, reception may ask a guest for an arrival time already given. Test: add this sentence to tests/ota-profile.mjs and expect an arrival fact (or an explicit "flight time only" fact) without conflating landing with hotel arrival.
2. Low - app/api/ota/route.ts:91: a manual save stores "Cua đã sửa nội dung; cần duyệt phiên bản này." in the draft notes, and the UI keeps showing it after that revision is approved and recorded as sent. Hotel impact: staff may think a sent reply still needs approval (status badge and history are correct). Test: after approve/sent, the draft panel note reflects the current status.
