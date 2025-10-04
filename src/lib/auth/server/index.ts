import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { magicLink } from 'better-auth/plugins';

import { db } from '@/db';
import * as authSchema from '@/db/tables/auth';
import { getBaseUrl } from '@/utils/helpers';

/**
 * Create Better Auth database adapter
 *
 * IMPORTANT: Better Auth is initialized at module load time (not per-request),
 * so we cannot use getCloudflareContext() here. Instead, we use the global `db`
 * Proxy which creates a new database instance on each property access.
 *
 * This pattern follows OpenNext.js best practices by ensuring no connection reuse
 * while working within Better Auth's initialization constraints.
 *
 * @see src/db/index.ts - The Proxy pattern implementation
 */
function createAuthAdapter() {
  const isNextDev = process.env.NODE_ENV === 'development' && !process.env.CLOUDFLARE_ENV;
  const isLocal = process.env.NEXT_PUBLIC_WEBAPP_ENV === 'local';

  // For local development: use the db proxy with transactions enabled
  // For Cloudflare Workers: use the db proxy with transactions disabled (D1 limitation)
  return drizzleAdapter(db, {
    provider: 'sqlite',
    schema: authSchema,
    // Disable transactions for Cloudflare Workers (D1 doesn't support BEGIN/COMMIT)
    // Keep enabled for local SQLite development
    transaction: isNextDev || isLocal,
  });
}

/**
 * Better Auth Configuration - Simple User Authentication
 * No organizations, just basic user auth
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || `${getBaseUrl()}/api/auth`,
  database: createAuthAdapter(),

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

  socialProviders: {
    google: {
      clientId: process.env.AUTH_GOOGLE_ID || '',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || '',
    },
  },

  plugins: [
    nextCookies(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const { emailService } = await import('@/lib/email/ses-service');
        await emailService.sendMagicLink(email, url);
      },
    }),
  ],
});

// Auth types are exported from @/lib/auth/types for consistency
