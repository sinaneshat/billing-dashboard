import { z } from '@hono/zod-openapi';

import { ApiResponseSchema } from '@/api/common/schemas';
import { productSelectSchema } from '@/db/validation/billing';

// ✅ Single source of truth - use drizzle-zod schema with OpenAPI metadata
const ProductSchema = productSelectSchema.openapi({
  example: {
    id: 'prod_123',
    name: 'Premium Plan',
    description: 'Full access to all features',
    price: 99000,
    billingPeriod: 'monthly',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
});

const ProductsArraySchema = z.array(ProductSchema);

export const GetProductsResponseSchema = ApiResponseSchema(ProductsArraySchema).openapi('GetProductsResponse');

// ✅ Export types - now consistent with database schema
export type Product = z.infer<typeof ProductSchema>;
export type ProductsResponse = z.infer<typeof GetProductsResponseSchema>;
