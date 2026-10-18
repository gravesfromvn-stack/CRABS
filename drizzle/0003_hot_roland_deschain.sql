CREATE TABLE `reply_drafts` (
	`owner` text NOT NULL,
	`contact_id` text NOT NULL,
	`revision` integer NOT NULL,
	`operation_id` text NOT NULL,
	`body` text NOT NULL,
	`status` text NOT NULL,
	`context_key` text NOT NULL,
	`source_ids` text NOT NULL,
	`created` text NOT NULL,
	`approved_at` text,
	PRIMARY KEY(`owner`, `contact_id`, `revision`)
);
