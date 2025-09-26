import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';

import { createHandler, Responses } from '@/api/core';
import { createCurrencyExchangeService } from '@/api/services/currency-exchange';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import { product } from '@/db/tables/billing';

import type { getProductsRoute } from './route';

/**
 * Products handler with Iranian currency conversion
 */
export const getProductsHandler: RouteHandler<typeof getProductsRoute, ApiEnv> = createHandler(
  {
    auth: 'public',
    operationName: 'getProducts',
  },
  async (c) => {
    // Get products from database using proper database pattern (prices stored in USD)
    const db = await getDbAsync();
    const rawProducts = await db.select().from(product).where(eq(product.isActive, true));

    // Convert USD prices to Toman - simplified response
    const currencyService = createCurrencyExchangeService();
    const productsWithTomanPricing = await Promise.all(
      rawProducts.map(async (prod: typeof rawProducts[0]) => {
        // Convert USD to Toman for each product
        const conversion = await currencyService.convertUsdToToman(prod.price);

        return {
          ...prod,
          price: conversion.tomanPrice, // Return Toman price
          formattedPrice: conversion.formattedPrice, // Pre-formatted string
        };
      }),
    );

    return Responses.ok(c, productsWithTomanPricing);
  },
);
