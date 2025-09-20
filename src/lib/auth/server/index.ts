import type { D1Database } from '@cloudflare/workers-types';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin, magicLink } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/d1';

import * as authSchema from '@/db/tables/auth';
import { getBaseUrl } from '@/utils/helpers';

/**
 * Create Better Auth configuration for Cloudflare Workers
 * Handles both CLI schema generation and runtime scenarios
 */
function createAuth(env?: { DB: D1Database }) {
  return betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL || `${getBaseUrl()}/api/auth`,

    // Use database adapter for both CLI and runtime
    database: drizzleAdapter(drizzle(env?.DB as D1Database, { schema: authSchema }), {
      provider: 'sqlite',
      schema: authSchema,
    }),
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
export function getAuth() {
  try {
    const { env } = getCloudflareContext();
    return createAuth(env);
  } catch {
    // Fallback for CLI or build-time usage
    return createAuth();
  }
}

// Export for CLI schema generation (without actual database)
export const auth = createAuth();

// Export createAuth for runtime usage
export { createAuth };
