/**
 * Unified Currency Conversion Service
 *
 * Centralized service for all currency conversions across the backend.
 * Ensures consistent usage of dynamic exchange rates with no hardcoded values.
 * All backend APIs should use this service for currency conversions.
 */

import type { CurrencyConversionResult } from './currency-exchange';
import { createCurrencyExchangeService } from './currency-exchange';

// =============================================================================
// UNIFIED CURRENCY SERVICE
// Following backend-patterns.md service creation patterns
// =============================================================================

class UnifiedCurrencyService {
  private exchangeService = createCurrencyExchangeService();

  constructor() {}

  /**
   * Create a new service instance
   * Following established backend patterns instead of singleton
   */
  static create(): UnifiedCurrencyService {
    return new UnifiedCurrencyService();
  }

  /**
   * Convert USD amount to Toman with all conversion data
   */
  async convertUsdToToman(usdAmount: number): Promise<CurrencyConversionResult> {
    return this.exchangeService.convertUsdToToman(usdAmount);
  }

  /**
   * Convert USD amount to IRR (Rials) with all conversion data
   */
  async convertUsdToRial(usdAmount: number): Promise<CurrencyConversionResult> {
    const result = await this.exchangeService.convertUsdToToman(usdAmount);
    return result; // Contains both Toman and Rial prices
  }

  /**
   * Convert multiple USD amounts to Toman in batch
   */
  async batchConvertUsdToToman(usdAmounts: number[]): Promise<CurrencyConversionResult[]> {
    return this.exchangeService.batchConvertUsdToToman(usdAmounts);
  }

  /**
   * Convert IRR amount to Toman (for payments already stored in IRR)
   * This doesn't require API call since it's just division by 10
   */
  convertRialToToman(rialAmount: number): {
    tomanPrice: number;
    rialPrice: number;
    formattedPrice: string;
  } {
    const tomanPrice = rialAmount / 10;
    return {
      tomanPrice,
      rialPrice: rialAmount,
      formattedPrice: tomanPrice === 0 ? 'Free' : `${tomanPrice.toLocaleString('en-US')} Toman`,
    };
  }

  /**
   * Get current exchange rate (for informational purposes)
   */
  async getCurrentExchangeRate(): Promise<number> {
    return this.exchangeService.getExchangeRate();
  }
}

// =============================================================================
// FACTORY FUNCTIONS FOR DIFFERENT USE CASES
// =============================================================================

/**
 * Create a new currency service instance (preferred approach)
 * Following backend-patterns.md service creation patterns
 */
export function createCurrencyService(): UnifiedCurrencyService {
  return UnifiedCurrencyService.create();
}

/**
 * Convert USD to Toman - Single conversion
 * Use this in API handlers that need to convert product prices
 */
export async function convertUsdToToman(usdAmount: number): Promise<CurrencyConversionResult> {
  const service = createCurrencyService();
  return service.convertUsdToToman(usdAmount);
}

/**
 * Convert USD to Rial - Single conversion
 * Use this when you need IRR amounts (e.g., for ZarinPal API)
 */
export async function convertUsdToRial(usdAmount: number): Promise<CurrencyConversionResult> {
  const service = createCurrencyService();
  return service.convertUsdToRial(usdAmount);
}

/**
 * Convert multiple USD amounts to Toman - Batch conversion
 * Use this in API handlers that need to convert multiple products/subscriptions
 */
export async function batchConvertUsdToToman(usdAmounts: number[]): Promise<CurrencyConversionResult[]> {
  const service = createCurrencyService();
  return service.batchConvertUsdToToman(usdAmounts);
}

/**
 * Convert IRR to Toman - No API call needed
 * Use this for payments already stored in IRR that need display formatting
 */
export function convertRialToToman(rialAmount: number): {
  tomanPrice: number;
  rialPrice: number;
  formattedPrice: string;
} {
  const service = createCurrencyService();
  return service.convertRialToToman(rialAmount);
}

/**
 * Get current exchange rate
 * Use this when you need just the rate for calculations
 */
export async function getCurrentExchangeRate(): Promise<number> {
  const service = createCurrencyService();
  return service.getCurrentExchangeRate();
}

// =============================================================================
// EXPORTS
// =============================================================================

export { UnifiedCurrencyService };
export type { CurrencyConversionResult };
