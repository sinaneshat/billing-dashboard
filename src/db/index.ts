import * as fs from 'node:fs';
import * as path from 'node:path';

import Database from 'better-sqlite3';
import { drizzle as drizzleBetter } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';

import * as schema from './schema';

// Database configuration
const LOCAL_DB_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const LOCAL_DB_PATH = path.join(process.cwd(), LOCAL_DB_DIR);

/**
 * Gets the path to the local SQLite database file
 * Creates the directory if it doesn't exist and returns the path to the database file
 */
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

/**
 * Initialize local SQLite database connection for development with performance optimizations
 */
function initLocalDb() {
  const dbPath = getLocalDbPath();

  if (!fs.existsSync(dbPath)) {
    throw new Error(
      `Local database not found at ${dbPath}. Run 'pnpm db:migrate:local' to create it.`,
    );
  }

  const sqlite = new Database(dbPath);

  // Performance optimizations for SQLite
  sqlite.pragma('journal_mode = WAL'); // Write-Ahead Logging for better concurrency
  sqlite.pragma('synchronous = NORMAL'); // Balance between safety and performance
  sqlite.pragma('cache_size = -2000'); // 2MB cache size (negative = pages)
  sqlite.pragma('foreign_keys = ON'); // Enable foreign key constraints
  sqlite.pragma('temp_store = MEMORY'); // Store temporary tables in memory
  sqlite.pragma('mmap_size = 268435456'); // 256MB memory-mapped I/O

  const db = drizzleBetter(sqlite, {
    schema,
    logger: process.env.NODE_ENV === 'development',
  });

  return db;
}

/**
 * Initialize D1 database connection for production/preview
 */
function initD1Db() {
  if (!process.env.DB) {
    throw new Error(
      'D1 database binding not found. Ensure DB is configured in wrangler.jsonc',
    );
  }

  return drizzleD1(process.env.DB as unknown as D1Database, {
    schema,
    logger: process.env.NODE_ENV !== 'production',
  });
}

/**
 * Database instance with performance optimizations
 * - In test: Uses in-memory SQLite from test setup
 * - In development: Uses local SQLite file via better-sqlite3
 * - In production/preview: Uses Cloudflare D1
 */
let _testDatabase: ReturnType<typeof initLocalDb> | null = null;

export function getDatabase() {
  const isTest = process.env.NODE_ENV === 'test' || process.env.NEXT_PUBLIC_WEBAPP_ENV === 'test';
  const isLocal = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_WEBAPP_ENV === 'local';

  // In test environment, use the test database if available
  if (isTest && _testDatabase) {
    return _testDatabase;
  }

  // If we have a D1 binding, use it (even in development with wrangler)
  if (process.env.DB) {
    return initD1Db();
  }

  // Otherwise, use local SQLite in development
  if (isLocal) {
    return initLocalDb();
  }

  // In production without D1 binding, throw error
  throw new Error(
    'No database connection available. In production, D1 binding is required.',
  );
}

export function setTestDatabase(database: ReturnType<typeof initLocalDb>) {
  _testDatabase = database;
}

// Lazy database connection - only initialize when accessed
let _db: ReturnType<typeof getDatabase> | null = null;
export const db = new Proxy({} as ReturnType<typeof getDatabase>, {
  get(target, prop) {
    if (!_db) {
      _db = getDatabase();
    }
    return (_db as ReturnType<typeof getDatabase>)[prop as keyof ReturnType<typeof getDatabase>];
  },
});

// Database type for prepared queries
export type DbType = typeof db;
