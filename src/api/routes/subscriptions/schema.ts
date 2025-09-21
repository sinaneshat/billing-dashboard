import { z } from '@hono/zod-openapi';

import { CoreSchemas } from '@/api/core/schemas';
import { productSelectSchema, subscriptionSelectSchema } from '@/db/validation/billing';

// Single source of truth - use drizzle-zod schemas with OpenAPI metadata
// Override timestamp fields to be strings (as they are serialized in API responses)
const SubscriptionSchema = subscriptionSelectSchema.extend({
  startDate: CoreSchemas.timestamp(),
  endDate: CoreSchemas.timestamp().nullable(),
  nextBillingDate: CoreSchemas.timestamp().nullable(),
  createdAt: CoreSchemas.timestamp(),
  updatedAt: CoreSchemas.timestamp(),
  trialEndDate: CoreSchemas.timestamp().nullable(),
  gracePeriodEndDate: CoreSchemas.timestamp().nullable(),
  upgradeDowngradeAt: CoreSchemas.timestamp().nullable(),
  lastBillingAttempt: CoreSchemas.timestamp().nullable(),
}).openapi({
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
  paymentMethod: z.literal('direct-debit-contract').default('direct-debit-contract').openapi({
    example: 'direct-debit-contract',
    description: 'Payment method: direct-debit-contract for automatic renewal via signed contracts',
  }),
  contractId: z.string().min(1).openapi({
    example: 'contract_abc123',
    description: 'Direct debit contract ID (required)',
  }),
  enableAutoRenew: z.boolean().default(true).openapi({
    example: true,
    description: 'Enable automatic renewal using the signed direct debit contract',
  }),
}).openapi('CreateSubscriptionRequest');

export const CancelSubscriptionRequestSchema = z.object({
  reason: z.string().optional().openapi({
    example: 'No longer needed',
    description: 'Optional cancellation reason',
  }),
}).openapi('CancelSubscriptionRequest');

// Refactored: Direct data schemas, response wrapper handled by Responses.* methods
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

// Path parameter schemas - use CoreSchemas for consistency
export const SubscriptionParamsSchema = z.object({
  id: CoreSchemas.id().openapi({
    param: { name: 'id', in: 'path' },
    example: 'sub_123',
    description: 'Subscription ID',
  }),
});

// Export types - now consistent with database schema and unified response system
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
