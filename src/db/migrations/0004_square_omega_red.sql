ALTER TABLE `chat_thread` ADD `slug` text NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_thread` ADD `is_favorite` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_thread` ADD `is_public` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `chat_thread_slug_unique` ON `chat_thread` (`slug`);--> statement-breakpoint
CREATE INDEX `chat_thread_slug_idx` ON `chat_thread` (`slug`);--> statement-breakpoint
CREATE INDEX `chat_thread_favorite_idx` ON `chat_thread` (`is_favorite`);--> statement-breakpoint
CREATE INDEX `chat_thread_public_idx` ON `chat_thread` (`is_public`);