import { z } from '@hono/zod-openapi';

import { ApiResponseSchema } from '@/api/common/schemas';

const ProductSchema = z.object({
  id: z.string().openapi({ example: 'prod_123' }),
  name: z.string().openapi({ example: 'Premium Plan' }),
  description: z.string().nullable().openapi({ example: 'Full access to all features' }),
  price: z.number().openapi({ example: 99000 }),
  billingPeriod: z.enum(['one_time', 'monthly']).openapi({ example: 'monthly' }),
  isActive: z.boolean().openapi({ example: true }),
  createdAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
  updatedAt: z.string().datetime().openapi({ example: new Date().toISOString() }),
});

const ProductsArraySchema = z.array(ProductSchema);

export const GetProductsResponseSchema = ApiResponseSchema(ProductsArraySchema).openapi('GetProductsResponse');

export type Product = z.infer<typeof ProductSchema>;
export type ProductsResponse = z.infer<typeof GetProductsResponseSchema>;
