CREATE TABLE `activity` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`contact_id` text NOT NULL,
	`detail` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE TABLE `contacts` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`segment` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`assignee` text NOT NULL,
	`due` text NOT NULL,
	`service_date` text NOT NULL,
	`adults` integer NOT NULL,
	`children` text NOT NULL,
	`budget` integer NOT NULL,
	`interest` text NOT NULL,
	`note` text NOT NULL,
	`stay` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `contacts_owner_updated` ON `contacts` (`owner`,`updated`);--> statement-breakpoint
CREATE TABLE `messages` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`contact_id` text NOT NULL,
	`direction` text NOT NULL,
	`body` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE INDEX `messages_contact` ON `messages` (`owner`,`contact_id`,`created`);--> statement-breakpoint
CREATE TABLE `settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`seed_version` integer NOT NULL
);
