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

import { zodValidation } from '@/api/common/zod-validation-utils';
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
  email: zodValidation.string.email('Please enter a valid email address'),
  password: zodValidation.string.withLength(8, 128, 'Password must be 8-128 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: zodValidation.string.nonEmpty('Please confirm your password'),
  name: zodValidation.string.withLength(2, 100, 'Name must be 2-100 characters'),
  acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

/**
 * User login form schema
 */
export const loginFormSchema = z.object({
  email: zodValidation.string.email(),
  password: zodValidation.string.nonEmpty('Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

/**
 * Password reset request form schema
 */
export const passwordResetRequestSchema = z.object({
  email: zodValidation.string.email(),
});

/**
 * Password reset form schema
 */
export const passwordResetSchema = z.object({
  token: zodValidation.string.nonEmpty('Reset token is required'),
  password: zodValidation.string.withLength(8, 128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmPassword: zodValidation.string.nonEmpty('Please confirm your password'),
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
  name: zodValidation.string.withLength(2, 100).optional(),
  email: zodValidation.string.email().optional(),
  mobile: zodValidation.iranianMobile().optional(),
  nationalId: zodValidation.iranianNationalId().optional(),
  avatar: z.string().url().optional(),
});

/**
 * Change password form schema
 */
export const changePasswordSchema = z.object({
  currentPassword: zodValidation.string.nonEmpty('Current password is required'),
  newPassword: zodValidation.string.withLength(8, 128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  confirmNewPassword: zodValidation.string.nonEmpty('Please confirm your new password'),
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
  productId: zodValidation.string.uuid('Please select a valid product'),
  paymentMethod: zodValidation.paymentMethodType,
  contractId: zodValidation.string.uuid().optional(),
  enableAutoRenew: z.boolean().default(true),
  callbackUrl: zodValidation.string.url().optional(),
  // Additional form-specific fields
  agreedToTerms: z.boolean().refine(val => val === true, 'You must agree to the subscription terms'),
}).superRefine((data, ctx) => {
  // Conditional validation: contractId required for direct debit
  if (data.paymentMethod === 'direct-debit-contract' && !data.contractId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Contract ID is required for direct debit contracts',
      path: ['contractId'],
    });
  }

  // Conditional validation: callbackUrl required for one-time payments
  if (data.paymentMethod === 'zarinpal-oneoff' && !data.callbackUrl) {
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
  feedback: zodValidation.string.withLength(0, 500).optional(),
  confirmCancellation: z.boolean().refine(val => val === true, 'Please confirm you want to cancel your subscription'),
});

/**
 * Direct debit contract setup form schema
 */
export const directDebitContractSchema = z.object({
  mobile: zodValidation.iranianMobile('Please enter a valid Iranian mobile number'),
  nationalId: zodValidation.iranianNationalId('Please enter a valid Iranian national ID'),
  displayName: zodValidation.string.withLength(3, 50, 'Display name must be 3-50 characters').optional(),
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
  subscriptionId: zodValidation.string.uuid(),
  amount: zodValidation.iranianRialAmount,
  description: zodValidation.string.withLength(5, 200),
  metadata: zodValidation.metadataValidator,
});

/**
 * Payment callback verification schema
 */
export const paymentCallbackSchema = z.object({
  Authority: zodValidation.zarinpalAuthority('Invalid payment authority'),
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
  name: zodValidation.string.withLength(2, 100, 'Product name must be 2-100 characters'),
  description: zodValidation.string.withLength(10, 500, 'Description must be 10-500 characters'),
  price: zodValidation.iranianRialAmount,
  billingPeriod: zodValidation.billingPeriod,
  isActive: z.boolean().default(true),
  metadata: z.object({
    features: z.array(zodValidation.string.withLength(3, 100)).min(1, 'At least one feature is required'),
    tier: zodValidation.string.withLength(3, 50),
    popular: z.boolean().default(false),
    color: z.enum(['blue', 'green', 'purple', 'gold', 'gray']).default('blue'),
    discount: zodValidation.string.withLength(0, 50).optional(),
    originalMonthlyPrice: zodValidation.iranianRialAmount().optional(),
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
  query: zodValidation.sanitizedString(200).optional(),
  category: zodValidation.string.withLength(2, 50).optional(),
  sortBy: z.enum(['name', 'date', 'price', 'popularity']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: zodValidation.number.positiveInt().default(1),
  limit: zodValidation.number.intRange(1, 100).default(20),
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
export const avatarUploadSchema = zodValidation.fileUploadValidator(
  ['image/jpeg', 'image/png', 'image/webp'],
  2 * 1024 * 1024, // 2MB
).extend({
  cropData: z.object({
    x: zodValidation.number.nonNegativeInt,
    y: zodValidation.number.nonNegativeInt,
    width: zodValidation.number.positiveInt,
    height: zodValidation.number.positiveInt,
  }).optional(),
});

/**
 * Document upload form schema
 */
export const documentUploadSchema = zodValidation.fileUploadValidator(
  ['application/pdf', 'image/jpeg', 'image/png'],
  10 * 1024 * 1024, // 10MB
).extend({
  documentType: z.enum(['invoice', 'receipt', 'contract', 'identity']).describe('Please select a document type'),
  description: zodValidation.string.withLength(5, 200).optional(),
});

// ============================================================================
// FORM VALIDATION UTILITIES
// ============================================================================

/**
 * Client-side form validation helper
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    const errors: Record<string, string> = {};
    result.error.issues.forEach((error: z.ZodIssue) => {
      const path = error.path.join('.');
      if (!errors[path]) {
        errors[path] = error.message;
      }
    });
    return { success: false, errors };
  }
}

/**
 * Get first error message for a field
 */
export function getFieldError(
  errors: Record<string, string> | undefined,
  fieldName: string,
): string | undefined {
  return errors?.[fieldName];
}

/**
 * Check if a field has an error
 */
export function hasFieldError(
  errors: Record<string, string> | undefined,
  fieldName: string,
): boolean {
  return Boolean(errors?.[fieldName]);
}

/**
 * Transform form data to API format
 */
export function transformFormToApi<T, U>(
  formData: T,
  transformer: (data: T) => U,
): U {
  return transformer(formData);
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type RegisterFormData = z.infer<typeof registerFormSchema>;
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type PasswordResetRequestData = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetData = z.infer<typeof passwordResetSchema>;

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export type SubscriptionCreateData = z.infer<typeof subscriptionCreateSchema>;
export type SubscriptionCancelData = z.infer<typeof subscriptionCancelSchema>;
export type DirectDebitContractData = z.infer<typeof directDebitContractSchema>;

export type PaymentProcessingData = z.infer<typeof paymentProcessingSchema>;
export type PaymentCallbackData = z.infer<typeof paymentCallbackSchema>;

export type ProductFormData = z.infer<typeof productFormSchema>;

export type SearchFormData = z.infer<typeof searchFormSchema>;
export type DateRangeFilterData = z.infer<typeof dateRangeFilterSchema>;

export type AvatarUploadData = z.infer<typeof avatarUploadSchema>;
export type DocumentUploadData = z.infer<typeof documentUploadSchema>;

// ============================================================================
// FORM SCHEMA REGISTRY
// ============================================================================

/**
 * Registry of all form schemas for easy access and type safety
 */
export const formSchemas = {
  // Authentication
  register: registerFormSchema,
  login: loginFormSchema,
  passwordResetRequest: passwordResetRequestSchema,
  passwordReset: passwordResetSchema,

  // Profile & Settings
  profileUpdate: profileUpdateSchema,
  changePassword: changePasswordSchema,

  // Subscription & Billing
  subscriptionCreate: subscriptionCreateSchema,
  subscriptionCancel: subscriptionCancelSchema,
  directDebitContract: directDebitContractSchema,

  // Payment
  paymentProcessing: paymentProcessingSchema,
  paymentCallback: paymentCallbackSchema,

  // Admin
  productForm: productFormSchema,

  // Search & Filter
  search: searchFormSchema,
  dateRangeFilter: dateRangeFilterSchema,

  // File Upload
  avatarUpload: avatarUploadSchema,
  documentUpload: documentUploadSchema,
} as const;

export type FormSchemaKey = keyof typeof formSchemas;
export type FormSchemaType<K extends FormSchemaKey> = z.infer<typeof formSchemas[K]>;
