CREATE TABLE IF NOT EXISTS ota_templates (
 owner text NOT NULL,
 id text NOT NULL,
 version integer NOT NULL,
 title text NOT NULL,
 body text NOT NULL,
 situations text NOT NULL,
 properties text NOT NULL,
 channels text NOT NULL,
 language text NOT NULL,
 source_thread text NOT NULL DEFAULT '',
 source_revision integer NOT NULL DEFAULT 0,
 operation_id text NOT NULL,
 approved_by text NOT NULL,
 approved_at text NOT NULL,
 retired_at text,
 PRIMARY KEY (owner, id, version)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS ota_template_operation ON ota_templates (owner, operation_id);
--> statement-breakpoint
ALTER TABLE ota_drafts ADD COLUMN source text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE ota_drafts ADD COLUMN template_id text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE ota_drafts ADD COLUMN template_version integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE ota_drafts ADD COLUMN attention text NOT NULL DEFAULT '';
