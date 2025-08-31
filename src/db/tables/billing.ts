import { relations } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from '../utils';
import { user } from './auth';

// Products table - defines what can be purchased
export const product = sqliteTable('product', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  price: real('price').notNull(), // Price in Iranian Rials (IRR)
  billingPeriod: text('billing_period', {
    enum: ['one_time', 'monthly'],
  }).notNull().default('one_time'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  metadata: text('metadata', { mode: 'json' }), // For additional product data
  ...timestamps,
}, table => [
  index('product_name_idx').on(table.name),
  index('product_billing_period_idx').on(table.billingPeriod),
  index('product_is_active_idx').on(table.isActive),
]);

// Subscriptions table - tracks user subscriptions to products
export const subscription = sqliteTable('subscription', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  productId: text('product_id').notNull().references(() => product.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['active', 'canceled', 'expired', 'pending'],
  }).notNull().default('pending'),

  // Billing dates
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }), // null for active, set when canceled
  nextBillingDate: integer('next_billing_date', { mode: 'timestamp' }), // For recurring subscriptions

  // ZarinPal Direct Debit integration fields
  zarinpalDirectDebitToken: text('zarinpal_direct_debit_token'), // For monthly auto-charge
  zarinpalDirectDebitId: text('zarinpal_direct_debit_id'), // ZarinPal direct debit ID

  // Billing details
  currentPrice: real('current_price').notNull(), // Price when subscribed (for historical tracking)
  billingPeriod: text('billing_period', {
    enum: ['one_time', 'monthly'],
  }).notNull(),

  metadata: text('metadata', { mode: 'json' }), // For additional subscription data
  ...timestamps,
}, table => [
  index('subscription_user_id_idx').on(table.userId),
  index('subscription_product_id_idx').on(table.productId),
  index('subscription_status_idx').on(table.status),
  index('subscription_next_billing_date_idx').on(table.nextBillingDate),
  index('subscription_zarinpal_direct_debit_token_idx').on(table.zarinpalDirectDebitToken),
]);

// Payments table - transaction log for all payment attempts
export const payment = sqliteTable('payment', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: text('subscription_id').references(() => subscription.id, { onDelete: 'set null' }),
  productId: text('product_id').notNull().references(() => product.id, { onDelete: 'cascade' }),

  // Payment details
  amount: real('amount').notNull(), // Amount in Iranian Rials (IRR)
  currency: text('currency').notNull().default('IRR'),
  status: text('status', {
    enum: ['pending', 'completed', 'failed', 'refunded', 'canceled'],
  }).notNull().default('pending'),
  paymentMethod: text('payment_method').notNull().default('zarinpal'),

  // ZarinPal specific fields
  zarinpalAuthority: text('zarinpal_authority'), // ZarinPal transaction authority
  zarinpalRefId: text('zarinpal_ref_id'), // ZarinPal reference ID after successful payment
  zarinpalCardHash: text('zarinpal_card_hash'), // For direct debit card identification
  zarinpalDirectDebitUsed: integer('zarinpal_direct_debit_used', { mode: 'boolean' }).default(false),

  // Retry logic for failed payments
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  nextRetryAt: integer('next_retry_at', { mode: 'timestamp' }),

  // Dates
  paidAt: integer('paid_at', { mode: 'timestamp' }),
  failedAt: integer('failed_at', { mode: 'timestamp' }),

  // Additional data
  failureReason: text('failure_reason'), // Why payment failed
  metadata: text('metadata', { mode: 'json' }), // For webhook data and additional info
  ...timestamps,
}, table => [
  index('payment_user_id_idx').on(table.userId),
  index('payment_subscription_id_idx').on(table.subscriptionId),
  index('payment_product_id_idx').on(table.productId),
  index('payment_status_idx').on(table.status),
  index('payment_zarinpal_authority_idx').on(table.zarinpalAuthority),
  index('payment_zarinpal_ref_id_idx').on(table.zarinpalRefId),
  index('payment_paid_at_idx').on(table.paidAt),
  index('payment_next_retry_at_idx').on(table.nextRetryAt),
]);

// Webhook events table - for audit trail and debugging
export const webhookEvent = sqliteTable('webhook_event', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  source: text('source').notNull().default('zarinpal'), // Source of webhook
  eventType: text('event_type').notNull(), // Type of event
  paymentId: text('payment_id').references(() => payment.id, { onDelete: 'set null' }),

  // Webhook data
  rawPayload: text('raw_payload', { mode: 'json' }).notNull(), // Full webhook payload
  processed: integer('processed', { mode: 'boolean' }).notNull().default(false),
  processedAt: integer('processed_at', { mode: 'timestamp' }),

  // Forwarding to external webhook URL
  forwardedToExternal: integer('forwarded_to_external', { mode: 'boolean' }).default(false),
  forwardedAt: integer('forwarded_at', { mode: 'timestamp' }),
  externalWebhookUrl: text('external_webhook_url'),

  // Error tracking
  processingError: text('processing_error'),
  forwardingError: text('forwarding_error'),

  ...timestamps,
}, table => [
  index('webhook_event_source_idx').on(table.source),
  index('webhook_event_type_idx').on(table.eventType),
  index('webhook_event_payment_id_idx').on(table.paymentId),
  index('webhook_event_processed_idx').on(table.processed),
  index('webhook_event_created_at_idx').on(table.createdAt),
]);

// Relations
export const productRelations = relations(product, ({ many }) => ({
  subscriptions: many(subscription),
  payments: many(payment),
}));

export const subscriptionRelations = relations(subscription, ({ one, many }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
  product: one(product, {
    fields: [subscription.productId],
    references: [product.id],
  }),
  payments: many(payment),
}));

export const paymentRelations = relations(payment, ({ one }) => ({
  user: one(user, {
    fields: [payment.userId],
    references: [user.id],
  }),
  subscription: one(subscription, {
    fields: [payment.subscriptionId],
    references: [subscription.id],
  }),
  product: one(product, {
    fields: [payment.productId],
    references: [product.id],
  }),
}));

export const webhookEventRelations = relations(webhookEvent, ({ one }) => ({
  payment: one(payment, {
    fields: [webhookEvent.paymentId],
    references: [payment.id],
  }),
}));

// Extended user relations to include billing tables
// Note: This extends the existing userRelations from auth.ts
export const userBillingRelations = relations(user, ({ many }) => ({
  subscriptions: many(subscription),
  payments: many(payment),
}));
