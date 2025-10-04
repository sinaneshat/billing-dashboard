/**
 * Seed Subscription Tier Quotas
 *
 * Populates the subscription_tier_quotas table with default quota configurations
 * for all subscription tiers (free, starter, pro, enterprise) with both monthly
 * and annual variants.
 *
 * Run with: pnpm tsx scripts/seed-quota-tiers.ts
 */

import { drizzle } from 'drizzle-orm/d1';
import { ulid } from 'ulid';

import * as tables from '../src/db/schema';

// Subscription tier quota configurations
const QUOTA_CONFIGURATIONS = [
  // Free Tier - Monthly (default for all users)
  {
    id: ulid(),
    tier: 'free' as const,
    isAnnual: false,
    threadsPerMonth: 2,
    messagesPerMonth: 20,
    maxAiModels: 5,
    allowCustomRoles: false,
    allowMemories: false,
    allowThreadExport: false,
    metadata: {
      description: 'Free tier with basic features',
      displayOrder: 1,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Free Tier - Annual (same as monthly for free)
  {
    id: ulid(),
    tier: 'free' as const,
    isAnnual: true,
    threadsPerMonth: 2,
    messagesPerMonth: 20,
    maxAiModels: 5,
    allowCustomRoles: false,
    allowMemories: false,
    allowThreadExport: false,
    metadata: {
      description: 'Free tier with basic features',
      displayOrder: 1,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Starter Tier - Monthly
  {
    id: ulid(),
    tier: 'starter' as const,
    isAnnual: false,
    threadsPerMonth: 10,
    messagesPerMonth: 100,
    maxAiModels: 11,
    allowCustomRoles: true,
    allowMemories: true,
    allowThreadExport: true,
    metadata: {
      description: 'Starter tier for individuals',
      displayOrder: 2,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Starter Tier - Annual (15% more usage)
  {
    id: ulid(),
    tier: 'starter' as const,
    isAnnual: true,
    threadsPerMonth: 12,
    messagesPerMonth: 115,
    maxAiModels: 11,
    allowCustomRoles: true,
    allowMemories: true,
    allowThreadExport: true,
    metadata: {
      description: 'Starter tier for individuals (annual)',
      displayOrder: 2,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Pro Tier - Monthly
  {
    id: ulid(),
    tier: 'pro' as const,
    isAnnual: false,
    threadsPerMonth: 50,
    messagesPerMonth: 500,
    maxAiModels: 11,
    allowCustomRoles: true,
    allowMemories: true,
    allowThreadExport: true,
    metadata: {
      description: 'Pro tier for professionals and teams',
      displayOrder: 3,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Pro Tier - Annual (15% more usage)
  {
    id: ulid(),
    tier: 'pro' as const,
    isAnnual: true,
    threadsPerMonth: 60,
    messagesPerMonth: 575,
    maxAiModels: 11,
    allowCustomRoles: true,
    allowMemories: true,
    allowThreadExport: true,
    metadata: {
      description: 'Pro tier for professionals and teams (annual)',
      displayOrder: 3,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Enterprise Tier - Monthly (Unlimited)
  {
    id: ulid(),
    tier: 'enterprise' as const,
    isAnnual: false,
    threadsPerMonth: 999999,
    messagesPerMonth: 999999,
    maxAiModels: 11,
    allowCustomRoles: true,
    allowMemories: true,
    allowThreadExport: true,
    metadata: {
      description: 'Enterprise tier with unlimited usage',
      displayOrder: 4,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // Enterprise Tier - Annual (Unlimited)
  {
    id: ulid(),
    tier: 'enterprise' as const,
    isAnnual: true,
    threadsPerMonth: 999999,
    messagesPerMonth: 999999,
    maxAiModels: 11,
    allowCustomRoles: true,
    allowMemories: true,
    allowThreadExport: true,
    metadata: {
      description: 'Enterprise tier with unlimited usage (annual)',
      displayOrder: 4,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seed() {
  console.log('🌱 Seeding subscription tier quotas...');

  // Get D1 database connection from wrangler
  // In local development, this uses .wrangler/state/v3/d1/miniflare-D1DatabaseObject/*
  const db = drizzle(process.env.DB as any);

  // Insert all quota configurations
  await db.insert(tables.subscriptionTierQuotas).values(QUOTA_CONFIGURATIONS);

  console.log('✅ Seeded subscription tier quotas successfully!');
  console.log(`📊 Inserted ${QUOTA_CONFIGURATIONS.length} quota configurations:`);
  console.log('  - Free (Monthly & Annual): 2 threads, 20 messages');
  console.log('  - Starter (Monthly): 10 threads, 100 messages');
  console.log('  - Starter (Annual): 12 threads, 115 messages');
  console.log('  - Pro (Monthly): 50 threads, 500 messages');
  console.log('  - Pro (Annual): 60 threads, 575 messages');
  console.log('  - Enterprise (Monthly & Annual): Unlimited');
}

seed()
  .then(() => {
    console.log('🎉 Seed completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  });
