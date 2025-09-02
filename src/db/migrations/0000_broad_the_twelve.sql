CREATE TABLE `account` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `account_provider_id_account_id_idx` ON `account` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_token_idx` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`username` text,
	`display_username` text,
	`email_verified` integer NOT NULL,
	`image` text,
	`phone` text,
	`is_anonymous` integer,
	`last_login_at` integer,
	`failed_login_attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);--> statement-breakpoint
CREATE INDEX `user_email_idx` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `user_username_idx` ON `user` (`username`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
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
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_id`) REFERENCES `payment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `billing_event_user_id_idx` ON `billing_event` (`user_id`);--> statement-breakpoint
CREATE INDEX `billing_event_subscription_id_idx` ON `billing_event` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `billing_event_payment_id_idx` ON `billing_event` (`payment_id`);--> statement-breakpoint
CREATE INDEX `billing_event_type_idx` ON `billing_event` (`event_type`);--> statement-breakpoint
CREATE INDEX `billing_event_severity_idx` ON `billing_event` (`severity`);--> statement-breakpoint
CREATE INDEX `billing_event_created_at_idx` ON `billing_event` (`created_at`);--> statement-breakpoint
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
	FOREIGN KEY (`subscription_id`) REFERENCES `subscription`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE restrict
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
CREATE INDEX `payment_user_status_idx` ON `payment` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `payment_subscription_status_idx` ON `payment` (`subscription_id`,`status`);--> statement-breakpoint
CREATE INDEX `payment_retry_processing_idx` ON `payment` (`status`,`next_retry_at`);--> statement-breakpoint
CREATE INDEX `payment_financial_reports_idx` ON `payment` (`status`,`paid_at`,`amount`);--> statement-breakpoint
CREATE TABLE `payment_method` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`contract_type` text DEFAULT 'pending_contract' NOT NULL,
	`contract_signature` text,
	`contract_status` text DEFAULT 'pending_signature' NOT NULL,
	`payman_authority` text,
	`contract_display_name` text DEFAULT 'Direct Debit Contract' NOT NULL,
	`contract_mobile` text,
	`contract_duration_days` integer DEFAULT 365,
	`max_daily_amount` integer,
	`max_daily_count` integer,
	`max_monthly_count` integer,
	`is_primary` integer DEFAULT false,
	`is_active` integer DEFAULT true,
	`last_used_at` integer,
	`contract_expires_at` integer,
	`contract_verified_at` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_contract_signature_unique` ON `payment_method` (`contract_signature`);--> statement-breakpoint
CREATE INDEX `payment_method_user_id_idx` ON `payment_method` (`user_id`);--> statement-breakpoint
CREATE INDEX `payment_method_contract_signature_idx` ON `payment_method` (`contract_signature`);--> statement-breakpoint
CREATE INDEX `payment_method_contract_type_idx` ON `payment_method` (`contract_type`);--> statement-breakpoint
CREATE INDEX `payment_method_contract_status_idx` ON `payment_method` (`contract_status`);--> statement-breakpoint
CREATE INDEX `payment_method_payman_authority_idx` ON `payment_method` (`payman_authority`);--> statement-breakpoint
CREATE INDEX `payment_method_is_primary_idx` ON `payment_method` (`is_primary`);--> statement-breakpoint
CREATE INDEX `payment_method_is_active_idx` ON `payment_method` (`is_active`);--> statement-breakpoint
CREATE INDEX `payment_method_user_status_idx` ON `payment_method` (`user_id`,`contract_status`);--> statement-breakpoint
CREATE INDEX `payment_method_user_active_idx` ON `payment_method` (`user_id`,`is_active`);--> statement-breakpoint
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
CREATE INDEX `product_active_billing_idx` ON `product` (`is_active`,`billing_period`);--> statement-breakpoint
CREATE TABLE `subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`next_billing_date` integer,
	`direct_debit_contract_id` text,
	`direct_debit_signature` text,
	`current_price` real NOT NULL,
	`billing_period` text NOT NULL,
	`payment_method_id` text,
	`trial_end_date` integer,
	`grace_period_end_date` integer,
	`cancellation_reason` text,
	`upgrade_downgrade_at` integer,
	`proration_credit` real DEFAULT 0,
	`billing_cycle_count` integer DEFAULT 0,
	`last_billing_attempt` integer,
	`failed_billing_attempts` integer DEFAULT 0,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `subscription_user_id_idx` ON `subscription` (`user_id`);--> statement-breakpoint
CREATE INDEX `subscription_product_id_idx` ON `subscription` (`product_id`);--> statement-breakpoint
CREATE INDEX `subscription_status_idx` ON `subscription` (`status`);--> statement-breakpoint
CREATE INDEX `subscription_next_billing_date_idx` ON `subscription` (`next_billing_date`);--> statement-breakpoint
CREATE INDEX `subscription_direct_debit_contract_id_idx` ON `subscription` (`direct_debit_contract_id`);--> statement-breakpoint
CREATE INDEX `subscription_user_status_idx` ON `subscription` (`user_id`,`status`);--> statement-breakpoint
CREATE INDEX `subscription_user_product_idx` ON `subscription` (`user_id`,`product_id`);--> statement-breakpoint
CREATE INDEX `subscription_status_billing_date_idx` ON `subscription` (`status`,`next_billing_date`);--> statement-breakpoint
CREATE INDEX `subscription_billing_automation_idx` ON `subscription` (`status`,`next_billing_date`,`payment_method_id`);--> statement-breakpoint
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
	FOREIGN KEY (`payment_id`) REFERENCES `payment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `webhook_event_source_idx` ON `webhook_event` (`source`);--> statement-breakpoint
CREATE INDEX `webhook_event_type_idx` ON `webhook_event` (`event_type`);--> statement-breakpoint
CREATE INDEX `webhook_event_payment_id_idx` ON `webhook_event` (`payment_id`);--> statement-breakpoint
CREATE INDEX `webhook_event_processed_idx` ON `webhook_event` (`processed`);--> statement-breakpoint
CREATE INDEX `webhook_event_created_at_idx` ON `webhook_event` (`created_at`);