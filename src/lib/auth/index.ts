/**
 * Auth module re-exports for convenience
 * Provides a unified interface for auth functionality
 */

// Client exports
export type { Session, User } from './client';
export { authClient } from './client';

// Server exports (for server-side only)
export { auth } from './server';
