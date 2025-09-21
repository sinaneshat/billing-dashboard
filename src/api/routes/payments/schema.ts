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

// Response schemas
export const GetPaymentsResponseSchema = createApiResponseSchema(
  z.array(PaymentWithDetailsSchema),
).openapi('GetPaymentsResponse');

// Export types - now consistent with database schema
export type Payment = z.infer<typeof PaymentSchema>;
export type PaymentWithDetails = z.infer<typeof PaymentWithDetailsSchema>;
