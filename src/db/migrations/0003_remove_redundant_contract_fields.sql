-- Migration: Remove redundant direct debit contract fields from subscription table
-- These fields duplicate data already stored in the paymentMethod table
-- The subscription.paymentMethodId foreign key provides access to contract information

-- SQLite doesn't support DROP COLUMN, so we need to recreate the table

-- Step 1: Create new subscription table without redundant fields
CREATE TABLE `subscription_new` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`product_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer,
	`next_billing_date` integer,
	-- removed: `direct_debit_contract_id` text,
	-- removed: `direct_debit_signature` text,
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
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE restrict
);

-- Step 2: Copy data from old table to new table (excluding the redundant fields)
INSERT INTO `subscription_new` (
	`id`, `user_id`, `product_id`, `status`, `start_date`, `end_date`, `next_billing_date`,
	`current_price`, `billing_period`, `payment_method_id`, `trial_end_date`, `grace_period_end_date`,
	`cancellation_reason`, `upgrade_downgrade_at`, `proration_credit`, `billing_cycle_count`,
	`last_billing_attempt`, `failed_billing_attempts`, `created_at`, `updated_at`
)
SELECT
	`id`, `user_id`, `product_id`, `status`, `start_date`, `end_date`, `next_billing_date`,
	`current_price`, `billing_period`, `payment_method_id`, `trial_end_date`, `grace_period_end_date`,
	`cancellation_reason`, `upgrade_downgrade_at`, `proration_credit`, `billing_cycle_count`,
	`last_billing_attempt`, `failed_billing_attempts`, `created_at`, `updated_at`
FROM `subscription`;

-- Step 3: Drop old table
DROP TABLE `subscription`;

-- Step 4: Rename new table to original name
ALTER TABLE `subscription_new` RENAME TO `subscription`;

-- Step 5: Recreate indexes (except the removed direct_debit_contract_id index)
CREATE INDEX `subscription_user_id_idx` ON `subscription` (`user_id`);
CREATE INDEX `subscription_product_id_idx` ON `subscription` (`product_id`);
CREATE INDEX `subscription_status_idx` ON `subscription` (`status`);
CREATE INDEX `subscription_next_billing_date_idx` ON `subscription` (`next_billing_date`);
CREATE INDEX `subscription_user_status_idx` ON `subscription` (`user_id`,`status`);
CREATE INDEX `subscription_user_product_idx` ON `subscription` (`user_id`,`product_id`);
CREATE INDEX `subscription_status_billing_date_idx` ON `subscription` (`status`,`next_billing_date`);
CREATE INDEX `subscription_billing_automation_idx` ON `subscription` (`status`,`next_billing_date`,`payment_method_id`);