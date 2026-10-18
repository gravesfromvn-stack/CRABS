// Posts SYNTHETIC OTA emails to the LOCAL dev server only (http://127.0.0.1:5173).
// All guests, booking numbers and messages are invented test data. Requires a
// local-only CRABS_INGEST_TOKEN in the ignored .env and the mailbox activated
// in the local UI ("Kích hoạt nơi nhận email"). Never point this at production.
import { readFileSync } from "node:fs";

const base = "http://127.0.0.1:5173";
const token = /^CRABS_INGEST_TOKEN=(.+)$/m.exec(readFileSync(".env", "utf8"))?.[1]?.trim();
if (!token) throw new Error("Add a local-only CRABS_INGEST_TOKEN to .env first.");

const domain = { booking: "guest.booking.com", agoda: "agoda-messaging.com" };
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
function mail(id, body, { channel = "booking", subject, auth = true, at }) {
  return {
    id,
    threadId: "gmail-" + id,
    internalDate: String(Date.parse(at)),
    payload: {
      mimeType: "text/plain",
      headers: [
        { name: "From", value: "Guest <notification@" + domain[channel] + ">" },
        { name: "Subject", value: subject },
        { name: "Authentication-Results", value: "mx.google.com; dmarc=" + (auth ? "pass" : "fail") + " header.from=" + domain[channel] },
        { name: "Message-ID", value: "<" + id + "@" + domain[channel] + ">" },
      ],
      body: { data: Buffer.from(body).toString("base64url") },
    },
  };
}
const booking = (guest, property, id, message, checkIn = "25 Oct 2026", checkOut = "28 Oct 2026") =>
  `Confirmation number: ${id}\nYou have a new message from a guest\n${guest} said:\n${message}\nReply\nReservation details\nGuest name:\n${guest}\nProperty name:\n${property}\nBooking number:\n${id}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}`;

const P75 = "Luxe Paradise Premium Pham Hong Thai Hotel & Spa";
const PSUITES = "Luxe Paradise Suites Hotel & Spa";
const emails = [
  // 1. 75PHT: arrival, room request, airport pickup, tour interest.
  mail("synthetic0001", booking("Synthetic Guest Alpha", P75, "5900000001",
    "We land at Noi Bai at 13:30 on flight VN 123 and expect to reach the hotel around 15:00. Could we have a quiet room on a high floor? We would also like an airport pickup for 2 adults and a Ninh Binh tour on 26 October."),
    { subject: "We received this message from Synthetic Guest Alpha", at: hoursAgo(30) }),
  // 2. Same thread: guest declines transfer — must not be asked again.
  mail("synthetic0002", booking("Synthetic Guest Alpha", P75, "5900000001",
    "Update: we no longer need the airport pickup, our friend will drive us. The Ninh Binh tour is still of interest."),
    { subject: "We received this message from Synthetic Guest Alpha", at: hoursAgo(20) }),
  // 3. Same booking number but the Suites property — must be a separate thread.
  mail("synthetic0003", booking("Synthetic Guest Beta", PSUITES, "5900000001",
    "Please arrange a late check-out until 14:00 if possible.", "27 Oct 2026", "29 Oct 2026"),
    { subject: "We received this message from Synthetic Guest Beta", at: hoursAgo(10) }),
  // 4. Same guest name as #1, different booking/property — must NOT merge by name.
  mail("synthetic0004", booking("Synthetic Guest Alpha", PSUITES, "5900000004",
    "Is breakfast included?", "02 Nov 2026", "04 Nov 2026"),
    { subject: "We received this message from Synthetic Guest Alpha", at: hoursAgo(8) }),
  // 5. Failed DMARC — must stay in the reconciliation queue, not a booking thread.
  mail("synthetic0005", booking("Synthetic Guest Gamma", P75, "5900000005",
    "We will arrive at 22:00."),
    { subject: "We received this message from Synthetic Guest Gamma", auth: false, at: hoursAgo(5) }),
];

// Any HTTP error or skipped email means the seed did not land: exit non-zero.
let failed = 0;
for (const m of emails) {
  const r = await fetch(base + "/api/ota/ingest", {
    method: "POST",
    headers: { "X-Crabs-Ingest-Key": token, "Content-Type": "application/json" },
    body: JSON.stringify(m),
  });
  const raw = await r.text();
  let d;
  try { d = JSON.parse(raw); } catch { d = { error: raw.slice(0, 200) || "non-JSON response" }; }
  const ok = r.ok && d.ok === true && !d.ignored;
  if (!ok) failed++;
  console.log(ok ? "OK  " : "FAIL", m.id, r.status, d.status ?? d.reason ?? d.error, d.duplicate ? "(duplicate)" : "", d.threadId ?? "");
}
if (failed) {
  console.error(`${failed} of ${emails.length} synthetic emails were not ingested.`);
  process.exitCode = 1;
}
