// Simple auth types
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AuthSession = {
  user: AuthUser;
  expiresAt: Date;
};

export type AuthEnv = {
  DB?: D1Database;
  KV?: KVNamespace;
  [key: string]: unknown;
};

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
