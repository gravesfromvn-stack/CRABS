CREATE TABLE `quote_versions` (
	`owner` text NOT NULL,
	`quote_id` text NOT NULL,
	`revision` integer NOT NULL,
	`payload` text NOT NULL,
	`status` text NOT NULL,
	`created` text NOT NULL,
	`approved_at` text,
	`approval_operation` text,
	PRIMARY KEY(`owner`, `quote_id`, `revision`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`contact_id` text NOT NULL,
	`current_revision` integer NOT NULL,
	`operation_id` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
