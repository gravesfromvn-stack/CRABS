CREATE TABLE service_catalog (owner TEXT NOT NULL, id TEXT NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL, category TEXT NOT NULL, payload TEXT NOT NULL, updated TEXT NOT NULL, last_operation TEXT NOT NULL, PRIMARY KEY(owner,id));
--> statement-breakpoint
CREATE TABLE service_catalog_history (owner TEXT NOT NULL, operation_id TEXT NOT NULL, item_id TEXT NOT NULL, actor TEXT NOT NULL, detail TEXT NOT NULL, payload TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(owner,operation_id));
--> statement-breakpoint
CREATE TABLE service_catalog_meta (owner TEXT NOT NULL PRIMARY KEY, seed_version TEXT NOT NULL, seeded TEXT NOT NULL);
