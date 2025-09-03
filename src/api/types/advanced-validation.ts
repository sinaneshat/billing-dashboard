/**
 * Advanced Validation Patterns using Context7 Zod Best Practices
 * Implements superRefine, complex transformations, and conditional validation
 */

import { z } from 'zod';

// Brand type imports are used in the schemas below
import {
  IranianNationalId as IranianNationalIdSchema,
  IranianRial as IranianRialSchema,
  PaymentId as PaymentIdSchema,
  PaymentMethodId as PaymentMethodIdSchema,
  SubscriptionId as SubscriptionIdSchema,
  UserEmail as UserEmailSchema,
  UserId as UserIdSchema,
  ZarinpalAuthority as ZarinpalAuthoritySchema,
} from './brand-types';

// ============================================================================
// ADVANCED REFINEMENT PATTERNS
// ============================================================================

/**
 * User registration with complex validation using superRefine
 * Implements multiple validation checks with detailed error reporting
 */
export const UserRegistrationSchema = z.object({
  email: UserEmailSchema,
  password: z.string(),
  confirmPassword: z.string(),
  nationalId: IranianNationalIdSchema,
  agreedToTerms: z.boolean(),
  agreedToPrivacy: z.boolean(),
  dateOfBirth: z.string().datetime().transform(str => new Date(str)),
}).superRefine((data, ctx) => {
  // Password strength validation
  if (data.password.length < 8) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_small,
      minimum: 8,
      type: 'string',
      inclusive: true,
      origin: 'string',
      message: 'Password must be at least 8 characters',
      path: ['password'],
    });
  }

  if (!/[A-Z]/.test(data.password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must contain at least one uppercase letter',
      path: ['password'],
    });
  }

  if (!/[a-z]/.test(data.password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must contain at least one lowercase letter',
      path: ['password'],
    });
  }

  if (!/\d/.test(data.password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must contain at least one number',
      path: ['password'],
    });
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(data.password)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Password must contain at least one special character',
      path: ['password'],
    });
  }

  // Password confirmation
  if (data.password !== data.confirmPassword) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords don\'t match',
      path: ['confirmPassword'],
    });
  }

  // Age verification (must be 18+)
  const age = new Date().getFullYear() - data.dateOfBirth.getFullYear();
  if (age < 18) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'User must be at least 18 years old',
      path: ['dateOfBirth'],
    });
  }

  // Terms and privacy agreement
  if (!data.agreedToTerms) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'You must agree to the terms of service',
      path: ['agreedToTerms'],
    });
  }

  if (!data.agreedToPrivacy) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'You must agree to the privacy policy',
      path: ['agreedToPrivacy'],
    });
  }
});

/**
 * Payment processing with complex business logic validation
 */
export const PaymentProcessingSchema = z.object({
  paymentId: PaymentIdSchema,
  userId: UserIdSchema,
  subscriptionId: SubscriptionIdSchema.optional(),
  amount: IranianRialSchema,
  paymentMethodId: PaymentMethodIdSchema,
  zarinpalAuthority: ZarinpalAuthoritySchema.optional(),
  metadata: z.object({
    orderId: z.string().optional(),
    description: z.string().min(1).max(500),
    callbackUrl: z.string().url().optional(),
  }),
}).superRefine((data, ctx) => {
  // ZarinPal authority is required for amounts > 1,000,000 Rials
  if (data.amount > 1_000_000 && !data.zarinpalAuthority) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'ZarinPal authority required for payments over 1,000,000 Rials',
      path: ['zarinpalAuthority'],
    });
  }

  // Subscription payments must have subscription ID
  if (data.metadata.description.includes('subscription') && !data.subscriptionId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Subscription ID required for subscription payments',
      path: ['subscriptionId'],
    });
  }

  // Callback URL required for high-value transactions
  if (data.amount > 5_000_000 && !data.metadata.callbackUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Callback URL required for high-value transactions',
      path: ['metadata', 'callbackUrl'],
    });
  }
});

// ============================================================================
// ADVANCED PREPROCESSING PATTERNS
// ============================================================================

/**
 * Smart data normalization with multi-stage preprocessing
 */
export const DataNormalizationSchema = z.preprocess(
  (data) => {
    // Stage 1: Parse JSON if string
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return null;
      }
    }

    // Stage 2: Normalize field names
    if (data && typeof data === 'object') {
      const normalized = Object.entries(data).reduce((acc, [key, value]) => {
        // Convert snake_case and kebab-case to camelCase
        const camelKey = key.replace(/[-_](.)/g, (_, char) => char.toUpperCase());
        acc[camelKey] = value;
        return acc;
      }, {} as Record<string, unknown>);

      return normalized;
    }

    return data;
  },
  z.object({
    userId: z.string().transform(val => UserIdSchema.parse(val)),
    emailAddress: z.string().transform(val => UserEmailSchema.parse(val)),
    createdAt: z.string().transform(val => new Date(val)),
    lastLoginAt: z.string().nullable().transform(val => val ? new Date(val) : null),
  }),
);

/**
 * File upload preprocessing with content validation
 */
export const FileUploadPreprocessingSchema = z.preprocess(
  async (file) => {
    if (file instanceof File) {
      const buffer = await file.arrayBuffer();
      const content = new TextDecoder().decode(buffer);

      // Extract file metadata
      return {
        name: file.name,
        size: file.size,
        type: file.type,
        content,
        lastModified: new Date(file.lastModified),
        extension: file.name.split('.').pop()?.toLowerCase() || '',
      };
    }
    return file;
  },
  z.object({
    name: z.string().min(1).max(255),
    size: z.number().max(10 * 1024 * 1024), // 10MB max
    type: z.string().refine(type =>
      ['text/plain', 'application/json', 'text/csv', 'image/jpeg', 'image/png'].includes(type),
    ),
    content: z.string(),
    lastModified: z.date(),
    extension: z.string().refine(ext =>
      ['txt', 'json', 'csv', 'jpg', 'jpeg', 'png'].includes(ext),
    ),
  }),
);

// ============================================================================
// CONDITIONAL VALIDATION PATTERNS
// ============================================================================

/**
 * Dynamic schema based on user role
 */
export function createUserSchemaByRole(userRole: 'user' | 'admin' | 'moderator') {
  const baseSchema = z.object({
    id: UserIdSchema,
    email: UserEmailSchema,
    name: z.string().min(1).max(100),
    createdAt: z.date(),
  });

  switch (userRole) {
    case 'admin':
      return baseSchema.extend({
        role: z.literal('admin'),
        permissions: z.array(z.enum([
          'user_management',
          'payment_management',
          'system_settings',
          'audit_logs',
          'subscription_management',
        ])),
        canManageUsers: z.boolean().default(true),
        canViewFinancials: z.boolean().default(true),
        systemAccess: z.boolean().default(true),
      });

    case 'moderator':
      return baseSchema.extend({
        role: z.literal('moderator'),
        permissions: z.array(z.enum([
          'user_support',
          'content_moderation',
          'basic_reports',
        ])),
        canManageUsers: z.boolean().default(false),
        canViewFinancials: z.boolean().default(false),
        departmentId: z.string().uuid(),
      });

    default:
      return baseSchema.extend({
        role: z.literal('user'),
        subscriptionTier: z.enum(['free', 'premium', 'enterprise']).default('free'),
        subscriptionId: SubscriptionIdSchema.optional(),
        preferences: z.object({
          language: z.enum(['fa', 'en']).default('fa'),
          theme: z.enum(['light', 'dark', 'auto']).default('light'),
          notifications: z.boolean().default(true),
        }).default({
          language: 'fa',
          theme: 'light',
          notifications: true,
        }),
      });
  }
}

/**
 * Context-aware validation based on request metadata
 */
export function createContextAwareValidation<T>(schema: z.ZodSchema<T>, context: {
  isProduction: boolean;
  userRole: string;
  ipCountry?: string;
  requestSource: 'web' | 'mobile' | 'api';
}) {
  return schema.superRefine((data, ctx) => {
    // Production-specific validations
    if (context.isProduction) {
      // In production, require stronger validation
      if (typeof data === 'object' && data !== null && 'email' in data) {
        const email = String((data as Record<string, unknown>).email);
        if (!email.includes('@') || email.includes('+')) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Production environment requires verified email addresses',
            path: ['email'],
          });
        }
      }
    }

    // Role-based validation
    if (context.userRole === 'guest') {
      // Guests have stricter limits
      if (typeof data === 'object' && data !== null && 'amount' in data) {
        const amount = Number((data as Record<string, unknown>).amount);
        if (amount > 100_000) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Guest users cannot process amounts over 100,000 Rials',
            path: ['amount'],
          });
        }
      }
    }

    // Geographic restrictions
    if (context.ipCountry && context.ipCountry !== 'IR') {
      if (typeof data === 'object' && data !== null && 'paymentMethod' in data) {
        const method = String((data as Record<string, unknown>).paymentMethod);
        if (method === 'direct-debit') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Direct debit is only available for Iranian users',
            path: ['paymentMethod'],
          });
        }
      }
    }

    // Request source specific validation
    if (context.requestSource === 'mobile') {
      // Mobile requests have different limits
      if (typeof data === 'object' && data !== null && 'fileSize' in data) {
        const fileSize = Number((data as Record<string, unknown>).fileSize);
        if (fileSize > 5 * 1024 * 1024) { // 5MB for mobile
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Mobile uploads are limited to 5MB',
            path: ['fileSize'],
          });
        }
      }
    }
  });
}

// ============================================================================
// TYPE INFERENCE
// ============================================================================

export type UserRegistrationData = z.infer<typeof UserRegistrationSchema>;
export type PaymentProcessingData = z.infer<typeof PaymentProcessingSchema>;
export type NormalizedData = z.infer<typeof DataNormalizationSchema>;
export type FileUploadData = z.infer<typeof FileUploadPreprocessingSchema>;

export type AdminUserSchema = ReturnType<typeof createUserSchemaByRole>;
export type AdminUser = z.infer<ReturnType<typeof createUserSchemaByRole>>;
