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
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stripe_customer` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`name` text,
	`default_payment_method_id` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `stripe_customer_user_id_unique` ON `stripe_customer` (`user_id`);--> statement-breakpoint
CREATE INDEX `stripe_customer_user_idx` ON `stripe_customer` (`user_id`);--> statement-breakpoint
CREATE TABLE `stripe_invoice` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`subscription_id` text,
	`status` text NOT NULL,
	`amount_due` integer NOT NULL,
	`amount_paid` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`period_start` integer,
	`period_end` integer,
	`hosted_invoice_url` text,
	`invoice_pdf` text,
	`paid` integer DEFAULT false NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `stripe_customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subscription_id`) REFERENCES `stripe_subscription`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `stripe_invoice_customer_idx` ON `stripe_invoice` (`customer_id`);--> statement-breakpoint
CREATE INDEX `stripe_invoice_subscription_idx` ON `stripe_invoice` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `stripe_invoice_status_idx` ON `stripe_invoice` (`status`);--> statement-breakpoint
CREATE TABLE `stripe_payment_method` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`type` text NOT NULL,
	`card_brand` text,
	`card_last4` text,
	`card_exp_month` integer,
	`card_exp_year` integer,
	`bank_name` text,
	`bank_last4` text,
	`is_default` integer DEFAULT false NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `stripe_customer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stripe_payment_method_customer_idx` ON `stripe_payment_method` (`customer_id`);--> statement-breakpoint
CREATE INDEX `stripe_payment_method_default_idx` ON `stripe_payment_method` (`is_default`);--> statement-breakpoint
CREATE TABLE `stripe_price` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`unit_amount` integer,
	`type` text DEFAULT 'recurring' NOT NULL,
	`interval` text,
	`interval_count` integer DEFAULT 1,
	`trial_period_days` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `stripe_product`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `stripe_price_product_idx` ON `stripe_price` (`product_id`);--> statement-breakpoint
CREATE INDEX `stripe_price_active_idx` ON `stripe_price` (`active`);--> statement-breakpoint
CREATE TABLE `stripe_product` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`active` integer DEFAULT true NOT NULL,
	`default_price_id` text,
	`metadata` text,
	`images` text,
	`features` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `stripe_product_active_idx` ON `stripe_product` (`active`);--> statement-breakpoint
CREATE TABLE `stripe_subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`price_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`cancel_at` integer,
	`canceled_at` integer,
	`current_period_start` integer NOT NULL,
	`current_period_end` integer NOT NULL,
	`trial_start` integer,
	`trial_end` integer,
	`ended_at` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `stripe_customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`price_id`) REFERENCES `stripe_price`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stripe_subscription_customer_idx` ON `stripe_subscription` (`customer_id`);--> statement-breakpoint
CREATE INDEX `stripe_subscription_user_idx` ON `stripe_subscription` (`user_id`);--> statement-breakpoint
CREATE INDEX `stripe_subscription_status_idx` ON `stripe_subscription` (`status`);--> statement-breakpoint
CREATE INDEX `stripe_subscription_price_idx` ON `stripe_subscription` (`price_id`);--> statement-breakpoint
CREATE TABLE `stripe_webhook_event` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`api_version` text,
	`processed` integer DEFAULT false NOT NULL,
	`processing_error` text,
	`data` text,
	`created_at` integer NOT NULL,
	`processed_at` integer
);
--> statement-breakpoint
CREATE INDEX `stripe_webhook_event_type_idx` ON `stripe_webhook_event` (`type`);--> statement-breakpoint
CREATE INDEX `stripe_webhook_event_processed_idx` ON `stripe_webhook_event` (`processed`);