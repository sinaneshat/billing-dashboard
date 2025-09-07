import { z } from '@hono/zod-openapi';

import { createApiResponseSchema } from '@/api/core/schemas';

// Step 1: Initiate Direct Debit Contract Setup Request Schema
export const InitiateDirectDebitRequestSchema = z.object({
  mobile: z.string()
    .regex(/^(?:\+98|0)?9\d{9}$/, 'Invalid Iranian mobile number format')
    .openapi({
      example: '09121234567',
      description: 'User mobile number (Iranian format: 09xxxxxxxxx)',
    }),
  ssn: z.string()
    .regex(/^\d{10}$/, 'National ID must be 10 digits')
    .optional()
    .openapi({
      example: '1234567890',
      description: 'National ID (کد ملی) - 10 digits, optional but recommended',
    }),
  callbackUrl: z.string()
    .url()
    .openapi({
      example: 'http://localhost:3000/payment/callback',
      description: 'Return URL after contract signing',
    }),
  contractDurationDays: z.number()
    .int()
    .min(30, 'Contract duration must be at least 30 days')
    .max(3650, 'Contract duration cannot exceed 10 years')
    .default(365)
    .openapi({
      example: 365,
      description: 'Contract duration in days (minimum 30, default 365)',
    }),
  maxDailyCount: z.number()
    .int()
    .min(1)
    .max(1000)
    .default(10)
    .openapi({
      example: 10,
      description: 'Maximum daily transactions allowed',
    }),
  maxMonthlyCount: z.number()
    .int()
    .min(1)
    .max(10000)
    .default(100)
    .openapi({
      example: 100,
      description: 'Maximum monthly transactions allowed',
    }),
  maxAmount: z.number()
    .int()
    .min(100000, 'Minimum amount is 100,000 IRR')
    .max(500000000, 'Maximum amount is 500,000,000 IRR')
    .default(50000000)
    .openapi({
      example: 50000000,
      description: 'Maximum transaction amount in Iranian Rials',
    }),
  metadata: z.record(z.string(), z.unknown())
    .optional()
    .openapi({
      example: { source: 'mobile_app' },
      description: 'Additional metadata for tracking',
    }),
});

// Bank information schema
const BankSchema = z.object({
  name: z.string().openapi({ example: 'بانک ملی ایران' }),
  slug: z.string().openapi({ example: 'bmi' }),
  bankCode: z.string().openapi({ example: '011' }),
  maxDailyAmount: z.number().openapi({ example: 50000000 }),
  maxDailyCount: z.number().nullable().openapi({ example: 10 }),
});

// Step 1: Response Schema
export const InitiateDirectDebitResponseSchema = createApiResponseSchema(z.object({
  paymanAuthority: z.string().openapi({
    example: 'payman_6moa',
    description: 'Contract authority from ZarinPal (store securely)',
  }),
  banks: z.array(BankSchema).openapi({
    description: 'Available banks for contract signing',
  }),
  contractSigningUrl: z.string()
    .url()
    .openapi({
      example: 'https://pay.zarinpal.com/pg/payman/banks',
      description: 'URL template for contract signing (replace placeholders)',
    }),
  contractId: z.string().openapi({
    example: 'contract_123456',
    description: 'Internal contract tracking ID for verification',
  }),
}));

// Step 2: Verify Direct Debit Contract Request Schema
export const VerifyDirectDebitContractRequestSchema = z.object({
  paymanAuthority: z.string().openapi({
    example: 'payman_6moa',
    description: 'Contract authority from initiation step',
  }),
  status: z.enum(['OK', 'NOK']).openapi({
    example: 'OK',
    description: 'Contract signing status from ZarinPal callback',
  }),
  contractId: z.string().openapi({
    example: 'contract_123456',
    description: 'Internal contract tracking ID from initiation',
  }),
});

// Error schema for contract verification
const ContractErrorSchema = z.object({
  code: z.string().openapi({ example: 'verification_failed' }),
  message: z.string().openapi({ example: 'Contract verification failed' }),
});

// Step 2: Response Schema
export const VerifyDirectDebitContractResponseSchema = createApiResponseSchema(z.object({
  contractVerified: z.boolean().openapi({
    example: true,
    description: 'Whether contract was successfully signed and verified',
  }),
  signature: z.string()
    .optional()
    .openapi({
      example: 'sig_200char_string_here',
      description: 'Contract signature for direct payments (200 characters, store securely)',
    }),
  paymentMethodId: z.string()
    .optional()
    .openapi({
      example: 'pm_123456789',
      description: 'Created payment method ID for direct debit',
    }),
  error: ContractErrorSchema
    .optional()
    .openapi({
      description: 'Error details if verification failed',
    }),
}));
