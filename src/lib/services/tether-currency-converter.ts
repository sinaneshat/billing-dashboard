/**
 * Tether (USDT) to Iranian Toman Currency Conversion Service
 * Uses Iranian cryptocurrency exchanges for more accurate local pricing
 * Keeps database data in USD, converts only for display/ZarinPal
 */

type TetherConversionResult = {
  usdPrice: number;
  tetherPrice: number; // 1 USD ≈ 1 USDT
  tomanPrice: number;
  exchangeRate: number; // USDT to Toman
  formattedPrice: string;
  lastUpdated: string;
  source: string;
};

// API Response Types
type NavasanResponse = {
  crypto_tether?: {
    value?: number;
  };
};

type AlanChandResponse = {
  price_toman?: number;
  toman?: number;
};

type WallexResponse = {
  result?: {
    stats?: {
      lastPrice?: number;
    };
  };
};

class TetherCurrencyConverter {
  private static instance: TetherCurrencyConverter;
  private cachedRate: number | null = null;
  private lastFetch: number = 0;
  private lastSource: string = '';
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (crypto moves fast)
  private readonly REQUEST_TIMEOUT = 8000; // 8 seconds

  public static getInstance(): TetherCurrencyConverter {
    if (!TetherCurrencyConverter.instance) {
      TetherCurrencyConverter.instance = new TetherCurrencyConverter();
    }
    return TetherCurrencyConverter.instance;
  }

  /**
   * Fetch live USDT to Toman rate from multiple Iranian sources with fallback
   */
  private async fetchTetherRate(): Promise<{ rate: number; source: string }> {
    const now = Date.now();

    // Use cached rate if still fresh
    if (this.cachedRate && (now - this.lastFetch) < this.CACHE_DURATION) {
      return { rate: this.cachedRate, source: this.lastSource };
    }

    // API sources in priority order
    const sources = [
      {
        name: 'Navasan',
        url: 'https://api.navasan.tech/latest/?item=crypto-tether',
        parser: (data: unknown) => (data as NavasanResponse)?.crypto_tether?.value || null,
      },
      {
        name: 'AlanChand',
        url: 'https://api.alanchand.com/v1/crypto/tether',
        parser: (data: unknown) => (data as AlanChandResponse)?.price_toman || (data as AlanChandResponse)?.toman || null,
      },
      {
        name: 'Wallex-Proxy',
        url: 'https://api.wallex.ir/v1/markets/USDTTMN',
        parser: (data: unknown) => (data as WallexResponse)?.result?.stats?.lastPrice || null,
      },
    ];

    // Try each source in order
    for (const source of sources) {
      try {
        console.warn(`🔄 Fetching USDT rate from ${source.name}...`);

        const response = await fetch(source.url, {
          headers: {
            'User-Agent': 'DeadPixel-Billing-Dashboard/1.0',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          },
          signal: AbortSignal.timeout(this.REQUEST_TIMEOUT),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const rate = source.parser(data);

        if (!rate || rate <= 0) {
          throw new Error('Invalid rate received from API');
        }

        // Validate rate is reasonable (between 50K-200K Toman)
        if (rate < 50000 || rate > 200000) {
          throw new Error(`Rate ${rate} seems unrealistic, skipping`);
        }

        this.cachedRate = rate;
        this.lastFetch = now;
        this.lastSource = source.name;

        console.warn(`✅ USDT to Toman rate: ${rate.toLocaleString()} (${source.name})`);
        return { rate, source: source.name };
      } catch (error) {
        console.warn(`❌ ${source.name} API failed:`, error);
        continue;
      }
    }

    // Ultimate fallback using known Iranian exchange rates
    const fallback = { rate: 102500, source: 'Market-Average-Fallback' };

    console.warn(`⚠️ Using fallback: ${fallback.rate.toLocaleString()} Toman/USDT (${fallback.source})`);
    this.cachedRate = fallback.rate;
    this.lastFetch = now;
    this.lastSource = fallback.source;
    return { rate: fallback.rate, source: fallback.source };
  }

  /**
   * Convert USD to Iranian Toman via Tether with smart rounding
   * USD → USDT (1:1) → Toman (market rate)
   */
  public async convertUsdToToman(usdAmount: number): Promise<TetherConversionResult> {
    if (usdAmount <= 0) {
      return {
        usdPrice: 0,
        tetherPrice: 0,
        tomanPrice: 0,
        exchangeRate: 0,
        formattedPrice: 'Free',
        lastUpdated: new Date().toISOString(),
        source: 'N/A',
      };
    }

    try {
      const { rate: tetherToTomanRate, source } = await this.fetchTetherRate();

      // USD to USDT is approximately 1:1 (Tether is pegged to USD)
      const tetherAmount = usdAmount; // 1 USD ≈ 1 USDT
      const tomanAmount = tetherAmount * tetherToTomanRate;

      // Smart rounding for Iranian pricing psychology
      const roundedToman = this.smartRoundToman(tomanAmount);

      return {
        usdPrice: usdAmount,
        tetherPrice: tetherAmount,
        tomanPrice: roundedToman,
        exchangeRate: tetherToTomanRate,
        formattedPrice: this.formatTomanPrice(roundedToman),
        lastUpdated: new Date().toISOString(),
        source,
      };
    } catch (error) {
      console.error('❌ Tether conversion failed:', error);

      // Emergency fallback - use approximate rate
      const emergencyRate = 102000; // Conservative estimate
      const tetherAmount = usdAmount;
      const tomanAmount = tetherAmount * emergencyRate;
      const roundedToman = this.smartRoundToman(tomanAmount);

      return {
        usdPrice: usdAmount,
        tetherPrice: tetherAmount,
        tomanPrice: roundedToman,
        exchangeRate: emergencyRate,
        formattedPrice: this.formatTomanPrice(roundedToman),
        lastUpdated: new Date().toISOString(),
        source: 'Emergency-Fallback',
      };
    }
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
      return Math.ceil(amount / 100) * 100;
    }

    // For small amounts (1,000 - 10,000 Toman)
    if (amount < 10000) {
      return Math.ceil(amount / 500) * 500;
    }

    // For medium amounts (10,000 - 100,000 Toman)
    if (amount < 100000) {
      return Math.ceil(amount / 1000) * 1000;
    }

    // For large amounts (100,000 - 1,000,000 Toman)
    if (amount < 1000000) {
      return Math.ceil(amount / 5000) * 5000;
    }

    // For very large amounts (> 1,000,000 Toman)
    return Math.ceil(amount / 10000) * 10000;
  }

  /**
   * Format Toman amount with English formatting
   */
  public formatTomanPrice(amount: number): string {
    if (amount === 0) {
      return 'Free';
    }

    const formattedNumber = amount.toLocaleString('en-US');
    return `${formattedNumber} Toman`;
  }

  /**
   * Batch convert multiple USD prices to Toman via Tether
   */
  public async batchConvertUsdToToman(usdPrices: number[]): Promise<TetherConversionResult[]> {
    try {
      const { rate: tetherToTomanRate, source } = await this.fetchTetherRate();

      return usdPrices.map((usdAmount) => {
        if (usdAmount <= 0) {
          return {
            usdPrice: 0,
            tetherPrice: 0,
            tomanPrice: 0,
            exchangeRate: tetherToTomanRate,
            formattedPrice: 'Free',
            lastUpdated: new Date().toISOString(),
            source,
          };
        }

        const tetherAmount = usdAmount; // 1 USD ≈ 1 USDT
        const tomanAmount = tetherAmount * tetherToTomanRate;
        const roundedToman = this.smartRoundToman(tomanAmount);

        return {
          usdPrice: usdAmount,
          tetherPrice: tetherAmount,
          tomanPrice: roundedToman,
          exchangeRate: tetherToTomanRate,
          formattedPrice: this.formatTomanPrice(roundedToman),
          lastUpdated: new Date().toISOString(),
          source,
        };
      });
    } catch (error) {
      console.error('❌ Batch Tether conversion failed:', error);
      throw error;
    }
  }

  /**
   * Get current Tether to Toman exchange rate (cached)
   */
  public async getCurrentTetherRate(): Promise<{ rate: number; source: string }> {
    return await this.fetchTetherRate();
  }

  /**
   * Convert Toman back to USD (for ZarinPal integration)
   * Toman → USDT → USD
   */
  public async convertTomanToUsd(tomanAmount: number): Promise<{ usd: number; rate: number }> {
    if (tomanAmount <= 0) {
      return { usd: 0, rate: 0 };
    }

    const { rate: tetherToTomanRate } = await this.fetchTetherRate();
    const tetherAmount = tomanAmount / tetherToTomanRate;
    const usdAmount = tetherAmount; // 1 USDT ≈ 1 USD

    return {
      usd: usdAmount,
      rate: tetherToTomanRate,
    };
  }
}

// Export singleton instance
export const tetherCurrencyConverter = TetherCurrencyConverter.getInstance();

// Export utility functions for easy use
export function convertUsdToTomanViaTether(usdAmount: number) {
  return tetherCurrencyConverter.convertUsdToToman(usdAmount);
}

export function formatTetherTomanCurrency(amount: number) {
  return tetherCurrencyConverter.formatTomanPrice(amount);
}

export function batchConvertPricesViaTether(usdPrices: number[]) {
  return tetherCurrencyConverter.batchConvertUsdToToman(usdPrices);
}

export function getCurrentTetherRate() {
  return tetherCurrencyConverter.getCurrentTetherRate();
}

export function convertTomanToUsd(tomanAmount: number) {
  return tetherCurrencyConverter.convertTomanToUsd(tomanAmount);
}

// Types export
export type { TetherConversionResult };
