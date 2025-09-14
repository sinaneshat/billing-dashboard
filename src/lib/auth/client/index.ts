import { ssoClient } from '@better-auth/sso/client';
import { createAuthClient } from 'better-auth/react';

/**
 * Better Auth Client Configuration - SSO Only Authentication
 * All authentication goes through SSO providers
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL
    || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : 'http://localhost:3000'),

  plugins: [
    ssoClient(),
  ],
});

// Export Better Auth hooks and methods directly
export const {
  // Session management
  useSession,
  getSession,

  // SSO Authentication methods
  signIn,
  signOut,

  // SSO specific methods
  sso,

  // User management
  updateUser,
  deleteUser,
} = authClient;

// Types are exported from @/lib/auth/types for consistency
