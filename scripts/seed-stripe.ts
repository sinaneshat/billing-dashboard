#!/usr/bin/env tsx
/**
 * Seed script for Stripe products and prices
 *
 * This script seeds the database with actual Stripe products and prices
 * from your production Stripe account.
 *
 * Products created in Stripe:
 * - Starter Plan: prod_TAEP2qXLP3VfRW
 * - Professional Plan: prod_TAEPSLycGec7IE
 * - Enterprise Plan: prod_TAEQkr9GyJIJzV
 */

import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/db/schema';
import path from 'path';
import fs from 'fs';

// Get the local D1 database path
const LOCAL_DB_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const LOCAL_DB_PATH = path.join(process.cwd(), LOCAL_DB_DIR);

function getLocalDbPath(): string {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    console.error(`❌ Database directory not found: ${LOCAL_DB_PATH}`);
    console.error('Please run `pnpm dev` first to create the local database.');
    process.exit(1);
  }

  const files = fs.readdirSync(LOCAL_DB_PATH);
  const dbFile = files.find(file => file.endsWith('.sqlite'));

  if (!dbFile) {
    console.error('❌ No SQLite database file found.');
    console.error('Please run `pnpm dev` first to create the local database.');
    process.exit(1);
  }

  return path.join(LOCAL_DB_PATH, dbFile);
}

const dbPath = getLocalDbPath();
console.log(`📦 Using database: ${dbPath}`);

const sqlite = new Database(dbPath);
const db = drizzle(sqlite, { schema });

/**
 * Actual Stripe Products from your production account
 */
const STRIPE_PRODUCTS = [
  {
    id: 'prod_TAEP2qXLP3VfRW', // Actual Stripe product ID
    name: 'Starter Plan',
    description: 'Perfect for individuals and small teams getting started',
    active: true,
    features: [
      'Up to 5 team members',
      '10 GB storage',
      'Basic support',
      'Core features'
    ],
    createdAt: new Date('2025-06-02T00:00:00Z'),
    updatedAt: new Date('2025-06-02T00:00:00Z'),
  },
  {
    id: 'prod_TAEPSLycGec7IE', // Actual Stripe product ID
    name: 'Professional Plan',
    description: 'For growing teams that need more power and flexibility',
    active: true,
    features: [
      'Up to 20 team members',
      '100 GB storage',
      'Priority support',
      'Advanced features',
      'Custom integrations'
    ],
    createdAt: new Date('2025-06-02T00:00:00Z'),
    updatedAt: new Date('2025-06-02T00:00:00Z'),
  },
  {
    id: 'prod_TAEQkr9GyJIJzV', // Actual Stripe product ID
    name: 'Enterprise Plan',
    description: 'For large organizations with advanced needs',
    active: true,
    features: [
      'Unlimited team members',
      'Unlimited storage',
      '24/7 dedicated support',
      'All features',
      'Custom integrations',
      'SLA guarantee',
      'On-premise option'
    ],
    createdAt: new Date('2025-06-02T00:00:00Z'),
    updatedAt: new Date('2025-06-02T00:00:00Z'),
  },
];

/**
 * Actual Stripe Prices from your production account
 */
const STRIPE_PRICES = [
  // Starter Plan Prices
  {
    id: 'price_1SDtxIGx4IA5m8QeKNqrkCmk', // Actual Stripe price ID
    productId: 'prod_TAEP2qXLP3VfRW',
    active: true,
    currency: 'usd',
    unitAmount: 999, // $9.99 in cents
    type: 'recurring' as const,
    interval: 'month' as const,
    intervalCount: 1,
    trialPeriodDays: 14,
    createdAt: new Date('2025-06-02T00:00:00Z'),
    updatedAt: new Date('2025-06-02T00:00:00Z'),
  },
  {
    id: 'price_1SDtxLGx4IA5m8Qe3Nen4m6G', // Actual Stripe price ID
    productId: 'prod_TAEP2qXLP3VfRW',
    active: true,
    currency: 'usd',
    unitAmount: 9990, // $99.90 in cents
    type: 'recurring' as const,
    interval: 'year' as const,
    intervalCount: 1,
    trialPeriodDays: 14,
    createdAt: new Date('2025-06-02T00:00:00Z'),
    updatedAt: new Date('2025-06-02T00:00:00Z'),
  },

  // Professional Plan Prices
  {
    id: 'price_1SDtxNGx4IA5m8Qe9r7Y4f8o', // Actual Stripe price ID
    productId: 'prod_TAEPSLycGec7IE',
    active: true,
    currency: 'usd',
    unitAmount: 2999, // $29.99 in cents
    type: 'recurring' as const,
    interval: 'month' as const,
    intervalCount: 1,
    trialPeriodDays: 14,
    createdAt: new Date('2025-06-02T00:00:00Z'),
    updatedAt: new Date('2025-06-02T00:00:00Z'),
  },
  {
    id: 'price_1SDtxQGx4IA5m8Qeo5P05AvK', // Actual Stripe price ID
    productId: 'prod_TAEPSLycGec7IE',
    active: true,
    currency: 'usd',
    unitAmount: 29990, // $299.90 in cents
    type: 'recurring' as const,
    interval: 'year' as const,
    intervalCount: 1,
    trialPeriodDays: 14,
    createdAt: new Date('2025-06-02T00:00:00Z'),
    updatedAt: new Date('2025-06-02T00:00:00Z'),
  },

  // Enterprise Plan Prices
  {
    id: 'price_1SDtxoGx4IA5m8QeKH6PgY9e', // Actual Stripe price ID
    productId: 'prod_TAEQkr9GyJIJzV',
    active: true,
    currency: 'usd',
    unitAmount: 9999, // $99.99 in cents
    type: 'recurring' as const,
    interval: 'month' as const,
    intervalCount: 1,
    trialPeriodDays: 30,
    createdAt: new Date('2025-06-02T00:00:00Z'),
    updatedAt: new Date('2025-06-02T00:00:00Z'),
  },
  {
    id: 'price_1SDtxqGx4IA5m8QeXKeUZEPk', // Actual Stripe price ID
    productId: 'prod_TAEQkr9GyJIJzV',
    active: true,
    currency: 'usd',
    unitAmount: 99990, // $999.90 in cents
    type: 'recurring' as const,
    interval: 'year' as const,
    intervalCount: 1,
    trialPeriodDays: 30,
    createdAt: new Date('2025-06-02T00:00:00Z'),
    updatedAt: new Date('2025-06-02T00:00:00Z'),
  },
];

async function seedStripeData() {
  try {
    console.log('🌱 Starting Stripe data seeding with PRODUCTION data...\n');

    // Seed Products
    console.log('📦 Seeding Stripe products...');
    for (const product of STRIPE_PRODUCTS) {
      await db.insert(schema.stripeProduct).values(product).onConflictDoNothing();
      console.log(`  ✓ ${product.name} (${product.id})`);
    }
    console.log(`✅ Seeded ${STRIPE_PRODUCTS.length} products\n`);

    // Seed Prices
    console.log('💰 Seeding Stripe prices...');
    for (const price of STRIPE_PRICES) {
      await db.insert(schema.stripePrice).values(price).onConflictDoNothing();
      const productName = STRIPE_PRODUCTS.find(p => p.id === price.productId)?.name;
      const amount = (price.unitAmount / 100).toFixed(2);
      const interval = price.interval;
      const trial = price.trialPeriodDays;
      console.log(`  ✓ ${productName} - $${amount}/${interval} (${trial} days trial) [${price.id}]`);
    }
    console.log(`✅ Seeded ${STRIPE_PRICES.length} prices\n`);

    console.log('✨ Stripe data seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   • Starter Plan: $9.99/mo or $99.90/yr (14-day trial)');
    console.log('   • Professional Plan: $29.99/mo or $299.90/yr (14-day trial)');
    console.log('   • Enterprise Plan: $99.99/mo or $999.90/yr (30-day trial)');
    console.log('');
    console.log('🔗 View in Stripe Dashboard:');
    console.log('   https://dashboard.stripe.com/test/products');

  } catch (error) {
    console.error('❌ Error seeding Stripe data:', error);
    throw error;
  } finally {
    sqlite.close();
  }
}

// Run the seed function
seedStripeData().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
