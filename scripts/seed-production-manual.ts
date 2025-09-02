#!/usr/bin/env tsx

/**
 * Manual Production Pricing Seeding
 * Directly seeds the database with production pricing data
 */

import { seedProductionPricing } from '../src/db/seed-production-pricing';

// Import the database connection
let db: unknown;

async function initDb() {
  try {
    // Try to import from the main db index
    const dbModule = await import('../src/db/index.js');
    db = dbModule.db;
    console.log('✅ Database connection established');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function runProductionSeeding() {
  console.log('🏭 Manual Production Pricing Seeding');
  console.log('=====================================');
  console.log('');

  // Initialize database connection
  const dbConnected = await initDb();
  if (!dbConnected) {
    console.error('Cannot proceed without database connection');
    process.exit(1);
  }

  try {
    // Run the production seeding
    await seedProductionPricing(db);

    console.log('');
    console.log('🎉 Production pricing seeding completed successfully!');
    console.log('');
    console.log('🚀 Ready to test with real USD to Toman pricing!');
  } catch (error: unknown) {
    console.error('');
    console.error('❌ Production seeding failed!');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runProductionSeeding().catch(console.error);
}

export { runProductionSeeding };
