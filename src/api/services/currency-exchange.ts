/**
 * Currency Exchange Service
 *
 * Production-ready service for USD to Iranian Rial conversion
 * Uses the simple chatqt.com API endpoint for reliable exchange rates
 * Follows BaseService pattern with proper error handling and caching
 */

import { z } from '@hono/zod-openapi';

// Removed apiLogger import due to ExecutionContext dependency

// =============================================================================
// ZOD SCHEMAS
// =============================================================================

/**
 * Currency Exchange Configuration Schema
 */
export const CurrencyExchangeConfigSchema = z.object({
  serviceName: z.string(),
  baseUrl: z.string().url(),
  timeout: z.number().positive(),
  retries: z.number().int().min(0).max(5),
  circuitBreaker: z.object({
    failureThreshold: z.number().int().positive(),
    resetTimeout: z.number().positive(),
  }).optional(),
  cacheDuration: z.number().positive().default(10 * 60 * 1000), // 10 minutes
}).openapi('CurrencyExchangeConfig');

export type CurrencyExchangeConfig = z.infer<typeof CurrencyExchangeConfigSchema>;

/**
 * Exchange Rate Response Schema
 */
export const ExchangeRateResponseSchema = z.object({
  rate: z.number().positive(),
}).openapi('ExchangeRateResponse');

export type ExchangeRateResponse = z.infer<typeof ExchangeRateResponseSchema>;

/**
 * Currency Conversion Result Schema
 */
export const CurrencyConversionResultSchema = z.object({
  usdPrice: z.number().min(0),
  tomanPrice: z.number().min(0),
  rialPrice: z.number().min(0),
  exchangeRate: z.number().positive(),
  formattedPrice: z.string(),
  lastUpdated: z.string().datetime(),
}).openapi('CurrencyConversionResult');

export type CurrencyConversionResult = z.infer<typeof CurrencyConversionResultSchema>;

// =============================================================================
// CURRENCY EXCHANGE SERVICE
// =============================================================================

export class CurrencyExchangeService {
  private config: CurrencyExchangeConfig;
  private cachedRate: number | null = null;
  private lastFetch: number = 0;
  // REMOVED: No fallback rates allowed - system must fail if API unavailable

  constructor(config: CurrencyExchangeConfig) {
    this.config = config;
  }

  /**
   * Make HTTP request with error handling and retries
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit,
    operationName?: string,
  ): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to ${operationName || 'make request'}: ${errorMessage}`);
    }
  }

  /**
   * Get service configuration from environment
   * Uses OpenNext.js Cloudflare context for consistent environment access
   */
  static getConfig(): CurrencyExchangeConfig {
    const configData = {
      serviceName: 'currency-exchange',
      baseUrl: 'https://services.chatqt.com/public',
      timeout: 5000, // 5 seconds
      retries: 2,
      circuitBreaker: {
        failureThreshold: 3,
        resetTimeout: 30000, // 30 seconds
      },
      cacheDuration: 10 * 60 * 1000, // 10 minutes
    };

    const result = CurrencyExchangeConfigSchema.safeParse(configData);
    if (!result.success) {
      throw new Error(`Currency exchange config validation failed: ${result.error.message}`);
    }
    return result.data;
  }

  /**
   * Factory method to create service instance with validated configuration
   */
  static create(): CurrencyExchangeService {
    const config = this.getConfig();
    return new CurrencyExchangeService(config);
  }

  /**
   * Fetch current USD to IRR exchange rate
   */
  async getExchangeRate(): Promise<number> {
    const now = Date.now();

    // Use cached rate if still fresh
    if (this.cachedRate && (now - this.lastFetch) < this.config.cacheDuration) {
      return this.cachedRate;
    }

    try {
      const response = await this.makeRequest<ExchangeRateResponse>(
        '/exchange/rate',
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'DeadPixel-Billing-Dashboard/1.0',
          },
        },
        'fetch exchange rate',
      );

      const rate = response.rate;
      if (!rate || rate <= 0) {
        throw new Error('Invalid exchange rate received from API');
      }

      // Cache the successful result
      this.cachedRate = rate;
      this.lastFetch = now;

      return rate;
    } catch (error) {
      // CRITICAL: No fallback rates - system must fail if exchange rate unavailable
      console.error('[CURRENCY-SERVICE] Exchange rate API failed - blocking all operations', {
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
        message: 'SYSTEM BLOCKED: Exchange rate API unavailable - no transactions allowed',
      });

      // Clear any cached rate and throw error to block operations
      this.cachedRate = null;
      this.lastFetch = 0;

      throw new Error(`Exchange rate API unavailable: ${error instanceof Error ? error.message : String(error)}. Operations blocked for financial safety.`);
    }
  }

  /**
   * Convert USD to Iranian Toman with smart rounding
   */
  async convertUsdToToman(usdAmount: number): Promise<CurrencyConversionResult> {
    if (usdAmount <= 0) {
      return {
        usdPrice: 0,
        tomanPrice: 0,
        rialPrice: 0,
        exchangeRate: 0,
        formattedPrice: 'Free',
        lastUpdated: new Date().toISOString(),
      };
    }

    const exchangeRate = await this.getExchangeRate();
    const rialPrice = usdAmount * exchangeRate;
    const tomanPrice = rialPrice / 10; // Convert IRR to Toman (1 Toman = 10 Rial)

    // Smart rounding for pricing psychology
    const roundedToman = this.smartRoundToman(tomanPrice);
    const roundedRial = roundedToman * 10;

    return {
      usdPrice: usdAmount,
      tomanPrice: roundedToman,
      rialPrice: roundedRial,
      exchangeRate,
      formattedPrice: this.formatTomanPrice(roundedToman),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Batch convert multiple USD prices to Toman
   */
  async batchConvertUsdToToman(usdPrices: number[]): Promise<CurrencyConversionResult[]> {
    const exchangeRate = await this.getExchangeRate();

    return usdPrices.map((usdAmount) => {
      if (usdAmount <= 0) {
        return {
          usdPrice: 0,
          tomanPrice: 0,
          rialPrice: 0,
          exchangeRate,
          formattedPrice: 'Free',
          lastUpdated: new Date().toISOString(),
        };
      }

      const rialPrice = usdAmount * exchangeRate;
      const tomanPrice = rialPrice / 10;
      const roundedToman = this.smartRoundToman(tomanPrice);
      const roundedRial = roundedToman * 10;

      return {
        usdPrice: usdAmount,
        tomanPrice: roundedToman,
        rialPrice: roundedRial,
        exchangeRate,
        formattedPrice: this.formatTomanPrice(roundedToman),
        lastUpdated: new Date().toISOString(),
      };
    });
  }

  // =============================================================================
  // PRIVATE UTILITY METHODS
  // =============================================================================

  /**
   * Smart rounding algorithm for Iranian Toman pricing
   */
  private smartRoundToman(amount: number): number {
    if (amount <= 0)
      return 0;

    // For very small amounts (< 1000 Toman)
    if (amount < 1000) {
      return Math.ceil(amount / 100) * 100; // Round to nearest 100 Toman
    }

    // For small amounts (1,000 - 10,000 Toman)
    if (amount < 10000) {
      return Math.ceil(amount / 500) * 500; // Round to nearest 500 Toman
    }

    // For medium amounts (10,000 - 100,000 Toman)
    if (amount < 100000) {
      return Math.ceil(amount / 1000) * 1000; // Round to nearest 1,000 Toman
    }

    // For large amounts (100,000 - 1,000,000 Toman)
    if (amount < 1000000) {
      return Math.ceil(amount / 5000) * 5000; // Round to nearest 5,000 Toman
    }

    // For very large amounts (> 1,000,000 Toman)
    return Math.ceil(amount / 10000) * 10000; // Round to nearest 10,000 Toman
  }

  /**
   * Format Toman amount with English formatting
   */
  private formatTomanPrice(amount: number): string {
    if (amount === 0) {
      return 'Free';
    }

    const formattedNumber = amount.toLocaleString('en-US');
    return `${formattedNumber} Toman`;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create CurrencyExchangeService instance
 * Uses OpenNext.js Cloudflare context for consistent environment access
 */
export function createCurrencyExchangeService(): CurrencyExchangeService {
  return CurrencyExchangeService.create();
}
