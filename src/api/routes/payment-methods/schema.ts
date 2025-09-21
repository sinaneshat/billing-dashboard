import { z } from '@hono/zod-openapi';

import { CoreSchemas, createApiResponseSchema } from '@/api/core/schemas';
import { paymentMethodSelectSchema } from '@/db/validation/billing';

// Single source of truth - use drizzle-zod schema with OpenAPI metadata
const PaymentMethodSchema = paymentMethodSelectSchema.openapi({
  example: {
    id: 'pm_123',
    userId: 'user_123',
    contractType: 'direct_debit_contract',
    contractSignature: 'eyJpdiI6InpoUHZoT0hPZjdNNj...',
    contractDisplayName: 'بانک ملی ایران',
    contractMobile: '09123456789',
    contractStatus: 'active',
    isPrimary: true,
    isActive: true,
  },
});

// ============================================================================
// VALIDATION SCHEMAS FOR HANDLERS
// ============================================================================

// Parameter validation schemas
export const PaymentMethodParamsSchema = z.object({
  id: z.string().min(1, 'Payment method ID is required'),
});

export const ContractParamsSchema = z.object({
  id: z.string().min(1, 'Contract ID is required'),
});

// Body validation schemas
export const UpdatePaymentMethodBodySchema = z.object({
  isPrimary: z.boolean().optional(),
});

// ============================================================================
// BASIC PAYMENT METHOD SCHEMAS
// ============================================================================

export const PaymentMethodListResponseSchema = createApiResponseSchema(
  z.array(PaymentMethodSchema),
);

export const PaymentMethodUpdateResponseSchema = createApiResponseSchema(
  PaymentMethodSchema,
);

// ============================================================================
// CONSOLIDATED DIRECT DEBIT CONTRACT SCHEMAS (3 ENDPOINTS TOTAL)
// ============================================================================

// Bank schema for contract creation response
const BankSchema = z.object({
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
  maxDailyAmount: z.number().int().nonnegative().openapi({
    example: 50000000,
    description: 'Maximum daily amount in IRR',
  }),
  maxDailyCount: z.number().int().nonnegative().nullable().openapi({
    example: 10,
    description: 'Maximum daily transaction count (null = unlimited)',
  }),
});

// 1. POST /payment-methods/contracts - Create contract + get banks + generate signing URL
export const CreateContractRequestSchema = z.object({
  mobile: z.string().regex(/^(?:\+98|0)?9\d{9}$/, 'Invalid Iranian mobile number format').openapi({
    example: '09123456789',
    description: 'Customer mobile number',
  }),
  ssn: z.string().regex(/^\d{10}$/, 'Iranian national ID must be exactly 10 digits').optional().openapi({
    example: '0480123456',
    description: 'Customer national ID (optional)',
  }),
  expireAt: z.string().regex(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/, 'Date must be in Y-m-d H:i:s format').openapi({
    example: '2025-12-31 23:59:59',
    description: 'Contract expiry date (minimum 30 days)',
  }),
  maxDailyCount: z.string().regex(/^\d+$/, 'Must be a numeric string').openapi({
    example: '10',
    description: 'Maximum daily transactions',
  }),
  maxMonthlyCount: z.string().regex(/^\d+$/, 'Must be a numeric string').openapi({
    example: '100',
    description: 'Maximum monthly transactions',
  }),
  maxAmount: z.string().regex(/^\d+$/, 'Must be a numeric string').openapi({
    example: '50000000',
    description: 'Maximum transaction amount in Iranian Rials',
  }),
});

export const CreateContractResponseSchema = createApiResponseSchema(
  z.object({
    contractId: CoreSchemas.id().openapi({
      example: 'contract_123',
      description: 'Generated contract ID for tracking',
    }),
    paymanAuthority: z.string().openapi({
      example: 'payman_6moa',
      description: 'ZarinPal Payman authority for signing',
    }),
    banks: z.array(BankSchema).openapi({
      description: 'Available banks for contract signing',
    }),
    signingUrlTemplate: z.string().openapi({
      example: 'https://www.zarinpal.com/pg/StartPayman/payman_6moa/{bank_code}',
      description: 'URL template - replace {bank_code} with selected bank code',
    }),
  }),
);

// 2. POST /payment-methods/contracts/{id}/verify - Verify signed contract and get signature
export const VerifyContractRequestSchema = z.object({
  paymanAuthority: z.string().min(1, 'Payman authority is required').openapi({
    example: 'payman_6moa',
    description: 'Contract authority received from callback',
  }),
  status: z.enum(['OK', 'NOK']).openapi({
    example: 'OK',
    description: 'Status from contract signing callback',
  }),
});

export const VerifyContractResponseSchema = createApiResponseSchema(
  z.object({
    signature: z.string().length(200, 'Signature must be exactly 200 characters').openapi({
      example: 'eyJpdiI6InpoUHZoT0hPZjdNNj...',
      description: 'Contract signature for direct debit transactions',
    }),
    paymentMethod: PaymentMethodSchema.openapi({
      description: 'Created payment method with contract details',
    }),
  }),
);

// 3. DELETE /payment-methods/contracts/{id} - Cancel contract
export const CancelContractResponseSchema = createApiResponseSchema(
  z.object({
    cancelled: z.boolean().openapi({
      description: 'Whether the contract was successfully cancelled',
    }),
    message: z.string().openapi({
      example: 'Direct debit contract cancelled successfully',
      description: 'Cancellation confirmation message',
    }),
  }),
);

// ============================================================================
// TYPE EXPORTS FOR FRONTEND
// ============================================================================

export type CreateContractRequest = z.infer<typeof CreateContractRequestSchema>;
export type CreateContractResponse = z.infer<typeof CreateContractResponseSchema>;
export type VerifyContractRequest = z.infer<typeof VerifyContractRequestSchema>;
export type VerifyContractResponse = z.infer<typeof VerifyContractResponseSchema>;
export type CancelContractResponse = z.infer<typeof CancelContractResponseSchema>;
