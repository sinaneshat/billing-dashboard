/**
 * Seed Stripe Products and Prices
 *
 * Populates stripe_product and stripe_price tables with ACTUAL Stripe products
 * from the test environment. These are the real product IDs and price IDs that
 * exist in Stripe, enabling actual subscription purchases.
 *
 * IMPORTANT: Uses real Stripe product/price IDs from test mode.
 * DO NOT modify these IDs unless you've created new products in Stripe.
 *
 * Run with: pnpm db:seed:products
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as tables from '../src/db/schema';

// ============================================================================
// ACTUAL Stripe Products and Prices from Test Mode
// Retrieved from: stripe products list & stripe prices list
// ============================================================================

const NOW = new Date();

/**
 * Subscription Products matching the pricing page screenshot
 * All IDs are REAL Stripe IDs from the test environment
 */
const PRODUCTS = [
  // ============================================================================
  // STARTER TIER - $20/month or $200/year
  // Stripe Product: prod_TAbABj98toEKg7
  // ============================================================================
  {
    product: {
      id: 'prod_TAbABj98toEKg7', // REAL Stripe product ID
      name: 'Starter',
      description: 'Perfect for individuals making 1-2 important decisions per week',
      active: true,
      defaultPriceId: 'price_1SEFyVGx4IA5m8Qe8Wo4WGYK', // Monthly price
      metadata: {
        tier: 'starter',
        displayOrder: '2',
        features: JSON.stringify([
          '150 messages / month',
          'Up to 5 AI models',
          '30 conversations / month',
          'Advanced AI models',
        ]),
      } as Record<string, string>,
      images: [],
      features: [
        '150 messages / month',
        'Up to 5 AI models',
        '30 conversations / month',
        'Advanced AI models',
      ],
      createdAt: NOW,
      updatedAt: NOW,
    },
    prices: [
      {
        id: 'price_1SEFyVGx4IA5m8Qe8Wo4WGYK', // REAL monthly price ID
        productId: 'prod_TAbABj98toEKg7',
        active: true,
        currency: 'usd',
        unitAmount: 2000, // $20.00
        type: 'recurring' as const,
        interval: 'month' as const,
        intervalCount: 1,
        trialPeriodDays: null,
        metadata: {
          tier: 'starter',
          billingPeriod: 'monthly',
        } as Record<string, string>,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'price_1SEFyVGx4IA5m8QevBWdcRom', // REAL annual price ID
        productId: 'prod_TAbABj98toEKg7',
        active: true,
        currency: 'usd',
        unitAmount: 20000, // $200.00
        type: 'recurring' as const,
        interval: 'year' as const,
        intervalCount: 1,
        trialPeriodDays: null,
        metadata: {
          tier: 'starter',
          billingPeriod: 'annual',
          savingsPercent: '17',
        } as Record<string, string>,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
  },

  // ============================================================================
  // PRO TIER - $59/month or $600/year (MOST POPULAR)
  // Stripe Product: prod_TAbATZPEiE2y9o
  // ============================================================================
  {
    product: {
      id: 'prod_TAbATZPEiE2y9o', // REAL Stripe product ID
      name: 'Pro',
      description: 'For serious decision makers who need 2-3 important decisions every day',
      active: true,
      defaultPriceId: 'price_1SEFyWGx4IA5m8QesQBukr4b', // Monthly price
      metadata: {
        tier: 'pro',
        displayOrder: '3',
        badge: 'most_popular',
        features: JSON.stringify([
          '400 messages / month',
          'Up to 7 AI models',
          '75 conversations / month',
          'Advanced AI models',
        ]),
      } as Record<string, string>,
      images: [],
      features: [
        '400 messages / month',
        'Up to 7 AI models',
        '75 conversations / month',
        'Advanced AI models',
      ],
      createdAt: NOW,
      updatedAt: NOW,
    },
    prices: [
      {
        id: 'price_1SEFyWGx4IA5m8QesQBukr4b', // REAL monthly price ID
        productId: 'prod_TAbATZPEiE2y9o',
        active: true,
        currency: 'usd',
        unitAmount: 5900, // $59.00
        type: 'recurring' as const,
        interval: 'month' as const,
        intervalCount: 1,
        trialPeriodDays: null,
        metadata: {
          tier: 'pro',
          billingPeriod: 'monthly',
        } as Record<string, string>,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'price_1SEFyXGx4IA5m8QeM8s6Iu54', // REAL annual price ID
        productId: 'prod_TAbATZPEiE2y9o',
        active: true,
        currency: 'usd',
        unitAmount: 60000, // $600.00
        type: 'recurring' as const,
        interval: 'year' as const,
        intervalCount: 1,
        trialPeriodDays: null,
        metadata: {
          tier: 'pro',
          billingPeriod: 'annual',
          savingsPercent: '15',
        } as Record<string, string>,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
  },

  // ============================================================================
  // POWER TIER - $249/month or $2500/year
  // Stripe Product: prod_TAbA8kAHcag3Kb
  // ============================================================================
  {
    product: {
      id: 'prod_TAbA8kAHcag3Kb', // REAL Stripe product ID
      name: 'Power',
      description: 'For teams that need extensive research and discovery capabilities',
      active: true,
      defaultPriceId: 'price_1SEFyYGx4IA5m8QeXhso3m35', // Monthly price
      metadata: {
        tier: 'power',
        displayOrder: '4',
        features: JSON.stringify([
          '1,800 messages / month',
          'Up to 15 AI models',
          '300 conversations / month',
          'Advanced AI models',
        ]),
      } as Record<string, string>,
      images: [],
      features: [
        '1,800 messages / month',
        'Up to 15 AI models',
        '300 conversations / month',
        'Advanced AI models',
      ],
      createdAt: NOW,
      updatedAt: NOW,
    },
    prices: [
      {
        id: 'price_1SEFyYGx4IA5m8QeXhso3m35', // REAL monthly price ID
        productId: 'prod_TAbA8kAHcag3Kb',
        active: true,
        currency: 'usd',
        unitAmount: 24900, // $249.00
        type: 'recurring' as const,
        interval: 'month' as const,
        intervalCount: 1,
        trialPeriodDays: null,
        metadata: {
          tier: 'power',
          billingPeriod: 'monthly',
        } as Record<string, string>,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'price_1SEFyYGx4IA5m8Qeukamf1lQ', // REAL annual price ID
        productId: 'prod_TAbA8kAHcag3Kb',
        active: true,
        currency: 'usd',
        unitAmount: 250000, // $2500.00
        type: 'recurring' as const,
        interval: 'year' as const,
        intervalCount: 1,
        trialPeriodDays: null,
        metadata: {
          tier: 'power',
          billingPeriod: 'annual',
          savingsPercent: '16',
        } as Record<string, string>,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
  },
];

// ============================================================================
// Database Connection Helper
// ============================================================================

function getLocalDbPath(): string {
  const LOCAL_DB_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
  const LOCAL_DB_PATH = path.join(process.cwd(), LOCAL_DB_DIR);

  // Look for existing SQLite file
  try {
    const files = fs.readdirSync(LOCAL_DB_PATH);
    const dbFile = files.find(file => file.endsWith('.sqlite'));
    if (dbFile) {
      return path.join(LOCAL_DB_PATH, dbFile);
    }
  } catch {
    // Directory doesn't exist
  }

  throw new Error(
    'Local database not found. Please run the dev server first to create the database.',
  );
}

// ============================================================================
// Seed Function
// ============================================================================

async function seed() {
  console.log('🌱 Seeding Stripe products and prices...');
  console.log('📋 Using REAL Stripe product IDs from test mode:\n');

  // Connect to local SQLite database
  const dbPath = getLocalDbPath();
  console.log(`📁 Using database: ${dbPath}\n`);

  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);

  // Clear existing products and prices to avoid conflicts
  console.log('🗑️  Clearing existing products and prices...');
  await db.delete(tables.stripePrice);
  await db.delete(tables.stripeProduct);

  let totalProducts = 0;
  let totalPrices = 0;

  // Insert products and prices
  for (const { product, prices } of PRODUCTS) {
    // Insert product
    await db.insert(tables.stripeProduct).values(product);
    totalProducts++;
    console.log(`  ✓ Created product: ${product.name} (${product.id})`);

    // Insert all prices for this product
    await db.insert(tables.stripePrice).values(prices);
    totalPrices += prices.length;

    for (const price of prices) {
      const amount = (price.unitAmount / 100).toFixed(2);
      const interval = price.interval === 'month' ? 'mo' : 'yr';
      console.log(`    ✓ Price: $${amount}/${interval} (${price.id})`);
    }
    console.log('');
  }

  console.log('✅ Seeded products and prices successfully!\n');
  console.log(`📊 Total products created: ${totalProducts}`);
  console.log(`💰 Total prices created: ${totalPrices}\n`);
  console.log('📋 Product Summary:\n');
  console.log('  🚀 Starter (prod_TAbABj98toEKg7):');
  console.log('     - $20/month or $200/year');
  console.log('     - 150 messages, 30 conversations, 5 AI models\n');
  console.log('  ⭐ Pro (prod_TAbATZPEiE2y9o) - MOST POPULAR:');
  console.log('     - $59/month or $600/year');
  console.log('     - 400 messages, 75 conversations, 7 AI models\n');
  console.log('  ⚡ Power (prod_TAbA8kAHcag3Kb):');
  console.log('     - $249/month or $2500/year');
  console.log('     - 1,800 messages, 300 conversations, 15 AI models\n');
  console.log('💡 These are REAL Stripe products - subscriptions will work!');
}

// ============================================================================
// Execute Seed
// ============================================================================

seed()
  .then(() => {
    console.log('\n🎉 Seed completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  });
