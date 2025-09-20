import * as fs from 'node:fs';
import * as path from 'node:path';

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin, magicLink } from 'better-auth/plugins';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';

import * as authSchema from '@/db/tables/auth';
import { getBaseUrl } from '@/utils/helpers';

// Database configuration for Better Auth
const LOCAL_DB_DIR = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject';
const LOCAL_DB_PATH = path.join(process.cwd(), LOCAL_DB_DIR);

/**
 * Gets the path to the local SQLite database file for Better Auth
 */
function getLocalDbPath(): string {
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.mkdirSync(LOCAL_DB_PATH, { recursive: true });
  }

  try {
    const files = fs.readdirSync(LOCAL_DB_PATH);
    const dbFile = files.find(file => file.endsWith('.sqlite'));
    if (dbFile) {
      return path.join(LOCAL_DB_PATH, dbFile);
    }
  } catch {
  }

  return path.join(LOCAL_DB_PATH, 'database.sqlite');
}

/**
 * Get database configuration for Better Auth
 * Uses clean database instance to avoid transaction conflicts with our custom handlers
 */
function getDatabaseConfig() {
  const isLocal = process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_WEBAPP_ENV === 'local';

  if (isLocal) {
    // Use Drizzle adapter with better-sqlite3 for local development
    const dbPath = getLocalDbPath();
    const sqlite = new Database(dbPath);

    // Configure SQLite for better performance and transaction handling
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('synchronous = NORMAL');
    sqlite.pragma('foreign_keys = ON');

    const localDb = drizzle(sqlite, { schema: authSchema });

    return drizzleAdapter(localDb, {
      provider: 'sqlite',
      schema: authSchema,
    });
  } else {
    // For production, try to get Cloudflare context synchronously
    // This will work during request handling but not during build
    try {
      const { env } = getCloudflareContext();
      const cleanDb = drizzleD1(env.DB, { schema: authSchema });

      return drizzleAdapter(cleanDb, {
        provider: 'sqlite',
        schema: authSchema,
      });
    } catch (error) {
      // Only fallback to local database if we're in build/development mode
      // In production runtime, re-throw the error to prevent silent failures
      if (process.env.NODE_ENV === 'development' || process.env.NEXT_PHASE === 'phase-production-build') {
        const dbPath = getLocalDbPath();
        const sqlite = new Database(dbPath);
        const localDb = drizzle(sqlite, { schema: authSchema });

        return drizzleAdapter(localDb, {
          provider: 'sqlite',
          schema: authSchema,
        });
      }

      // In production runtime, this should not happen
      console.error('Failed to get Cloudflare context in production:', error);
      throw new Error('Database configuration failed: Cloudflare context not available');
    }
  }
}

/**
 * Better Auth Configuration - Simple User Authentication
 * No organizations, just basic user auth
 */
let authInstance: ReturnType<typeof betterAuth> | null = null;

/**
 * Get or create Better Auth instance with lazy database initialization
 */
export function getAuth() {
  if (authInstance)
    return authInstance;

  const config = {
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || `${getBaseUrl()}/api/auth`,
    database: getDatabaseConfig(),

    socialProviders: {
      google: {
        clientId: process.env.AUTH_GOOGLE_ID || '',
        clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
      },
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      cookieCache: {
        enabled: true,
        maxAge: 60 * 15, // 15 minutes cache
      },
    },

    // Security configuration
    advanced: {
      crossSubDomainCookies: {
        enabled: false,
      },
      useSecureCookies: true,
      database: {
        generateId: () => crypto.randomUUID(),
      },
    },

    // Trusted origins
    trustedOrigins: [
      getBaseUrl(),
      ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
    ],

    user: {
      changeEmail: {
        enabled: false, // Disabled for security
      },
    },

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },

    plugins: [
      nextCookies(),
      admin(), // Enable admin plugin for SSO impersonateUser functionality
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          const { emailService } = await import('@/lib/email/ses-service');
          await emailService.sendMagicLink(email, url);
        },
      }),
    ],
  };

  authInstance = betterAuth(config);
  return authInstance;
}

// Export auth for backward compatibility
export const auth = getAuth();

// Auth types are exported from @/lib/auth/types for consistency
