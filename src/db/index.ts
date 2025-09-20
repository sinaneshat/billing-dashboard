import { getCloudflareContext } from '@opennextjs/cloudflare';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';
import { cache } from 'react';

import * as schema from './schema';

/**
 * Create database instance following official OpenNext.js patterns
 * Uses React cache for optimal performance in server components
 */
export const getDb = cache(() => {
  try {
    const { env } = getCloudflareContext();
    return drizzleD1(env.DB, { schema });
  } catch {
    // Fallback for build time or when context is not available
    throw new Error('Database context not available. This function should only be called at runtime in Cloudflare Workers.');
  }
});

/**
 * Async version for static routes (ISR/SSG) following OpenNext.js patterns
 */
export const getDbAsync = cache(async () => {
  const { env } = await getCloudflareContext({ async: true });
  return drizzleD1(env.DB, { schema });
});

/**
 * Default database instance for backward compatibility
 * Always uses D1 database for consistency across environments
 */
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_, prop) {
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
export type DbType = ReturnType<typeof getDb>;

// Export schema for Better Auth CLI compatibility
export { schema };
