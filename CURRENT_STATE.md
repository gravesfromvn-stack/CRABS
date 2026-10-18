# CRABS current state

Audit date: 18 October 2026, Asia/Ho_Chi_Minh.
Application baseline: 450d7c96c467f3fb8464639110ae0a5d4fa22ca9.
Sites publication: version 21; succeeded 17 October 2026 at 23:50:38 Vietnam time.
Production URL: https://tourflow-sales-demo.decentbell2.chatgpt.site/
Audience checked during the audit: owner only; no additional editors or groups.

Production counts observed in the UI during the audit: 802 imported emails, 204 items needing action, 4 needing reconciliation, 0 manually recorded sends. These are time-bound observations, not current guarantees or unique guest counts. Zero recorded sends does not prove guests have never been answered outside CRABS.

## Implementation map

| Module | Current implementation | Evidence | Remaining limitation |
|---|---|---|---|
| OTA intake | Gmail full MIME through Make, property/channel/reservation matching, duplicate guards, unresolved queue | app/api/ota/ingest/route.ts; lib/ota.ts; lib/ota-store.ts | Email-only coverage; attachments not ingested; no guarantee all OTA messages appear |
| Draft review | Save revisions, AI rewrite from intent, approval, copy, explicit manual-send record, stale-context guards | app/api/ota/route.ts; app/ota-workspace.tsx; lib/ota-rewrite.ts | No direct OTA sending or delivery receipt; no complete formal reject-with-reason workflow |
| Guest needs | Source-backed arrival, room/stay requests, pickup/dropoff and itinerary; chronological updates | lib/ota-profile.ts; lib/ota-profile-store.ts; app/ota-guest-summary.tsx | Per-thread profile cache, not a cross-stay customer master or staff-owned fulfillment record |
| Reception | Dates, preferences, requests, status, due date and assignee | lib/reception.ts; app/hotel-workspace.tsx; app/api/workspace/route.ts | Demo/anonymized workspace; assignees are sample labels, not authenticated staff |
| Quotes | Tours and transfers, financial calculation, revisions, expiry, internal approval | lib/quotes.ts; app/api/quotes/route.ts; app/quote-workspace.tsx | 7 demo products; draft/approved states only; no accepted quote to service order |
| Catalog and knowledge | Historical sources, templates and demo product descriptions | lib/demo-data.ts; lib/luxe-knowledge.ts; lib/reply-template-library.json | No live supplier catalog with approved price/terms lifecycle |
| Orders and fulfillment | Not implemented as an operational order lifecycle | db/schema.ts; API routes | Need supplier confirmation, participants, pickup schedule, tasks and completion |
| Payments and refunds | Quote arithmetic exists; payment ledger does not | db/schema.ts; lib/quotes.ts | Need actual payments/refunds/references/allocations and reconciliation |
| Reporting | Inbox counters; historical anonymized 75PHT aggregates | app/analysis-workspace.tsx; lib/analysis-data.json | Not current revenue/cash/order reporting |
| Access | ChatGPT login, owner-scoped records, private Site | app/chatgpt-auth.ts; db/schema.ts; API routes | No shared tenant/property staff permissions |
| Export and recovery | Demo workspace export includes quotes | app/workspace.tsx exportData | Does not export the OTA store; no documented full restore drill |
| Hotel Link/PMS | Waiting for API access | README history; app/ota-workspace.tsx | No active adapter, credentials or verified messaging access |

## Two data paths to connect carefully

```text
OTA email -> Make -> ota_events -> ota_threads -> ota_guest_profiles / ota_drafts -> human copy/send
Static anonymized Sheets snapshot -> contacts/messages/reception -> reply_drafts / quote_versions
```

There is no live bridge from OTA threads to the demo contacts/quotes workspace. Building that bridge requires real guest/reservation/request identities, not importing raw guest data into demo bundles.

The database currently defines contacts, messages, activity, settings, reply_drafts, quotes, quote_versions, ota_mailbox, ota_events, ota_threads, ota_drafts, ota_sent, ota_reviews, ota_guest_profiles.

## External flow evidence

Make scenario 6661902 (“Crabs · OTA Gmail mới → hộp thư & nháp duyệt”) was active when inspected on 18 October. Schedule: 900 seconds. Gmail connection status was ok, no incomplete executions blocked it; returned recent executions were successful. The separate 30-day import is on demand (6662351). No scenario was run or edited during the audit.

## Source data limits

lib/source-demo-data.json is snapshot 75pht-snapshot-2026-10-15-v1: 151 anonymized profiles, 58 with conversation text and 76 service rows, spanning multiple property labels. These are not 151 verified 75PHT guests. Sheets updates do not automatically update CRABS and CRM edits do not write back to Sheets.

The 75PHT analysis inventory covered 26 workbooks and 212 value tabs in earlier work. It excludes unverified sources and does not prove all historical customer data was collected.

## Known gaps and review targets

- The hotel checkout-time sources conflict (11:00 versus 12:00); historic airport transfer prices remain unapproved. See lib/luxe-knowledge.ts.
- GET /api/ota?id=<thread> can extract/cache an AI profile and write derived data. GET /api/workspace can seed/import demo data. Do not use these as strictly side-effect-free production audit probes.
- AI extraction is invoked in the intake/detail path; no durable background AI job queue or global budget control is implemented.
- Some test fixtures and demo price dates are fixed in October 2026. tests/local-flow.mjs still expects a 20-contact seed although the current workspace adds source profiles.
- VALIDATION.md is a chronological historical record, not a current full-suite certificate.
- A correct exact quote citation does not itself prove the AI summary is semantically correct.
- No evidence yet of a complete pilot, full recovery drill or the proposed 60-case business AI evaluation.

## Verification boundary

Prior implementation work recorded TypeScript/build success and 38 OTA plus 17 profile checks passing for the latest feature work. This handoff preparation did not rerun those application tests. The 18 October audit checked source, hosted version identity, current UI and Make status/history; it performed no application mutations. Fresh-clone build/test results must be recorded when actually run.

Local run on 18 October 2026 (Claude, branch claude/local-setup, Windows ARM64 with Node 22.23.3 x64, npm 10.9.9): tsc and npm run build passed; local D1 migrated (0000–0007); npm run dev served the UI with local mock sign-in; the nine isolated suites passed (ota 38, ota-profile 17, ota-stay 1, quotes 14, reception 6, replies 14, source-data 12, review-queue 8, analysis 8). tests/local-flow.mjs was not run. Synthetic OTA emails exercised matching, profile, draft edit/approve/manual-sent end to end without an AI key. Details and observed defects: REVIEW_PACKET.md "Local setup packet". This is local evidence only, not production or UAT acceptance. Later on the same branch (62cd06f, eadd2b3) both observed defects were fixed with reproduction tests; the full run then passed 10 suites, 125 checks (REVIEW_PACKET.md "Fix packet").


## Local anonymized OTA corpus (Travis, 18 October 2026)

The local OTA dataset now contains a static anonymized snapshot of 803 emails, 215 threads, 383 draft revisions and 89 reviews. Local UI verified 803/205/4/0. Production is unchanged; non-OTA local tables are unchanged. Derived profile caches rebuild locally, with no AI key. See REVIEW_PACKET and the ignored private-data/crabs-803-2026-10-18/README-CHO-CLAUDE.md for evidence, limits and backup.

Automatic drafts from approved templates (Claude, 18 October 2026, local only): per-booking approvals are separate from reusable templates (ota_templates, migration 0008); unapproved, unsupported or changed cases go to "Cần Cua xử lý" with reasons; 152 checks passed. No template exists yet; Cua creates them. See docs/AUTO_DRAFTS.md and REVIEW_PACKET.md "Feature packet".
