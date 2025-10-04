CREATE TABLE `chat_custom_role` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`system_prompt` text NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_custom_role_user_idx` ON `chat_custom_role` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_custom_role_name_idx` ON `chat_custom_role` (`name`);--> statement-breakpoint
CREATE TABLE `chat_thread_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`memory_id` text NOT NULL,
	`attached_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `chat_thread`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`memory_id`) REFERENCES `chat_memory`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_thread_memory_thread_idx` ON `chat_thread_memory` (`thread_id`);--> statement-breakpoint
CREATE INDEX `chat_thread_memory_memory_idx` ON `chat_thread_memory` (`memory_id`);--> statement-breakpoint
CREATE INDEX `chat_thread_memory_unique_idx` ON `chat_thread_memory` (`thread_id`,`memory_id`);--> statement-breakpoint
ALTER TABLE `chat_memory` ADD `description` text;--> statement-breakpoint
ALTER TABLE `chat_participant` ADD `custom_role_id` text REFERENCES chat_custom_role(id);--> statement-breakpoint
CREATE INDEX `chat_participant_custom_role_idx` ON `chat_participant` (`custom_role_id`);--> statement-breakpoint
ALTER TABLE `subscription_tier_quotas` ADD `memories_per_month` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_tier_quotas` ADD `custom_roles_per_month` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_chat_usage` ADD `memories_created` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_chat_usage` ADD `memories_limit` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_chat_usage` ADD `custom_roles_created` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_chat_usage` ADD `custom_roles_limit` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_chat_usage_history` ADD `memories_created` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_chat_usage_history` ADD `memories_limit` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_chat_usage_history` ADD `custom_roles_created` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `user_chat_usage_history` ADD `custom_roles_limit` integer DEFAULT 0 NOT NULL;