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
