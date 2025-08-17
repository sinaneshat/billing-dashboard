import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { jwt, magicLink } from 'better-auth/plugins';

import { db } from '@/db';
import * as authSchema from '@/db/tables/auth';
import { getBaseUrl } from '@/utils/helpers';

/**
 * Better Auth Configuration - Simple User Authentication
 * No organizations, just basic user auth
 */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || `${getBaseUrl()}/api/auth`,
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: authSchema,
  }),

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
    'http://localhost:3000',
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
    jwt(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        const { emailService } = await import('@/lib/email/ses-service');
        await emailService.sendMagicLink(email, url);
      },
    }),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
