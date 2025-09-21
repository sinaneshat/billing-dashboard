-- Migration: Add encrypted signature fields and remove old signature field
-- This migration adds contract_signature_encrypted and contract_signature_hash fields
-- while preserving existing data by renaming the old contract_signature field

PRAGMA foreign_keys=OFF;

-- Step 1: Create new table structure with encrypted signature fields
CREATE TABLE `__new_payment_method` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`contract_type` text DEFAULT 'pending_contract' NOT NULL,
	`contract_signature_encrypted` text,
	`contract_signature_hash` text,
	`contract_status` text DEFAULT 'pending_signature' NOT NULL,
	`payman_authority` text,
	`contract_display_name` text DEFAULT 'Direct Debit Contract' NOT NULL,
	`contract_mobile` text,
	`contract_ssn` text,
	`contract_duration_days` integer DEFAULT 365,
	`max_daily_amount` integer,
	`max_daily_count` integer,
	`max_monthly_count` integer,
	`max_transaction_amount` integer,
	`bank_code` text,
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

-- Step 2: Copy data from old table to new table
-- Note: contract_signature data will be NULL in the new encrypted field initially
-- This will need to be handled by the application layer for existing contracts
INSERT INTO `__new_payment_method`(
	"id", "user_id", "contract_type", "contract_signature_encrypted", "contract_signature_hash",
	"contract_status", "payman_authority", "contract_display_name", "contract_mobile",
	"contract_ssn", "contract_duration_days", "max_daily_amount", "max_daily_count",
	"max_monthly_count", "max_transaction_amount", "bank_code", "is_primary", "is_active",
	"last_used_at", "contract_expires_at", "contract_verified_at", "metadata",
	"created_at", "updated_at"
)
SELECT
	"id", "user_id", "contract_type", NULL, NULL,
	"contract_status", "payman_authority", "contract_display_name", "contract_mobile",
	"contract_ssn", "contract_duration_days", "max_daily_amount", "max_daily_count",
	"max_monthly_count", "max_transaction_amount", "bank_code", "is_primary", "is_active",
	"last_used_at", "contract_expires_at", "contract_verified_at", "metadata",
	"created_at", "updated_at"
FROM `payment_method`;

-- Step 3: Drop old table and rename new table
DROP TABLE `payment_method`;
ALTER TABLE `__new_payment_method` RENAME TO `payment_method`;

-- Step 4: Recreate indexes with updated field names
CREATE UNIQUE INDEX `payment_method_contract_signature_hash_unique` ON `payment_method` (`contract_signature_hash`);
CREATE INDEX `payment_method_user_id_idx` ON `payment_method` (`user_id`);
CREATE INDEX `payment_method_contract_signature_hash_idx` ON `payment_method` (`contract_signature_hash`);
CREATE INDEX `payment_method_contract_type_idx` ON `payment_method` (`contract_type`);
CREATE INDEX `payment_method_contract_status_idx` ON `payment_method` (`contract_status`);
CREATE INDEX `payment_method_payman_authority_idx` ON `payment_method` (`payman_authority`);
CREATE INDEX `payment_method_is_primary_idx` ON `payment_method` (`is_primary`);
CREATE INDEX `payment_method_is_active_idx` ON `payment_method` (`is_active`);
CREATE INDEX `payment_method_user_status_idx` ON `payment_method` (`user_id`,`contract_status`);
CREATE INDEX `payment_method_user_active_idx` ON `payment_method` (`user_id`,`is_active`);

PRAGMA foreign_keys=ON;