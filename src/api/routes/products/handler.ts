import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import { apiLogger } from '@/api/middleware/hono-logger';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { product } from '@/db/tables/billing';
import { currencyConverter } from '@/lib/services/currency-converter';

import type { getProductsRoute } from './route';

/**
 * Handler for GET /products endpoint
 * Returns all active products with live Rial pricing for ZarinPal compatibility
 * Database stores USD prices, API converts to Iranian Rials
 * @param c - Hono context
 * @returns List of active products with live currency conversion
 */
export const getProductsHandler: RouteHandler<typeof getProductsRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'products');

  try {
    // Get raw products from database (stored in USD)
    const rawProducts = await db
      .select()
      .from(product)
      .where(eq(product.isActive, true))
      .orderBy(product.createdAt);

    // Convert USD prices to Iranian Rials for ZarinPal compatibility
    const enhancedProducts = await Promise.all(
      rawProducts.map(async (prod) => {
        const metadata = prod.metadata as Record<string, unknown>;
        const usdPrice = prod.price; // Database now stores USD prices

        let pricingInfo;

        if (usdPrice === 0) {
          // Free product
          pricingInfo = {
            usdPrice: 0,
            rialPrice: 0,
            tomanPrice: 0,
            formattedPrice: 'Free',
            lastUpdated: new Date().toISOString(),
          };
        } else {
          // Get fresh USD to IRR conversion for accurate pricing
          const conversion = await currencyConverter.convertUsdToToman(usdPrice);
          // Convert from Toman to Rials (1 Toman = 10 Rials) for ZarinPal
          const rialPrice = conversion.tomanPrice * 10;

          pricingInfo = {
            usdPrice,
            rialPrice, // For ZarinPal payments
            tomanPrice: conversion.tomanPrice, // For display to users
            formattedPrice: `${conversion.tomanPrice.toLocaleString('en-US')} Toman`,
            exchangeRate: conversion.exchangeRate,
            lastUpdated: conversion.lastUpdated,
          };
        }

        return {
          ...prod,
          price: pricingInfo.rialPrice, // Return Rial price for ZarinPal compatibility
          metadata: {
            ...metadata,
            pricing: pricingInfo,
          },
        };
      }),
    );

    apiLogger.info('Products fetched with live USD to Rial conversion', {
      count: enhancedProducts.length,
      exchangeRate: enhancedProducts[0]?.metadata?.pricing?.exchangeRate,
    });

    return ok(c, enhancedProducts, undefined, HttpStatusCodes.OK);
  } catch (error) {
    apiLogger.error('Failed to fetch products with currency conversion', { error });

    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to fetch products',
    });
  }
};
