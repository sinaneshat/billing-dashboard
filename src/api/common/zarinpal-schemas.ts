/**
 * ZarinPal API Schemas using Zod following established codebase patterns
 * Based on official ZarinPal API documentation
 */

import { z } from '@hono/zod-openapi';

import { CoreSchemas } from '../core/schemas';

// =============================================================================
// ZarinPal Error Response Schemas
// =============================================================================

/**
 * ZarinPal error code enum following their official API documentation
 */
export const ZarinPalErrorCodeSchema = z.enum([
  '-9', // Transaction failure
  '-10', // Invalid IP or merchant
  '-11', // Merchant is not active
  '-12', // Attempts limit exceeded
  '-15', // Merchant access denied
  '-16', // Invalid merchant level
  '-17', // Merchant must be active
  '-30', // Service not allowed
  '-31', // Transaction not found
  '-33', // Transaction not successful
  '-34', // Transaction not found
  '-40', // Merchant access denied
  '-41', // Invalid amount
  '-42', // Refund limit exceeded
  '-50', // Refund limit exceeded
  '-51', // Transaction not refundable
  '-52', // Bank error
  '-53', // Transaction cancelled
  '-54', // Transaction not verified
  '-74', // Invalid merchant ID
  '-80', // Merchant does not have access to direct debit
  '100', // Verified
  '101', // Already verified
]).openapi('ZarinPalErrorCode');

export type ZarinPalErrorCode = z.infer<typeof ZarinPalErrorCodeSchema>;

/**
 * ZarinPal error structure from their API responses
 */
export const ZarinPalErrorSchema = z.object({
  message: z.string().openapi({
    example: 'Merchant have not access.',
    description: 'Human-readable error message from ZarinPal',
  }),
  code: z.coerce.number().openapi({
    example: -80,
    description: 'ZarinPal error code',
  }),
  validations: z.array(z.unknown()).default([]).openapi({
    example: [],
    description: 'Validation errors array',
  }),
}).openapi('ZarinPalError');

export type ZarinPalError = z.infer<typeof ZarinPalErrorSchema>;

/**
 * Standard ZarinPal API response wrapper
 */
export function ZarinPalResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    data: dataSchema.optional().openapi({
      description: 'Response data when successful',
    }),
    errors: ZarinPalErrorSchema.optional().openapi({
      description: 'Error details when request fails',
    }),
  }).openapi('ZarinPalResponse');
}

// =============================================================================
// Direct Debit Contract Schemas
// =============================================================================

/**
 * Bank information from ZarinPal bank list
 */
export const ZarinPalBankSchema = z.object({
  name: z.string().openapi({
    example: 'بانک ملی ایران',
    description: 'Bank display name in Persian',
  }),
  slug: z.string().openapi({
    example: 'bmi',
    description: 'Bank slug identifier',
  }),
  bank_code: z.string().openapi({
    example: '011',
    description: 'Bank code for contract signing',
  }),
  max_daily_amount: z.number().openapi({
    example: 50000000,
    description: 'Maximum daily amount in IRR',
  }),
  max_daily_count: z.number().nullable().openapi({
    example: 10,
    description: 'Maximum daily transaction count',
  }),
}).openapi('ZarinPalBank');

export type ZarinPalBank = z.infer<typeof ZarinPalBankSchema>;

/**
 * Direct Debit Contract Request Schema
 */
export const DirectDebitContractRequestSchema = z.object({
  mobile: z.string()
    .regex(/^(?:\+98|0)?9\d{9}$/, 'Invalid Iranian mobile number format')
    .openapi({
      example: '09123456789',
      description: 'Iranian mobile number (required for contract)',
    }),
  ssn: z.string()
    .regex(/^\d{10}$/, 'Invalid Iranian national ID format')
    .optional()
    .openapi({
      example: '1234567890',
      description: 'Iranian national ID (optional)',
    }),
  callbackUrl: CoreSchemas.url().openapi({
    example: 'https://example.com/payment/callback',
    description: 'Callback URL after contract signing',
  }),
  contractDurationDays: z.number()
    .int()
    .min(1)
    .max(3650)
    .default(365)
    .openapi({
      example: 365,
      description: 'Contract duration in days (default: 1 year)',
    }),
  maxDailyCount: z.number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .openapi({
      example: 10,
      description: 'Maximum daily transaction count',
    }),
  maxMonthlyCount: z.number()
    .int()
    .min(1)
    .max(1000)
    .default(100)
    .openapi({
      example: 100,
      description: 'Maximum monthly transaction count',
    }),
  maxAmount: CoreSchemas.amount().openapi({
    example: 50000000,
    description: 'Maximum transaction amount in IRR',
  }),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({
    example: { source: 'direct-debit-setup' },
    description: 'Optional metadata for tracking',
  }),
}).openapi('DirectDebitContractRequest');

export type DirectDebitContractRequest = z.infer<typeof DirectDebitContractRequestSchema>;

/**
 * Bank schema with camelCase fields as returned by our API handlers
 */
export const ApiFormattedBankSchema = z.object({
  name: z.string().openapi({
    example: 'بانک ملی ایران',
    description: 'Bank display name in Persian',
  }),
  slug: z.string().openapi({
    example: 'bmi',
    description: 'Bank slug identifier',
  }),
  bankCode: z.string().openapi({
    example: '011',
    description: 'Bank code for contract signing',
  }),
  maxDailyAmount: z.number().openapi({
    example: 50000000,
    description: 'Maximum daily amount in IRR',
  }),
  maxDailyCount: z.number().nullable().openapi({
    example: 10,
    description: 'Maximum daily transaction count',
  }),
}).openapi('ApiFormattedBank');

/**
 * Contract initiation response from our API
 */
export const DirectDebitContractResponseSchema = z.object({
  paymanAuthority: z.string().openapi({
    example: 'A00000000000000000000000000000000000000',
    description: 'ZarinPal Payman authority for contract signing',
  }),
  banks: z.array(ApiFormattedBankSchema).openapi({
    description: 'Available banks for contract signing (with camelCase field names)',
  }),
  contractSigningUrl: z.string().min(1).openapi({
    example: 'https://www.zarinpal.com/pg/StartPayman/{PAYMAN_AUTHORITY}/{BANK_CODE}',
    description: 'URL template for contract signing',
  }),
  contractId: CoreSchemas.uuid().openapi({
    description: 'Unique contract ID for tracking',
  }),
}).openapi('DirectDebitContractResponse');

export type DirectDebitContractResponse = z.infer<typeof DirectDebitContractResponseSchema>;

/**
 * Contract verification request
 */
export const VerifyDirectDebitContractRequestSchema = z.object({
  paymanAuthority: z.string().openapi({
    example: 'A00000000000000000000000000000000000000',
    description: 'ZarinPal Payman authority from callback',
  }),
  status: z.enum(['OK', 'NOK']).openapi({
    example: 'OK',
    description: 'Contract signing status from ZarinPal callback',
  }),
  contractId: CoreSchemas.uuid().openapi({
    description: 'Contract ID from initial setup',
  }),
}).openapi('VerifyDirectDebitContractRequest');

export type VerifyDirectDebitContractRequest = z.infer<typeof VerifyDirectDebitContractRequestSchema>;

/**
 * Contract verification response
 */
export const VerifyDirectDebitContractResponseSchema = z.object({
  contractVerified: z.boolean().openapi({
    example: true,
    description: 'Whether the contract was successfully verified',
  }),
  signature: z.string().optional().openapi({
    example: 'signature_data_from_zarinpal',
    description: 'Contract signature (when verified)',
  }),
  paymentMethodId: CoreSchemas.uuid().optional().openapi({
    description: 'Created payment method ID (when verified)',
  }),
  error: z.object({
    code: z.string().openapi({ example: 'user_cancelled' }),
    message: z.string().openapi({ example: 'Contract was cancelled by user' }),
  }).optional().openapi({
    description: 'Error details when verification fails',
  }),
}).openapi('VerifyDirectDebitContractResponse');

export type VerifyDirectDebitContractResponse = z.infer<typeof VerifyDirectDebitContractResponseSchema>;

// =============================================================================
// ZarinPal Service Internal Schemas
// =============================================================================

/**
 * ZarinPal Payman request payload (internal)
 */
export const ZarinPalPaymanRequestSchema = z.object({
  merchant_id: z.string(),
  mobile: z.string(),
  ssn: z.string().optional(),
  expire_at: z.string(),
  max_daily_count: z.string(),
  max_monthly_count: z.string(),
  max_amount: z.string(),
  callback_url: z.string().min(1),
});

export type ZarinPalPaymanRequest = z.infer<typeof ZarinPalPaymanRequestSchema>;

/**
 * ZarinPal Payman response (internal)
 */
export const ZarinPalPaymanResponseSchema = ZarinPalResponseSchema(
  z.object({
    payman_authority: z.string(),
    code: z.number(),
    message: z.string(),
  }),
);

export type ZarinPalPaymanResponse = z.infer<typeof ZarinPalPaymanResponseSchema>;

/**
 * ZarinPal Bank List response (internal)
 */
export const ZarinPalBankListResponseSchema = ZarinPalResponseSchema(
  z.object({
    banks: z.array(ZarinPalBankSchema),
    code: z.number(),
    message: z.string(),
  }),
);

export type ZarinPalBankListResponse = z.infer<typeof ZarinPalBankListResponseSchema>;

/**
 * ZarinPal Signature response (internal)
 */
export const ZarinPalSignatureResponseSchema = ZarinPalResponseSchema(
  z.object({
    signature: z.string(),
    code: z.number(),
    message: z.string(),
  }),
);

export type ZarinPalSignatureResponse = z.infer<typeof ZarinPalSignatureResponseSchema>;
