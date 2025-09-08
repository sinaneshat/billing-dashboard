ALTER TABLE `product` ADD `roundtable_id` text;--> statement-breakpoint
ALTER TABLE `product` ADD `message_quota` integer;--> statement-breakpoint
ALTER TABLE `product` ADD `conversation_limit` integer;--> statement-breakpoint
ALTER TABLE `product` ADD `model_limit` integer;--> statement-breakpoint
ALTER TABLE `product` ADD `features` text;--> statement-breakpoint
ALTER TABLE `product` ADD `stripe_product_id` text;--> statement-breakpoint
ALTER TABLE `product` ADD `stripe_price_id` text;--> statement-breakpoint
ALTER TABLE `product` ADD `usage_type` text;--> statement-breakpoint
ALTER TABLE `product` ADD `system_prompt_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `product_roundtable_id_unique` ON `product` (`roundtable_id`);--> statement-breakpoint
CREATE INDEX `product_roundtable_id_idx` ON `product` (`roundtable_id`);--> statement-breakpoint
CREATE INDEX `product_stripe_product_id_idx` ON `product` (`stripe_product_id`);--> statement-breakpoint
CREATE INDEX `product_stripe_price_id_idx` ON `product` (`stripe_price_id`);--> statement-breakpoint
CREATE INDEX `product_message_quota_idx` ON `product` (`message_quota`);--> statement-breakpoint
CREATE INDEX `product_model_limit_idx` ON `product` (`model_limit`);