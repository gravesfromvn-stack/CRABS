# Decisions and business vocabulary

## Confirmed by Cua

- App name is CRABS (previously TourFlow); keep existing production hosting and data.
- Prioritize Luxe Paradise / 75 Pham Hong Thai. The Theodore Hanoi is reference context, not a source of Luxe policies.
- Support both tours and airport transfers, including both in one quote.
- Receive OTA email through Make first. Hotel Link comes after API access is granted and verified.
- Start email history with the prior 30 days, then receive new emails.
- Match by property + OTA + reservation identity. Do not match by guest name alone.
- AI prepares drafts; Cua/staff edit, approve and copy into OTA. No automatic guest send.
- Present useful tour content and benefits first; confirm a suitable option; discuss price/negotiation last.
- Do not ask for information the guest already supplied.
- After relevant arrival/departure timing, offer undecided airport directions. Respect refusal, own transport and deferred discussion; pickup refusal alone does not refuse dropoff.
- Ask about Hanoi plans only when unknown and appropriate. Acknowledge named interests; respect requests to discuss tours after arrival. Avoid upselling in complaints/cancellations.
- Show stay dates plus guest name and a source-backed needs summary under the header. Requested room arrangements are not hotel-confirmed arrangements.
- Preserve earlier drafts and record the exact manually sent text when staff explicitly confirm sending.
- Keep customer data private; repository fixtures are synthetic/anonymized and contain no live CRM database.
- Current handoff stage: audit and plan before a separately assigned implementation.

## Roadmap confirmed, details proposed

V1: Hotel Sales and Guest Operations.
V1.5: PMS integration, read/reconcile first.
V2: PMS core, only after explicit authority/migration decisions.
V3: wider all-in-one platform.

The P0 implementation order, 75PHT pilot composition, service packages, approved prices, staff permissions, RPO/RTO and the 60-case/90% AI threshold are proposals requiring business acceptance. Do not present them as completed work or signed-off contracts.

## Distinct business states

Internal quote approval != guest acceptance != supplier confirmation != payment received != service completed.
PMS remains authoritative for rooms, room rates, room inventory and reservations until a deliberate migration is accepted.
CRABS should own service sales, care requests and fulfillment records.

Perfect Key was mentioned historically but is not a selected or verified integration. Hotel Link API access and commercial terms have not been confirmed.

## Inputs still needed from Cua

Pilot property/team; approved service/supplier terms; current hotel policy (including checkout time); permissions; payment evidence and refund procedure; acceptable recovery time/data-loss window.
