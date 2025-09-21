import { z } from '@hono/zod-openapi';

import { CoreSchemas, createApiResponseSchema } from '@/api/core/schemas';
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

export const ChangePlanRequestSchema = z.object({
  productId: z.string().min(1).openapi({
    example: 'prod_456',
    description: 'New product ID to change subscription to',
  }),
  effectiveDate: z.enum(['immediate', 'next_cycle']).default('immediate').openapi({
    example: 'immediate',
    description: 'When to apply the plan change: immediately or at next billing cycle',
  }),
  paymentMethodId: z.string().optional().openapi({
    example: 'pm_abc123',
    description: 'Payment method to use for immediate billing (required for upgrades)',
  }),
}).openapi('ChangePlanRequest');

// ============================================================================
// ENHANCED SUBSCRIPTION UPDATE SCHEMAS
// ============================================================================

// Iranian-specific validation schemas
export const IranianValidationSchemas = {
  // Iranian mobile number validation
  mobileNumber: z.string()
    .regex(/^(?:\+98|0)?9\d{9}$/, 'Invalid Iranian mobile number format')
    .openapi({
      example: '09123456789',
      description: 'Iranian mobile number',
    }),

  // Iranian Rial amount validation (no decimal places)
  rialAmount: z.number()
    .int('Rial amounts must be whole numbers')
    .min(1000, 'Minimum amount is 1,000 IRR')
    .max(1000000000, 'Maximum amount is 1,000,000,000 IRR')
    .openapi({
      example: 50000,
      description: 'Amount in Iranian Rials',
    }),

  // Product ID validation
  productId: z.string()
    .min(1, 'Product ID is required')
    .regex(/^[\w-]+$/, 'Invalid product ID format')
    .openapi({
      example: 'prod_premium_monthly',
      description: 'Product identifier',
    }),
};

// Comprehensive subscription update response schema
export const ChangePlanResponseDataSchema = z.object({
  subscriptionId: CoreSchemas.id().openapi({
    example: 'sub_123',
    description: 'Updated subscription ID',
  }),
  planChanged: z.boolean().openapi({
    description: 'Whether the plan was successfully changed',
  }),
  previousProductId: z.string().openapi({
    example: 'prod_basic_monthly',
    description: 'Previous product ID',
  }),
  newProductId: z.string().openapi({
    example: 'prod_premium_monthly',
    description: 'New product ID',
  }),
  prorationDetails: z.object({
    creditAmount: z.number().int().openapi({
      example: 15000,
      description: 'Credit amount for unused time (in IRR)',
    }),
    chargeAmount: z.number().int().openapi({
      example: 25000,
      description: 'Charge amount for new plan (in IRR)',
    }),
    netAmount: z.number().int().openapi({
      example: 10000,
      description: 'Net amount charged/credited (in IRR)',
    }),
    effectiveDate: CoreSchemas.timestamp().openapi({
      description: 'When the change took effect',
    }),
    nextBillingDate: CoreSchemas.timestamp().openapi({
      description: 'Next billing date for the subscription',
    }),
  }).openapi({
    description: 'Proration calculation details',
  }),
  autoRenewalEnabled: z.boolean().openapi({
    description: 'Whether automatic renewal is still enabled',
  }),
}).openapi('ChangePlanResponseData');

export const ChangePlanResponseSchema = createApiResponseSchema(
  ChangePlanResponseDataSchema,
);

// Plan change specific error responses
export const PlanChangeErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      'PLAN_CHANGE_NOT_ALLOWED',
      'SAME_PLAN_ERROR',
      'PAYMENT_METHOD_REQUIRED',
      'INSUFFICIENT_PAYMENT_METHOD',
      'SUBSCRIPTION_NOT_ACTIVE',
      'PRODUCT_NOT_FOUND',
      'PRORATION_CALCULATION_ERROR',
    ]),
    message: z.string(),
    context: z.object({
      errorType: z.literal('plan_change'),
      currentPlan: z.string().optional(),
      targetPlan: z.string().optional(),
      requiredAmount: z.number().optional(),
      availablePaymentMethods: z.array(z.string()).optional(),
    }),
  }),
}).openapi('PlanChangeError');

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

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Export types - now consistent with database schema and unified response system
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type SubscriptionWithProduct = z.infer<typeof SubscriptionWithProductSchema>;
export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;
export type CancelSubscriptionRequest = z.infer<typeof CancelSubscriptionRequestSchema>;
export type ChangePlanRequest = z.infer<typeof ChangePlanRequestSchema>;
export type SubscriptionParams = z.infer<typeof SubscriptionParamsSchema>;

// Response data types for handlers
export type GetSubscriptionsResponseData = z.infer<typeof GetSubscriptionsResponseDataSchema>;
export type GetSubscriptionResponseData = z.infer<typeof GetSubscriptionResponseDataSchema>;
export type CreateSubscriptionResponseData = z.infer<typeof CreateSubscriptionResponseDataSchema>;
export type CancelSubscriptionResponseData = z.infer<typeof CancelSubscriptionResponseDataSchema>;
export type ChangePlanResponseData = z.infer<typeof ChangePlanResponseDataSchema>;
export type ChangePlanResponse = z.infer<typeof ChangePlanResponseSchema>;
