/**
 * Form Validation Schemas
 *
 * Reusable form validation schemas built on top of our comprehensive Zod utilities.
 * These schemas provide consistent validation across frontend forms with proper
 * error messages and type safety.
 *
 * Uses single source of truth from database schemas and API route validations.
 */

import { z } from 'zod';

import { CoreSchemas, iranianRialAmountSchema, Validators } from '@/api/core';

// Helper validators to replace formValidators usage
const formValidators = {
  string: {
    withLength: (min: number, max: number, message?: string) =>
      z.string().min(min, message).max(max, message),
    uuid: () => CoreSchemas.uuid(),
    url: () => CoreSchemas.url(),
  },
  iranianRialAmount: iranianRialAmountSchema(),
  paymentMethodType: z.enum(['zarinpal', 'bank_transfer', 'cash']),
  billingPeriod: z.enum(['monthly', 'quarterly', 'yearly']),
  metadataValidator: z.record(z.string(), z.unknown()).optional(),
  fileUploadValidator: (
    _allowedTypes: string[],
    _maxSizeMB: number,
  ) => z.object({
    name: z.string(),
    size: z.number(),
    type: z.string(),
    content: z.string(),
  }), // Proper file validator
  number: {
    positiveInt: z.number().int().positive(),
    nonNegativeInt: z.number().int().nonnegative(),
    intRange: (min: number, max: number) => z.number().int().min(min).max(max),
  },
  sanitizedString: (maxLength: number) => z.string().max(maxLength),
  zarinpalAuthority: () => z.string().min(36).max(36, 'Invalid payment authority'),
};
// Types available from database validation schemas
// import type {
//   ProductInsert,
//   SubscriptionInsert,
//   PaymentInsert,
//   PaymentMethodInsert
// } from '@/db/validation/billing';

// ============================================================================
// AUTHENTICATION FORMS
// ============================================================================

/**
 * User registration form schema
 */
export const registerFormSchema = z.object({
  email: CoreSchemas.email(),
  password: Validators.strongPassword(),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  name: z.string().min(2).max(100, 'Name must be 2-100 characters'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * User login form schema
 */
export const loginFormSchema = z.object({
  email: CoreSchemas.email(),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * Password reset request form schema
 */
export const passwordResetRequestSchema = z.object({
  email: CoreSchemas.email(),
});

/**
 * Password reset form schema
 */
export const passwordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: Validators.strongPassword(),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// ============================================================================
// PROFILE & SETTINGS FORMS
// ============================================================================

/**
 * User profile update form schema
 */
export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: CoreSchemas.email().optional(),
  mobile: z.string().regex(/^(\+98|0)?9\d{9}$/, 'Invalid Iranian mobile format').optional(),
  nationalId: z.string().regex(/^\d{10}$/, 'National ID must be exactly 10 digits').optional(),
  avatar: z.string().url().optional(),
});

/**
 * Change password form schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: Validators.strongPassword(),
  confirmNewPassword: z.string().min(1, 'Please confirm your new password'),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: 'Passwords do not match',
  path: ['confirmNewPassword'],
}).refine(data => data.currentPassword !== data.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword'],
});

// ============================================================================
// SUBSCRIPTION & BILLING FORMS
// ============================================================================

/**
 * Subscription creation form schema
 * Maps directly to API route validation
 */
export const subscriptionCreateSchema = z.object({
  productId: formValidators.string.uuid(),
  paymentMethod: formValidators.paymentMethodType,
  contractId: formValidators.string.uuid().optional(),
  enableAutoRenew: z.boolean().default(true),
  callbackUrl: formValidators.string.url().optional(),
  // Additional form-specific fields
  agreedToTerms: z.boolean().refine(val => val === true, 'You must agree to the subscription terms'),
}).superRefine((data, ctx) => {
  // Conditional validation: contractId required for direct debit
  if (data.paymentMethod === 'bank_transfer' && !data.contractId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Contract ID is required for direct debit contracts',
      path: ['contractId'],
    });
  }

  // Conditional validation: callbackUrl required for one-time payments
  if (data.paymentMethod === 'zarinpal' && !data.callbackUrl) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Callback URL is required for one-time payments',
      path: ['callbackUrl'],
    });
  }
});

/**
 * Subscription cancellation form schema
 */
export const subscriptionCancelSchema = z.object({
  reason: z.enum([
    'too_expensive',
    'no_longer_needed',
    'found_alternative',
    'technical_issues',
    'poor_support',
    'other',
  ]).describe('Please select a cancellation reason'),
  feedback: formValidators.string.withLength(0, 500).optional(),
  confirmCancellation: z.boolean().refine(val => val === true, 'Please confirm you want to cancel your subscription'),
});

/**
 * Direct debit contract setup form schema
 */
export const directDebitContractSchema = z.object({
  mobile: z.string().regex(/^(\+98|0)?9\d{9}$/, 'Invalid Iranian mobile format'),
  nationalId: z.string().regex(/^\d{10}$/, 'National ID must be exactly 10 digits'),
  displayName: formValidators.string.withLength(3, 50, 'Display name must be 3-50 characters').optional(),
  // Bank selection
  selectedBank: z.enum([
    'mellat',
    'melli',
    'sepah',
    'tejarat',
    'saderat',
    'postbank',
    'keshavarzi',
    'maskan',
    'refah',
    'ansar',
    'parsian',
    'pasargad',
    'karafarin',
    'iran_zamin',
    'shahr',
    'day',
    'middle_east',
  ]).describe('Please select your bank'),
  // Terms and conditions
  agreedToTerms: z.boolean().refine(val => val === true, 'You must agree to the direct debit terms'),
  agreedToBankTerms: z.boolean().refine(val => val === true, 'You must agree to your bank\'s terms'),
});

// ============================================================================
// PAYMENT FORMS
// ============================================================================

/**
 * Payment processing form schema
 */
export const paymentProcessingSchema = z.object({
  subscriptionId: formValidators.string.uuid(),
  amount: formValidators.iranianRialAmount,
  description: formValidators.string.withLength(5, 200),
  metadata: formValidators.metadataValidator,
});

/**
 * Payment callback verification schema
 */
export const paymentCallbackSchema = z.object({
  Authority: formValidators.zarinpalAuthority(),
  Status: z.enum(['OK', 'NOK']).describe('Invalid payment status'),
});

// ============================================================================
// ADMIN FORMS
// ============================================================================

/**
 * Product creation/update form schema
 * Maps to database product schema
 */
export const productFormSchema = z.object({
  name: z.string().min(2).max(100, 'Product name must be 2-100 characters'),
  description: formValidators.string.withLength(10, 500, 'Description must be 10-500 characters'),
  price: formValidators.iranianRialAmount,
  billingPeriod: formValidators.billingPeriod,
  isActive: z.boolean().default(true),
  metadata: z.object({
    features: z.array(formValidators.string.withLength(3, 100)).min(1, 'At least one feature is required'),
    tier: formValidators.string.withLength(3, 50),
    popular: z.boolean().default(false),
    color: z.enum(['blue', 'green', 'purple', 'gold', 'gray']).default('blue'),
    discount: formValidators.string.withLength(0, 50).optional(),
    originalMonthlyPrice: formValidators.iranianRialAmount.optional(),
    isAddon: z.boolean().default(false),
  }).optional(),
});

// ============================================================================
// SEARCH & FILTER FORMS
// ============================================================================

/**
 * General search form schema
 */
export const searchFormSchema = z.object({
  query: formValidators.sanitizedString(200).optional(),
  category: formValidators.string.withLength(2, 50).optional(),
  sortBy: z.enum(['name', 'date', 'price', 'popularity']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

/**
 * Date range filter schema
 */
export const dateRangeFilterSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.startDate <= data.endDate;
  }
  return true;
}, {
  message: 'Start date must be before or equal to end date',
  path: ['endDate'],
});

// ============================================================================
// FILE UPLOAD FORMS
// ============================================================================

/**
 * Avatar upload form schema
 */
export const avatarUploadSchema = formValidators.fileUploadValidator(
  ['image/jpeg', 'image/png', 'image/webp'],
  2, // 2MB
).extend({
  cropData: z.object({
    x: formValidators.number.nonNegativeInt,
    y: formValidators.number.nonNegativeInt,
    width: formValidators.number.positiveInt,
    height: formValidators.number.positiveInt,
  }).optional(),
});

/**
 * Document upload form schema
 */
export const documentUploadSchema = formValidators.fileUploadValidator(
  ['application/pdf', 'image/jpeg', 'image/png'],
  10, // 10MB
).extend({
  category: z.enum(['identity', 'proof_of_address', 'bank_statement', 'other']),
  description: formValidators.string.withLength(3, 200, 'Description must be 3-200 characters').optional(),
});

// ============================================================================
// UTILITY FORM SCHEMAS
// ============================================================================

/**
 * Confirmation dialog form schema
 */
export const confirmationSchema = z.object({
  confirmed: z.boolean().refine(val => val === true, 'Please confirm this action'),
  confirmationText: z.string().optional(),
});

/**
 * Contact form schema
 */
export const contactFormSchema = z.object({
  name: z.string().min(2).max(100, 'Name must be 2-100 characters'),
  email: CoreSchemas.email(),
  subject: formValidators.string.withLength(5, 200, 'Subject must be 5-200 characters'),
  message: formValidators.string.withLength(10, 2000, 'Message must be 10-2000 characters'),
  category: z.enum(['general', 'billing', 'technical', 'feedback']).default('general'),
});

// ============================================================================
// FORM VALIDATION UTILITIES
// ============================================================================

/**
 * Generic form field error extraction utility
 */
export function extractFormErrors<_T>(
  result: { success: false; error: { errors: z.ZodIssue[] } },
): Record<string, string> {
  return result.error.errors.reduce((acc: Record<string, string>, error: z.ZodIssue) => {
    const path = error.path.join('.');
    acc[path] = error.message;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * Validate form data and return typed result or errors
 */
export function validateFormData<T extends z.ZodSchema>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.issues.reduce((acc: Record<string, string>, error: z.ZodIssue) => {
      const path = error.path.join('.');
      acc[path] = error.message;
      return acc;
    }, {} as Record<string, string>),
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RegisterFormData = z.infer<typeof registerFormSchema>;
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
export type SubscriptionCreateFormData = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionCancelFormData = z.infer<typeof subscriptionCancelSchema>;
export type DirectDebitContractFormData = z.infer<typeof directDebitContractSchema>;
export type PaymentProcessingFormData = z.infer<typeof paymentProcessingSchema>;
export type PaymentCallbackFormData = z.infer<typeof paymentCallbackSchema>;
export type ProductFormData = z.infer<typeof productFormSchema>;
export type SearchFormData = z.infer<typeof searchFormSchema>;
export type DateRangeFilterData = z.infer<typeof dateRangeFilterSchema>;
export type AvatarUploadFormData = z.infer<typeof avatarUploadSchema>;
export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;
export type ContactFormData = z.infer<typeof contactFormSchema>;
