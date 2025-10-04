DROP INDEX `subscription_tier_quotas_tier_unique`;--> statement-breakpoint
CREATE INDEX `subscription_tier_quotas_tier_annual_unique_idx` ON `subscription_tier_quotas` (`tier`,`is_annual`);