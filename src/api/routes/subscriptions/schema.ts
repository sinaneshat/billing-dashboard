import { z } from '@hono/zod-openapi';

import { CoreSchemas } from '@/api/core/schemas';
import { productSelectSchema, subscriptionSelectSchema } from '@/db/validation/billing';

// ✅ Single source of truth - use drizzle-zod schemas with OpenAPI metadata
const SubscriptionSchema = subscriptionSelectSchema.openapi({
  example: {
    id: 'sub_123',
    userId: 'user_123',
    productId: 'prod_123',
    status: 'active',
    startDate: new Date().toISOString(),
    endDate: null,
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    currentPrice: 99000,
    billingPeriod: 'monthly',
    directDebitContractId: 'contract_abc123',
    directDebitSignature: 'signature_200chars...',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});

// Subscription with related product data - extend from drizzle schemas
const SubscriptionWithProductSchema = SubscriptionSchema.extend({
  product: productSelectSchema.pick({
    id: true,
    name: true,
    description: true,
    billingPeriod: true,
  }).openapi({
    example: {
      id: 'prod_123',
      name: 'Premium Plan',
      description: 'Full access to all features',
      billingPeriod: 'monthly',
    },
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

// ✅ Refactored: Direct data schemas, response wrapper handled by Responses.* methods
export const GetSubscriptionsResponseDataSchema = z.array(SubscriptionWithProductSchema).openapi('GetSubscriptionsData');

export const GetSubscriptionResponseDataSchema = SubscriptionWithProductSchema.openapi('GetSubscriptionData');

export const CreateSubscriptionResponseDataSchema = z.object({
  subscriptionId: CoreSchemas.id().openapi({
    example: 'sub_123',
    description: 'Created subscription ID',
  }),
  paymentMethod: z.string().openapi({
    example: 'direct-debit-contract',
    description: 'Payment method used for subscription',
  }),
  contractId: CoreSchemas.id().optional().openapi({
    example: 'contract_abc123',
    description: 'Direct debit contract ID used for this subscription',
  }),
  autoRenewalEnabled: z.boolean().openapi({
    example: true,
    description: 'Whether automatic renewal is enabled via direct debit contract',
  }),
  // ZarinPal compatibility fields
  paymentUrl: CoreSchemas.url().optional().openapi({
    example: 'https://www.zarinpal.com/pg/StartPay/A00000000000000000000000000123456789',
    description: 'ZarinPal payment gateway URL (only for legacy zarinpal-oneoff)',
  }),
  authority: z.string().optional().openapi({
    example: 'A00000000000000000000000000123456789',
    description: 'ZarinPal payment authority (only for legacy zarinpal-oneoff)',
  }),
}).openapi('CreateSubscriptionData');

export const CancelSubscriptionResponseDataSchema = z.object({
  subscriptionId: CoreSchemas.id().openapi({
    example: 'sub_123',
    description: 'Canceled subscription ID',
  }),
  status: z.enum(['canceled']).openapi({
    example: 'canceled',
    description: 'Subscription status after cancellation',
  }),
  canceledAt: CoreSchemas.timestamp().openapi({
    description: 'Timestamp when subscription was canceled',
  }),
}).openapi('CancelSubscriptionData');

export const ResubscribeResponseDataSchema = z.object({
  subscriptionId: CoreSchemas.id().openapi({
    example: 'sub_123',
    description: 'Resubscribed subscription ID',
  }),
  paymentUrl: CoreSchemas.url().openapi({
    example: 'https://www.zarinpal.com/pg/StartPay/A00000000000000000000000000123456789',
    description: 'ZarinPal payment URL for completing resubscription',
  }),
  authority: z.string().openapi({
    example: 'A00000000000000000000000000123456789',
    description: 'ZarinPal payment authority',
  }),
}).openapi('ResubscribeData');

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

export const ChangePlanResponseDataSchema = z.object({
  subscriptionId: CoreSchemas.id().openapi({
    example: 'sub_123',
    description: 'Modified subscription ID',
  }),
  oldProductId: CoreSchemas.id().openapi({
    example: 'prod_basic',
    description: 'Previous product ID',
  }),
  newProductId: CoreSchemas.id().openapi({
    example: 'prod_premium',
    description: 'New product ID',
  }),
  effectiveDate: CoreSchemas.timestamp().openapi({
    description: 'When the plan change takes effect',
  }),
  paymentUrl: CoreSchemas.url().nullable().openapi({
    example: 'https://www.zarinpal.com/pg/StartPay/A00000000000000000000000000123456789',
    description: 'Payment URL if additional payment is required (for upgrades)',
  }),
  authority: z.string().nullable().openapi({
    example: 'A00000000000000000000000000123456789',
    description: 'ZarinPal authority if payment is required',
  }),
  priceDifference: CoreSchemas.amount().openapi({
    example: 50000,
    description: 'Price difference (positive for upgrade, negative for downgrade)',
  }),
  prorationAmount: CoreSchemas.amount().nullable().openapi({
    example: 25000,
    description: 'Prorated amount for immediate plan changes',
  }),
}).openapi('ChangePlanData');

// Path parameter schemas
export const SubscriptionParamsSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: 'id', in: 'path' },
    example: 'sub_123',
    description: 'Subscription ID',
  }),
});

// ✅ Export types - now consistent with database schema and unified response system
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type SubscriptionWithProduct = z.infer<typeof SubscriptionWithProductSchema>;
export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;
export type CancelSubscriptionRequest = z.infer<typeof CancelSubscriptionRequestSchema>;
export type SubscriptionParams = z.infer<typeof SubscriptionParamsSchema>;

// Response data types for handlers
export type GetSubscriptionsResponseData = z.infer<typeof GetSubscriptionsResponseDataSchema>;
export type GetSubscriptionResponseData = z.infer<typeof GetSubscriptionResponseDataSchema>;
export type CreateSubscriptionResponseData = z.infer<typeof CreateSubscriptionResponseDataSchema>;
export type CancelSubscriptionResponseData = z.infer<typeof CancelSubscriptionResponseDataSchema>;
export type ResubscribeResponseData = z.infer<typeof ResubscribeResponseDataSchema>;
export type ChangePlanResponseData = z.infer<typeof ChangePlanResponseDataSchema>;
