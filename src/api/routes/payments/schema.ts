import { z } from '@hono/zod-openapi';

import { createApiResponseSchema } from '@/api/core/schemas';
import { paymentSelectSchema, productSelectSchema, subscriptionSelectSchema } from '@/db/validation/billing';

// Single source of truth - use drizzle-zod schemas with OpenAPI metadata
const PaymentSchema = paymentSelectSchema.openapi({
  example: {
    id: 'pay_123',
    userId: 'user_123',
    subscriptionId: 'sub_123',
    productId: 'prod_123',
    amount: 99000,
    currency: 'IRR',
    status: 'completed',
    paymentMethod: 'zarinpal',
    zarinpalAuthority: 'A00000000000000000000000000123456789',
    zarinpalRefId: '123456789',
    paidAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});

// Payment with related data - extend from drizzle schemas
const PaymentWithDetailsSchema = PaymentSchema.extend({
  product: productSelectSchema.pick({
    id: true,
    name: true,
    description: true,
  }).openapi({
    example: {
      id: 'prod_123',
      name: 'Premium Plan',
      description: 'Full access to all features',
    },
  }),
  subscription: subscriptionSelectSchema.pick({
    id: true,
    status: true,
  }).nullable().openapi({
    example: {
      id: 'sub_123',
      status: 'active',
    },
  }),
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
export const GetPaymentsResponseSchema = createApiResponseSchema(
  z.array(PaymentWithDetailsSchema),
).openapi('GetPaymentsResponse');

export const PaymentCallbackResponseSchema = createApiResponseSchema(
  z.object({
    success: z.boolean(),
    paymentId: z.string(),
    subscriptionId: z.string().nullable(),
    refId: z.string().optional(),
    redirectUrl: z.string().optional(),
  }),
).openapi('PaymentCallbackResponse');

export const VerifyPaymentResponseSchema = createApiResponseSchema(
  z.object({
    verified: z.boolean(),
    paymentId: z.string(),
    refId: z.string().optional(),
    cardHash: z.string().optional(),
  }),
).openapi('VerifyPaymentResponse');

// Invoice generation request
export const GenerateInvoiceRequestSchema = z.object({
  format: z.enum(['pdf', 'html']).default('pdf').openapi({
    example: 'pdf',
    description: 'Invoice format (PDF or HTML)',
  }),
  language: z.enum(['en', 'fa']).default('en').openapi({
    example: 'en',
    description: 'Invoice language (English or Persian)',
  }),
  includeDetails: z.boolean().default(true).openapi({
    example: true,
    description: 'Include detailed payment information',
  }),
}).openapi('GenerateInvoiceRequest');

// Invoice generation response
export const GenerateInvoiceResponseSchema = createApiResponseSchema(
  z.object({
    invoiceId: z.string(),
    downloadUrl: z.string(),
    format: z.string(),
    language: z.string(),
    generatedAt: z.string().datetime(),
    expiresAt: z.string().datetime(),
  }),
).openapi('GenerateInvoiceResponse');

// Path parameter schemas
export const PaymentParamsSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: 'id', in: 'path' },
    example: 'pay_123',
    description: 'Payment ID',
  }),
});

// Export types - now consistent with database schema
export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentWithDetails = z.infer<typeof PaymentWithDetailsSchema>;
export type PaymentCallbackRequest = z.infer<typeof PaymentCallbackRequestSchema>;
export type VerifyPaymentRequest = z.infer<typeof VerifyPaymentRequestSchema>;
export type PaymentParams = z.infer<typeof PaymentParamsSchema>;
export type GenerateInvoiceRequest = z.infer<typeof GenerateInvoiceRequestSchema>;
