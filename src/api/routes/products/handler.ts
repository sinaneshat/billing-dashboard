import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';

// import * as HttpStatusCodes from 'stoker/http-status-codes'; // Unused
import { createHandler, Responses } from '@/api/core';
import { createCurrencyExchangeService } from '@/api/services/currency-exchange';
import type { ApiEnv } from '@/api/types';
import type { ProductMetadata } from '@/api/types/metadata';
import { db } from '@/db';
import { product } from '@/db/tables/billing';

import type { getProductsRoute } from './route';

/**
 * Handler for GET /products endpoint
 * Returns all active products with live Rial pricing for ZarinPal compatibility
 * Database stores USD prices, API converts to Iranian Rials
 * Using factory pattern for consistent authentication and error handling
 */
export const getProductsHandler: RouteHandler<typeof getProductsRoute, ApiEnv> = createHandler(
  {
    operationName: 'getProducts',
  },
  async (c) => {
    // Create currency exchange service instance
    const currencyService = createCurrencyExchangeService(c.env);

    // Get raw products from database (stored in USD) using direct DB access
    const rawProducts = await db.select().from(product).where(eq(product.isActive, true));

    // Convert USD prices to Iranian Rials for ZarinPal compatibility
    const enhancedProducts = await Promise.all(
      rawProducts.map(async (prod) => {
        const metadata = prod.metadata as ProductMetadata;
        const usdPrice = prod.price; // Database stores USD prices

        // Get fresh USD to IRR conversion for accurate pricing
        const conversion = await currencyService.convertUsdToToman(usdPrice);

        const pricingInfo = {
          usdPrice: conversion.usdPrice,
          rialPrice: conversion.rialPrice, // For ZarinPal payments
          tomanPrice: conversion.tomanPrice, // For display to users
          formattedPrice: conversion.formattedPrice,
          exchangeRate: conversion.exchangeRate,
          lastUpdated: conversion.lastUpdated,
        };

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

    return Responses.ok(c, enhancedProducts);
  },
);
