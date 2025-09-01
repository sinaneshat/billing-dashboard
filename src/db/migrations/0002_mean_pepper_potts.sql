CREATE TABLE `billing_event` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subscription_id` text,
	`payment_id` text,
	`payment_method_id` text,
	`event_type` text NOT NULL,
	`event_data` text NOT NULL,
	`severity` text DEFAULT 'info',
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`payment_id`) REFERENCES `payment`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `billing_event_user_id_idx` ON `billing_event` (`user_id`);--> statement-breakpoint
CREATE INDEX `billing_event_subscription_id_idx` ON `billing_event` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `billing_event_payment_id_idx` ON `billing_event` (`payment_id`);--> statement-breakpoint
CREATE INDEX `billing_event_type_idx` ON `billing_event` (`event_type`);--> statement-breakpoint
CREATE INDEX `billing_event_severity_idx` ON `billing_event` (`severity`);--> statement-breakpoint
CREATE INDEX `billing_event_created_at_idx` ON `billing_event` (`created_at`);--> statement-breakpoint
CREATE TABLE `payment_method` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`zarinpal_card_hash` text NOT NULL,
	`card_mask` text NOT NULL,
	`card_type` text,
	`is_primary` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`last_used_at` integer,
	`expires_at` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_zarinpal_card_hash_unique` ON `payment_method` (`zarinpal_card_hash`);--> statement-breakpoint
CREATE INDEX `payment_method_user_id_idx` ON `payment_method` (`user_id`);--> statement-breakpoint
CREATE INDEX `payment_method_zarinpal_card_hash_idx` ON `payment_method` (`zarinpal_card_hash`);--> statement-breakpoint
CREATE INDEX `payment_method_is_primary_idx` ON `payment_method` (`is_primary`);--> statement-breakpoint
CREATE INDEX `payment_method_is_active_idx` ON `payment_method` (`is_active`);--> statement-breakpoint
ALTER TABLE `subscription` ADD `payment_method_id` text REFERENCES payment_method(id);--> statement-breakpoint
ALTER TABLE `subscription` ADD `trial_end_date` integer;--> statement-breakpoint
ALTER TABLE `subscription` ADD `grace_period_end_date` integer;--> statement-breakpoint
ALTER TABLE `subscription` ADD `cancellation_reason` text;--> statement-breakpoint
ALTER TABLE `subscription` ADD `upgrade_downgrade_at` integer;--> statement-breakpoint
ALTER TABLE `subscription` ADD `proration_credit` real DEFAULT 0;--> statement-breakpoint
ALTER TABLE `subscription` ADD `billing_cycle_count` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `subscription` ADD `last_billing_attempt` integer;--> statement-breakpoint
ALTER TABLE `subscription` ADD `failed_billing_attempts` integer DEFAULT 0;