import * as fs from 'node:fs';
import * as path from 'node:path';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import Database from 'better-sqlite3';
import { drizzle as drizzleBetter } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { cache } from 'react';

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
 * Get D1 database binding using official OpenNext.js pattern
 */
function getD1Binding(): D1Database | null {
  try {
    const { env } = getCloudflareContext();
    return env.DB || null;
  } catch {
    return null;
  }
}

/**
 * Create database instance following official OpenNext.js patterns
 * Uses React cache for optimal performance in server components
 */
export const getDb = cache(() => {
  const { env } = getCloudflareContext();
  return drizzleD1(env.DB, { schema });
});

/**
 * Async version for static routes (ISR/SSG) following OpenNext.js patterns
 */
export const getDbAsync = cache(async () => {
  const { env } = await getCloudflareContext({ async: true });
  return drizzleD1(env.DB, { schema });
});

/**
 * Legacy database instance for backward compatibility
 * Uses automatic environment detection
 */
function createDbInstance(): ReturnType<typeof drizzleD1<typeof schema>> | ReturnType<typeof drizzleBetter<typeof schema>> {
  const isLocal = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_WEBAPP_ENV === 'local';

  // Try to get D1 binding first (production/preview)
  const d1Database = getD1Binding();
  if (d1Database) {
    return drizzleD1(d1Database, {
      schema,
      logger: process.env.NODE_ENV !== 'production',
    });
  }

  // Fall back to local SQLite in development
  if (isLocal) {
    return initLocalDb();
  }

  // In production without D1 binding, throw descriptive error
  throw new Error(
    'No database connection available. In production, D1 binding is required.',
  );
}

/**
 * Default database instance for backward compatibility
 * Note: In production, prefer using getDb() or getDbAsync()
 */
export const db = new Proxy({} as ReturnType<typeof createDbInstance>, {
  get(_, prop) {
    const dbInstance = createDbInstance();
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

// Export schema for Better Auth CLI compatibility
export { schema };
