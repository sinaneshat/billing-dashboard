import { z } from '@hono/zod-openapi';

import { ApiResponseSchema } from '@/api/common/schemas';

// Payment schema matching the database
const PaymentSchema = z.object({
  id: z.string().openapi({ example: 'pay_123' }),
  userId: z.string().openapi({ example: 'user_123' }),
  subscriptionId: z.string().nullable().openapi({ example: 'sub_123' }),
  productId: z.string().openapi({ example: 'prod_123' }),
  amount: z.number().openapi({ example: 99000 }),
  currency: z.string().openapi({ example: 'IRR' }),
  status: z.enum(['pending', 'completed', 'failed', 'refunded', 'canceled']).openapi({ example: 'completed' }),
  paymentMethod: z.string().openapi({ example: 'zarinpal' }),
  zarinpalAuthority: z.string().nullable().openapi({ example: 'A00000000000000000000000000123456789' }),
  zarinpalRefId: z.string().nullable().openapi({ example: '123456789' }),
  paidAt: z.string().datetime().nullable().openapi({ example: new Date().toISOString() }),
  createdAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
  updatedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
});

// Payment with related product data
const PaymentWithDetailsSchema = PaymentSchema.extend({
  product: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
  }),
  subscription: z.object({
    id: z.string(),
    status: z.string(),
  }).nullable(),
});

// Payment callback request from ZarinPal
export const PaymentCallbackRequestSchema = z.object({
  Authority: z.string().openapi({
    example: 'A00000000000000000000000000123456789',
    description: 'ZarinPal payment authority',
  }),
  Status: z.enum(['OK', 'NOK']).openapi({
    example: 'OK',
    description: 'Payment status from ZarinPal',
  }),
}).openapi('PaymentCallbackRequest');

// Verify payment request
export const VerifyPaymentRequestSchema = z.object({
  authority: z.string().min(1).openapi({
    example: 'A00000000000000000000000000123456789',
    description: 'ZarinPal payment authority to verify',
  }),
}).openapi('VerifyPaymentRequest');

// Response schemas
export const GetPaymentsResponseSchema = ApiResponseSchema(
  z.array(PaymentWithDetailsSchema),
).openapi('GetPaymentsResponse');

export const PaymentCallbackResponseSchema = ApiResponseSchema(
  z.object({
    success: z.boolean(),
    paymentId: z.string(),
    subscriptionId: z.string().nullable(),
    refId: z.string().optional(),
    redirectUrl: z.string().optional(),
  }),
).openapi('PaymentCallbackResponse');

export const VerifyPaymentResponseSchema = ApiResponseSchema(
  z.object({
    verified: z.boolean(),
    paymentId: z.string(),
    refId: z.string().optional(),
    cardHash: z.string().optional(),
  }),
).openapi('VerifyPaymentResponse');

// Path parameter schemas
export const PaymentParamsSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: 'id', in: 'path' },
    example: 'pay_123',
    description: 'Payment ID',
  }),
});

// Export types
export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentWithDetails = z.infer<typeof PaymentWithDetailsSchema>;
export type PaymentCallbackRequest = z.infer<typeof PaymentCallbackRequestSchema>;
export type VerifyPaymentRequest = z.infer<typeof VerifyPaymentRequestSchema>;
export type PaymentParams = z.infer<typeof PaymentParamsSchema>;
