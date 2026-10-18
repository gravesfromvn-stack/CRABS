# Product vision and handoff scope

Source: Cua's CRABS/TourFlow handoff DOCX dated 18 October 2026, plus explicit decisions in the working conversation. This readable summary is for GitHub/Claude ingestion; the supplied source DOCX is retained under docs/reference/.

CRABS connects service sales and hotel guest operations. The roadmap is V1 Hotel Sales and Guest Operations, V1.5 PMS integration, V2 PMS core and V3 a broader all-in-one platform. Advance only after acceptance, reconciliation and assigned operational ownership.

The DOCX was written before its author inspected this repository. Its “not verified” implementation statements are superseded by code evidence and the bounded audit in CURRENT_STATE.md, not by assuming every feature is complete.

## V1 proposed mandatory scope

Account/property permissions; guest and requests; service/supplier catalog and versioned prices/quotes; service orders and supplier confirmation; pickup/tasks; actual payment/refund records; reviewed AI drafts and actual final-send records; action queues, permissioned export, backup and restore testing.

## State and authority

Keep inquiry, quote, service order, supplier confirmation, payment and task lifecycles separate. Keep historical sent quote terms immutable. Treat a timeout after a write as an unknown result requiring reconciliation, not proof of failure. Make retries idempotent.

PMS owns rooms, room inventory, room rates and reservations. CRABS owns service sales, guest care and service fulfillment. Confirm authority per field before any two-way integration. V1 may start with controlled manual or file input; a PMS API is not a prerequisite.

## Architecture direction

Inspect and extend the existing modular application first. Keep integrations behind bounded adapters. Add durable mappings, synchronization events, reconciliation and outbound records only when the corresponding feature is authorized. Do not rewrite the stack solely because a generic architecture proposal mentions another database.

## Acceptance and operations

Use the end-to-end UAT and AI evaluation proposals in BACKLOG_V1.md. Test cross-property access, duplicate/reordered events, partial money flows, cancellations, concurrent edits and recovery. Decide retention, RPO/RTO and support ownership with Cua.

## Decisions not made by the DOCX

It does not establish an API contract or price for Hotel Link/Perfect Key, a selected PMS, a complete implementation, successful production UAT, a release date, a budget or a guaranteed AI quality score.
