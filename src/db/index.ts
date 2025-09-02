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

  // Look for existing SQLite file (prioritize wrangler-generated files)
  try {
    const files = fs.readdirSync(LOCAL_DB_PATH);
    const dbFile = files.find(file => file.endsWith('.sqlite'));
    if (dbFile) {
      const fullPath = path.join(LOCAL_DB_PATH, dbFile);
      return fullPath;
    }
  } catch {
  }

  // Return default path
  const defaultPath = path.join(LOCAL_DB_PATH, 'database.sqlite');
  return defaultPath;
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

// Cached database instance
let _db: ReturnType<typeof initLocalDb | typeof initD1Db> | null = null;

/**
 * Get database instance with lazy initialization
 * - In development: Uses local SQLite file via better-sqlite3
 * - In production/preview: Uses Cloudflare D1
 */
function getDb() {
  if (_db) {
    return _db;
  }

  const isLocal = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_WEBAPP_ENV === 'local';

  // If we have a D1 binding, use it (even in development with wrangler)
  if (process.env.DB) {
    _db = initD1Db();
    return _db;
  }

  // Otherwise, use local SQLite in development
  if (isLocal) {
    _db = initLocalDb();
    return _db;
  }

  // In production without D1 binding, throw error
  throw new Error(
    'No database connection available. In production, D1 binding is required.',
  );
}

/**
 * Database instance with lazy initialization and performance optimizations
 * This prevents database connection during build time when bindings are not available
 */
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(target, prop) {
    const dbInstance = getDb();
    const value = dbInstance[prop as keyof typeof dbInstance];

    // Bind methods to the correct context
    if (typeof value === 'function') {
      return value.bind(dbInstance);
    }

    return value;
  },
});

// Database type for prepared queries
export type DbType = typeof db;
