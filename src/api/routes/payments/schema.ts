import { z } from '@hono/zod-openapi';

import { CoreSchemas, createApiResponseSchema } from '@/api/core/schemas';
import { paymentMethodSelectSchema, paymentSelectSchema, productSelectSchema, subscriptionSelectSchema } from '@/db/validation/billing';

// Single source of truth - use drizzle-zod schemas with OpenAPI metadata
// Override timestamp fields to be strings (as they are serialized in API responses)
const PaymentSchema = paymentSelectSchema.extend({
  paidAt: CoreSchemas.timestamp().nullable(),
  failedAt: CoreSchemas.timestamp().nullable(),
  nextRetryAt: CoreSchemas.timestamp().nullable(),
  createdAt: CoreSchemas.timestamp(),
  updatedAt: CoreSchemas.timestamp(),
}).openapi({
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
// Simplified: only Toman amounts and formatted strings
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
  paymentMethod: paymentMethodSelectSchema.pick({
    id: true,
    contractDisplayName: true,
    contractMobile: true,
    contractStatus: true,
    contractType: true,
    isPrimary: true,
    bankCode: true,
  }).nullable().openapi({
    example: {
      id: 'pm_123',
      contractDisplayName: 'پرداخت مستقیم بانک ملی',
      contractMobile: '09121234567',
      contractStatus: 'active',
      contractType: 'direct_debit_contract',
      isPrimary: true,
      bankCode: '017',
    },
  }),
  // Simplified: only what frontend needs
  tomanAmount: z.number().describe('Payment amount in Toman'),
  formattedAmount: z.string().describe('Pre-formatted amount string (e.g., "99,000 تومان")'),
});

// Response schemas
export const GetPaymentsResponseSchema = createApiResponseSchema(
  z.array(PaymentWithDetailsSchema),
).openapi('GetPaymentsResponse');

// Export types - now consistent with database schema
export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentWithDetails = z.infer<typeof PaymentWithDetailsSchema>;
