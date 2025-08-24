/**
 * Auth module re-exports for convenience
 * Provides a unified interface for auth functionality
 */

// Client exports
export { authClient } from './client';

// Server exports (for server-side only)
export { auth } from './server';

// Centralized types - single source of truth
export type {
  Session,
  User,
} from './types';
