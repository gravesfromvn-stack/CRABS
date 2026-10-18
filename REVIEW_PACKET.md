# Initial review packet

## Tour knowledge supplement — 18 October 2026

User requested a recheck of Private DATA INBOUND TOUR and updates to rates/itinerary knowledge while Claude integrates separately. Implemented on travis/tour-knowledge from fd3c423, keeping travis/daily-operation at its prior head and leaving the Claude checkout untouched.

New source-first products view, five provider-page research summaries, official AI09 evidence, commercial gaps and 28 corrected program-row links. Optional websiteReview is frozen in newly saved quote evidence; no rewrite of old versions and no price promotion. The historical Sheet amounts remain unchanged. No API routes, OTA logic, migrations, dependencies, Make or production writes changed.

Validation: TypeScript/build passed; 5 tour-research, 8 quote-sources and 17 isolated quote-API checks passed. The new test initially exposed two test-fixture mistakes (non-Sheet document heading tested as A1 range; omitted children field); both fixtures corrected before passing. UI verified search, variant evidence, 14-day timeline and advice/confirmation tabs. Build still warns on large chunks. Not a live-availability, supplier-contract or full V1 UAT test.

Details and integration steps: docs/TOUR_KNOWLEDGE_HANDOFF.md. Rollback this supplement by reverting its commit; no DB migration/restore needed. Preserve later user/Claude changes when reverting shared files.

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

Observed defects (fixed later on this branch, see "Fix packet" below):
1. Low/medium - lib/ota-profile.ts:24: rule-based arrival extraction skips any sentence that also mentions a flight or landing, so "We land at 13:30 on flight VN 123 and expect to reach the hotel around 15:00" leaves "Dự kiến đến: Chưa có giờ đến". Hotel impact: without an AI key, reception may ask a guest for an arrival time already given. Test: add this sentence to tests/ota-profile.mjs and expect an arrival fact (or an explicit "flight time only" fact) without conflating landing with hotel arrival.
2. Low - app/api/ota/route.ts:91: a manual save stores "Cua đã sửa nội dung; cần duyệt phiên bản này." in the draft notes, and the UI keeps showing it after that revision is approved and recorded as sent. Hotel impact: staff may think a sent reply still needs approval (status badge and history are correct). Test: after approve/sent, the draft panel note reflects the current status.

## Fix packet: arrival with flight time, approval prompt, seed exit code (18 October 2026)

- Branch claude/local-setup. Base 57b17ab (local setup). Commits: 62cd06f (two defects + tests), eadd2b3 (seed exit code), followed by this documentation commit. Not pushed, merged or deployed.
- Environment and data: as in the local setup packet; local D1 and synthetic data only, no AI key.

Changes:
1. lib/ota-profile.ts: a sentence that mentions a flight/landing is no longer dropped entirely. It is split into clauses (",", ";", and/then/but/so, và/rồi/nhưng/sau đó); a clause with a clock time that names the hotel (arrive/reach/get to … hotel, check-in, đến khách sạn, nhận phòng) and no flight word becomes the arrival fact, summarised as "Đến khách sạn khoảng 15:00 · giờ chuyến bay 13:30 (không phải giờ đến khách sạn)". The source quote is the full guest sentence. Flight-only sentences ("Our flight will arrive at 14:00", "We land at 13:30 and will take a taxi") still record no arrival. A sentence without a hotel clause ("land at 13:30 and arrive around 15:00") is still not recorded — conservative by design.
2. lib/ota-profile-store.ts: when the cached profile for the current context is rule-based, its facts are re-derived from the current rules on read (no DB write, no AI call). Without this, threads cached before change 1 would keep "Chưa có giờ đến" until the next guest message. AI-generated profiles keep their cache; the v4- cache key was not bumped to avoid re-running AI for every thread.
3. lib/ota-draft-notice.ts + app/ota-workspace.tsx: the draft panel note is computed from draft status. Pending: unchanged composition note. Approved: "Phiên bản N đã duyệt; chưa ghi nhận gửi…". Approved but stale (new guest message): "Có tin khách mới sau khi duyệt phiên bản N; duyệt lại trước khi copy gửi." Sent: "Phiên bản N đã được ghi nhận gửi thủ công trên OTA." For approved/sent the phrases "cần duyệt phiên bản này" and "chưa được duyệt" are removed from the displayed composition note only. Stored ota_drafts.notes, bodies and revision history are unchanged.
4. scripts/local-seed-ota.mjs: each email is marked OK/FAIL; HTTP errors, non-JSON responses and ignored emails set exit code 1.

Reproduction first, then fix (actual runs):
- tests/ota-profile.mjs new check "Hotel arrival after a flight landing…" failed before change 1 (AssertionError: hotel arrival must be recorded); "Rule profile cached by older rules is re-derived…" failed before change 2 (TypeError reading summary of missing arrival). Both pass after.
- tests/ota-draft-notice.mjs (new, Miniflare D1, synthetic Booking.com mail) failed before change 3 at "Approved draft no longer shows the approval prompt" (displayed '…cần duyệt phiên bản này.'). After: 5/5 pass, covering pending rule draft, manual edit pending, approved, approval invalidated by a new guest message (old contextKey approve -> 409, panel asks to re-approve) and recorded manual send, with stored notes/bodies of earlier revisions unchanged.
- Seed: with a wrong token the script printed five 401s and exited 0 before change 4; after, exit 1 with "5 of 5 synthetic emails were not ingested." With the valid local token: five OK (duplicates), exit 0.

Full run after all changes (Windows ARM64, Node 22.23.3 x64): tsc --noEmit passed; npm run build passed; ota 38, ota-profile 19, ota-stay 1, ota-draft-notice 5, quotes 14, reception 6, replies 14, source-data 12, review-queue 8, analysis 8 — all passed (125 checks). tests/local-flow.mjs not run (same reasons as above).

Local UI check (npm run dev, synthetic thread #5900000001 at 75PHT, already recorded as sent before the fix): profile shows "Đến khách sạn khoảng 15:00 · giờ chuyến bay 13:30 (không phải giờ đến khách sạn)"; the draft panel shows "Phiên bản 3 đã được ghi nhận gửi thủ công trên OTA." and no "cần duyệt phiên bản này".

Data/migration impact: none (no schema or stored-data change). Rollback: revert 62cd06f and eadd2b3.

For review / still open:
- The AI profile path is unchanged; whether the model separates flight and hotel times is untested (needs the AI evaluation set, not mocks).
- Departure extraction (lib/ota-profile.ts, departure regex) can still take a flight departure time ("flight leaves at 10:00") as hotel departure — same class of issue, not changed here.
- AI composition notes ("Rà nội dung trước khi duyệt") are not rewritten for approved/sent drafts; only the two pending-approval phrases are.
- Not done in this turn by instruction: OTA thread -> reception/request bridge.

## Fix packet 2: arrival time meaning, questions/rules, corrections (18 October 2026)

- Branch claude/local-setup. Base 82c1d56 (reviewed by Travis: 24 ota-profile + ota-draft-notice checks passed). One commit on top. Not pushed, merged or deployed. Synthetic sentences only; no AI key.
- Changed: lib/ota-profile.ts (rule-based extraction only), tests/ota-profile.mjs (+6 checks), this section. AI profile cache, cache key, stored drafts and approval history untouched (lib/ota-profile-store.ts unchanged in this commit).

Behaviour (summary shown in the profile; the source quote stays the full guest sentence):

| Guest sentence | Before (actual run) | After (actual run) |
|---|---|---|
| Our flight lands at 1:30 PM and we will arrive at the hotel at 3:00 PM. | Đến khách sạn 3:00 · giờ chuyến bay 1:30 | Đến khách sạn 15:00 · giờ chuyến bay 13:30 |
| … lands at 13:30 and we will arrive at the hotel between 15:00 and 16:00. | Đến khách sạn 15:00 | Đến khách sạn trong khoảng 15:00–16:00 |
| … lands at 13:30 and we will not arrive at the hotel before 18:00. | Đến khách sạn 18:00 | Đến khách sạn không trước 18:00 |
| Our flight lands at 08:00 and can we check-in at 10:00? | arrival: Đến khách sạn 10:00 | no arrival; stay request (requested): Khách hỏi nhận phòng lúc 10:00 · chưa xác nhận · giờ chuyến bay 08:00 |
| … lands at 13:30 and the hotel says check-in is from 15:00. | arrival 15:00 | no arrival (Chưa có giờ đến) |
| … arrive at the hotel at 15:00, but we will arrive at the hotel at 18:00 instead. | arrival 15:00 | Đến khách sạn 18:00 · khách đã đính chính (trước đó: 15:00) |
| Can we check in at 10:00? (no flight) | arrival provided | no arrival; stay request (requested) |
| The hotel says check-in is from 15:00. (no flight) | arrival provided | no arrival |

Every "after" summary for a flight sentence ends with "· giờ chuyến bay HH:MM (không phải giờ đến khách sạn)" when a landing time is given.

How: clock times are parsed to 24-hour HH:MM (am/pm, 15h, 15h30, giờ); bare numbers such as "2 adults", "26 October", "VN 123" are not times. "between A and B" stays in one clause. A hotel clause is skipped if it is a question or a quoted hotel rule. Qualifiers: range, "không trước", "sau", "trước", "chậm nhất" (by / no later than), "khoảng". Any other negation, two different hotel times without a correction word (instead/actually/rather/thay vào đó/đổi thành…), or two times that are not a range leave arrival unknown.

Reproduction first: the new checks were added before the change; the first failed with actual 'Đến khách sạn 3:00 · giờ chuyến bay 1:30 …' and a probe of all eight sentences above produced the "Before" column. After the change all pass.

Draft re-asking: each new case runs followupDraft on the resulting profile and asserts the draft does not ask for arrival time, check-in time or flight details.

Full run after the change (Windows ARM64, Node 22.23.3 x64): tsc --noEmit passed; npm run build passed; ota 38, ota-profile 25, ota-stay 1, ota-draft-notice 5, quotes 14, reception 6, replies 14, source-data 12, review-queue 8, analysis 8 — all passed (131 checks). tests/local-flow.mjs not run. Local UI not re-checked for this commit (extraction-only change; covered by unit checks and the cache re-derivation check from 62cd06f).

Behaviour changes to note in review:
- Non-flight sentences that ask to check in at a time ("Can we check in at 10:00?", "Is it possible to check in early at 11:00?") were previously stored as provided arrival; they are now stay requests. Non-flight statements still use the full sentence as summary (unchanged).
- Conservative gaps (left unknown, not guessed): a single clause holding both flight and hotel ("We get to the hotel by taxi around 15:00 after our flight lands at 13:30"); "arrive around 15:00" without naming the hotel in a flight sentence; questions about arrival without check-in wording. Departure/flight-departure separation is still not addressed.


## Local anonymized OTA corpus (Travis, 18 October 2026)

Cua explicitly requested an anonymized copy of the 803 live OTA emails for Claude's localhost testing, preserving property/booking relationships and reply history without changing production. Imported into the existing local_seedy D1 database after a SQLite backup of the 5-email synthetic dataset. No application code, migration, online data, Make setting, guest send, Git commit/push or deployment was changed.

Counts: 803 events, 215 threads (55 luxe-75pht, 160 luxe-suites), 383 draft revisions, 89 reconciliation reviews, 0 sent records. UI confirmed 803 received / 205 needing action / 4 reconciliation / 0 sent. Latest drafts: 138 pending, 67 needs_writing, 10 approved. Direct identifiers are replaced consistently; raw source records and reverse maps are not in the Claude checkout. The 11 derived profile caches were excluded and local rules rebuild profiles; historical drafts and reviews were preserved. Operational dates and semantics remain, so this private test corpus must not be published.

Evidence: 215/215 stay extractions and source links preserved; 215/215 draft-history metadata preserved; 803 guest clock-time checks passed; relationship and stale-context checks passed; SQLite integrity ok; non-OTA tables and other owners unchanged. UI opened Guest 0080's two-email/two-version history. On application commit 0ca901b, Travis independently reran ota-profile (25 PASS) and ota-draft-notice (5 PASS); this is not an independent rerun of all 131 checks/build or completed UAT.

Local handoff, immutable snapshot, reports and pre-import backup: private-data/crabs-803-2026-10-18/README-CHO-CLAUDE.md. This directory and .wrangler/ are Git-ignored. Labels/links to the original mailbox and Make still exist in the UI; they are not proof of live local intake. Do not use external links or anonymized replies for real guest work. No OTA-to-reception bridge was added.

## Feature packet: drafts from approved templates and "Cần Cua xử lý" (18 October 2026)

- Branch claude/local-setup. Base beb525d (Travis's corpus notes, committed verbatim) on top of 0ca901b. One feature commit plus docs. Not pushed, merged or deployed; Make and online data untouched.
- Environment: Windows ARM64, Node 22.23.3 x64, no AI key. Local D1 holds Travis's anonymized 803-email copy.
- Assigned by Cua: auto-prepare replies only from content/rules Cua approved for reuse; everything unapproved, unsupported or changed goes to Cua with a reason. Full description for Cua and Travis: docs/AUTO_DRAFTS.md.

Design:
- Per-booking approval ≠ reusable template. New table ota_templates (versioned, operation-id idempotent) is the only source of automatic template drafts; a template is created from an approved revision with explicit confirmed:true and a chosen scope (situations, properties, channels; language detected).
- Template save is refused when it contains a price/percentage, discount or "arranged/confirmed" promise, the source guest's name, booking number, clock times or stay dates.
- planReply classifies unanswered guest messages per sentence (rule profile), blocks money/cancel/complaint/booking change/confirmation requests/extranet Accept buttons/unclassified sentences/other languages/date conflicts, and picks the smallest template covering every situation in the right property/channel/language. Placeholders fill from the same thread only; conditional blocks drop arrival questions when known and transport/tour offers when refused/own/deferred. A post-render check blocks re-asking and re-offering.
- prepareDraft: approved, sent and Cua-written versions of the current context are kept; never stacks an automatic draft on Cua's unapproved edit; new message after approval → new draft with attention "Có tin mới sau phiên bản vN đã duyệt"; a template suggestion that no longer fits is flagged back to Cua (text kept); one operation id per context/template version makes reruns no-ops.
- ota_drafts gains source/template_id/template_version/attention (migration 0008; legacy rows inferred). Queues: "Cần Cua xử lý" (review) and "Đề xuất từ mẫu" (template). UI: per-conversation summary (what the guest needs / what was prepared and from which template / what Cua must do), template manager with approved-reply history and Ý Cua, labels "Đề xuất từ mẫu đã duyệt · chờ Cua duyệt". Sửa / ý sửa (AI) / Lưu nháp / Duyệt nội dung unchanged; no send.
- Rule-profile changes found while testing on the corpus: dotted times (14.00, not 10.11.2026), "plane" as flight, shuttle as pickup, greeting-prefixed check-in requests without "?", luggage drop as stay request, pm-less hotel time before landing left unknown.

Tests actually run (final tree): tsc --noEmit passed; npm run build passed; ota 38, ota-profile 28 (+3), ota-stay 1, ota-draft-notice 5, ota-templates 18 (new), quotes 14, reception 6, replies 14, source-data 12, review-queue 8, analysis 8 — all passed (152 checks). tests/local-flow.mjs not run.
ota-templates covers: no template → Cua with reason; single approval is not a template; explicit permission and refusal of price/%/promise/source identity/times/dates; matching template filled from its own booking and labelled; other property never uses it; declined transport not re-offered; arrival asked only when unknown; price/out-of-scope/other language/OTA "Is this ok?"/extranet Accept → Cua; windows ("1 to 2 pm", "10/11 pm", "2–3 PM") → Cua; sign-offs/contact lines do not block; unconditional vehicle offer held back; only Cua's approve makes approved; new message after approval; Cua's edit not buried; replay + reruns create nothing; approved-in-context stays; versions immutable; retired template flags open suggestions back to Cua; owner isolation.

Local corpus evidence (803 copy): backup before work private-data/crabs-803-2026-10-18/claude-before-auto-drafts-20261018T130439.sqlite; migration 0008 applied locally (counts unchanged 803/215/383/89/0, integrity ok); clean backup claude-after-migration-0008.sqlite. A clearly marked test template "[THỬ – Claude]" produced 10→14 suggestions; manual review of each found 5 wrong arrival fills (plane time, ambiguous 7:30, three time windows) — fixed with tests; the 8 remaining were correct; repeated reruns: 215/215 kept; the 11 approved revisions unchanged. The local DB was then restored to the clean post-migration backup (0 templates, 383 drafts, 205 review / 10 approved). anonymized-snapshot.json set read-only; sha256 fca69459…79ecf.

Deployment note: migration 0008 must be applied before this code runs anywhere else; until Cua creates templates, behaviour is the old rule drafts plus reasons. Open items: see docs/AUTO_DRAFTS.md "Giới hạn còn lại".

## Separate Daily Operation packet — Travis, 18 October 2026

Authorized scope: implement Reception & Operations locally with Today as default, Service schedule, Guest profiles and Shift handoff, isolated from Claude's ongoing templates work.

- Branch `travis/daily-operation`, base `0ca901b`. Separate clone `work/crabs-daily-operation` in the Codex project workspace. Port 5188, independent dependencies and `.wrangler/state`; Claude's checkout/port 5173 and production are not targets.
- Default app view and reception renderer changed in `app/workspace.tsx`. New UI, domain validation, store and API are operations-specific. Additional schema file registered in `drizzle.config.ts`. No shared OTA parser/store/template routes or `db/schema.ts` edits.
- Migration `0010_daily_operations.sql` adds owner-scoped task, history and handoff tables. Local Wrangler migration tested. Drizzle snapshot/journal integration deferred until branches are reconciled; 0008/0009 intentionally unclaimed here. Do not regenerate migrations without reviewing this gap.
- API verifies exact source association, same origin, owner, version and source fingerprint; task/history writes are atomic and retries idempotent. Changed source/schedule requires renewed review/supplier evidence. No automatic guest acceptance, supplier confirmation, payment or sending. Missing-property sources cannot be marked supplier-confirmed or complete.
- Source view computes rule summaries without writing OTA profiles/drafts. A local display guard labels check-in requests as unconfirmed requests (observed phrase: “I'd like to request check-in at 10:00 - 11:00.”); upstream extraction remains Claude's responsibility.
- Imported the already-approved static anonymized snapshot into the empty separate DB: 803 events, 215 threads, 383 drafts, 89 reviews, 0 sent, integrity_check=ok. No AI profile cache imported; no source database write. One test task and one received test handoff, explicitly labeled “Kiểm thử local”, remain for demonstration.

Validation actually run on Windows ARM64 / Node 22.23.3 x64:

| Check | Result / boundary |
|---|---|
| `node tests/operations.mjs` | 15 pass; isolated synthetic Miniflare DB; auth, property/booking, GET read-only, check-in request label, duplicate operation IDs, rebind/version, evidence/date validation, stale source and changed schedule, concurrent save, completion, handoff and owner isolation |
| `node tests/reception.mjs` | 6 pass; legacy reception compatibility; isolated test DB |
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | Pass |
| `node scripts/run-framework.mjs build` | Pass; >500 kB chunk warning remains |
| Local UI in browser | All four tabs; create/edit/save task; date field persists; same task in Today/schedule/handoff; write and receive handoff; whole-page reload preserves data; 55 75PHT vs 160 Suites source profiles; narrow-window detail navigation |

No full baseline rerun, `tests/local-flow.mjs`, real-AI testing, live intake, staff multi-user UAT, push, merge or deployment. This does not certify production readiness.

Remaining boundaries: manual source-to-task creation, static copied data, refresh to see changes, OTA and Sheets kept separate, owner-only actor/assignee labels, no live supplier/PMS/payment/send, no automatic quote-to-order transition. Task history payloads are retained, but UI history is a change list rather than a full version diff/restore tool. Review data loading at larger volumes and confirm migration metadata before future integration.

Rollback/continuation: keep the branch/checkout separate or revert its code commit; stop its port 5188 process. Do not reset either database. Import code through a reviewed merge/cherry-pick later, resolving only overlapping router/schema/migration changes. User guide: [DAILY_OPERATION_LOCAL.md](docs/DAILY_OPERATION_LOCAL.md).

## Local quote usability packet — Travis, 18 October 2026

Scope: explain the quote page in practical terms and optimize the isolated local UI after Daily Operation commit 1bce353. This stays on travis/daily-operation / port 5188; no Claude checkout edit, production mutation or deployment.

Changed app/quote-workspace.tsx plus new app/quote-guide.tsx, app/quotes.css, lib/quote-presentation.ts and tests/quote-presentation.mjs. New four-step guide explains when to use quotes, input gaps and the manual handoff boundary. Product buttons show service names; new lines prefill the catalog introduction/benefits. The guest presentation uses saved fields with benefits/terms before price, excluding structured costs, commissions, profit, supplier and reception profile. Operator-entered details/terms are deliberately included and need review. Copy is Vietnamese, demo-marked and guarded by fresh GET data/current revision/approval/contact version/expiry/existing approval checks. UI internal cost details are separate. Backend API, schema, calculations and stored old versions are unchanged.

Corrected defaults: expiry is editable today+2 days instead of hard-coded 2026-10-20; pickup uses arrival and dropoff uses departure, unknown dates remain blank, generic flight clock/route are labeled as references requiring directional review. Selected contact is reflected in the hash so reload keeps that contact. These do not establish new commercial policies or silently extend catalog price validity.

Actual validation on Windows ARM64 / Node 22.23.3 x64:
- node tests/quote-presentation.mjs: 6/6 pass, synthetic helper tests (date defaults, saved content ordering, finance/profile exclusion, unchanged payload, copy guards).
- node tests/quotes.mjs: 14/14 pass in an ephemeral Miniflare D1 (arithmetic, API auth/origin, idempotency, snapshot history, stale/concurrent guards). No production writes.
- node node_modules/typescript/bin/tsc --noEmit --incremental false: pass.
- node scripts/run-framework.mjs build: pass; existing >500 kB chunk warning remains.
- Browser: picked Linh Nguyen synthetic contact, added Ninh Binh for 2 adults, saved v1 (2,500,000 VND sale / 440,000 VND expected margin), confirmed copy disabled before approval, approved the explicit KIEM THU LOCAL sample, copied with success notice and reloaded/reopened persisted approved quote. No external send. Responsive guest-preview display inspected.

One labeled local test quote remains (3ccc9c78 prefix), with preserved approval record. No real guest quotation was approved. No full unrelated suite rerun. Current limits: seven demo products, Sheets/demo contacts only, no OTA-to-quote bridge, approved live catalog/price management, guest acceptance lifecycle, order/payment/dispatch automation or multilingual proposal generation. Task creation after acceptance remains manual on the correct source profile.

Guide and business inputs for Cua: docs/QUOTES_GUIDE.md. Future integration must review app/quote-workspace.tsx separately from Claude's template changes; no migration is required for this quote usability change.

## Local source-price packet — 18 October 2026

Authorized scope: retrieve existing Sheets 75PHT tour/transfer prices and conditions into the isolated quote page; list unresolved validity and terms. Base commit 1c9b36b on travis/daily-operation. No edits to Claude's checkout/port 5173, online CRM, Sheets or Make; no OTA sends, push, merge or deploy.

Changed: lib/quote-source-data.json (sanitized catalog), lib/quote-sources.ts (shared source definitions), app/quote-source-library.tsx, quote workspace/guide/styles, quote schema/presentation/API. Optional server-owned reference snapshots extend JSON payloads; no D1 schema change. Source IDs are checked on the server; forged client approval/reference metadata is ignored. Existing source snapshots remain immutable. Input amounts can be null for source drafts; legacy demo inputs require numeric values.

Business findings: 223 pending entries; transaction vs website vs itinerary vs USD template separated. October tour rows 7/9 have inconsistent quantity × unit price versus total. Airport direction/type has multiple amounts; five ambiguous/free records are excluded as rate options. Do not infer property from workbook title, confirm explicitly. Two missing website prices; 28 draft programs have no approved price/supplier. No automatic USD conversion, +15/+20% markup or combo perks.

Actual validation on Windows ARM with Node 22.23.3 x64:
- node tests/quote-sources.mjs: 8/8 pass.
- node tests/quote-presentation.mjs: 6/6 pass.
- node tests/quotes.mjs: 17/17 pass in ephemeral Miniflare D1, including the 14 legacy cases and three source persistence/approval/revision cases. Auth stubbed.
- node node_modules/typescript/bin/tsc --noEmit --incremental false: pass after source changes.
- node scripts/run-framework.mjs build: pass; existing large-client-chunk warning remains (>500 kB).
- Browser port 5188: accent-insensitive search “Hoa Lu” locates exact recorded tour; adding reuses 23/10 date and 2 adults from synthetic Linh. Blank price/cost/commission saves successfully to draft a843e6cc (v1), source D5:K5 visible after reload. Approve and copy both disabled. Existing approved synthetic quote 3ccc9c78 (v1, 2.5m/440k) still displayed unchanged.
- No whole-app regression run, payment, supplier booking, live price approval or end-to-end OTA quote test.

User review list, exact ranges/amounts and operational limits: docs/QUOTE_SOURCE_REVIEW.md. Source library is a bounded read batch (October recent rows, September first 70 rows, November first 25 plus tour library). No claim of exhaustive all-month audit. Do not promote pending rates merely because fields are filled or the quote checkbox is checked.

## Integration packet: Claude + Travis (18 October 2026)

- Branch `integration/claude-travis` in CRABS-Claude, created from `claude/local-setup` at 00cba81 (unchanged). Travis's commits fetched read-only from his local clone and cherry-picked in order, authorship kept: 1bce353→5a95ea3 (Daily Operation), 1c9b36b→0eee39a (quote guide/presentation), fd3c423→dc243f7 (75PHT source catalog). Then Claude commits 6d10034, d6fb236, 6db0ac0 and this documentation commit. Not pushed, merged into main or deployed; Make/Hotel Link/online untouched; no guest send.
- Conflicts: only REVIEW_PACKET.md (both appended; both kept). Functional overlaps resolved: app/workspace.tsx (Travis's reception renderer and default view kept), drizzle.config.ts (both schemas), migrations (see below), reception check-in label (lib/operations-store.ts now also maps the new stay-request facts; Travis's test unchanged and passing).
- Migrations: 0008_ota_templates (Claude) and 0010_daily_operations (Travis); 0009 unclaimed. Added 0010 to drizzle/meta/_journal.json (idx 9) without renaming the file, so Travis's DB that recorded 0010 does not re-run it. Snapshots still end at 0005; do not run drizzle-kit generate. No DROP in any migration.
- Port 5173 DB: consistent backup via VACUUM INTO before migrating (claude-before-integration-20261018T142420.sqlite), applied only 0010 with `npm run db:local:migrate`, backup after (claude-after-integration-0010.sqlite). Before→after: identical counts and approval signatures (803 events, 215 threads, 383 drafts with 11 approved, 89 reviews, 171 contacts, 0 templates, 0 Cua edits pending); only 3 empty ops tables and one d1_migrations row added. Port 5188 DB not copied or modified; the 803 corpus was not re-imported.
- Code changes during integration: template safety check is per sentence and per direction (pickup refusal no longer blocks a dropoff offer); "I'd like to request check-in at …" is a stay request, not a known arrival, in inbox and reception; refresh updates stale reasons on automatic drafts when templates change (text kept).

Tests actually run on 6db0ac0 (Windows ARM64, Node 22.23.3 x64, ephemeral Miniflare D1, no AI key): tsc pass; build pass (large-chunk warning remains); ota 38, ota-profile 29, ota-stay 1, ota-draft-notice 5, ota-templates 20, operations 15, reception 6, quotes 17, quote-presentation 6, quote-sources 8, replies 14, source-data 12, review-queue 8, analysis 8 — 187 checks in this run, all passed. tests/local-flow.mjs not run.

UI/API checks on a throwaway worktree + copy of the 5173 DB on port 5199 (removed afterwards; 5173 DB verified unchanged):
- Default Lễ tân & vận hành → Hôm nay; four tabs; profiles separated by source and property.
- 18 synthetic OTA messages routed as in docs/AUTO_DRAFTS.md (2 template suggestions, 16 to "Cần Cua xử lý" with specific reasons); flight time never used as hotel arrival; range/negation/correction/check-in question kept out of templates.
- Template created through the UI from verified source ota-085aa785… v2 (test label "[THỬ – Claude]"): 10 suggestions (8 real Suites, 2 synthetic); approve via UI → "Đã duyệt… Chưa gửi"; new message after approval → new suggestion with reason, v2 approved kept; new message while Cua edit pending → no automatic draft on top; reruns 233/233 kept.
- Operations: task saved from exact booking/property, completion blocked without guest acceptance + supplier confirmation, acceptance blocked without evidence, handoff written/received once, new guest message marks task stale and blocks save until re-review; after reload the task appears in Lịch dịch vụ 25/10 15:30 and Bàn giao ca.
- Quotes: source item R75-TOUR-OCT-5 saved to draft with null price; approval blocked at server, also after filling numbers and ticking the demo checkbox; v1 snapshot (D5:K5, 1.350.000 ₫ "not current rate") preserved; catalog 223 = 17/10/28/161/7, 30 null amounts and no zeros, USD kept, limousine rows 7/9 gaps kept.

Open decisions and limits: docs/INTEGRATED_LOCAL.md. Rollback: `git switch claude/local-setup`; DB restore from the two backups above.
