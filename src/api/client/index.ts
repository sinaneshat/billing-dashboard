/**
 * Hono RPC Client for Shakewell Wallet API
 *
 * This client provides type-safe access to the backend API using Hono's RPC functionality.
 * It serves as the single source of truth for API communication and enables end-to-end
 * type safety between the backend routes and frontend services.
 */

import { hc } from 'hono/client';

import type { AppType } from '@/api';

/**
 * Base API URL - Context7 consistent pattern for SSR/hydration
 * CRITICAL FIX: Ensures consistent base URL between server and client
 */
function getBaseUrl() {
  // Both server and client should use the same base URL for query consistency
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  if (baseUrl) {
    return baseUrl;
  }

  // Fallback logic
  if (typeof window === 'undefined') {
    // Server-side: use localhost for development
    return 'http://localhost:3000/api/v1';
  }

  // Client-side: use same origin
  return `${window.location.origin}/api/v1`;
}

/**
 * Type-safe Hono RPC client
 *
 * This client automatically infers types from the backend AppType,
 * providing full type safety for requests and responses.
 */
export const apiClient = hc<AppType>(getBaseUrl(), {
  headers: {
    Accept: 'application/json',
  },
  init: {
    credentials: 'include',
  },
});

/**
 * Type helper to extract request types from API client
 */
export type ApiClient = typeof apiClient;

/**
 * Export AppType for use in services layer
 */
export type { AppType };
