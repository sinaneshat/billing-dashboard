import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';

import { createHandler, Responses } from '@/api/core';
import { createCurrencyExchangeService } from '@/api/services/currency-exchange';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
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
    // Get products from database (prices stored in USD)
    const rawProducts = await db.select().from(product).where(eq(product.isActive, true));

    // Convert USD prices to Iranian currency
    const currencyService = createCurrencyExchangeService(c.env);
    const productsWithTomanPricing = await Promise.all(
      rawProducts.map(async (prod) => {
        // Convert USD to Toman for each product
        const conversion = await currencyService.convertUsdToToman(prod.price);

        return {
          ...prod,
          price: conversion.tomanPrice, // Return Toman price for display
          originalUsdPrice: prod.price, // Keep original USD for reference
          exchangeRate: conversion.exchangeRate,
          formattedPrice: conversion.formattedPrice,
        };
      }),
    );

    return Responses.ok(c, productsWithTomanPricing);
  },
);
