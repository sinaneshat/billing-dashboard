import { relations } from 'drizzle-orm';
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from '../utils';
import { user } from './auth';

// Products table - defines what can be purchased
export const product = sqliteTable('product', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  description: text('description'),
  price: real('price').notNull(), // Price in USD - API converts to Rials for ZarinPal
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
  // Composite index for active products by billing period
  index('product_active_billing_idx').on(table.isActive, table.billingPeriod),
]);

// Direct debit contracts table - stores ZarinPal Payman contracts only
export const paymentMethod = sqliteTable('payment_method', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),

  // ZarinPal Direct Debit Contract fields (Payman API)
  contractType: text('contract_type', {
    enum: ['direct_debit_contract', 'pending_contract'],
  }).notNull().default('pending_contract'),
  contractSignature: text('contract_signature').unique(), // ZarinPal contract signature
  contractStatus: text('contract_status', {
    enum: ['pending_signature', 'active', 'cancelled_by_user', 'verification_failed', 'expired'],
  }).notNull().default('pending_signature'),
  paymanAuthority: text('payman_authority'), // ZarinPal payman authority (temporary during setup)

  // Contract details
  contractDisplayName: text('contract_display_name').notNull().default('Direct Debit Contract'),
  contractMobile: text('contract_mobile'), // Mobile number used for contract
  contractDurationDays: integer('contract_duration_days').default(365),
  maxDailyAmount: integer('max_daily_amount'),
  maxDailyCount: integer('max_daily_count'),
  maxMonthlyCount: integer('max_monthly_count'),

  // Status fields
  isPrimary: integer('is_primary', { mode: 'boolean' }).default(false),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  contractExpiresAt: integer('contract_expires_at', { mode: 'timestamp' }),
  contractVerifiedAt: integer('contract_verified_at', { mode: 'timestamp' }),

  metadata: text('metadata', { mode: 'json' }),
  ...timestamps,
}, table => [
  index('payment_method_user_id_idx').on(table.userId),
  index('payment_method_contract_signature_idx').on(table.contractSignature),
  index('payment_method_contract_type_idx').on(table.contractType),
  index('payment_method_contract_status_idx').on(table.contractStatus),
  index('payment_method_payman_authority_idx').on(table.paymanAuthority),
  index('payment_method_is_primary_idx').on(table.isPrimary),
  index('payment_method_is_active_idx').on(table.isActive),
  // Composite indexes for better query performance
  index('payment_method_user_status_idx').on(table.userId, table.contractStatus),
  index('payment_method_user_active_idx').on(table.userId, table.isActive),
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

  // ZarinPal Direct Debit Contract integration fields (Payman API)
  directDebitContractId: text('direct_debit_contract_id'), // ZarinPal Payman contract ID
  directDebitSignature: text('direct_debit_signature'), // ZarinPal contract signature

  // Billing details
  currentPrice: real('current_price').notNull(), // Price when subscribed (for historical tracking)
  billingPeriod: text('billing_period', {
    enum: ['one_time', 'monthly'],
  }).notNull(),

  // Enhanced subscription features
  paymentMethodId: text('payment_method_id').references(() => paymentMethod.id, { onDelete: 'restrict' }),
  trialEndDate: integer('trial_end_date', { mode: 'timestamp' }),
  gracePeriodEndDate: integer('grace_period_end_date', { mode: 'timestamp' }),
  cancellationReason: text('cancellation_reason'),
  upgradeDowngradeAt: integer('upgrade_downgrade_at', { mode: 'timestamp' }),
  prorationCredit: real('proration_credit').default(0),
  billingCycleCount: integer('billing_cycle_count').default(0),
  lastBillingAttempt: integer('last_billing_attempt', { mode: 'timestamp' }),
  failedBillingAttempts: integer('failed_billing_attempts').default(0),

  metadata: text('metadata', { mode: 'json' }), // For additional subscription data
  ...timestamps,
}, table => [
  index('subscription_user_id_idx').on(table.userId),
  index('subscription_product_id_idx').on(table.productId),
  index('subscription_status_idx').on(table.status),
  index('subscription_next_billing_date_idx').on(table.nextBillingDate),
  index('subscription_direct_debit_contract_id_idx').on(table.directDebitContractId),
  // Composite indexes for common query patterns
  index('subscription_user_status_idx').on(table.userId, table.status),
  index('subscription_user_product_idx').on(table.userId, table.productId),
  index('subscription_status_billing_date_idx').on(table.status, table.nextBillingDate),
  // Index for billing automation queries
  index('subscription_billing_automation_idx').on(table.status, table.nextBillingDate, table.paymentMethodId),
]);

// Payments table - transaction log for all payment attempts
export const payment = sqliteTable('payment', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: text('subscription_id').references(() => subscription.id, { onDelete: 'restrict' }),
  productId: text('product_id').notNull().references(() => product.id, { onDelete: 'restrict' }),

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
  // Composite indexes for common query patterns
  index('payment_user_status_idx').on(table.userId, table.status),
  index('payment_subscription_status_idx').on(table.subscriptionId, table.status),
  index('payment_retry_processing_idx').on(table.status, table.nextRetryAt),
  // Index for financial reporting queries
  index('payment_financial_reports_idx').on(table.status, table.paidAt, table.amount),
]);

// Billing events table - comprehensive audit trail
export const billingEvent = sqliteTable('billing_event', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: text('subscription_id').references(() => subscription.id, { onDelete: 'cascade' }),
  paymentId: text('payment_id').references(() => payment.id, { onDelete: 'cascade' }),
  paymentMethodId: text('payment_method_id').references(() => paymentMethod.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(), // 'payment_success', 'payment_failed', 'subscription_created', etc.
  eventData: text('event_data', { mode: 'json' }).notNull(),
  severity: text('severity', { enum: ['info', 'warning', 'error', 'critical'] }).default('info'),
  ...timestamps,
}, table => [
  index('billing_event_user_id_idx').on(table.userId),
  index('billing_event_subscription_id_idx').on(table.subscriptionId),
  index('billing_event_payment_id_idx').on(table.paymentId),
  index('billing_event_type_idx').on(table.eventType),
  index('billing_event_severity_idx').on(table.severity),
  index('billing_event_created_at_idx').on(table.createdAt),
]);

// Webhook events table - for audit trail and debugging
export const webhookEvent = sqliteTable('webhook_event', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  source: text('source').notNull().default('zarinpal'), // Source of webhook
  eventType: text('event_type').notNull(), // Type of event
  paymentId: text('payment_id').references(() => payment.id, { onDelete: 'cascade' }),

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
  paymentMethod: one(paymentMethod, {
    fields: [subscription.paymentMethodId],
    references: [paymentMethod.id],
  }),
  payments: many(payment),
  billingEvents: many(billingEvent),
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

// Payment method relations
export const paymentMethodRelations = relations(paymentMethod, ({ one, many }) => ({
  user: one(user, {
    fields: [paymentMethod.userId],
    references: [user.id],
  }),
  subscriptions: many(subscription),
  billingEvents: many(billingEvent),
}));

// Billing event relations
export const billingEventRelations = relations(billingEvent, ({ one }) => ({
  user: one(user, {
    fields: [billingEvent.userId],
    references: [user.id],
  }),
  subscription: one(subscription, {
    fields: [billingEvent.subscriptionId],
    references: [subscription.id],
  }),
  payment: one(payment, {
    fields: [billingEvent.paymentId],
    references: [payment.id],
  }),
  paymentMethod: one(paymentMethod, {
    fields: [billingEvent.paymentMethodId],
    references: [paymentMethod.id],
  }),
}));

// Extended user relations to include billing tables
// Note: This extends the existing userRelations from auth.ts
export const userBillingRelations = relations(user, ({ many }) => ({
  subscriptions: many(subscription),
  payments: many(payment),
  paymentMethods: many(paymentMethod),
  billingEvents: many(billingEvent),
}));
