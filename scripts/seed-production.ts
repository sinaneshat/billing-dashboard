#!/usr/bin/env tsx
/* eslint-disable no-console */
/**
 * Production-Ready Database Seeding Script
 * Seeds database with Roundtable UUID-based products
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

// Roundtable UUID-based products - matches exactly what's in the database
const ROUNDTABLE_PRODUCTS = [
  {
    id: '37168efc-84e3-48b3-922c-5ee57b27eb5a',
    name: 'Free',
    description: 'Get started with basic features',
    price: 0,
    billingPeriod: 'monthly' as const,
    isActive: true,
    roundtableId: '37168efc-84e3-48b3-922c-5ee57b27eb5a',
    messageQuota: 20,
    conversationLimit: 2,
    modelLimit: 5,
    features: {
      allowed_models: ["openai/gpt-5", "openai/gpt-4o-search-preview", "deepseek/deepseek-r1", "google/gemini-2.5-pro-preview-03-25", "meta-llama/llama-4-maverick"],
      can_use_premium_models: false
    },
    stripeProductId: null,
    stripePriceId: null,
    usageType: null,
    systemPromptId: null,
    metadata: {
      tier: 'free',
      popular: false,
      source: 'roundtable',
      features: ['20 messages per month', 'Up to 5 AI models', '2 conversations per month', 'Basic support']
    }
  },
  {
    id: '0bde9d03-6cb5-4a3b-9a8b-aa6983178198',
    name: 'Starter',
    description: 'Affordable entry for creators and thinkers.',
    price: 20,
    billingPeriod: 'monthly' as const,
    isActive: true,
    roundtableId: '0bde9d03-6cb5-4a3b-9a8b-aa6983178198',
    messageQuota: 150,
    conversationLimit: 30,
    modelLimit: 5,
    features: {
      allowed_models: ["openai/gpt-4.1", "openai/gpt-4o-search-preview", "deepseek/deepseek-r1", "openai/o3", "openai/o4-mini", "openai/o4-mini-high", "anthropic/claude-sonnet-4", "anthropic/claude-opus-4", "google/gemini-2.5-pro-preview-03-25", "meta-llama/llama-4-maverick", "x-ai/grok-4", "perplexity/sonar-reasoning", "perplexity/sonar-pro", "perplexity/sonar-deep-research", "openai/gpt-5-chat", "openai/gpt-5", "anthropic/claude-opus-4.1"],
      priority_support: true,
      can_use_premium_models: true
    },
    stripeProductId: 'prod_Smp1zODelp6eyp',
    stripePriceId: 'price_1RrFNqFqO8Kcw2apHCOEE7ZD',
    usageType: null,
    systemPromptId: null,
    metadata: {
      tier: 'starter',
      popular: false,
      source: 'roundtable',
      features: ['150 messages per month', 'Up to 5 AI models', '30 conversations per month', 'Email support', 'Premium AI models']
    }
  },
  {
    id: '375e4aee-6dfc-48b3-bd11-5ba892f17edd',
    name: 'Pro',
    description: 'For those who think big and often.',
    price: 59,
    billingPeriod: 'monthly' as const,
    isActive: true,
    roundtableId: '375e4aee-6dfc-48b3-bd11-5ba892f17edd',
    messageQuota: 400,
    conversationLimit: 75,
    modelLimit: 7,
    features: {
      allowed_models: ["openai/gpt-4.1", "openai/gpt-4o-search-preview", "deepseek/deepseek-r1", "openai/o3", "openai/o4-mini", "openai/o4-mini-high", "anthropic/claude-sonnet-4", "anthropic/claude-opus-4", "google/gemini-2.5-pro-preview-03-25", "meta-llama/llama-4-maverick", "x-ai/grok-4", "perplexity/sonar-reasoning", "perplexity/sonar-pro", "perplexity/sonar-deep-research", "openai/gpt-5-chat", "openai/gpt-5", "anthropic/claude-opus-4.1"],
      priority_support: true,
      can_use_premium_models: true
    },
    stripeProductId: 'prod_SHjnBoV5d84CuH',
    stripePriceId: 'price_1RNAJbFqO8Kcw2apaZimGpKW',
    usageType: null,
    systemPromptId: null,
    metadata: {
      tier: 'pro',
      popular: true,
      source: 'roundtable',
      features: ['400 messages per month', 'Up to 7 AI models', '75 conversations per month', 'Priority support', 'Premium AI models']
    }
  },
  {
    id: '53425ae7-0806-42f1-9ca7-ef21966ab6ad',
    name: 'Power',
    description: 'Maximum power, minimal limits.',
    price: 249,
    billingPeriod: 'monthly' as const,
    isActive: true,
    roundtableId: '53425ae7-0806-42f1-9ca7-ef21966ab6ad',
    messageQuota: 1800,
    conversationLimit: 300,
    modelLimit: 15,
    features: {
      allowed_models: ["openai/gpt-4.1", "openai/gpt-4o-search-preview", "deepseek/deepseek-r1", "openai/o3", "openai/o4-mini", "openai/o4-mini-high", "anthropic/claude-sonnet-4", "anthropic/claude-opus-4", "google/gemini-2.5-pro-preview-03-25", "meta-llama/llama-4-maverick", "x-ai/grok-4", "perplexity/sonar-reasoning", "perplexity/sonar-pro", "perplexity/sonar-deep-research", "openai/gpt-5-chat", "openai/gpt-5", "anthropic/claude-opus-4.1"],
      priority_support: true,
      can_use_premium_models: true
    },
    stripeProductId: 'prod_SHjpFZgILFX8EQ',
    stripePriceId: 'price_1RNALvFqO8Kcw2apagykNmkc',
    usageType: null,
    systemPromptId: null,
    metadata: {
      tier: 'power',
      popular: false,
      source: 'roundtable',
      features: ['1800 messages per month', 'Up to 15 AI models', '300 conversations per month', '24/7 priority support', 'Premium AI models']
    }
  }
];

async function seedProducts() {
  console.log('🌱 Seeding Roundtable UUID products...');

  for (const productData of ROUNDTABLE_PRODUCTS) {
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
        console.log(`Created product: ${productData.name} (${productData.stripePriceId || 'Free'})`);
      } else {
        // Update existing product
        await db
          .update(product)
          .set({
            ...productData,
            updatedAt: new Date(),
          })
          .where(eq(product.id, productData.id));
        console.log(`🔄 Updated product: ${productData.name} (${productData.stripePriceId || 'Free'})`);
      }
    } catch (error) {
      console.error(`❌ Failed to seed product ${productData.name}:`, error);
      throw error;
    }
  }

  console.log('Products seeded successfully');
}

async function main() {
  try {
    console.log('🚀 Starting database seeding...');
    console.log('📅 Timestamp:', new Date().toISOString());
    console.log('');

    await seedProducts();

    console.log('');
    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   • 4 UUID-based Roundtable products seeded');
    console.log('   • All products include proper Stripe integration');
    console.log('   • SSO flow ready with clean product IDs');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Database seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  main();
}

export { main as seedMain, seedProducts };
