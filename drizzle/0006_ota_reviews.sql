CREATE TABLE `ota_reviews` (
 `owner` text NOT NULL,
 `operation_id` text NOT NULL,
 `event_id` text NOT NULL,
 `payload_hash` text NOT NULL,
 `thread_id` text NOT NULL,
 `decision` text NOT NULL,
 `note` text NOT NULL,
 `evidence` text NOT NULL,
 `candidate_draft` text NOT NULL,
 `previous_state` text NOT NULL,
 `created` text NOT NULL,
 PRIMARY KEY(`owner`, `operation_id`)
);
--> statement-breakpoint
CREATE INDEX `ota_reviews_event` ON `ota_reviews` (`owner`, `event_id`, `created`);
