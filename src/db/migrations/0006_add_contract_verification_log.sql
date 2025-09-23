-- Add contract_verification_log table to track all verification attempts
-- This helps monitor and recover from failed verifications
CREATE TABLE IF NOT EXISTS `contract_verification_log` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text,
  `payman_authority` text NOT NULL,
  `status` text NOT NULL DEFAULT 'pending', -- pending, success, failed, recovered
  `attempt_count` integer DEFAULT 1,
  `contract_signature` text, -- Store signature if verification succeeds
  `payment_method_id` text, -- Link to created payment method
  `error_message` text,
  `ip_address` text,
  `user_agent` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  `verified_at` integer,
  FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`payment_method_id`) REFERENCES `payment_method`(`id`) ON UPDATE no action ON DELETE set null
);

-- Index for finding verification attempts by authority
CREATE INDEX IF NOT EXISTS `verification_by_authority_idx` ON `contract_verification_log` (`payman_authority`);

-- Index for finding pending verifications
CREATE INDEX IF NOT EXISTS `verification_pending_idx` ON `contract_verification_log` (`status`, `created_at`) WHERE `status` = 'pending';

-- Index for user's verification history
CREATE INDEX IF NOT EXISTS `verification_by_user_idx` ON `contract_verification_log` (`user_id`, `created_at`);