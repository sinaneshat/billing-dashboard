import type { D1Database } from '@cloudflare/workers-types';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin, magicLink } from 'better-auth/plugins';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';

import * as authSchema from '@/db/tables/auth';
import { getBaseUrl } from '@/utils/helpers';

/**
 * Create Better Auth configuration for both local and Cloudflare Workers
 * Handles local development and production scenarios
 */
function createAuth(env?: { DB: D1Database }) {
  // Try to get D1 database
  let d1Database: D1Database;

  if (env?.DB) {
    // Use provided D1 database instance
    d1Database = env.DB;
  } else {
    try {
      // Try to get D1 database from Cloudflare context
      const { env: contextEnv } = getCloudflareContext();
      d1Database = contextEnv.DB;
    } catch {
      // For build time or when D1 context is not available, create a safe mock
      d1Database = new Proxy({} as D1Database, {
        get(_, prop) {
          // Allow non-function properties to pass through for build time
          if (typeof prop === 'string' && !['prepare', 'batch', 'dump', 'exec'].includes(prop)) {
            return undefined;
          }
          // Throw only when actually trying to use database methods
          throw new Error('D1 database context not available. For local development, use `wrangler dev` instead of `next dev`.');
        },
      });
    }
  }

  // Create Drizzle adapter with D1
  const database = drizzleAdapter(drizzleD1(d1Database, { schema: authSchema }), {
    provider: 'sqlite',
    schema: authSchema,
  });

  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || `${getBaseUrl()}/api/auth`,
    database,
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
  });
}

/**
 * Get Better Auth instance with Cloudflare context
 * Uses lazy initialization for runtime compatibility
 */
export async function getAuth() {
  try {
    const { env } = await getCloudflareContext({ async: true });
    return createAuth(env);
  } catch {
    // Fallback for CLI or build-time usage - only use local database
    return createAuth();
  }
}

/**
 * Better Auth instance for request-time usage
 * Defers initialization until actually needed during a request
 */
export function getAuthInstance() {
  // Always create fresh instance to ensure D1 context is available
  // This is necessary because D1 context is only available during request handling
  return getAuth();
}

// Export auth instance - now safe for build time
export const auth = createAuth();

// Export createAuth for runtime usage
export { createAuth };
