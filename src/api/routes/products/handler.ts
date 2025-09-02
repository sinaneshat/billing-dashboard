import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import { apiLogger } from '@/api/middleware/hono-logger';
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
    // ✅ Return complete drizzle schema data - no manual transformation needed
    const products = await db
      .select()
      .from(product)
      .where(eq(product.isActive, true))
      .orderBy(product.createdAt);

    return ok(c, products, undefined, HttpStatusCodes.OK);
  } catch (error) {
    apiLogger.error('Failed to fetch products', { error });

    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to fetch products',
    });
  }
};
