CREATE TABLE ops_tasks (owner TEXT NOT NULL, id TEXT NOT NULL, source_kind TEXT NOT NULL, source_id TEXT NOT NULL, version INTEGER NOT NULL, payload TEXT NOT NULL, updated TEXT NOT NULL, last_operation TEXT NOT NULL, PRIMARY KEY(owner,id));
--> statement-breakpoint
CREATE INDEX ops_tasks_source ON ops_tasks(owner,source_kind,source_id);
--> statement-breakpoint
CREATE TABLE ops_history (owner TEXT NOT NULL, operation_id TEXT NOT NULL, task_id TEXT NOT NULL, actor TEXT NOT NULL, detail TEXT NOT NULL, payload TEXT NOT NULL, command_hash TEXT NOT NULL, created TEXT NOT NULL, PRIMARY KEY(owner,operation_id));
--> statement-breakpoint
CREATE TABLE ops_handoffs (owner TEXT NOT NULL, id TEXT NOT NULL, property_id TEXT NOT NULL, day TEXT NOT NULL, shift TEXT NOT NULL, recipient TEXT NOT NULL, body TEXT NOT NULL, actor TEXT NOT NULL, created TEXT NOT NULL, received_at TEXT NOT NULL DEFAULT '', received_by TEXT NOT NULL DEFAULT '', last_operation TEXT NOT NULL, PRIMARY KEY(owner,id));
