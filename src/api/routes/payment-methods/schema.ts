import { z } from '@hono/zod-openapi';

import { ApiResponseSchema } from '@/api/common/schemas';

// Payment Method schema matching the database
const PaymentMethodSchema = z.object({
  id: z.string().openapi({ example: 'pm_123' }),
  userId: z.string().openapi({ example: 'user_123' }),
  zarinpalCardHash: z.string().openapi({ example: 'hash_123' }),
  cardMask: z.string().openapi({ example: '**** **** **** 1234' }),
  cardType: z.string().nullable().openapi({ example: 'VISA' }),
  isPrimary: z.boolean().openapi({ example: true }),
  isActive: z.boolean().openapi({ example: true }),
  lastUsedAt: z.string().datetime().nullable().openapi({ example: new Date().toISOString() }),
  expiresAt: z.string().datetime().nullable().openapi({ example: new Date().toISOString() }),
  createdAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
  updatedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
});

// GET /payment-methods response
export const GetPaymentMethodsResponseSchema = ApiResponseSchema(
  z.array(PaymentMethodSchema),
);

// POST /payment-methods request
export const CreatePaymentMethodRequestSchema = z.object({
  zarinpalCardHash: z.string().openapi({
    example: 'hash_123',
    description: 'Card hash from ZarinPal tokenization',
  }),
  cardMask: z.string().openapi({
    example: '**** **** **** 1234',
    description: 'Masked card number for display',
  }),
  cardType: z.string().nullable().openapi({
    example: 'VISA',
    description: 'Card type or issuing bank',
  }),
  expiresAt: z.string().datetime().nullable().openapi({
    example: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Card expiration date',
  }),
  setPrimary: z.boolean().default(false).openapi({
    example: true,
    description: 'Set this payment method as primary',
  }),
});

// POST /payment-methods response
export const CreatePaymentMethodResponseSchema = ApiResponseSchema(
  PaymentMethodSchema,
);

// DELETE /payment-methods/:id response
export const DeletePaymentMethodResponseSchema = ApiResponseSchema(
  z.object({
    id: z.string(),
    deleted: z.boolean(),
    deletedAt: z.string().datetime(),
  }),
);

// PATCH /payment-methods/:id/default response
export const SetDefaultPaymentMethodResponseSchema = ApiResponseSchema(
  z.object({
    id: z.string(),
    isPrimary: z.boolean(),
    updatedAt: z.string().datetime(),
  }),
);

// Path parameter schemas
export const PaymentMethodParamsSchema = z.object({
  id: z.string().min(1).openapi({
    param: { name: 'id', in: 'path' },
    example: 'pm_123',
    description: 'Payment Method ID',
  }),
});

// Export types
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;
export type PaymentMethodParams = z.infer<typeof PaymentMethodParamsSchema>;
