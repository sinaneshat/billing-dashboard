import { z } from '@hono/zod-openapi';

import { ApiResponseSchema } from '@/api/common/schemas';

// Base subscription schema matching the database
const SubscriptionSchema = z.object({
  id: z.string().openapi({ example: 'sub_123' }),
  userId: z.string().openapi({ example: 'user_123' }),
  productId: z.string().openapi({ example: 'prod_123' }),
  status: z.enum(['active', 'canceled', 'expired', 'pending']).openapi({ example: 'active' }),
  startDate: z.string().datetime().openapi({ example: new Date().toISOString() }),
  endDate: z.string().datetime().nullable().openapi({ example: null }),
  nextBillingDate: z.string().datetime().nullable().openapi({ example: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }),
  currentPrice: z.number().openapi({ example: 99000 }),
  billingPeriod: z.enum(['one_time', 'monthly']).openapi({ example: 'monthly' }),
  directDebitContractId: z.string().nullable().openapi({ example: 'contract_abc123', description: 'ZarinPal direct debit contract ID for automatic billing' }),
  directDebitSignature: z.string().nullable().openapi({ example: 'signature_200chars...', description: 'ZarinPal direct debit contract signature (stored securely)' }),
  createdAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
  updatedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
});

// Subscription with related product data
const SubscriptionWithProductSchema = SubscriptionSchema.extend({
  product: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    billingPeriod: z.enum(['one_time', 'monthly']),
  }),
});

// Request schemas for Direct Debit Contract-based subscriptions
export const CreateSubscriptionRequestSchema = z.object({
  productId: z.string().min(1).openapi({
    example: 'prod_123',
    description: 'Product ID to subscribe to',
  }),
  paymentMethod: z.enum(['direct-debit-contract', 'zarinpal-oneoff']).default('direct-debit-contract').openapi({
    example: 'direct-debit-contract',
    description: 'Payment method: direct-debit-contract for automatic renewal via signed contracts, zarinpal-oneoff for legacy one-time payments',
  }),
  contractId: z.string().optional().openapi({
    example: 'contract_abc123',
    description: 'Direct debit contract ID (required when paymentMethod is direct-debit-contract)',
  }),
  enableAutoRenew: z.boolean().default(true).openapi({
    example: true,
    description: 'Enable automatic renewal using the signed direct debit contract',
  }),
  callbackUrl: z.string().url().optional().openapi({
    example: 'https://app.example.com/payment/callback',
    description: 'URL to redirect after payment (only used for zarinpal-oneoff legacy payments)',
  }),
}).openapi('CreateSubscriptionRequest');

export const CancelSubscriptionRequestSchema = z.object({
  reason: z.string().optional().openapi({
    example: 'No longer needed',
    description: 'Optional cancellation reason',
  }),
}).openapi('CancelSubscriptionRequest');

// Response schemas
export const GetSubscriptionsResponseSchema = ApiResponseSchema(
  z.array(SubscriptionWithProductSchema),
).openapi('GetSubscriptionsResponse');

export const GetSubscriptionResponseSchema = ApiResponseSchema(
  SubscriptionWithProductSchema,
).openapi('GetSubscriptionResponse');

export const CreateSubscriptionResponseSchema = ApiResponseSchema(
  z.object({
    subscriptionId: z.string().openapi({ example: 'sub_123' }),
    paymentMethod: z.string().openapi({ example: 'direct-debit-contract' }),
    contractId: z.string().optional().openapi({
      example: 'contract_abc123',
      description: 'Direct debit contract ID used for this subscription',
    }),
    autoRenewalEnabled: z.boolean().openapi({
      example: true,
      description: 'Whether automatic renewal is enabled via direct debit contract',
    }),
    // Legacy fields for zarinpal-oneoff compatibility (deprecated)
    paymentUrl: z.string().url().optional().openapi({
      example: 'https://www.zarinpal.com/pg/StartPay/A00000000000000000000000000123456789',
      description: 'ZarinPal payment gateway URL (only for legacy zarinpal-oneoff)',
    }),
    authority: z.string().optional().openapi({
      example: 'A00000000000000000000000000123456789',
      description: 'ZarinPal payment authority (only for legacy zarinpal-oneoff)',
    }),
  }),
).openapi('CreateSubscriptionResponse');

export const CancelSubscriptionResponseSchema = ApiResponseSchema(
  z.object({
    subscriptionId: z.string(),
    status: z.enum(['canceled']),
    canceledAt: z.string().datetime(),
  }),
).openapi('CancelSubscriptionResponse');

export const ResubscribeResponseSchema = ApiResponseSchema(
  z.object({
    subscriptionId: z.string(),
    paymentUrl: z.string().url(),
    authority: z.string(),
  }),
).openapi('ResubscribeResponse');

// Plan change schemas
export const ChangePlanRequestSchema = z.object({
  newProductId: z.string().min(1).openapi({
    example: 'prod_456',
    description: 'New product ID to change to',
  }),
  callbackUrl: z.string().url().openapi({
    example: 'https://app.example.com/payment/callback',
    description: 'URL to redirect after payment (if additional payment required)',
  }),
  effectiveDate: z.enum(['immediate', 'next_billing_cycle']).default('immediate').openapi({
    example: 'immediate',
    description: 'When the plan change should take effect',
  }),
}).openapi('ChangePlanRequest');

export const ChangePlanResponseSchema = ApiResponseSchema(
  z.object({
    subscriptionId: z.string(),
    oldProductId: z.string(),
    newProductId: z.string(),
    effectiveDate: z.string().datetime(),
    paymentUrl: z.string().url().nullable().openapi({
      description: 'Payment URL if additional payment is required (for upgrades)',
    }),
    authority: z.string().nullable().openapi({
      description: 'ZarinPal authority if payment is required',
    }),
    priceDifference: z.number().openapi({
      description: 'Price difference (positive for upgrade, negative for downgrade)',
    }),
    prorationAmount: z.number().nullable().openapi({
      description: 'Prorated amount for immediate plan changes',
    }),
  }),
).openapi('ChangePlanResponse');

// Path parameter schemas
export const SubscriptionParamsSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: 'id', in: 'path' },
    example: 'sub_123',
    description: 'Subscription ID',
  }),
});

// Export types for use in handlers and services
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type SubscriptionWithProduct = z.infer<typeof SubscriptionWithProductSchema>;
export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;
export type CancelSubscriptionRequest = z.infer<typeof CancelSubscriptionRequestSchema>;
export type SubscriptionParams = z.infer<typeof SubscriptionParamsSchema>;
