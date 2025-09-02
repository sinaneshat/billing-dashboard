/**
 * Real-time USD to Iranian Toman Currency Conversion Service
 * Uses live exchange rates and handles proper rounding for pricing display
 */

type ExchangeRateResponse = {
  rates: {
    IRR: number;
  };
  base: string;
  date: string;
};

type CurrencyConversionResult = {
  usdPrice: number;
  tomanPrice: number;
  exchangeRate: number;
  formattedPrice: string;
  lastUpdated: string;
};

class CurrencyConverter {
  private static instance: CurrencyConverter;
  private cachedRate: number | null = null;
  private lastFetch: number = 0;
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private readonly TOMAN_TO_RIAL = 10; // 1 Toman = 10 Rial

  public static getInstance(): CurrencyConverter {
    if (!CurrencyConverter.instance) {
      CurrencyConverter.instance = new CurrencyConverter();
    }
    return CurrencyConverter.instance;
  }

  /**
   * Fetch live USD to IRR exchange rate from multiple sources with fallback
   */
  private async fetchExchangeRate(): Promise<number> {
    const now = Date.now();

    // Use cached rate if still fresh
    if (this.cachedRate && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cachedRate;
    }

    // Primary API: exchangerate-api.com (free tier, 1500 requests/month)
    try {
      const response = await fetch(
        'https://api.exchangerate-api.com/v4/latest/USD',
        {
          headers: { 'User-Agent': 'DeadPixel-Billing-Dashboard/1.0' },
          signal: AbortSignal.timeout(5000), // 5 second timeout
        },
      );

      if (!response.ok) {
        throw new Error(`Primary API failed: ${response.status}`);
      }

      const data: ExchangeRateResponse = await response.json();
      const rate = data.rates.IRR;

      if (!rate || rate <= 0) {
        throw new Error('Invalid exchange rate received');
      }

      this.cachedRate = rate;
      this.lastFetch = now;

      console.warn(`✅ USD to IRR rate updated: ${rate} (Primary API)`);
      return rate;
    } catch (primaryError) {
      console.warn('Primary exchange rate API failed, trying fallback:', primaryError);

      // Fallback API: fixer.io (backup)
      try {
        const fallbackResponse = await fetch(
          'https://api.fixer.io/latest?base=USD&symbols=IRR',
          {
            signal: AbortSignal.timeout(5000),
          },
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json() as { rates?: { IRR?: number } };
          const fallbackRate = fallbackData.rates?.IRR;

          if (fallbackRate && fallbackRate > 0) {
            this.cachedRate = fallbackRate;
            this.lastFetch = now;
            console.warn(`✅ USD to IRR rate updated: ${fallbackRate} (Fallback API)`);
            return fallbackRate;
          }
        }
      } catch (fallbackError) {
        console.warn('Fallback exchange rate API also failed:', fallbackError);
      }

      // Ultimate fallback: use approximate current rate (update this periodically)
      const approximateRate = 42000; // Approximate USD to IRR as of 2024
      console.warn(`⚠️ Using approximate exchange rate: ${approximateRate} IRR/USD`);

      this.cachedRate = approximateRate;
      this.lastFetch = now;
      return approximateRate;
    }
  }

  /**
   * Convert USD to Iranian Toman with smart rounding
   */
  public async convertUsdToToman(usdAmount: number): Promise<CurrencyConversionResult> {
    if (usdAmount <= 0) {
      return {
        usdPrice: 0,
        tomanPrice: 0,
        exchangeRate: 0,
        formattedPrice: 'Free',
        lastUpdated: new Date().toISOString(),
      };
    }

    const irrRate = await this.fetchExchangeRate();
    const irrAmount = usdAmount * irrRate;
    const tomanAmount = irrAmount / this.TOMAN_TO_RIAL; // Convert IRR to Toman

    // Smart rounding for pricing psychology
    const roundedToman = this.smartRoundToman(tomanAmount);

    return {
      usdPrice: usdAmount,
      tomanPrice: roundedToman,
      exchangeRate: irrRate,
      formattedPrice: this.formatTomanPrice(roundedToman),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Smart rounding algorithm for Iranian Toman pricing
   * Makes prices look clean and psychologically appealing
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
   * All text remains in English as requested
   */
  public formatTomanPrice(amount: number): string {
    if (amount === 0) {
      return 'Free';
    }

    // Format number with English digits and proper separators
    const formattedNumber = amount.toLocaleString('en-US');
    return `${formattedNumber} Toman`;
  }

  /**
   * Batch convert multiple USD prices to Toman
   */
  public async batchConvertUsdToToman(usdPrices: number[]): Promise<CurrencyConversionResult[]> {
    const exchangeRate = await this.fetchExchangeRate();

    return usdPrices.map((usdAmount) => {
      if (usdAmount <= 0) {
        return {
          usdPrice: 0,
          tomanPrice: 0,
          exchangeRate,
          formattedPrice: 'Free',
          lastUpdated: new Date().toISOString(),
        };
      }

      const irrAmount = usdAmount * exchangeRate;
      const tomanAmount = irrAmount / this.TOMAN_TO_RIAL;
      const roundedToman = this.smartRoundToman(tomanAmount);

      return {
        usdPrice: usdAmount,
        tomanPrice: roundedToman,
        exchangeRate,
        formattedPrice: this.formatTomanPrice(roundedToman),
        lastUpdated: new Date().toISOString(),
      };
    });
  }

  /**
   * Get current exchange rate (cached)
   */
  public async getCurrentExchangeRate(): Promise<number> {
    return await this.fetchExchangeRate();
  }
}

// Export singleton instance
export const currencyConverter = CurrencyConverter.getInstance();

// Export utility functions for easy use
export function convertUsdToToman(usdAmount: number) {
  return currencyConverter.convertUsdToToman(usdAmount);
}

export function formatTomanCurrency(amount: number) {
  return currencyConverter.formatTomanPrice(amount);
}

export function batchConvertPrices(usdPrices: number[]) {
  return currencyConverter.batchConvertUsdToToman(usdPrices);
}

// Types export
export type { CurrencyConversionResult };
