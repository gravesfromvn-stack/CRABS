-- Roll back only the out-of-window copies from the first intake test.
-- Gmail originals and all previous CRM/demo tables remain intact.
DELETE FROM ota_drafts WHERE (owner,thread_id) IN (SELECT owner,thread_id FROM ota_events WHERE mailbox='paradisesuitespht@gmail.com' AND imported>='2026-10-16T18:04:00.000Z' AND imported<'2026-10-16T18:06:00.000Z' AND received<'2024-04-25T00:00:00.000Z') AND NOT EXISTS (SELECT 1 FROM ota_sent WHERE ota_sent.owner=ota_drafts.owner AND ota_sent.thread_id=ota_drafts.thread_id);
--> statement-breakpoint
DELETE FROM ota_events WHERE mailbox='paradisesuitespht@gmail.com' AND imported>='2026-10-16T18:04:00.000Z' AND imported<'2026-10-16T18:06:00.000Z' AND received<'2024-04-25T00:00:00.000Z' AND NOT EXISTS (SELECT 1 FROM ota_sent WHERE ota_sent.owner=ota_events.owner AND ota_sent.thread_id=ota_events.thread_id);
--> statement-breakpoint
DELETE FROM ota_threads WHERE created>='2026-10-16T18:04:00.000Z' AND created<'2026-10-16T18:06:00.000Z' AND NOT EXISTS (SELECT 1 FROM ota_events WHERE ota_events.owner=ota_threads.owner AND ota_events.thread_id=ota_threads.id) AND NOT EXISTS (SELECT 1 FROM ota_sent WHERE ota_sent.owner=ota_threads.owner AND ota_sent.thread_id=ota_threads.id);
--> statement-breakpoint
UPDATE ota_mailbox SET last_received=NULL WHERE NOT EXISTS (SELECT 1 FROM ota_events WHERE ota_events.owner=ota_mailbox.owner);
