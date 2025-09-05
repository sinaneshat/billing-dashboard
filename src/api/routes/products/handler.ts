import type { RouteHandler } from '@hono/zod-openapi';

// import * as HttpStatusCodes from 'stoker/http-status-codes'; // Unused
import { createHandler, Responses } from '@/api/core';
import { billingRepositories } from '@/api/repositories/billing-repositories';
import type { ApiEnv } from '@/api/types';
import type { ProductMetadata } from '@/api/types/metadata';
import { currencyConverter } from '@/lib/services/currency-converter';

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
    // Get raw products from database (stored in USD) using repository
    const rawProducts = await billingRepositories.products.findActive();

    // Convert USD prices to Iranian Rials for ZarinPal compatibility
    const enhancedProducts = await Promise.all(
      rawProducts.map(async (prod) => {
        const metadata = prod.metadata as ProductMetadata;
        const usdPrice = prod.price; // Database stores USD prices

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

    return Responses.ok(c, enhancedProducts);
  },
);
