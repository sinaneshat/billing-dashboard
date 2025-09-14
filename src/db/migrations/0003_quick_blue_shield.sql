CREATE TABLE `sso_provider` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`issuer` text NOT NULL,
	`domain` text NOT NULL,
	`oidc_config` text,
	`saml_config` text,
	`user_id` text NOT NULL,
	`organization_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sso_provider_provider_id_unique` ON `sso_provider` (`provider_id`);--> statement-breakpoint
CREATE INDEX `sso_provider_user_id_idx` ON `sso_provider` (`user_id`);--> statement-breakpoint
CREATE INDEX `sso_provider_domain_idx` ON `sso_provider` (`domain`);--> statement-breakpoint
CREATE INDEX `sso_provider_issuer_idx` ON `sso_provider` (`issuer`);