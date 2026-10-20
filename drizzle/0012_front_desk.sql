ALTER TABLE ops_handoffs ADD COLUMN room TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE ops_handoffs ADD COLUMN booking_ref TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE ops_handoffs ADD COLUMN stage TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE ops_handoffs ADD COLUMN category TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE ops_handoffs ADD COLUMN author TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
CREATE TABLE ops_flags (owner TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, actor TEXT NOT NULL, updated TEXT NOT NULL, last_operation TEXT NOT NULL, PRIMARY KEY(owner,key));
