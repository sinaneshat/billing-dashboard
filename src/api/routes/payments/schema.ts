import { z } from '@hono/zod-openapi';

import { CoreSchemas, createApiResponseSchema } from '@/api/core/schemas';
import { paymentSelectSchema } from '@/db/validation/billing';

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

// SOLID-compliant payment schema - ONLY raw payment domain data
// Following Single Responsibility Principle: payments endpoint serves ONLY raw payment data from database
// Frontend should fetch related data separately and handle ALL formatting/transformations
// NO data transformations in backend - only raw database values

// SOLID-compliant response schemas - single responsibility for payment domain only
// Returns RAW database data only - no transformations
export const GetPaymentsResponseSchema = createApiResponseSchema(
  z.array(PaymentSchema),
).openapi('GetPaymentsResponse');

// Export types - SOLID-compliant with single responsibility principle
// Only raw database types - no transformations
export type Payment = z.infer<typeof PaymentSchema>;
