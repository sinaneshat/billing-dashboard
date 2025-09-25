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

// Subscription with related product and payment method data - extend from drizzle schemas
// Simplified: only Toman amounts and formatted strings
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
  paymentMethod: z.object({
    id: z.string(),
    contractDisplayName: z.string(),
    contractMobile: z.string().nullable(),
    contractStatus: z.string(),
    bankCode: z.string().nullable(),
    isPrimary: z.boolean().nullable(),
    isActive: z.boolean().nullable(),
  }).nullable().openapi({
    example: {
      id: 'pm_123',
      contractDisplayName: 'بانک ملی ایران - 1234',
      contractMobile: '09123456789',
      contractStatus: 'active',
      bankCode: '011',
      isPrimary: true,
      isActive: true,
    },
    description: 'Payment method details including bank contract information',
  }),
  // Simplified: only what frontend needs
  currentPriceToman: z.number().describe('Subscription price in Toman'),
  formattedPrice: z.string().describe('Pre-formatted price string (e.g., "99,000 تومان/ماه")'),
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
  immediateBilling: z.boolean().openapi({
    example: false,
    description: 'Whether immediate billing was attempted for this subscription',
  }),
  paymentProcessed: z.boolean().openapi({
    example: false,
    description: 'Whether payment was successfully processed immediately',
  }),
  paymentId: CoreSchemas.id().optional().openapi({
    example: 'pay_456',
    description: 'Payment ID if immediate billing was successful',
  }),
  chargedAmount: z.number().optional().openapi({
    example: 99000,
    description: 'Amount charged in IRR if immediate billing was successful',
  }),
  zarinpalRefId: z.string().optional().openapi({
    example: '123456789',
    description: 'ZarinPal reference ID if payment was processed',
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
// SUBSCRIPTION SWITCHING SCHEMAS
// ============================================================================

export const SwitchSubscriptionRequestSchema = z.object({
  newProductId: CoreSchemas.id().openapi({
    example: 'prod_456',
    description: 'ID of the product to switch to',
  }),
  effectiveDate: z.enum(['immediate', 'next_cycle']).default('immediate').openapi({
    example: 'immediate',
    description: 'When the switch should take effect',
  }),
  confirmProration: z.boolean().default(true).openapi({
    example: true,
    description: 'Confirm understanding of proration charges/credits',
  }),
}).openapi('SwitchSubscriptionRequest');

export const SwitchSubscriptionResponseDataSchema = z.object({
  oldSubscriptionId: CoreSchemas.id().openapi({
    example: 'sub_123',
    description: 'ID of the cancelled subscription',
  }),
  newSubscriptionId: CoreSchemas.id().openapi({
    example: 'sub_456',
    description: 'ID of the newly created subscription',
  }),
  proratedCredit: z.number().openapi({
    example: 25000,
    description: 'Credit amount from unused time in IRR',
  }),
  chargeAmount: z.number().openapi({
    example: 50000,
    description: 'Amount charged for the new plan in IRR',
  }),
  netAmount: z.number().openapi({
    example: 25000,
    description: 'Net amount charged (positive) or credited (negative) in IRR',
  }),
  paymentStatus: z.enum(['completed', 'failed', 'credited']).openapi({
    example: 'completed',
    description: 'Status of the payment for the switch',
  }),
  effectiveDate: CoreSchemas.timestamp().openapi({
    example: new Date().toISOString(),
    description: 'When the switch became effective',
  }),
}).openapi('SwitchSubscriptionData');

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Export types - now consistent with database schema and unified response system
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type SubscriptionWithProduct = z.infer<typeof SubscriptionWithProductSchema>;
export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionRequestSchema>;
export type CancelSubscriptionRequest = z.infer<typeof CancelSubscriptionRequestSchema>;
export type SwitchSubscriptionRequest = z.infer<typeof SwitchSubscriptionRequestSchema>;
export type SubscriptionParams = z.infer<typeof SubscriptionParamsSchema>;

// Response data types for handlers
export type GetSubscriptionsResponseData = z.infer<typeof GetSubscriptionsResponseDataSchema>;
export type GetSubscriptionResponseData = z.infer<typeof GetSubscriptionResponseDataSchema>;
export type CreateSubscriptionResponseData = z.infer<typeof CreateSubscriptionResponseDataSchema>;
export type CancelSubscriptionResponseData = z.infer<typeof CancelSubscriptionResponseDataSchema>;
export type SwitchSubscriptionResponseData = z.infer<typeof SwitchSubscriptionResponseDataSchema>;
