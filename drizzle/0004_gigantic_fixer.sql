CREATE TABLE `ota_drafts` (
	`owner` text NOT NULL,
	`thread_id` text NOT NULL,
	`revision` integer NOT NULL,
	`operation_id` text NOT NULL,
	`context_key` text NOT NULL,
	`body` text NOT NULL,
	`notes` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL,
	`approved_at` text,
	`sent_at` text,
	PRIMARY KEY(`owner`, `thread_id`, `revision`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ota_draft_operation` ON `ota_drafts` (`owner`,`operation_id`);--> statement-breakpoint
CREATE TABLE `ota_events` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`mailbox` text NOT NULL,
	`gmail_thread` text NOT NULL,
	`internet_id` text NOT NULL,
	`subject` text NOT NULL,
	`sender` text NOT NULL,
	`received` text NOT NULL,
	`imported` text NOT NULL,
	`full_text` text NOT NULL,
	`guest_text` text NOT NULL,
	`channel` text NOT NULL,
	`booking_id` text NOT NULL,
	`property_id` text NOT NULL,
	`property_label` text NOT NULL,
	`guest_name` text NOT NULL,
	`kind` text NOT NULL,
	`reason` text NOT NULL,
	`authenticated` integer NOT NULL,
	`status` text NOT NULL,
	`thread_id` text NOT NULL,
	`resolved_by` text DEFAULT '' NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `ota_events_thread` ON `ota_events` (`owner`,`thread_id`,`received`);--> statement-breakpoint
CREATE INDEX `ota_events_status` ON `ota_events` (`owner`,`status`,`received`);--> statement-breakpoint
CREATE TABLE `ota_mailbox` (
	`mailbox` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`created` text NOT NULL,
	`last_received` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ota_sent` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`thread_id` text NOT NULL,
	`revision` integer NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `ota_threads` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`property_id` text NOT NULL,
	`channel` text NOT NULL,
	`booking_id` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ota_thread_identity` ON `ota_threads` (`owner`,`property_id`,`channel`,`booking_id`);