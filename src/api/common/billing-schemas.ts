/**
 * Billing Domain Schemas - Schema-First Development
 *
 * Defines type-safe Zod schemas for all billing entities.
 * Replaces Drizzle InferSelectModel/InferInsertModel with proper schema-first approach.
 *
 * Following Context7 best practices and Zero Casting policy.
 */

import { z } from 'zod';

import { createEntitySchema, createInsertSchema, createUpdateSchema } from './schema-first-patterns';

// ============================================================================
// BILLING ENTITY SCHEMAS
// ============================================================================

/**
 * Product entity schema
 * Matches src/db/tables/billing.ts product table
 */
export const ProductSelectSchema = createEntitySchema({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  price: z.number().nonnegative(), // Price in USD
  billingPeriod: z.enum(['one_time', 'monthly']).default('one_time'),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(), // JSON metadata
}, { withAudit: true });

export const ProductInsertSchema = createInsertSchema(ProductSelectSchema);
export const ProductUpdateSchema = createUpdateSchema(ProductSelectSchema);

export type ProductSelect = z.infer<typeof ProductSelectSchema>;
export type ProductInsert = z.infer<typeof ProductInsertSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;

/**
 * Payment Method entity schema
 * Matches src/db/tables/billing.ts paymentMethod table
 */
export const PaymentMethodSelectSchema = createEntitySchema({
  userId: z.string().uuid(),

  // ZarinPal Direct Debit Contract fields
  contractType: z.enum(['direct_debit_contract', 'pending_contract']).default('pending_contract'),
  contractSignature: z.string().nullable().optional(),
  contractStatus: z.enum([
    'pending_signature',
    'active',
    'cancelled_by_user',
    'verification_failed',
    'expired',
  ]).default('pending_signature'),
  paymanAuthority: z.string().nullable().optional(),

  // Contract details
  contractDisplayName: z.string().default('Direct Debit Contract'),
  contractMobile: z.string().nullable().optional(),
  contractDurationDays: z.number().int().positive().nullable().optional().default(365),
  maxDailyAmount: z.number().int().positive().nullable().optional(),
  maxDailyCount: z.number().int().positive().nullable().optional(),
  maxMonthlyCount: z.number().int().positive().nullable().optional(),

  // Status fields
  isPrimary: z.boolean().default(false),
  isActive: z.boolean().default(true),
  lastUsedAt: z.date().nullable().optional(),
  contractExpiresAt: z.date().nullable().optional(),
  contractVerifiedAt: z.date().nullable().optional(),

  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
}, { withAudit: true });

export const PaymentMethodInsertSchema = createInsertSchema(PaymentMethodSelectSchema);
export const PaymentMethodUpdateSchema = createUpdateSchema(PaymentMethodSelectSchema);

export type PaymentMethodSelect = z.infer<typeof PaymentMethodSelectSchema>;
export type PaymentMethodInsert = z.infer<typeof PaymentMethodInsertSchema>;
export type PaymentMethodUpdate = z.infer<typeof PaymentMethodUpdateSchema>;

/**
 * Subscription entity schema
 * Matches src/db/tables/billing.ts subscription table
 */
export const SubscriptionSelectSchema = createEntitySchema({
  userId: z.string().uuid(),
  productId: z.string().uuid(),
  status: z.enum(['active', 'canceled', 'expired', 'pending']).default('pending'),

  // Billing dates
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  nextBillingDate: z.date().nullable().optional(),

  // ZarinPal Direct Debit Contract integration
  directDebitContractId: z.string().nullable().optional(),
  directDebitSignature: z.string().nullable().optional(),

  // Billing details
  currentPrice: z.number().nonnegative(),
  billingPeriod: z.enum(['one_time', 'monthly']),

  // Enhanced features
  paymentMethodId: z.string().uuid().nullable().optional(),
  trialEndDate: z.date().nullable().optional(),
  gracePeriodEndDate: z.date().nullable().optional(),
  cancellationReason: z.string().nullable().optional(),
  billingCycleCount: z.number().int().nonnegative().default(0),
  lastBillingAttempt: z.date().nullable().optional(),
  prorationCredit: z.number().nonnegative().default(0),
  upgradeDowngradeAt: z.date().nullable().optional(),

  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
}, { withAudit: true });

export const SubscriptionInsertSchema = createInsertSchema(SubscriptionSelectSchema);
export const SubscriptionUpdateSchema = createUpdateSchema(SubscriptionSelectSchema);

export type SubscriptionSelect = z.infer<typeof SubscriptionSelectSchema>;
export type SubscriptionInsert = z.infer<typeof SubscriptionInsertSchema>;
export type SubscriptionUpdate = z.infer<typeof SubscriptionUpdateSchema>;

/**
 * Payment entity schema
 * Matches src/db/tables/billing.ts payment table
 */
export const PaymentSelectSchema = createEntitySchema({
  userId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable().optional(),
  productId: z.string().uuid(),

  // Payment details
  amount: z.number().int().positive(),
  currency: z.enum(['USD', 'IRR']).default('IRR'),
  status: z.enum(['pending', 'completed', 'failed', 'refunded', 'canceled']).default('pending'),

  // ZarinPal specific fields
  paymentMethod: z.string().default('zarinpal'),
  zarinpalAuthority: z.string().nullable().optional(),
  zarinpalRefId: z.string().nullable().optional(),
  zarinpalCardHash: z.string().nullable().optional(),
  zarinpalDirectDebitUsed: z.boolean().default(false),

  // Payment lifecycle timestamps
  paidAt: z.date().nullable().optional(),
  failedAt: z.date().nullable().optional(),
  refundedAt: z.date().nullable().optional(),

  // Retry logic
  retryCount: z.number().int().nonnegative().default(0),
  maxRetries: z.number().int().nonnegative().default(3),
  nextRetryAt: z.date().nullable().optional(),

  // Failure handling
  failureReason: z.string().nullable().optional(),

  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
}, { withAudit: true });

export const PaymentInsertSchema = createInsertSchema(PaymentSelectSchema);
export const PaymentUpdateSchema = createUpdateSchema(PaymentSelectSchema);

export type PaymentSelect = z.infer<typeof PaymentSelectSchema>;
export type PaymentInsert = z.infer<typeof PaymentInsertSchema>;
export type PaymentUpdate = z.infer<typeof PaymentUpdateSchema>;

/**
 * Billing Event entity schema
 * Matches src/db/tables/billing.ts billingEvent table
 */
export const BillingEventSelectSchema = createEntitySchema({
  userId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable().optional(),
  paymentId: z.string().uuid().nullable().optional(),
  paymentMethodId: z.string().uuid().nullable().optional(),

  eventType: z.string(),
  severity: z.enum(['info', 'warning', 'error', 'critical']).default('info'),
  eventData: z.record(z.string(), z.unknown()).nullable().optional(),

  // External system tracking
  externalEventId: z.string().nullable().optional(),
  externalSystemName: z.string().nullable().optional(),
}, { withAudit: true });

export const BillingEventInsertSchema = createInsertSchema(BillingEventSelectSchema);

export type BillingEventSelect = z.infer<typeof BillingEventSelectSchema>;
export type BillingEventInsert = z.infer<typeof BillingEventInsertSchema>;

/**
 * Webhook Event entity schema
 * Matches src/db/tables/billing.ts webhookEvent table
 */
export const WebhookEventSelectSchema = createEntitySchema({
  source: z.string(),
  eventType: z.string(),
  rawPayload: z.record(z.string(), z.unknown()),
  processed: z.boolean().default(false),
  processedAt: z.date().nullable().optional(),
  processingError: z.string().nullable().optional(),

  // Related entity IDs
  paymentId: z.string().uuid().nullable().optional(),
  subscriptionId: z.string().uuid().nullable().optional(),

  // External webhook forwarding
  forwardedToExternal: z.boolean().default(false),
  forwardedAt: z.date().nullable().optional(),
  externalWebhookUrl: z.string().url().nullable().optional(),
  forwardingError: z.string().nullable().optional(),

  // Security and validation
  signature: z.string().nullable().optional(),
  signatureValid: z.boolean().nullable().optional(),
  ipAddress: z.string().nullable().optional(), // IP validation available in newer Zod versions
}, { withAudit: true });

export const WebhookEventInsertSchema = createInsertSchema(WebhookEventSelectSchema);

export type WebhookEventSelect = z.infer<typeof WebhookEventSelectSchema>;
export type WebhookEventInsert = z.infer<typeof WebhookEventInsertSchema>;

// ============================================================================
// REPOSITORY SCHEMA COLLECTIONS
// ============================================================================

/**
 * Complete schema collections for each repository
 * Used by BaseRepository for validation
 */
export const ProductSchemas = {
  select: ProductSelectSchema,
  insert: ProductInsertSchema,
  update: ProductUpdateSchema,
} as const;

export const PaymentMethodSchemas = {
  select: PaymentMethodSelectSchema,
  insert: PaymentMethodInsertSchema,
  update: PaymentMethodUpdateSchema,
} as const;

export const SubscriptionSchemas = {
  select: SubscriptionSelectSchema,
  insert: SubscriptionInsertSchema,
  update: SubscriptionUpdateSchema,
} as const;

export const PaymentSchemas = {
  select: PaymentSelectSchema,
  insert: PaymentInsertSchema,
  update: PaymentUpdateSchema,
} as const;

export const BillingEventSchemas = {
  select: BillingEventSelectSchema,
  insert: BillingEventInsertSchema,
  update: z.never(), // Billing events are immutable
} as const;

export const WebhookEventSchemas = {
  select: WebhookEventSelectSchema,
  insert: WebhookEventInsertSchema,
  update: z.never(), // Webhook events are immutable
} as const;

// ============================================================================
// QUERY SCHEMAS
// ============================================================================

/**
 * Common filter schemas for repository queries
 */
export const ProductQuerySchema = z.object({
  billingPeriod: z.enum(['one_time', 'monthly']).optional(),
  isActive: z.boolean().optional(),
}).partial();

export const PaymentMethodQuerySchema = z.object({
  contractType: z.enum(['direct_debit_contract', 'pending_contract']).optional(),
  contractStatus: z.enum([
    'pending_signature',
    'active',
    'cancelled_by_user',
    'verification_failed',
    'expired',
  ]).optional(),
  isActive: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
}).partial();

export const SubscriptionQuerySchema = z.object({
  status: z.enum(['active', 'canceled', 'expired', 'pending']).optional(),
  productId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
}).partial();

export const PaymentQuerySchema = z.object({
  status: z.enum(['pending', 'completed', 'failed', 'refunded', 'canceled']).optional(),
  subscriptionId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  paymentMethod: z.string().optional(),
}).partial();

export const BillingEventQuerySchema = z.object({
  eventType: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error', 'critical']).optional(),
  subscriptionId: z.string().uuid().optional(),
  paymentId: z.string().uuid().optional(),
}).partial();

export const WebhookEventQuerySchema = z.object({
  source: z.string().optional(),
  eventType: z.string().optional(),
  processed: z.boolean().optional(),
  paymentId: z.string().uuid().optional(),
}).partial();

// ============================================================================
// SCHEMA-BASED TYPE EXPORTS (For future migration)
// ============================================================================

// Note: These types are created for future schema-first migration
// Currently the repository still uses Drizzle inference types
// TODO: Gradually replace repository types with these schema-based types

export type BillingSchemaTypes = {
  ProductSelect: z.infer<typeof ProductSelectSchema>;
  ProductInsert: z.infer<typeof ProductInsertSchema>;
  ProductUpdate: z.infer<typeof ProductUpdateSchema>;
  PaymentMethodSelect: z.infer<typeof PaymentMethodSelectSchema>;
  PaymentMethodInsert: z.infer<typeof PaymentMethodInsertSchema>;
  PaymentMethodUpdate: z.infer<typeof PaymentMethodUpdateSchema>;
  SubscriptionSelect: z.infer<typeof SubscriptionSelectSchema>;
  SubscriptionInsert: z.infer<typeof SubscriptionInsertSchema>;
  SubscriptionUpdate: z.infer<typeof SubscriptionUpdateSchema>;
  PaymentSelect: z.infer<typeof PaymentSelectSchema>;
  PaymentInsert: z.infer<typeof PaymentInsertSchema>;
  PaymentUpdate: z.infer<typeof PaymentUpdateSchema>;
  BillingEventSelect: z.infer<typeof BillingEventSelectSchema>;
  BillingEventInsert: z.infer<typeof BillingEventInsertSchema>;
  WebhookEventSelect: z.infer<typeof WebhookEventSelectSchema>;
  WebhookEventInsert: z.infer<typeof WebhookEventInsertSchema>;
};
