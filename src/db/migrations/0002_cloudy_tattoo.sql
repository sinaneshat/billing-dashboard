CREATE TABLE `chat_memory` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`thread_id` text,
	`type` text DEFAULT 'topic' NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`is_global` integer DEFAULT false NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`thread_id`) REFERENCES `chat_thread`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_memory_user_idx` ON `chat_memory` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_memory_thread_idx` ON `chat_memory` (`thread_id`);--> statement-breakpoint
CREATE INDEX `chat_memory_global_idx` ON `chat_memory` (`is_global`);--> statement-breakpoint
CREATE TABLE `chat_message` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`participant_id` text,
	`role` text DEFAULT 'assistant' NOT NULL,
	`content` text NOT NULL,
	`reasoning` text,
	`tool_calls` text,
	`metadata` text,
	`parent_message_id` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `chat_thread`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`participant_id`) REFERENCES `chat_participant`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`parent_message_id`) REFERENCES `chat_message`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `chat_message_thread_idx` ON `chat_message` (`thread_id`);--> statement-breakpoint
CREATE INDEX `chat_message_created_idx` ON `chat_message` (`created_at`);--> statement-breakpoint
CREATE INDEX `chat_message_participant_idx` ON `chat_message` (`participant_id`);--> statement-breakpoint
CREATE TABLE `chat_participant` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`model_id` text NOT NULL,
	`role` text NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`is_enabled` integer DEFAULT true NOT NULL,
	`settings` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `chat_thread`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_participant_thread_idx` ON `chat_participant` (`thread_id`);--> statement-breakpoint
CREATE INDEX `chat_participant_priority_idx` ON `chat_participant` (`priority`);--> statement-breakpoint
CREATE TABLE `chat_thread` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`mode` text DEFAULT 'brainstorming' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`last_message_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_thread_user_idx` ON `chat_thread` (`user_id`);--> statement-breakpoint
CREATE INDEX `chat_thread_status_idx` ON `chat_thread` (`status`);--> statement-breakpoint
CREATE INDEX `chat_thread_updated_idx` ON `chat_thread` (`updated_at`);--> statement-breakpoint
CREATE TABLE `model_configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`model_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`capabilities` text,
	`default_settings` text,
	`is_enabled` integer DEFAULT true NOT NULL,
	`order` integer DEFAULT 0 NOT NULL,
	`metadata` text,
	`created_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `model_configuration_model_id_unique` ON `model_configuration` (`model_id`);--> statement-breakpoint
CREATE INDEX `model_configuration_provider_idx` ON `model_configuration` (`provider`);--> statement-breakpoint
CREATE INDEX `model_configuration_enabled_idx` ON `model_configuration` (`is_enabled`);