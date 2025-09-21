PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_payment_method` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`contract_type` text DEFAULT 'pending_contract' NOT NULL,
	`contract_signature` text(200),
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
--> statement-breakpoint
INSERT INTO `__new_payment_method`("id", "user_id", "contract_type", "contract_signature", "contract_status", "payman_authority", "contract_display_name", "contract_mobile", "contract_ssn", "contract_duration_days", "max_daily_amount", "max_daily_count", "max_monthly_count", "max_transaction_amount", "bank_code", "is_primary", "is_active", "last_used_at", "contract_expires_at", "contract_verified_at", "metadata", "created_at", "updated_at") SELECT "id", "user_id", "contract_type", "contract_signature", "contract_status", "payman_authority", "contract_display_name", "contract_mobile", "contract_ssn", "contract_duration_days", "max_daily_amount", "max_daily_count", "max_monthly_count", "max_transaction_amount", "bank_code", "is_primary", "is_active", "last_used_at", "contract_expires_at", "contract_verified_at", "metadata", "created_at", "updated_at" FROM `payment_method`;--> statement-breakpoint
DROP TABLE `payment_method`;--> statement-breakpoint
ALTER TABLE `__new_payment_method` RENAME TO `payment_method`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `payment_method_contract_signature_unique` ON `payment_method` (`contract_signature`);--> statement-breakpoint
CREATE INDEX `payment_method_user_id_idx` ON `payment_method` (`user_id`);--> statement-breakpoint
CREATE INDEX `payment_method_contract_signature_idx` ON `payment_method` (`contract_signature`);--> statement-breakpoint
CREATE INDEX `payment_method_contract_type_idx` ON `payment_method` (`contract_type`);--> statement-breakpoint
CREATE INDEX `payment_method_contract_status_idx` ON `payment_method` (`contract_status`);--> statement-breakpoint
CREATE INDEX `payment_method_payman_authority_idx` ON `payment_method` (`payman_authority`);--> statement-breakpoint
CREATE INDEX `payment_method_is_primary_idx` ON `payment_method` (`is_primary`);--> statement-breakpoint
CREATE INDEX `payment_method_is_active_idx` ON `payment_method` (`is_active`);--> statement-breakpoint
CREATE INDEX `payment_method_user_status_idx` ON `payment_method` (`user_id`,`contract_status`);--> statement-breakpoint
CREATE INDEX `payment_method_user_active_idx` ON `payment_method` (`user_id`,`is_active`);