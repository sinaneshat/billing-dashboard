/**
 * External Integration Tables
 * For managing webhook endpoints and user account linking with external systems
 */

import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from '../utils';

// External webhook endpoints configuration
export const externalWebhookEndpoint = sqliteTable('external_webhook_endpoint', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(), // e.g. 'external_service_production', 'external_service_staging'
  url: text('url').notNull(), // e.g. 'https://external-service.example.com/webhooks'
  secretKey: text('secret_key').notNull(), // For HMAC signing
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),

  // Event filtering
  enabledEvents: text('enabled_events', { mode: 'json' }).notNull().default('["*"]'), // ['payment_intent.succeeded', 'subscription.created']

  // Retry configuration
  maxRetries: integer('max_retries').notNull().default(3),
  retryBackoffMultiplier: integer('retry_backoff_multiplier').notNull().default(2),
  timeoutMs: integer('timeout_ms').notNull().default(15000),

  // Statistics
  totalDeliveries: integer('total_deliveries').notNull().default(0),
  successfulDeliveries: integer('successful_deliveries').notNull().default(0),
  failedDeliveries: integer('failed_deliveries').notNull().default(0),
  lastSuccessAt: integer('last_success_at', { mode: 'timestamp' }),
  lastFailureAt: integer('last_failure_at', { mode: 'timestamp' }),

  metadata: text('metadata', { mode: 'json' }), // Additional configuration
  ...timestamps,
}, table => [
  index('external_webhook_endpoint_name_idx').on(table.name),
  index('external_webhook_endpoint_is_active_idx').on(table.isActive),
  index('external_webhook_endpoint_url_idx').on(table.url),
]);

// Note: User correlation is handled via email addresses
// No separate mapping table needed - webhooks will include user email

// Webhook delivery tracking for external systems
export const webhookDeliveryAttempt = sqliteTable('webhook_delivery_attempt', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),

  // Reference to webhook event
  webhookEventId: text('webhook_event_id').notNull(), // Links to existing webhookEvent table
  endpointId: text('endpoint_id').notNull().references(() => externalWebhookEndpoint.id, { onDelete: 'cascade' }),

  // Delivery details
  attemptNumber: integer('attempt_number').notNull().default(1),
  httpStatusCode: integer('http_status_code'),
  responseBody: text('response_body'),
  responseHeaders: text('response_headers', { mode: 'json' }),

  // Timing
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
  responseTimeMs: integer('response_time_ms'),

  // Status
  success: integer('success', { mode: 'boolean' }).notNull().default(false),
  errorMessage: text('error_message'),
  errorType: text('error_type'), // 'network', 'timeout', 'http_error', 'authentication'

  // Retry scheduling
  nextRetryAt: integer('next_retry_at', { mode: 'timestamp' }),
  retryAfterMs: integer('retry_after_ms'), // Delay before next retry

  ...timestamps,
}, table => [
  index('webhook_delivery_attempt_event_idx').on(table.webhookEventId),
  index('webhook_delivery_attempt_endpoint_idx').on(table.endpointId),
  index('webhook_delivery_attempt_success_idx').on(table.success),
  index('webhook_delivery_attempt_next_retry_idx').on(table.nextRetryAt),
  // Composite indexes
  index('webhook_delivery_attempt_event_endpoint_idx').on(table.webhookEventId, table.endpointId),
  index('webhook_delivery_attempt_retry_queue_idx').on(table.nextRetryAt, table.success),
]);

// Relations
export const externalWebhookEndpointRelations = relations(externalWebhookEndpoint, ({ many }) => ({
  deliveryAttempts: many(webhookDeliveryAttempt),
}));

// Note: Relations removed since we're using email-based correlation

export const webhookDeliveryAttemptRelations = relations(webhookDeliveryAttempt, ({ one }) => ({
  endpoint: one(externalWebhookEndpoint, {
    fields: [webhookDeliveryAttempt.endpointId],
    references: [externalWebhookEndpoint.id],
  }),
}));
