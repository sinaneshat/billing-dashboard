/**
 * Comprehensive Zod Validation Utilities
 *
 * This module provides reusable validation utilities, transforms, and patterns
 * built on top of Zod for maximum type safety and consistency across the application.
 *
 * Features:
 * - Common field validation patterns
 * - Iranian-specific validations (phone, national ID, postal code)
 * - Payment and billing validations
 * - Type-safe transforms with proper error handling
 * - Standardized error formatting
 * - Maximum type inference capabilities
 */

import { z } from 'zod';

// ============================================================================
// CORE VALIDATION PRIMITIVES
// ============================================================================

/**
 * Enhanced string validation with common patterns
 */
export const zodString = {
  /** Non-empty string with trimming */
  nonEmpty: (message?: string) => z.string().trim().min(1, message ?? 'This field is required'),

  /** Optional non-empty string with trimming */
  optionalNonEmpty: () => z.string().trim().min(1).optional(),

  /** String with length constraints */
  withLength: (min: number, max: number, message?: string) =>
    z.string().trim().min(min, message).max(max, message),

  /** Email validation with proper formatting */
  email: (message?: string) => z.string().email(message ?? 'Please enter a valid email address'),

  /** URL validation */
  url: (message?: string) => z.string().url(message ?? 'Please enter a valid URL'),

  /** UUID validation */
  uuid: (message?: string) => z.string().uuid(message ?? 'Invalid UUID format'),

  /** Alphanumeric string */
  alphanumeric: (message?: string) => z.string().regex(/^[a-z0-9]+$/i, message ?? 'Only letters and numbers allowed'),

  /** Slug format (URL-friendly) */
  slug: (message?: string) => z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, message ?? 'Invalid slug format'),
} as const;

/**
 * Enhanced number validation with common patterns
 */
export const zodNumber = {
  /** Positive integer */
  positiveInt: (message?: string) => z.number().int().positive(message ?? 'Must be a positive number'),

  /** Non-negative integer */
  nonNegativeInt: (message?: string) => z.number().int().min(0, message ?? 'Must be zero or positive'),

  /** Integer within range */
  intRange: (min: number, max: number, message?: string) =>
    z.number().int().min(min, message).max(max, message),

  /** Positive number with precision */
  positiveDecimal: (decimals = 2, message?: string) =>
    z.number().positive(message ?? 'Must be a positive number').multipleOf(1 / 10 ** decimals, `Maximum ${decimals} decimal places allowed`),

  /** Percentage (0-100) */
  percentage: (message?: string) => z.number().min(0).max(100, message ?? 'Must be between 0 and 100'),
} as const;

/**
 * Enhanced date validation with common patterns
 */
export const zodDate = {
  /** Future date only */
  future: (message?: string) => z.date().refine(date => date > new Date(), message ?? 'Date must be in the future'),

  /** Past date only */
  past: (message?: string) => z.date().refine(date => date < new Date(), message ?? 'Date must be in the past'),

  /** Date within range */
  range: (start: Date, end: Date, message?: string) =>
    z.date().refine(date => date >= start && date <= end, message ?? 'Date must be within specified range'),

  /** ISO string that transforms to Date */
  isoString: () => z.string().datetime().transform(str => new Date(str)),
} as const;

// ============================================================================
// IRANIAN-SPECIFIC VALIDATIONS
// ============================================================================

/**
 * Iranian national ID validation (10-digit code with checksum)
 */
export function iranianNationalId(message?: string) {
  return z.string()
    .regex(/^\d{10}$/, 'National ID must be exactly 10 digits')
    .refine((value) => {
      // Iranian national ID checksum validation
      if (value.length !== 10 || /^(\d)\1{9}$/.test(value))
        return false;

      const digits = value.split('').map(Number);
      const checkDigit = digits.pop()!;

      let sum = 0;
      for (let i = 0; i < 9; i++) {
        const digit = digits[i];
        if (digit === undefined)
          return false;
        sum += digit * (10 - i);
      }

      const remainder = sum % 11;
      const expectedCheck = remainder < 2 ? remainder : 11 - remainder;

      return checkDigit === expectedCheck;
    }, message ?? 'Invalid Iranian national ID');
}

/**
 * Iranian mobile phone number validation
 */
export function iranianMobile(message?: string) {
  return z.string()
    .regex(/^(\+98|0)?9\d{9}$/, message ?? 'Invalid Iranian mobile number format')
    .transform((phone) => {
      // Normalize to +98 format
      if (phone.startsWith('09'))
        return `+98${phone.slice(1)}`;
      if (phone.startsWith('9'))
        return `+98${phone}`;
      if (!phone.startsWith('+98'))
        return `+98${phone}`;
      return phone;
    });
}

/**
 * Iranian postal code validation
 */
export function iranianPostalCode(message?: string) {
  return z.string()
    .regex(/^\d{5}-?\d{5}$/, message ?? 'Invalid Iranian postal code format')
    .transform(code => code.replace('-', ''));
}

// ============================================================================
// PAYMENT & BILLING VALIDATIONS
// ============================================================================

/**
 * Iranian Rial amount validation (positive integer in Rials)
 */
export function iranianRialAmount(message?: string) {
  return z.number()
    .int('Amount must be a whole number')
    .positive(message ?? 'Amount must be positive')
    .min(1000, 'Minimum amount is 1,000 Rials')
    .max(500_000_000, 'Maximum amount is 500,000,000 Rials');
} // 500M Rials = ~$12,000

/**
 * ZarinPal authority code validation
 */
export function zarinpalAuthority(message?: string) {
  return z.string()
    .length(36, message ?? 'ZarinPal authority must be exactly 36 characters')
    .regex(/^[A-Z0-9]+$/i, 'Invalid authority format');
}

/**
 * ZarinPal reference ID validation
 */
export function zarinpalRefId(message?: string) {
  return z.string()
    .regex(/^\d+$/, message ?? 'Reference ID must contain only digits')
    .min(1, 'Reference ID cannot be empty');
}

/**
 * Payment method validation
 */
export const paymentMethodType = z.enum([
  'direct-debit-contract',
  'zarinpal-oneoff',
  'zarinpal-gateway',
]);

/**
 * Billing period validation
 */
export const billingPeriod = z.enum([
  'monthly',
  'yearly',
  'one_time',
]);

/**
 * Subscription status validation
 */
export const subscriptionStatus = z.enum([
  'pending',
  'active',
  'cancelled',
  'suspended',
  'expired',
]);

// ============================================================================
// ADVANCED VALIDATION UTILITIES
// ============================================================================

/**
 * Create a validation schema that accepts multiple formats and normalizes them
 */
export function createMultiFormatValidator<T>(
  validators: Array<z.ZodSchema<T>>,
  errorMessage?: string,
) {
  return z.union(validators as [z.ZodSchema<T>, z.ZodSchema<T>, ...z.ZodSchema<T>[]]).describe(errorMessage ?? 'Invalid format');
}

/**
 * Create a conditional validation based on another field
 */
export function createConditionalValidator<T, K extends string>(
  conditionField: K,
  conditionValue: unknown,
  schema: z.ZodSchema<T>,
  fallbackSchema?: z.ZodSchema<T>,
) {
  return z.any().refine(
    (data) => {
      if (data && typeof data === 'object' && data[conditionField] === conditionValue) {
        return schema.safeParse(data).success;
      }
      return fallbackSchema ? fallbackSchema.safeParse(data).success : true;
    },
    {
      message: `Validation failed for ${conditionField} = ${conditionValue}`,
    },
  );
}

/**
 * Create a sanitized string validator that removes dangerous characters
 */
export function sanitizedString(maxLength = 1000) {
  return z.string()
    .trim()
    .max(maxLength, `Maximum ${maxLength} characters allowed`)
    .transform(str =>
      str
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove script content
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // Remove dangerous characters
        .replace(/[<>&"']/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim(),
    );
}

/**
 * Create a validated JSON string parser
 */
export function createJsonValidator<T>(schema: z.ZodSchema<T>) {
  return z.string()
    .transform((str, ctx) => {
      try {
        return JSON.parse(str);
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Invalid JSON format',
        });
        return z.NEVER;
      }
    })
    .pipe(schema);
}

/**
 * Create a file upload validator
 */
export function fileUploadValidator(allowedTypes: string[], maxSizeBytes: number) {
  return z.object({
    name: zodString.nonEmpty('File name is required'),
    size: z.number()
      .positive('File size must be positive')
      .max(maxSizeBytes, `File size cannot exceed ${Math.round(maxSizeBytes / 1024 / 1024)}MB`),
    type: z.string()
      .refine(type => allowedTypes.includes(type), `Only these file types are allowed: ${allowedTypes.join(', ')}`),
    content: z.string().min(1, 'File content is required'),
  });
}

// ============================================================================
// METADATA & CONFIGURATION VALIDATIONS
// ============================================================================

/**
 * Generic metadata validator for flexible JSON objects
 */
export const metadataValidator = z.record(z.string(), z.unknown())
  .optional()
  .default({});

/**
 * Environment configuration validator
 */
export const environmentValidator = z.enum(['development', 'preview', 'production']);

/**
 * API version validator
 */
export const apiVersionValidator = z.string()
  .regex(/^v\d+(\.\d+)?$/, 'API version must be in format v1, v1.1, etc.');

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Standard error response shape
 */
export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
    validation: z.array(z.object({
      field: z.string(),
      message: z.string(),
    })).optional(),
  }),
  meta: z.object({
    requestId: z.string().optional(),
    timestamp: z.string().optional(),
  }).optional(),
});

/**
 * Success response wrapper
 */
export function createSuccessResponseSchema<T>(dataSchema: z.ZodSchema<T>) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z.object({
      requestId: z.string().optional(),
      timestamp: z.string().optional(),
    }).and(z.record(z.string(), z.unknown())).optional(),
  });
}

/**
 * Paginated response wrapper
 */
export function createPaginatedResponseSchema<T>(itemSchema: z.ZodSchema<T>) {
  return createSuccessResponseSchema(z.object({
    items: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      pages: z.number().int().positive(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }));
}

/**
 * Transform validation errors into user-friendly format
 */
export function formatZodError(error: z.ZodError): Array<{ field: string; message: string }> {
  return error.issues.map(err => ({
    field: err.path.join('.') || 'unknown',
    message: err.message,
  }));
}

/**
 * Safe validation with detailed error information
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: Array<{ field: string; message: string }> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: formatZodError(result.error) };
  }
}

// ============================================================================
// TYPE UTILITIES
// ============================================================================

/**
 * Infer the type from a Zod schema
 */
export type InferSchema<T extends z.ZodSchema> = z.infer<T>;

/**
 * Create a partial version of a schema
 */
export function createPartialSchema<T extends z.ZodRawShape>(schema: z.ZodObject<T>) {
  return schema.partial();
}

/**
 * Create an update schema that omits certain fields
 */
export function createUpdateSchema<T extends z.ZodRawShape, K extends keyof T>(
  schema: z.ZodObject<T>,
  omitFields: readonly K[],
) {
  const omitObj: Record<string, true> = {};
  omitFields.forEach((key) => {
    omitObj[String(key)] = true;
  });
  return schema.omit(omitObj as Record<keyof T, true>);
}

/**
 * Create a search/filter schema with common patterns
 */
export function createSearchSchema<T extends z.ZodRawShape>(
  baseSchema: z.ZodObject<T>,
  searchableFields: Array<keyof T>,
) {
  return z.object({
    // Pagination
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),

    // Sorting
    sortBy: z.enum(searchableFields as [string, ...string[]]).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),

    // Search
    search: zodString.optionalNonEmpty(),

    // Filters based on schema fields
    ...Object.fromEntries(
      searchableFields.map((field) => {
        const fieldSchema = baseSchema.shape[field];
        return [
          `filter_${String(field)}`,
          fieldSchema ? z.any().optional() : z.any().optional(),
        ];
      }),
    ),
  });
}

// ============================================================================
// COMMON COMPOSITE VALIDATIONS
// ============================================================================

/**
 * Address validation (Iranian format)
 */
export const iranianAddressSchema = z.object({
  street: zodString.nonEmpty('Street address is required'),
  city: zodString.nonEmpty('City is required'),
  province: zodString.nonEmpty('Province is required'),
  postalCode: iranianPostalCode('Valid postal code is required'),
  country: z.literal('Iran').default('Iran'),
});

/**
 * Contact information validation
 */
export const contactInfoSchema = z.object({
  email: zodString.email(),
  mobile: iranianMobile(),
  phone: z.string().regex(/^(\+98|0)\d{8,11}$/, 'Invalid phone number').optional(),
});

/**
 * Audit fields for database records
 */
export const auditFieldsSchema = z.object({
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
  createdBy: zodString.uuid().optional(),
  updatedBy: zodString.uuid().optional(),
});

/**
 * Soft delete fields
 */
export const softDeleteSchema = z.object({
  deletedAt: z.date().nullable().default(null),
  deletedBy: zodString.uuid().optional(),
});

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export const zodValidation = {
  // Core primitives
  string: zodString,
  number: zodNumber,
  date: zodDate,

  // Iranian-specific
  iranianNationalId,
  iranianMobile,
  iranianPostalCode,

  // Payment & billing
  iranianRialAmount,
  zarinpalAuthority,
  zarinpalRefId,
  paymentMethodType,
  billingPeriod,
  subscriptionStatus,

  // Advanced utilities
  createMultiFormatValidator,
  createConditionalValidator,
  sanitizedString,
  createJsonValidator,
  fileUploadValidator,

  // Metadata & config
  metadataValidator,
  environmentValidator,
  apiVersionValidator,

  // Response schemas
  apiErrorResponseSchema,
  createSuccessResponseSchema,
  createPaginatedResponseSchema,

  // Error handling
  formatZodError,
  safeValidate,

  // Type utilities
  createPartialSchema,
  createUpdateSchema,
  createSearchSchema,

  // Composite validations
  iranianAddressSchema,
  contactInfoSchema,
  auditFieldsSchema,
  softDeleteSchema,
} as const;

export type ZodValidation = typeof zodValidation;
