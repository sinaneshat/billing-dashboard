import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';

import { createHandler, Responses } from '@/api/core';
import { createCurrencyExchangeService } from '@/api/services/currency-exchange';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import { product } from '@/db/tables/billing';

import type { getProductsRoute } from './route';

/**
 * Products handler - converts USD prices to Iranian Toman internally
 * CRITICAL: Fails if exchange rate API is unavailable (no fallbacks allowed)
 * Backend handles all currency conversion - frontend displays converted prices
 */
export const getProductsHandler: RouteHandler<typeof getProductsRoute, ApiEnv> = createHandler(
  {
    auth: 'public',
    operationName: 'getProducts',
  },
  async (c) => {
    try {
      // Get raw products from database
      const db = await getDbAsync();
      const rawProducts = await db.select().from(product).where(eq(product.isActive, true));

      // Initialize currency service for conversion
      const currencyService = createCurrencyExchangeService();

      // Convert each product's USD price to Toman
      // CRITICAL: This will throw if exchange rate API is unavailable
      const productsWithConvertedPrices = await Promise.all(
        rawProducts.map(async (product) => {
          if (product.price === 0) {
            // Free products don't need conversion
            return {
              ...product,
              priceIrr: 0,
              priceToman: 0,
              formattedPrice: 'Free',
            };
          }

          // Convert USD to Iranian currency using live exchange rate
          const conversionResult = await currencyService.convertUsdToToman(product.price);

          return {
            ...product,
            priceIrr: conversionResult.rialPrice,
            priceToman: conversionResult.tomanPrice,
            formattedPrice: conversionResult.formattedPrice,
          };
        }),
      );

      return Responses.ok(c, productsWithConvertedPrices);
    } catch (error) {
      // If exchange rate API is unavailable, fail the entire request
      // This prevents showing products with incorrect pricing
      if (error instanceof Error && error.message.includes('Exchange rate API unavailable')) {
        return Responses.serviceUnavailable(c, {
          error: 'EXCHANGE_RATE_UNAVAILABLE',
          message: 'Product pricing unavailable due to exchange rate API failure. Please try again later.',
          retryAfter: 300,
        });
      }

      // For other errors, return internal server error
      throw error;
    }
  },
);
