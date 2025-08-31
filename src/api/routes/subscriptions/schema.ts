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
  zarinpalDirectDebitToken: z.string().nullable().openapi({ example: 'card_hash_abc123' }),
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

// Request schemas
export const CreateSubscriptionRequestSchema = z.object({
  productId: z.string().min(1).openapi({
    example: 'prod_123',
    description: 'Product ID to subscribe to',
  }),
  paymentMethod: z.enum(['zarinpal']).default('zarinpal').openapi({
    example: 'zarinpal',
    description: 'Payment method for the subscription',
  }),
  callbackUrl: z.string().url().openapi({
    example: 'https://app.example.com/payment/callback',
    description: 'URL to redirect after payment',
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
    paymentUrl: z.string().url().openapi({
      example: 'https://www.zarinpal.com/pg/StartPay/A00000000000000000000000000123456789',
      description: 'ZarinPal payment gateway URL for redirection',
    }),
    authority: z.string().openapi({
      example: 'A00000000000000000000000000123456789',
      description: 'ZarinPal payment authority token',
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
