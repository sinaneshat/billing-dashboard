import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';

import { STRING_LIMITS } from '@/constants';

import {
  accounts,
  sessions,
  users,
  verifications,
} from '../tables/auth';

// User schemas
export const userSelectSchema = createSelectSchema(users);
export const userInsertSchema = createInsertSchema(users, {
  email: schema => schema.email(),
  image: () => z.string().url().optional(),
});
export const userUpdateSchema = createUpdateSchema(users, {
  email: schema => schema.email().optional(),
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
  image: userUpdateSchema.shape.image.or(z.literal('')),
  email: z.string().email('Invalid email address'),
});

export type ProfileUpdateValues = z.infer<typeof profileUpdateSchema>;

// Session schemas
export const sessionSelectSchema = createSelectSchema(sessions);
export const sessionInsertSchema = createInsertSchema(sessions);

// Account schemas
export const accountSelectSchema = createSelectSchema(accounts);
export const accountInsertSchema = createInsertSchema(accounts);

// Verification schemas
export const verificationSelectSchema = createSelectSchema(verifications);
export const verificationInsertSchema = createInsertSchema(verifications);
