-- Migration: Add Roundtable product mapping fields
-- This migration adds columns to support full mapping between Roundtable and billing dashboard products

-- Add new columns to product table for Roundtable integration
ALTER TABLE `product` ADD COLUMN `roundtable_id` text; -- UUID from Roundtable system
ALTER TABLE `product` ADD COLUMN `message_quota` integer; -- Monthly message quota
ALTER TABLE `product` ADD COLUMN `conversation_limit` integer; -- Monthly conversation limit
ALTER TABLE `product` ADD COLUMN `model_limit` integer; -- Number of AI models available
ALTER TABLE `product` ADD COLUMN `features` text; -- JSON: allowed_models, premium features, etc.
ALTER TABLE `product` ADD COLUMN `stripe_product_id` text; -- Stripe product ID for regular payments
ALTER TABLE `product` ADD COLUMN `stripe_price_id` text; -- Stripe price ID for regular payments
ALTER TABLE `product` ADD COLUMN `usage_type` text; -- Usage type from Roundtable
ALTER TABLE `product` ADD COLUMN `system_prompt_id` text; -- System prompt ID from Roundtable

-- Add indexes for better query performance
CREATE INDEX `product_roundtable_id_idx` ON `product` (`roundtable_id`);
CREATE INDEX `product_stripe_product_id_idx` ON `product` (`stripe_product_id`);
CREATE INDEX `product_stripe_price_id_idx` ON `product` (`stripe_price_id`);
CREATE INDEX `product_message_quota_idx` ON `product` (`message_quota`);
CREATE INDEX `product_model_limit_idx` ON `product` (`model_limit`);

-- Create unique constraint on roundtable_id to ensure one-to-one mapping
CREATE UNIQUE INDEX `product_roundtable_id_unique` ON `product` (`roundtable_id`) WHERE `roundtable_id` IS NOT NULL;