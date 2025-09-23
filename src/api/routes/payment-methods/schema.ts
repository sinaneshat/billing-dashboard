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

export const SetDefaultResponseSchema = createApiResponseSchema(
  z.object({
    success: z.boolean().openapi({
      description: 'Whether the operation was successful',
      example: true,
    }),
    message: z.string().openapi({
      example: 'Payment method set as default successfully',
      description: 'Success confirmation message',
    }),
    paymentMethodId: z.string().openapi({
      example: 'pm_123',
      description: 'ID of the payment method that was set as default',
    }),
  }),
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
// ENHANCED PAYMENT METHOD MANAGEMENT SCHEMAS
// ============================================================================

// Enhanced set-default payment method response schema
export const SetDefaultPaymentMethodResponseDataSchema = z.object({
  success: z.boolean().openapi({
    example: true,
    description: 'Whether the operation was successful',
  }),
  message: z.string().openapi({
    example: 'Payment method set as default successfully',
    description: 'Success message',
  }),
  paymentMethodId: CoreSchemas.id().openapi({
    example: 'pm_abc123',
    description: 'ID of the payment method that was set as default',
  }),
  previousDefaultId: z.string().nullable().openapi({
    example: 'pm_xyz789',
    description: 'ID of the previous default payment method (null if none)',
  }),
}).openapi('SetDefaultPaymentMethodData');

export const SetDefaultPaymentMethodResponseSchema = createApiResponseSchema(
  SetDefaultPaymentMethodResponseDataSchema,
);

// URL parameter schema for payment method operations
export const PaymentMethodSetDefaultParamsSchema = z.object({
  id: z.string().min(1).openapi({
    param: {
      name: 'id',
      in: 'path',
      description: 'Payment method ID',
      example: 'pm_abc123',
    },
  }),
});

// Payment method error responses
export const PaymentMethodErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum([
      'PAYMENT_METHOD_NOT_FOUND',
      'PAYMENT_METHOD_INACTIVE',
      'CONTRACT_NOT_ACTIVE',
      'USER_NOT_AUTHORIZED',
      'ALREADY_DEFAULT_METHOD',
    ]),
    message: z.string(),
    context: z.object({
      errorType: z.literal('payment_method'),
      paymentMethodId: z.string().optional(),
      contractStatus: z.string().optional(),
    }),
  }),
}).openapi('PaymentMethodError');

// Iranian-specific validation schemas for payment methods
export const IranianPaymentValidationSchemas = {
  // Iranian mobile number validation
  mobileNumber: z.string()
    .regex(/^(?:\+98|0)?9\d{9}$/, 'Invalid Iranian mobile number format')
    .openapi({
      example: '09123456789',
      description: 'Iranian mobile number',
    }),

  // Iranian national ID validation
  nationalId: z.string()
    .regex(/^\d{10}$/, 'Iranian national ID must be exactly 10 digits')
    .openapi({
      example: '0480123456',
      description: 'Iranian national ID',
    }),

  // Iranian Rial amount validation
  rialAmount: z.number()
    .int('Rial amounts must be whole numbers')
    .min(1000, 'Minimum amount is 1,000 IRR')
    .max(1000000000, 'Maximum amount is 1,000,000,000 IRR')
    .openapi({
      example: 50000000,
      description: 'Amount in Iranian Rials',
    }),
};

// ============================================================================
// PUBLIC CALLBACK SCHEMAS (for ZarinPal redirects)
// ============================================================================

// Public Contract Callback Query Schema (for ZarinPal redirects)
export const ContractCallbackQuerySchema = z.object({
  payman_authority: z.string().min(1, 'Payman authority is required').openapi({
    example: 'payman_53U0Ohm',
    description: 'Contract authority from ZarinPal callback',
  }),
  status: z.enum(['OK', 'NOK']).openapi({
    example: 'OK',
    description: 'Status from contract signing callback',
  }),
});

export const ContractCallbackResponseSchema = createApiResponseSchema(
  z.object({
    success: z.boolean().openapi({
      description: 'Whether the contract verification was successful',
    }),
    signature: z.string().optional().openapi({
      description: 'Contract signature if verification was successful',
    }),
    paymentMethodId: z.string().optional().openapi({
      description: 'Created payment method ID if successful',
    }),
    message: z.string().openapi({
      description: 'Result message',
    }),
  }),
);

// ============================================================================
// CONTRACT RECOVERY SCHEMAS
// ============================================================================

export const RecoverContractRequestSchema = z.object({
  paymanAuthority: z.string().min(1, 'Payman authority is required').openapi({
    example: 'payman_53U0Ohm',
    description: 'ZarinPal Payman authority from failed callback',
  }),
}).openapi('RecoverContractRequest');

export const RecoverContractResponseSchema = createApiResponseSchema(
  z.object({
    success: z.boolean().openapi({
      description: 'Whether the contract recovery was successful',
    }),
    recovered: z.boolean().openapi({
      description: 'Whether a payment method was recovered',
    }),
    signature: z.string().optional().openapi({
      description: 'Contract signature if recovery was successful',
    }),
    paymentMethod: PaymentMethodSchema.optional().openapi({
      description: 'Created or existing payment method if successful',
    }),
    message: z.string().openapi({
      description: 'Result message',
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

// New payment method management types
export type SetDefaultPaymentMethodResponseData = z.infer<typeof SetDefaultPaymentMethodResponseDataSchema>;
export type SetDefaultPaymentMethodResponse = z.infer<typeof SetDefaultPaymentMethodResponseSchema>;
export type PaymentMethodSetDefaultParams = z.infer<typeof PaymentMethodSetDefaultParamsSchema>;

// Public callback types
export type ContractCallbackQuery = z.infer<typeof ContractCallbackQuerySchema>;
export type ContractCallbackResponse = z.infer<typeof ContractCallbackResponseSchema>;

// Contract recovery types
export type RecoverContractRequest = z.infer<typeof RecoverContractRequestSchema>;
export type RecoverContractResponse = z.infer<typeof RecoverContractResponseSchema>;
