import { getCloudflareContext } from '@opennextjs/cloudflare';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { magicLink } from 'better-auth/plugins';
import { drizzle as drizzleD1 } from 'drizzle-orm/d1';

import { db } from '@/db';
import * as authSchema from '@/db/tables/auth';
import { getBaseUrl } from '@/utils/helpers';

/**
 * Create Better Auth database adapter based on environment
 */
function createAuthAdapter() {
  const isNextDev = process.env.NODE_ENV === 'development' && !process.env.CLOUDFLARE_ENV;
  const isLocal = process.env.NEXT_PUBLIC_WEBAPP_ENV === 'local';

  // For Next.js development - use local SQLite which supports transactions
  if (isNextDev || isLocal) {
    return drizzleAdapter(db, {
      provider: 'sqlite',
      schema: authSchema,
    });
  }

  // For Cloudflare Workers (production/preview) - use D1 with batch operations
  try {
    const { env } = getCloudflareContext();
    if (env.DB) {
      const d1Db = drizzleD1(env.DB, { schema: authSchema });

      return drizzleAdapter(d1Db, {
        provider: 'sqlite',
        schema: authSchema,
        // Disable transactions for D1 compatibility (D1 doesn't support BEGIN/COMMIT)
        transaction: false,
      });
    }
  } catch (error) {
    // Fallback when Cloudflare context is not available
    console.warn('[AUTH] Cloudflare context not available, falling back to regular db adapter', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    });
  }

  // Fallback to regular db proxy (keep transactions enabled for local SQLite)
  return drizzleAdapter(db, {
    provider: 'sqlite',
    schema: authSchema,
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
