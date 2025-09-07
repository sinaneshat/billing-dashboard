import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

import { REGEX_PATTERNS, STRING_LIMITS } from '@/constants';

import {
  account,
  session,
  user,
  verification,
} from '../tables/auth';

// User schemas
export const userSelectSchema = createSelectSchema(user);
export const userInsertSchema = createInsertSchema(user, {
  email: schema => schema.email(),
  username: schema => schema.min(STRING_LIMITS.USERNAME_MIN).max(STRING_LIMITS.USERNAME_MAX).regex(REGEX_PATTERNS.USERNAME),
  phone: schema => schema.regex(REGEX_PATTERNS.PHONE).optional(),
  image: () => z.string().url().optional(),
});
export const userUpdateSchema = createUpdateSchema(user, {
  email: schema => schema.email().optional(),
  username: schema => schema.min(STRING_LIMITS.USERNAME_MIN).max(STRING_LIMITS.USERNAME_MAX).regex(REGEX_PATTERNS.USERNAME).optional(),
  phone: schema => schema.regex(REGEX_PATTERNS.PHONE).optional(),
  image: () => z.string().url().optional(),
});

// Auth form schemas derived from DB constraints where applicable
export const authEmailSchema = z.object({
  email: z.string().email(),
});

export const authFormSchema = authEmailSchema.extend({
  name: z.string().min(1).max(STRING_LIMITS.NAME_MAX).optional(),
});

export type AuthEmailValues = z.infer<typeof authEmailSchema>;
export type AuthFormValues = z.infer<typeof authFormSchema>;

export const profileUpdateSchema = z.object({
  name: userUpdateSchema.shape.name,
  username: userUpdateSchema.shape.username,
  phone: userUpdateSchema.shape.phone,
  image: userUpdateSchema.shape.image.or(z.literal('')),
  email: z.string().email('Invalid email address'),
});

export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;

// Session schemas
export const sessionSelectSchema = createSelectSchema(session);
export const sessionInsertSchema = createInsertSchema(session);

// Account schemas
export const accountSelectSchema = createSelectSchema(account);
export const accountInsertSchema = createInsertSchema(account);

// Verification schemas
export const verificationSelectSchema = createSelectSchema(verification);
export const verificationInsertSchema = createInsertSchema(verification);
