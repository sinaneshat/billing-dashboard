/**
 * Frontend Currency Conversion Utilities
 *
 * Handles USD to Iranian currency conversion for frontend display
 * Uses exchange rates to convert raw USD database values to Toman/Rial for display
 */

// =============================================================================
// TYPES
// =============================================================================

export type CurrencyConversionResult = {
  usdAmount: number;
  tomanAmount: number;
  rialAmount: number;
  exchangeRate: number;
};

// =============================================================================
// CONSTANTS
// =============================================================================

// REMOVED: No fallback rates allowed - system must use API-fetched rates only
// All exchange rate operations must fail if API is unavailable

// =============================================================================
// CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert USD amount to Toman (Iranian currency display unit)
 * Note: 1 Toman = 10 Rials
 */
export function convertUsdToToman(usdAmount: number, exchangeRate: number): CurrencyConversionResult {
  // CRITICAL: exchangeRate is now required - no fallbacks allowed
  if (!exchangeRate || exchangeRate <= 0) {
    throw new Error('Exchange rate is required and must be positive. No fallback rates allowed for financial safety.');
  }

  const rialAmount = usdAmount * exchangeRate;
  const tomanAmount = rialAmount / 10; // Convert Rial to Toman

  return {
    usdAmount,
    tomanAmount: Math.round(tomanAmount),
    rialAmount: Math.round(rialAmount),
    exchangeRate,
  };
}

/**
 * Convert Rial amount to Toman (for payment amounts that are stored in IRR)
 */
export function convertRialToToman(rialAmount: number): number {
  return Math.round(rialAmount / 10);
}

// =============================================================================
// REACT HOOKS (FUTURE ENHANCEMENT)
// =============================================================================

// TODO: Add React hooks for fetching live exchange rates
// export function useExchangeRate() { ... }
// export function useCurrencyConversion() { ... }
