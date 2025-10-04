CREATE TABLE `subscription_tier_quotas` (
	`id` text PRIMARY KEY NOT NULL,
	`tier` text NOT NULL,
	`is_annual` integer DEFAULT false NOT NULL,
	`threads_per_month` integer NOT NULL,
	`messages_per_month` integer NOT NULL,
	`max_ai_models` integer DEFAULT 5 NOT NULL,
	`allow_custom_roles` integer DEFAULT false NOT NULL,
	`allow_memories` integer DEFAULT false NOT NULL,
	`allow_thread_export` integer DEFAULT false NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscription_tier_quotas_tier_unique` ON `subscription_tier_quotas` (`tier`);--> statement-breakpoint
CREATE INDEX `subscription_tier_quotas_tier_idx` ON `subscription_tier_quotas` (`tier`);--> statement-breakpoint
CREATE INDEX `subscription_tier_quotas_annual_idx` ON `subscription_tier_quotas` (`is_annual`);--> statement-breakpoint
CREATE TABLE `user_chat_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`current_period_start` integer NOT NULL,
	`current_period_end` integer NOT NULL,
	`threads_created` integer DEFAULT 0 NOT NULL,
	`threads_limit` integer NOT NULL,
	`messages_created` integer DEFAULT 0 NOT NULL,
	`messages_limit` integer NOT NULL,
	`subscription_tier` text DEFAULT 'free' NOT NULL,
	`is_annual` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_chat_usage_user_id_unique` ON `user_chat_usage` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_chat_usage_user_idx` ON `user_chat_usage` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_chat_usage_period_idx` ON `user_chat_usage` (`current_period_end`);--> statement-breakpoint
CREATE TABLE `user_chat_usage_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`threads_created` integer DEFAULT 0 NOT NULL,
	`threads_limit` integer NOT NULL,
	`messages_created` integer DEFAULT 0 NOT NULL,
	`messages_limit` integer NOT NULL,
	`subscription_tier` text NOT NULL,
	`is_annual` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_chat_usage_history_user_idx` ON `user_chat_usage_history` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_chat_usage_history_period_idx` ON `user_chat_usage_history` (`period_start`,`period_end`);