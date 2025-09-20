import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin, magicLink } from 'better-auth/plugins';

import { getDb } from '@/db/index';
import * as authSchema from '@/db/tables/auth';
import { getBaseUrl } from '@/utils/helpers';

/**
 * Get database configuration for Better Auth
 * Uses D1 database for production compatibility
 */
function getDatabaseConfig() {
  // Use the same D1 database instance as the rest of the app
  const db = getDb();

  return drizzleAdapter(db, {
    provider: 'sqlite', // D1 is SQLite-compatible
    schema: authSchema,
  });
}

/**
 * Better Auth Configuration - Simple User Authentication
 */
export function getAuth() {
  return betterAuth({
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
  });
}

// Export auth for backward compatibility
export const auth = getAuth();

// Auth types are exported from @/lib/auth/types for consistency
