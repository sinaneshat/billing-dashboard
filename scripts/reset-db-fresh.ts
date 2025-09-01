#!/usr/bin/env tsx
/**
 * Complete Database Reset and Fresh Seeding
 * Wipes everything clean and seeds with test products only
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from '../src/db/schema';
import { checkDatabaseStatus, seedFreshProducts } from '../src/db/seed-fresh';

// Local database path (same as drizzle.config.ts)
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

async function resetDatabase() {
  console.log('🔄 Starting complete database reset...');
  console.log('');

  try {
    const dbPath = getLocalDbPath();
    console.log(`📍 Database location: ${dbPath}`);

    // Initialize database connection
    const sqlite = new Database(dbPath);
    const db = drizzle(sqlite, { schema });

    console.log('');
    console.log('🧹 STEP 1: Checking current database state...');
    await checkDatabaseStatus(db);

    console.log('');
    console.log('💥 STEP 2: Dropping all user data and content...');

    // Drop user-generated data tables (keep schema)
    const tablesToClear = [
      'billing_event',
      'webhook_event',
      'payment',
      'subscription',
      'payment_method',
      'product', // We'll reseed this
      'verification',
      'account',
      'session',
      'user', // Clear all users for fresh start
    ];

    for (const table of tablesToClear) {
      try {
        await sqlite.exec(`DELETE FROM ${table};`);
        console.log(`✅ Cleared table: ${table}`);
      } catch {
        console.log(`⏭️  Skipped table: ${table} (may not exist)`);
      }
    }

    // Reset auto-increment sequences if they exist
    try {
      await sqlite.exec(`DELETE FROM sqlite_sequence;`);
      console.log('✅ Reset all sequences');
    } catch {
      console.log('⏭️  No sequences to reset');
    }

    console.log('');
    console.log('🌱 STEP 3: Seeding fresh products...');
    await seedFreshProducts(db);

    console.log('');
    console.log('✅ STEP 4: Verifying database state...');
    const productCount = await checkDatabaseStatus(db);

    sqlite.close();

    console.log('');
    console.log('🎉 DATABASE RESET COMPLETED SUCCESSFULLY!');
    console.log('');
    console.log('📊 Final State:');
    console.log(`   • ${productCount} products ready for testing`);
    console.log('   • 0 users (ready for fresh signups)');
    console.log('   • 0 subscriptions');
    console.log('   • 0 payments');
    console.log('');
    console.log('🚀 Next Steps:');
    console.log('   1. Start your development server: npm run dev');
    console.log('   2. Sign up with a new account');
    console.log('   3. Test subscription flows with the available products');
    console.log('');
    console.log('💡 All products are priced in Iranian Rials for easy testing!');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
}

// Run the reset
resetDatabase();
