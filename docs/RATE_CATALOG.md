# Rate catalog: 6-tab workbook and tour advice

Local only (branch `integration/claude-travis`). Nothing here sends, books, holds, confirms a supplier or takes payment.

## Source and import

- Workbook: "CRABS · Bảng duyệt giá và điều kiện" (Google Sheet `1suN2rN-…`), exported by Cua as XLSX on 18 October 2026. The XLSX is kept in `private-data/rate-sheet/` (git-ignored); only the derived `lib/rate-catalog.json` is committed.
- Reader: `scripts/xlsx-read.mjs` (no dependencies; values, cached formula results, hyperlinks). Limitation: a cell with several rich-text links keeps only the first link.
- Importer: `node scripts/import-rate-sheet.mjs <file.xlsx> --sheet-url <url>`.
  - Header rows are found by their labels ("Mã duyệt", "Mã"), and columns are mapped by header text, never by fixed row or column.
  - Importing the same file again (same sha256) is a no-op.
  - A changed file creates a new version. Changes are recorded per field in `changes[]`.
  - If an item had a complete approval and the source approval differs, the approved record is kept and the new one goes to `pendingApproval` for Cua to review.
  - Rows missing from the source get `removedInSource`; they are not deleted.

First import, version 1, sha256 `668e3317a0c5…`:

| Tab | Rows read |
|---|---|
| Duyet gia | 81 |
| Dieu kien | 81 |
| Kho tour | 40 |
| Nguon | 99 |
| Tuyen 12Go | 12 |
| Xe tu Ha Noi | 19 |

Merged by code into 102 items, with no duplicates:

- **By category:** advise 46, reference 54, unusable 2 (HT06, HT13: itinerary content mixed with another tour), quotable 0.
- **By kind:** 7 airport transfers (XE), 12 12Go routes (VT), 19 bus schedules from Hanoi (XHN), 4 Klook comparisons (KL01–04), 1 policy (HCT-00) and 1 advisory note. Every remaining item is a tour or variant.

Each item keeps:

- codes: source id, CRM ids;
- supplier, origin and destination, duration, route;
- the base route for "Xem hành trình X" variants, and the class (dorm, private room, Jeep, easy rider, cabin);
- inclusions, exclusions and children terms, and items to confirm;
- the source price as written: raw text, unit and amounts with currency, never converted;
- Nguon evidence rows;
- the approval record and the 7 conditions;
- tab/row references with gid links, read date and import version;
- issues.

## Price rules (`lib/rate-catalog.ts` → `priceStatus`)

A price is "Giá đã duyệt" only when all of the following hold:

- "Cua chọn" is "Cua duyệt";
- the full record is filled: price, unit, property, supplier, from, until, approver, approval date, and all 7 conditions;
- the booking's property matches;
- the service date is known and inside the validity period.

Everything else is "Tham khảo · Cần Cua chốt giá". Example: HN01 has the "Cua duyệt" choice but no price or conditions, so 750.000đ is not usable.

Guest drafts that contain an amount are blocked from approval, unless the amount equals an approved, valid price of a proposed option.

## Advice (`lib/tour-advice.ts`, `lib/guest-intent.ts`)

- **Intent:** info, compare, price, interest, book, confirm, change, decline, later.
  - "Maybe Ha Long" counts as interest, not a booking.
  - "Book" adds an internal note that CRABS has not booked anything.
  - A short "Yes" confirms only the last question the hotel actually sent or approved.
- **Constraints:** date, party size, children and their ages, mobility, half-day, budget, preference, luggage. The latest mention wins, earlier values stay in the profile history, and the guest's own spelling is kept.
- **Options:** at most 3. The curated researched products (Ninh Bình, Hạ Long, Hà Nội) come with their workbook variants listed separately (NB01–NB04, HL01 vs HL02). Other places use catalog tours that can be advised, never merged, with the day vs multi-day length respected. Half-day guests get no full-day tour.
- **Transport:** bus and 12Go rows stay internal, with cautions:
  - +1 day and 00:xx departures;
  - aggregated or sample schedules (not availability);
  - Nội Bài vs city times;
  - Hà Giang/Cao Bằng city ≠ Loop/Bản Giốc;
  - durations are estimates.

  The guest line never lists departure times, and it is skipped when a proposed tour already includes transport from Hanoi.
- **Guest text:** sourced facts only, in the guest's language (EN/VI). It has no amounts, codes or links and at most one question. Re-asking the date, party size or arrival time is flagged.
- **Properties:** Suites bookings see options internally only until Cua decides that property sells them.

## CRM panel

In the OTA conversation view, "Tư vấn nội bộ" shows:

- what the guest gave, their intents and what a "Yes" confirms;
- corrections, open questions and Cua's decisions;
- options with the reason, source, read date and price status;
- variants with their source price and status;
- transport rows with cautions;
- room request status and the checks on the current draft.

Nothing in the panel is copied into the draft. The edit → new version → approve → copy flow is unchanged.

## What Cua still has to supply

- Complete approval records for every item that should be quotable: sale price, unit, property, supplier, validity, approver and date, plus the 7 conditions. Today 0 items are quotable. HN01 is ticked but incomplete.
- Whether Luxe Paradise Suites may offer these tours.
- Whether Klook is ever the hotel's supplier. Today Klook is reference/comparison only.
- Conflicts to resolve:
  - HT06 and HT13 (Celina vs Paradise Grand content);
  - CH05, where the note says the table was written in 2024;
  - CH04/CH10/CH11 Jeep, whose price is per person per day and requires 4 guests.
- Approved persona wording if drafts should ever say "I am a local". Drafts currently use the reception-team voice.

## Tests

- `node tests/rate-catalog.mjs` (8): a synthetic 6-tab workbook (headers at different rows), variants, classification, re-import without duplicates, review of approved records, removed rows, property/date validity, plus checks on the committed real catalog.
- `node tests/tour-advice.mjs` (16): the scenarios required for this release.
