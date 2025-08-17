/**
 * Hono RPC Client for Billing Dashboard API
 *
 * This client provides type-safe access to the backend API using Hono's RPC functionality.
 * It serves as the single source of truth for API communication and enables end-to-end
 * type safety between the backend routes and frontend services.
 */

import { hc, parseResponse } from 'hono/client';

import type { AppType } from '@/api';

/**
 * Base API URL - automatically uses the correct URL for development/production
 */
function getBaseUrl() {
  // Server-side: use configured API URL or localhost
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  }
  // Client-side: ensure absolute URL so $url() works
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

// Advanced factory: create a typed client with overrides
export function createApiClient(options?: {
  baseUrl?: string;
  headers?: Record<string, string>;
  init?: RequestInit;
  fetch?: typeof fetch;
}) {
  return hc<AppType>(options?.baseUrl ?? getBaseUrl(), {
    headers: {
      Accept: 'application/json',
      ...(options?.headers ?? {}),
    },
    init: {
      credentials: 'include',
      ...(options?.init ?? {}),
    },
    fetch: options?.fetch,
  });
}

// Typed parse helper re-export
export { parseResponse };
