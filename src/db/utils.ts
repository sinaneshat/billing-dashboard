import { integer, text } from 'drizzle-orm/sqlite-core';

/**
 * Reusable timestamp columns for consistent timestamp handling across all schemas
 * Uses JavaScript Date objects for SQLite timestamp mode
 */
export const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
};

/**
 * Timestamp columns without automatic update trigger
 * Used for immutable records like logs
 */
export const timestampsNoUpdate = {
  createdAt: integer('created_at', { mode: 'timestamp' })
    .$defaultFn(() => new Date())
    .notNull(),
};

/**
 * Common column definitions
 */
export const commonColumns = {
  id: (name = 'id') => text(name).primaryKey(),
  deletedAt: () => integer('deleted_at', { mode: 'timestamp' }),
  metadata: () => text('metadata', { mode: 'json' }),
};

/**
 * Runtime default value generators
 *
 * Workaround for Drizzle $defaultFn not working with Cloudflare D1.
 * Use these in application code for consistent default generation.
 */
export const generateDefaults = {
  id: () => crypto.randomUUID(),
  timestamp: () => new Date(),
  recordDefaults: () => {
    const now = new Date();
    return {
      id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
  },
  updateDefaults: () => ({
    updatedAt: new Date(),
  }),
};
