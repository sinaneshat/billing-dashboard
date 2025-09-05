#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Production-Ready Database Seeding Script
 * This script seeds the database with initial production data
 * Safe to run multiple times (idempotent)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { product } from '../src/db/tables/billing';

// Local database configuration
const LOCAL_DB_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const LOCAL_DB_PATH = path.join(process.cwd(), LOCAL_DB_DIR);

function getLocalDbPath(): string {
  // Create directory if it doesn't exist
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.mkdirSync(LOCAL_DB_PATH, { recursive: true });
  }

  // Look for existing SQLite file
  try {
    const files = fs.readdirSync(LOCAL_DB_PATH);
    const dbFile = files.find(file => file.endsWith('.sqlite'));
    if (dbFile) {
      return path.join(LOCAL_DB_PATH, dbFile);
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  // Return default path
  return path.join(LOCAL_DB_PATH, 'database.sqlite');
}

// Create database connection for seeding
const sqlite = new Database(getLocalDbPath());
const db = drizzle(sqlite);

const PRODUCTS_SEED_DATA = [
  {
    id: 'prod_free',
    name: 'Free Plan',
    description: 'Get started with our basic features',
    price: 0,
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
    price: 20, // USD - will be converted to IRR by API
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
    price: 59, // USD - will be converted to IRR by API
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
      popular: true,
      messagesPerMonth: 400,
      aiModelsLimit: 7,
      conversationsPerMonth: 75,
    },
  },
  {
    id: 'prod_power',
    name: 'Power Plan',
    description: 'Maximum features for heavy usage',
    price: 249, // USD - will be converted to IRR by API
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
];

async function seedProducts() {
  console.log('🌱 Seeding products...');

  for (const productData of PRODUCTS_SEED_DATA) {
    try {
      // Check if product exists
      const existing = await db
        .select()
        .from(product)
        .where(eq(product.id, productData.id))
        .limit(1);

      if (existing.length === 0) {
        // Insert new product
        await db.insert(product).values({
          ...productData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Created product: ${productData.name}`);
      } else {
        // Update existing product (to ensure latest data)
        await db
          .update(product)
          .set({
            ...productData,
            updatedAt: new Date(),
          })
          .where(eq(product.id, productData.id));
        console.log(`🔄 Updated product: ${productData.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to seed product ${productData.name}:`, error);
      throw error;
    }
  }

  console.log('✅ Products seeded successfully');
}

async function main() {
  try {
    console.log('🚀 Starting production database seeding...');
    console.log('📅 Timestamp:', new Date().toISOString());

    await seedProducts();

    console.log('🎉 Production database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  main();
}

export { main as seedProduction, seedProducts };
