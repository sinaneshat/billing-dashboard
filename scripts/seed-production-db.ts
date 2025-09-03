#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Production Database Setup with Inline Seeding
 * Creates production-ready products directly without external seed files
 * - Stores USD prices in database
 * - API converts USD to Rials for ZarinPal
 * - All text in English only
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { product } from '../src/db/tables/billing';

// Local database path
const LOCAL_DB_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const LOCAL_DB_PATH = path.join(process.cwd(), LOCAL_DB_DIR);

// Production-ready products with USD pricing
const PRODUCTION_PRODUCTS = [
  {
    id: 'prod_free',
    name: 'Free Plan',
    description: 'Get started with our basic features',
    price: 0, // $0 USD - Free tier
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: [
        '20 messages per month',
        'Up to 5 AI models',
        '2 conversations per month',
        'Basic support',
      ],
      tier: 'free',
      popular: false,
      messagesPerMonth: 20,
      aiModelsLimit: 5,
      conversationsPerMonth: 2,
    },
  },
  {
    id: 'prod_starter',
    name: 'Starter Plan',
    description: 'Perfect for individuals getting started',
    price: 20, // $20 USD per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: [
        '150 messages per month',
        'Up to 5 AI models',
        '30 conversations per month',
        'Email support',
      ],
      tier: 'starter',
      popular: false,
      messagesPerMonth: 150,
      aiModelsLimit: 5,
      conversationsPerMonth: 30,
    },
  },
  {
    id: 'prod_pro',
    name: 'Pro Plan',
    description: 'Most popular choice for power users',
    price: 59, // $59 USD per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: [
        '400 messages per month',
        'Up to 7 AI models',
        '75 conversations per month',
        'Priority email support',
      ],
      tier: 'pro',
      popular: true, // Most popular plan
      messagesPerMonth: 400,
      aiModelsLimit: 7,
      conversationsPerMonth: 75,
    },
  },
  {
    id: 'prod_power',
    name: 'Power Plan',
    description: 'Maximum features for heavy usage',
    price: 249, // $249 USD per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: [
        '1,800 messages per month',
        'Up to 15 AI models',
        '300 conversations per month',
        '24/7 priority support',
      ],
      tier: 'power',
      popular: false,
      messagesPerMonth: 1800,
      aiModelsLimit: 15,
      conversationsPerMonth: 300,
    },
  },
] as const;

function getLocalDbPath(): string {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.mkdirSync(LOCAL_DB_PATH, { recursive: true });
  }

  try {
    const files = fs.readdirSync(LOCAL_DB_PATH);
    const dbFile = files.find(file => file.endsWith('.sqlite'));
    if (dbFile) {
      return path.join(LOCAL_DB_PATH, dbFile);
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return path.join(LOCAL_DB_PATH, 'database.sqlite');
}

async function seedProductionDatabase() {
  console.log('🚀 Setting up production database with inline seeding...');
  console.log('');

  try {
    const dbPath = getLocalDbPath();
    console.log(`📍 Database location: ${dbPath}`);

    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite, {
      schema: { product },
    });

    console.log('');
    console.log('🧹 Clearing existing products...');

    // Clear existing products
    sqlite.exec('DELETE FROM product;');
    console.log('✅ Products table cleared');

    console.log('');
    console.log('🌱 Inserting production products (USD pricing)...');

    // Insert production products
    for (const productData of PRODUCTION_PRODUCTS) {
      await db.insert(product).values(productData).execute();

      const priceDisplay = productData.price === 0
        ? 'Free'
        : `$${productData.price} USD`;

      console.log(`✅ Added: ${productData.name} - ${priceDisplay}`);
    }

    console.log('');
    console.log('🔍 Verifying database state...');

    const productCount = await sqlite.prepare('SELECT COUNT(*) as count FROM product WHERE is_active = 1').get() as { count: number };

    sqlite.close();

    console.log('');
    console.log('✅ PRODUCTION DATABASE SETUP COMPLETED!');
    console.log('');
    console.log('📊 Final State:');
    console.log(`   • ${productCount.count} active products ready for production`);
    console.log('   • All prices stored in USD in database');
    console.log('   • API will convert USD to Rials for ZarinPal payments');
    console.log('   • All text in English only');
    console.log('   • No test data or Persian text');
    console.log('');
    console.log('🎯 Products Created:');
    PRODUCTION_PRODUCTS.forEach((p) => {
      const price = p.price === 0 ? 'Free' : `$${p.price} USD`;
      const popular = p.metadata.popular ? ' (Popular)' : '';
      console.log(`   • ${p.name}: ${price}${popular}`);
    });
    console.log('');
    console.log('🚀 Ready for production use!');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run the seeding
if (require.main === module) {
  seedProductionDatabase();
}

export { seedProductionDatabase };
