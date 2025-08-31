CREATE TABLE `payment` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subscription_id` text,
	`product_id` text NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'IRR' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`payment_method` text DEFAULT 'zarinpal' NOT NULL,
	`zarinpal_authority` text,
	`zarinpal_ref_id` text,
	`zarinpal_card_hash` text,
	`zarinpal_direct_debit_used` integer DEFAULT false,
	`retry_count` integer DEFAULT 0 NOT NULL,
	`max_retries` integer DEFAULT 3 NOT NULL,
	`next_retry_at` integer,
	`paid_at` integer,
	`failed_at` integer,
	`failure_reason` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payment_user_id_idx` ON `payment` (`user_id`);--> statement-breakpoint
CREATE INDEX `payment_subscription_id_idx` ON `payment` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `payment_product_id_idx` ON `payment` (`product_id`);--> statement-breakpoint
CREATE INDEX `payment_status_idx` ON `payment` (`status`);--> statement-breakpoint
CREATE INDEX `payment_zarinpal_authority_idx` ON `payment` (`zarinpal_authority`);--> statement-breakpoint
CREATE INDEX `payment_zarinpal_ref_id_idx` ON `payment` (`zarinpal_ref_id`);--> statement-breakpoint
CREATE INDEX `payment_paid_at_idx` ON `payment` (`paid_at`);--> statement-breakpoint
CREATE INDEX `payment_next_retry_at_idx` ON `payment` (`next_retry_at`);--> statement-breakpoint
CREATE TABLE `product` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` real NOT NULL,
	`billing_period` text DEFAULT 'one_time' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `product_name_idx` ON `product` (`name`);--> statement-breakpoint
CREATE INDEX `product_billing_period_idx` ON `product` (`billing_period`);--> statement-breakpoint
CREATE INDEX `product_is_active_idx` ON `product` (`is_active`);--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`next_billing_date` integer,
	`zarinpal_direct_debit_token` text,
	`zarinpal_direct_debit_id` text,
	`current_price` real NOT NULL,
	`billing_period` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `subscription_user_id_idx` ON `subscription` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscription_product_id_idx` ON `subscription` (`product_id`);--> statement-breakpoint
CREATE INDEX `subscription_status_idx` ON `subscription` (`status`);--> statement-breakpoint
CREATE INDEX `subscription_next_billing_date_idx` ON `subscription` (`next_billing_date`);--> statement-breakpoint
CREATE INDEX `subscription_zarinpal_direct_debit_token_idx` ON `subscription` (`zarinpal_direct_debit_token`);--> statement-breakpoint
CREATE TABLE `webhook_event` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text DEFAULT 'zarinpal' NOT NULL,
	`event_type` text NOT NULL,
	`payment_id` text,
	`raw_payload` text NOT NULL,
	`processed` integer DEFAULT false NOT NULL,
	`processed_at` integer,
	`forwarded_to_external` integer DEFAULT false,
	`forwarded_at` integer,
	`external_webhook_url` text,
	`processing_error` text,
	`forwarding_error` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`payment_id`) REFERENCES `payment`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `webhook_event_source_idx` ON `webhook_event` (`source`);--> statement-breakpoint
CREATE INDEX `webhook_event_type_idx` ON `webhook_event` (`event_type`);--> statement-breakpoint
CREATE INDEX `webhook_event_payment_id_idx` ON `webhook_event` (`payment_id`);--> statement-breakpoint
CREATE INDEX `webhook_event_processed_idx` ON `webhook_event` (`processed`);--> statement-breakpoint
CREATE INDEX `webhook_event_created_at_idx` ON `webhook_event` (`created_at`);