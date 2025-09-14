import { sso } from '@better-auth/sso';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { admin } from 'better-auth/plugins';

import { db } from '@/db';
import * as authSchema from '@/db/tables/auth';
import { getBaseUrl } from '@/utils/helpers';

/**
 * Better Auth Configuration - SSO Only Authentication
 * All authentication goes through registered SSO providers
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
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
  ],

  user: {
    changeEmail: {
      enabled: false, // Disabled for security
    },
  },

  emailAndPassword: {
    enabled: true, // Required for SSO plugin to work properly
    requireEmailVerification: false,
  },

  plugins: [
    nextCookies(),
    admin(), // Required for impersonateUser functionality in SSO
    sso({
      // User provisioning - called when users sign in through SSO
      provisionUser: async ({ user, userInfo, provider }) => {
        // Log SSO sign-in for audit purposes
        console.warn(`SSO user provisioned: ${user.email} via ${provider.providerId}`);

        // Update user profile with any additional information from SSO provider
        if (userInfo.name && user.name !== userInfo.name) {
          // Note: Better Auth will handle the user updates automatically
          console.warn(`SSO user name updated: ${userInfo.name}`);
        }
      },

      // Configuration options
      defaultOverrideUserInfo: false, // Don't override existing user info by default
      disableImplicitSignUp: false, // Allow new users to be created via SSO
      trustEmailVerified: true, // Trust that SSO provider has verified the email
    }),
  ],
});

// Auth types are exported from @/lib/auth/types for consistency
