import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { timestamps } from '../utils';

// Simplified user table without organization/billing fields
export const user = sqliteTable('user', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  displayUsername: text('display_username'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).$defaultFn(() => false).notNull(),
  image: text('image'),
  phone: text('phone'),
  isAnonymous: integer('is_anonymous', { mode: 'boolean' }),
  lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: integer('locked_until', { mode: 'timestamp' }),
  ...timestamps,
}, table => [
  index('user_email_idx').on(table.email),
  index('user_username_idx').on(table.username),
]);

// Simplified session table without organization reference
export const session = sqliteTable('session', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  ...timestamps,
}, table => [
  index('session_user_id_idx').on(table.userId),
  index('session_token_idx').on(table.token),
]);

export const account = sqliteTable('account', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  ...timestamps,
}, table => [
  index('account_user_id_idx').on(table.userId),
  index('account_provider_id_account_id_idx').on(table.providerId, table.accountId),
]);

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  ...timestamps,
}, table => [
  index('verification_identifier_idx').on(table.identifier),
]);

export const jwks = sqliteTable('jwks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  publicKey: text('public_key').notNull(),
  privateKey: text('private_key').notNull(),
  ...timestamps,
});

// Simplified Relations
export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));
