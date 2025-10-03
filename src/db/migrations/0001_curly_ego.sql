PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_stripe_subscription` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`user_id` text NOT NULL,
	`status` text NOT NULL,
	`price_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`cancel_at` integer,
	`canceled_at` integer,
	`current_period_start` integer NOT NULL,
	`current_period_end` integer NOT NULL,
	`trial_start` integer,
	`trial_end` integer,
	`ended_at` integer,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `stripe_customer`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`price_id`) REFERENCES `stripe_price`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_stripe_subscription`("id", "customer_id", "user_id", "status", "price_id", "quantity", "cancel_at_period_end", "cancel_at", "canceled_at", "current_period_start", "current_period_end", "trial_start", "trial_end", "ended_at", "metadata", "created_at", "updated_at") SELECT "id", "customer_id", "user_id", "status", "price_id", "quantity", "cancel_at_period_end", "cancel_at", "canceled_at", "current_period_start", "current_period_end", "trial_start", "trial_end", "ended_at", "metadata", "created_at", "updated_at" FROM `stripe_subscription`;--> statement-breakpoint
DROP TABLE `stripe_subscription`;--> statement-breakpoint
ALTER TABLE `__new_stripe_subscription` RENAME TO `stripe_subscription`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `stripe_subscription_customer_idx` ON `stripe_subscription` (`customer_id`);--> statement-breakpoint
CREATE INDEX `stripe_subscription_user_idx` ON `stripe_subscription` (`user_id`);--> statement-breakpoint
CREATE INDEX `stripe_subscription_status_idx` ON `stripe_subscription` (`status`);--> statement-breakpoint
CREATE INDEX `stripe_subscription_price_idx` ON `stripe_subscription` (`price_id`);