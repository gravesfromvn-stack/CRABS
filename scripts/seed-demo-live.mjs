// Seeds DEMO data into the LOCAL dev server (http://localhost:5173) through its own APIs, so every
// write passes the same validation as a user action. Additive only: it never deletes or edits the
// existing OTA emails. Re-running is safe: fixed ids/operation ids make repeated writes no-ops.
// All guests, bookings, phone numbers and messages below are synthetic.
//   node scripts/seed-demo-live.mjs
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const base = "http://localhost:5173";
if (!/^http:\/\/(localhost|127\.0\.0\.1):5173$/.test(base)) throw new Error("Local dev server only.");
const token = /^CRABS_INGEST_TOKEN=(.+)$/m.exec(readFileSync(".env", "utf8"))?.[1]?.trim();
if (!token) throw new Error("Add a local-only CRABS_INGEST_TOKEN to .env first.");
// Deterministic UUIDs: the same seed item always has the same id and operation id.
const uuid = (name) => { const h = createHash("sha1").update("crabs-demo-seed:" + name).digest("hex"); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`; };
const log = [];
const note = (s) => { log.push(s); console.log(s); };

// --- local sign-in (mock user of the dev plugin) ---
const signin = await fetch(base + "/signin-with-chatgpt?return_to=/", { redirect: "manual" });
const cookie = signin.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
if (!cookie) throw new Error("Local sign-in cookie not received; is the dev server on 5173 running?");
const headers = { Cookie: cookie, Origin: base, "Content-Type": "application/json" };
async function api(path, payload, ok = [200]) {
  const r = await fetch(base + path, payload ? { method: "POST", headers, body: JSON.stringify(payload) } : { headers });
  const d = await r.json().catch(() => ({}));
  if (!ok.includes(r.status)) throw new Error(`${path} ${r.status}: ${JSON.stringify(d).slice(0, 300)}`);
  return { status: r.status, data: d };
}

// The anonymized corpus was imported under a placeholder mailbox; activate the app mailbox the same
// way the UI button does (adds one row, changes nothing else).
await api("/api/ota", { action: "connect" }, [200, 409]);

// --- 1. synthetic OTA conversations for the live demo ---
const P75 = "Luxe Paradise Premium Pham Hong Thai Hotel & Spa", PSUITES = "Luxe Paradise Suites Hotel & Spa";
const hoursAgo = (h) => new Date(Date.now() - h * 3600000).toISOString();
const bookingMail = (id, guest, property, booking, message, checkIn, checkOut, at) => {
  const body = `Confirmation number: ${booking}\nYou have a new message from a guest\n${guest} said:\n${message}\nReply\nReservation details\nGuest name:\n${guest}\nProperty name:\n${property}\nBooking number:\n${booking}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}`;
  return { id, threadId: "gmail-" + id, internalDate: String(Date.parse(at)), payload: { mimeType: "text/plain", headers: [
    { name: "From", value: "Guest <notification@guest.booking.com>" }, { name: "Subject", value: "We received this message from " + guest },
    { name: "Authentication-Results", value: "mx.google.com; dmarc=pass header.from=guest.booking.com" }, { name: "Message-ID", value: `<${id}@guest.booking.com>` }],
    body: { data: Buffer.from(body).toString("base64url") } } };
};
const demoThreads = [
  { key: "anna", id: "demolive0001", guest: "Demo Guest Anna", property: P75, booking: "5991900101", in: "22 Oct 2026", out: "25 Oct 2026", at: hoursAgo(20),
    message: "We are 2 adults with 2 suitcases and we land at Noi Bai at 08:30 on flight VN 211. Could you arrange an airport pickup? We would also like an early check-in if possible." },
  { key: "ben", id: "demolive0002", guest: "Demo Guest Ben", property: P75, booking: "5991900102", in: "23 Oct 2026", out: "27 Oct 2026", at: hoursAgo(18),
    message: "We will arrive at the hotel at 15:00. We would love to visit Ha Long Bay and Ninh Binh during our stay. Could you recommend a tour?" },
  { key: "carla", id: "demolive0003", guest: "Demo Guest Carla", property: P75, booking: "5991900103", in: "23 Oct 2026", out: "26 Oct 2026", at: hoursAgo(16),
    message: "We are interested in a Ninh Binh day trip on 24 October for 2 adults. Please message me on WhatsApp: +1 202 555 0143." },
  { key: "daniel", id: "demolive0004", guest: "Demo Guest Daniel", property: P75, booking: "5991900104", in: "21 Oct 2026", out: "24 Oct 2026", at: hoursAgo(14),
    message: "We will arrive at the hotel at 16:00. Could we book a massage at the spa for two people on our first evening?" },
  { key: "emma", id: "demolive0005", guest: "Demo Guest Emma", property: PSUITES, booking: "5991900105", in: "22 Oct 2026", out: "24 Oct 2026", at: hoursAgo(12),
    message: "We will arrive at the hotel at 13:00. Is a late check-out until 16:00 possible on our last day?" },
  { key: "felix", id: "demolive0006", guest: "Demo Guest Felix", property: P75, booking: "5991900106", in: "21 Oct 2026", out: "23 Oct 2026", at: hoursAgo(10),
    message: "We will arrive at the hotel at 15:00. Thank you!" },
];
for (const t of demoThreads) {
  const r = await fetch(base + "/api/ota/ingest", { method: "POST", headers: { "X-Crabs-Ingest-Key": token, "Content-Type": "application/json" },
    body: JSON.stringify(bookingMail(t.id, t.guest, t.property, t.booking, t.message, t.in, t.out, t.at)) });
  const d = await r.json();
  if (!r.ok) throw new Error("ingest " + t.id + ": " + JSON.stringify(d));
  note(`OTA ${t.key}: ${d.duplicate ? "đã có" : "đã nhận"} (${d.status || d.reason || ""})`);
}
const findThread = async (booking) => (await api("/api/ota?queue=all&search=" + booking)).data.items.find((x) => x.booking_id === booking)?.id;
for (const t of demoThreads) { t.thread = await findThread(t.booking); if (!t.thread) throw new Error("Thread not found for " + t.booking); }
const byKey = Object.fromEntries(demoThreads.map((t) => [t.key, t]));

// --- 2. reusable templates, each created from an approved reply (the product's own rule) ---
const sign = "\n\nBest regards,\nReception team";
const templates = [
  { key: "welcome", source: "felix", title: "Welcome · lời chào & giờ đến", situations: ["arrival", "thanks", "room"], properties: ["luxe-75pht", "luxe-suites"],
    body: "Dear {{guest_name}},\n\nThank you for your message and for choosing {{property}}. We look forward to welcoming you from {{check_in}} to {{check_out}}.[[if:arrival]] We have noted your arrival time of {{arrival_time}}.[[/if]][[if:room]] We have also noted your room request; our team will check availability and this request is not yet confirmed.[[/if]][[offer:pickup]]\n\nIf it helps, we can share private airport pick-up options for your arrival.[[/offer]]" + sign },
  { key: "info", source: "emma", title: "Hotel Info · nhận sớm / trả muộn", situations: ["early_checkin", "stay", "arrival"], properties: ["luxe-75pht", "luxe-suites"],
    body: "Dear {{guest_name}},\n\nThank you for your message.[[if:arrival]] We have noted your arrival time of {{arrival_time}}.[[/if]]\n\n{{service_info}}" + sign },
  { key: "transfer", source: "anna", title: "Airport Transfer · chốt trên Extranet", situations: ["transfer_interest", "arrival", "early_checkin"], properties: ["luxe-75pht"],
    body: "Dear {{guest_name}},\n\nThank you for your message. We look forward to welcoming you on {{check_in}}.\n\n{{service_info}}" + sign },
  { key: "spa", source: "daniel", title: "Spa · chốt trên Extranet", situations: ["spa", "arrival"], properties: ["luxe-75pht", "luxe-suites"],
    body: "Dear {{guest_name}},\n\nThank you for your message.[[if:arrival]] We have noted your arrival time of {{arrival_time}}.[[/if]]\n\n{{service_info}}" + sign },
  { key: "tour", source: "ben", title: "Tour Inquiry → xin WhatsApp", situations: ["tour_interest", "arrival"], properties: ["luxe-75pht"],
    body: "Dear {{guest_name}},\n\nThank you for your interest in exploring the area during your stay.\n\n{{tour_options}}\n\n{{service_info}}" + sign },
];
const existing = (await api("/api/ota/templates")).data.templates || [];
for (const t of templates) {
  if (existing.some((x) => x.title === t.title && !x.retired_at)) { note(`Mẫu "${t.title}": đã có`); continue; }
  const src = byKey[t.source];
  let detail = (await api("/api/ota?id=" + src.thread)).data;
  let latest = detail.drafts[0];
  if (latest.status !== "approved") {
    // The approved reply is the current draft text (rules + configured services); Cua's real flow is the same.
    const body = latest.body || "Thank you for your message. We have noted your request." + sign;
    if (latest.status !== "pending" || !latest.body) {
      await api("/api/ota", { action: "save", id: src.thread, revision: latest.revision, contextKey: detail.contextKey, body, operationId: uuid("draft-" + t.key) });
      detail = (await api("/api/ota?id=" + src.thread)).data; latest = detail.drafts[0];
    }
    await api("/api/ota", { action: "approve", id: src.thread, revision: latest.revision, contextKey: detail.contextKey });
    detail = (await api("/api/ota?id=" + src.thread)).data; latest = detail.drafts[0];
  }
  const r = await api("/api/ota/templates", { action: "save", operationId: uuid("template-" + t.key), title: t.title, body: t.body, situations: t.situations, properties: t.properties, channels: [], sourceThread: src.thread, sourceRevision: latest.revision, confirmed: true });
  note(`Mẫu "${t.title}": v${r.data.version} · nháp đề xuất mới: ${JSON.stringify(r.data.refresh || {})}`);
}

// --- 3. quotes on demo customers (synthetic demo products and configured hotel services) ---
const ws = (await api("/api/workspace")).data;
const contact = (id) => ws.contacts.find((c) => c.id === id);
const line = (productId, date, quantity, passengers, price, cost, commission, details) => ({ productId, date, quantity, passengers, price, cost, commission, extraCost: 0, discount: 0, details });
const quotes = [
  { key: "q1", contact: "demo-01", approve: true, lines: [line("T02", "2026-10-27", 2, 2, 1250000, 960000, 70000, "2 người lớn; hỏi thể lực trước khi leo Hang Múa."), line("X01", "2026-10-26", 1, 2, 350000, 260000, 20000, "Chuyến DEMO-101 12:30; Nội Bài → khách sạn; 2 vali.")] },
  { key: "q2", contact: "demo-02", approve: true, childrenPolicy: "Trẻ 6 và 10 tuổi: giá trẻ em theo nhà tàu, demo tính bằng 75% người lớn.", lines: [line("T03", "2026-10-28", 3, 4, 1750000, 1380000, 90000, "2 người lớn + 2 trẻ em; ghép phương án Hạ Long trong ngày.")] },
  { key: "q3", contact: "demo-03", approve: false, missing: "Khách đổi sang 29/10: chờ nhà tàu xác nhận chỗ.", lines: [line("T03", "2026-10-29", 2, 2, 1750000, 1380000, 90000, "Đổi ngày từ 28/10 sang 29/10; chưa xác nhận chỗ.")] },
  { key: "q4", contact: "demo-04", approve: true, lines: [line("T05", "2026-10-26", 2, 2, 650000, 430000, 40000, "1 khách ăn chay; khung giờ tối.")] },
  { key: "q5", contact: "demo-05", approve: true, lines: [line("X02", "2026-10-30", 1, 4, 450000, 340000, 25000, "4 khách, 3 vali lớn; tiễn ra Nội Bài.")] },
  { key: "q6", contact: "demo-06", approve: false, lines: [line("HS-luxe-75pht-car7-pickup", "2026-10-30", 1, 4, 500000, 380000, 20000, "Xe 7 chỗ theo bảng giá khách sạn; giá vốn/hoa hồng nhập tay, chờ Cua hoàn tất cấu hình.")] },
  { key: "q7", contact: "demo-07", approve: false, lines: [line("HS-luxe-75pht-tour-hl-day", "2026-10-31", 2, 2, 1890000, 1382000, 0, "Hạ Long 1 ngày theo giá nguồn; chờ Cua duyệt tuyến trong cấu hình.")] },
  { key: "q8", contact: "demo-08", approve: true, lines: [line("T04", "2026-10-29", 2, 2, 2650000, 2140000, 140000, "Sa Pa 2N1Đ, phòng đôi.")] },
];
for (const q of quotes) {
  const c = contact(q.contact); if (!c) { note(`Báo giá ${q.key}: không có hồ sơ ${q.contact}, bỏ qua`); continue; }
  const id = uuid("quote-" + q.key);
  const quote = { lines: q.lines, validUntil: q.lines.map((l) => l.date).sort()[0], conditions: "Giá demo cho buổi trình diễn; chỗ và dịch vụ chưa xác nhận. Hủy trước 24 giờ không mất phí (giả định demo).", missing: q.missing || "", childrenPolicy: q.childrenPolicy || "", demoPriceConfirmed: true };
  const saved = await api("/api/quotes", { action: "save", operationId: uuid("quote-save-" + q.key), id, contactId: c.id, expectedRevision: 0, contactVersion: c.version, quote }, [200, 409]);
  if (saved.status === 409) { note(`Báo giá ${q.key}: đã có`); continue; }
  if (q.approve) { const a = await api("/api/quotes", { action: "approve", operationId: uuid("quote-approve-" + q.key), id, revision: 1 }, [200, 400, 409]); note(`Báo giá ${q.key} (${c.name}): lưu v1 · duyệt ${a.status === 200 ? "đạt" : "chưa: " + (a.data.error || "").slice(0, 120)}`); }
  else note(`Báo giá ${q.key} (${c.name}): lưu nháp v1`);
}

// --- 4. reception tasks and shift handoffs ---
const ops = (await api("/api/operations")).data;
const source = (kind, id) => ops.sources.find((s) => s.kind === kind && s.id === id);
const task = (o) => ({ title: o.title, kind: o.kind, assignee: o.assignee || "Lễ tân ca sáng", due: o.due || "", serviceDate: o.serviceDate || "", serviceTime: o.serviceTime || "", details: o.details || "", state: o.state || "open", guestDecision: o.guestDecision || "unknown", guestEvidence: o.guestEvidence || "", supplierStatus: o.supplierStatus || "unchecked", supplierEvidence: o.supplierEvidence || "", note: o.note || "" });
const tasks = [
  { key: "t1", kind: "ota", id: byKey.anna.thread, task: { title: "Đón sân bay · xe 4 chỗ · VN 211", kind: "pickup", due: "2026-10-21T17:00", serviceDate: "2026-10-22", serviceTime: "08:30", details: "2 khách, 2 vali. Giá theo bảng khách sạn.", state: "working", guestDecision: "accepted", guestEvidence: "Khách trả lời đồng ý xe 4 chỗ trên Extranet (demo).", supplierStatus: "waiting" } },
  { key: "t2", kind: "ota", id: byKey.anna.thread, task: { title: "Yêu cầu nhận phòng sớm", kind: "room", serviceDate: "2026-10-22", details: "Khách đến khách sạn khoảng 10:00; phụ thu 50% theo chính sách nếu có phòng." } },
  { key: "t3", kind: "ota", id: byKey.daniel.thread, task: { title: "Spa · 2 khách tối ngày đầu", kind: "spa", due: "2026-10-21T12:00", serviceDate: "2026-10-21", serviceTime: "19:00", details: "Massage cho 2 khách; chờ bảng giá spa.", guestDecision: "interested" } },
  { key: "t4", kind: "ota", id: byKey.carla.thread, task: { title: "Tư vấn tour Ninh Bình qua WhatsApp", kind: "tour", assignee: "Sales tour", serviceDate: "2026-10-24", details: "Đã có số WhatsApp khách; gửi lịch trình PDF.", state: "working", guestDecision: "interested" } },
  { key: "t5", kind: "ota", id: byKey.emma.thread, task: { title: "Trả phòng muộn đến 16:00", kind: "room", serviceDate: "2026-10-24", details: "Phụ thu 50% theo chính sách; kiểm tra phòng trống.", supplierStatus: "waiting" } },
  { key: "t6", kind: "ota", id: byKey.felix.thread, task: { title: "Chuẩn bị đón khách đến 15:00", kind: "stay", serviceDate: "2026-10-21", serviceTime: "15:00", details: "Gửi lời chào và hướng dẫn nhận phòng.", state: "done", note: "Đã gửi lời chào trên OTA (demo)." } },
  { key: "t7", kind: "contact", id: "demo-01", task: { title: "Đón sân bay · DEMO-101", kind: "pickup", serviceDate: "2026-10-22", serviceTime: "12:30", details: "2 khách; xe 4 chỗ.", state: "done", guestDecision: "accepted", guestEvidence: "Khách xác nhận qua tin nhắn mô phỏng.", supplierStatus: "confirmed", supplierEvidence: "Nhà xe mẫu xác nhận lúc 10:00 (demo).", note: "Hoàn tất mô phỏng." } },
  { key: "t8", kind: "contact", id: "demo-02", task: { title: "Tour Hạ Long gia đình", kind: "tour", assignee: "Sales tour", serviceDate: "2026-10-24", details: "2 người lớn, 2 trẻ em.", state: "working", guestDecision: "accepted", guestEvidence: "Khách đồng ý báo giá v1 (demo).", supplierStatus: "confirmed", supplierEvidence: "Nhà tàu mẫu giữ chỗ (demo)." } },
  { key: "t9", kind: "contact", id: "demo-05", task: { title: "Tiễn sân bay · xe 7 chỗ", kind: "dropoff", serviceDate: "2026-10-25", serviceTime: "09:00", details: "4 khách, 3 vali lớn.", guestDecision: "interested" } },
  { key: "t10", kind: "contact", id: "demo-04", task: { title: "Ghi chú ăn chay cho food tour", kind: "other", serviceDate: "2026-10-21", details: "Báo nhà cung cấp 1 khách ăn chay." } },
];
for (const t of tasks) {
  const s = source(t.kind, t.id); if (!s) { note(`Việc ${t.key}: không tìm thấy nguồn ${t.kind}:${t.id}`); continue; }
  const r = await api("/api/operations", { action: "save", id: uuid("task-" + t.key), operationId: uuid("task-op-" + t.key), sourceKind: t.kind, sourceId: t.id, version: 0, task: { ...task(t.task), reviewedSourceKey: s.sourceKey } }, [200, 409]);
  note(`Việc ${t.key} "${t.task.title}": ${r.status === 409 ? "đã có" : "đã tạo"}`);
}
for (const h of [
  { key: "h1", shift: "Ca sáng 19/10", recipient: "Lễ tân ca chiều", body: "Đón sân bay VN 211 ngày 22/10 chờ nhà xe xác nhận. Khách Daniel hỏi spa, chờ bảng giá. Tour Ninh Bình của Carla đã có WhatsApp." },
  { key: "h2", shift: "Ca chiều 19/10", recipient: "Lễ tân ca tối", body: "Kiểm tra phòng trống cho trả phòng muộn (Suites) ngày 24/10. Báo giá Hạ Long 26/10 còn chờ nhà tàu." },
]) {
  const r = await api("/api/operations", { action: "handoff", id: uuid("handoff-" + h.key), operationId: uuid("handoff-op-" + h.key), propertyId: "luxe-75pht", day: "2026-10-19", shift: h.shift, recipient: h.recipient, body: h.body }, [200, 409]);
  note(`Bàn giao ${h.shift}: ${r.status === 409 ? "đã có" : "đã tạo"}`);
}
console.log(JSON.stringify({ done: true, steps: log.length }));
