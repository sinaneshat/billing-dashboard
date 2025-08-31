#!/usr/bin/env tsx

/**
 * Database Seeding Script
 * Seeds the database with comprehensive test data for billing dashboard
 */

import { db } from '../src/db';
import { seedDatabase } from '../src/db/seed';

async function main() {
  try {
    console.log('🚀 Starting database seeding...');
    await seedDatabase(db);
    console.log('🎉 Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
