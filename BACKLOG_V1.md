# V1 backlog

Status: proposed, not assigned for implementation. Existing functionality must be verified and extended rather than rebuilt.
Pilot proposal: one 75PHT property/team, current OTA email intake, airport transfers plus one day-tour product.

| ID | Scope | Depends on | Acceptance |
|---|---|---|---|
| V1-00 | Reproduce baseline; update stale test expectations; document test environment and current evidence | Repository access | Exact source revision and actual command results; no production changes; known failures remain visible |
| V1-01 | Tenant/property staff identities and server-side permissions; real/demo boundary | V1-00, Cua's role matrix | Cross-property/account access denied; actor/time on important operations; existing owner data preserved |
| V1-02 | Guest, reservation reference and inquiry master; controlled OTA linking | V1-01 | Known details reused; no automatic merge by name/shared phone; repeat stays stay distinct; unresolved cases remain reviewable |
| V1-03 | Reception/service requests, assignee, due date and handoff | V1-02 | OTA request can become staff work without retyping; changed guest intent updates correct request and retains history |
| V1-04 | Approved suppliers, service/price/terms versions and quote lifecycle | V1-02, approved business inputs | Sent content immutable; changes create revision; draft/sent/accepted/rejected/expired distinct; no invented availability |
| V1-05 | Accepted quote to service order, supplier confirmation and dispatch | V1-03, V1-04 | Retry creates one order; supplier rejection/unavailability handled; participants/pickup/schedule/task ownership recorded |
| V1-06 | Actual payment/refund ledger and reconciliation | V1-05 | Due/paid/outstanding separate; payment evidence and actor/time stored; idempotent retry; cancellation after deposit handled |
| V1-07 | Complete draft review workflow and AI QA | V1-02, V1-04 | Source/policy versions visible; edit/approve/reject and final sent text traceable; no stale approval or automatic send |
| V1-08 | Daily work screen, overdue/action queues and operational reports | V1-03, V1-05, V1-06 | Staff see next action, owner and due time; no inference of revenue from approved quotes |
| V1-09 | Full backup/restore, connection/error alerts and operating runbook | Starts after V1-01; accepted before pilot | Restore into isolated environment verified; OTA data included; designated incident owner and AI/manual fallback |
| V1-10 | End-to-end pilot/UAT | V1-00 through V1-09 | No unresolved critical failures; business owner accepts evidence, access checks and recovery drill |

V1-00 progress (18 October 2026, branch claude/local-setup): local build, D1 migration, dev UI and the nine isolated suites reproduced on Windows ARM with Node x64 (docs/LOCAL_SETUP.md). Still open: update tests/local-flow.mjs expectations/port, add an aggregate test script, and fix the two defects listed in REVIEW_PACKET.md "Local setup packet".

## Required UAT

Inquiry -> correct guest/property -> needs -> quote -> guest acceptance -> supplier confirmation -> payment -> pickup/task execution -> reconcile/close.

Also test changed dates after acceptance, no supplier availability, cancellation after deposit, partial refund, duplicate clicks/retries, unknown result after timeout, shared phone and repeat stays. Completing a task does not close an order with unresolved money issues.

## AI evaluation proposal

At least 60 anonymized cases: 20 price/policy, 10 incomplete/conflicting data, 10 privacy, 10 prompt injection, 10 sending/operational cases. All critical cases must pass; proposed useful-response target >=90% under an agreed rubric. This is a target, not a measured current score.

## Outside this V1

Live room inventory, automatic hotel check-in/out, night audit, channel management, automatic PMS posting, dynamic pricing, full accounting, advanced multi-currency and AI autonomous sending/transactions. Hotel Link/PMS API exploration can proceed as a bounded research task; integration is V1.5 and is not required to start the manual-input V1 pilot.

No dates, budgets or vendor API capabilities are promised by this backlog.
