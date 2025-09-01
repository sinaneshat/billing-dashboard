import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { product } from '@/db/tables/billing';

import type { getProductsRoute } from './route';

/**
 * Handler for GET /products endpoint
 * Returns all active products from the database
 * @param c - Hono context
 * @returns List of active products
 */
export const getProductsHandler: RouteHandler<typeof getProductsRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'products');

  try {
    // Fetch all active products from database
    const products = await db
      .select()
      .from(product)
      .where(eq(product.isActive, true))
      .orderBy(product.createdAt);

    // Transform timestamps to ISO strings for API response
    const transformedProducts = products.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      billingPeriod: p.billingPeriod,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));

    return ok(c, transformedProducts, undefined, HttpStatusCodes.OK);
  } catch (error) {
    console.error('Failed to fetch products:', error);

    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to fetch products',
    });
  }
};
