import { z } from '@hono/zod-openapi';

import {
  ApiFormattedBankSchema,
  DirectDebitContractRequestSchema,
  DirectDebitContractResponseSchema,
  VerifyDirectDebitContractResponseSchema as ZarinPalVerifyResponseSchema,
} from '@/api/common/zarinpal-schemas';
import {
  CoreSchemas,
  createApiResponseSchema,
  iranianRialAmountSchema,
} from '@/api/core/schemas';
import { validateWithSchema } from '@/api/core/validation';

// Use existing schemas from core - eliminates duplication
export const InitiateDirectDebitRequestSchema = DirectDebitContractRequestSchema;

// Use existing ZarinPal response schema
export const InitiateDirectDebitResponseSchema = createApiResponseSchema(
  DirectDebitContractResponseSchema,
);

// Re-export existing schemas to maintain API compatibility
export { VerifyDirectDebitContractRequestSchema } from '@/api/common/zarinpal-schemas';

// Wrap ZarinPal verification response in our API response format
export const VerifyDirectDebitContractResponseSchema = createApiResponseSchema(
  ZarinPalVerifyResponseSchema,
);

// Additional schemas for our specific endpoints
export const ExecuteDirectDebitPaymentRequestSchema = z.object({
  paymentMethodId: z.string().min(1).openapi({
    description: 'Payment method ID (direct debit contract)',
  }),
  subscriptionId: CoreSchemas.uuid().openapi({
    description: 'Subscription to charge',
  }),
  usdAmount: z.number().positive().openapi({
    description: 'Amount in USD (will be converted to IRR)',
    example: 29.99,
  }),
  description: z.string().min(1).max(255).openapi({
    example: 'Monthly subscription billing',
    description: 'Payment description',
  }),
  metadata: z.record(z.string(), z.unknown()).optional().openapi({
    description: 'Additional metadata for the payment',
  }),
});

export const ExecuteDirectDebitPaymentResponseSchema = createApiResponseSchema(
  z.object({
    paymentId: CoreSchemas.uuid(),
    zarinpalRefId: z.string().optional(),
    status: CoreSchemas.paymentStatus(),
    amount: iranianRialAmountSchema(),
    currency: CoreSchemas.currency(),
  }),
);

export const GetBankListResponseSchema = createApiResponseSchema(
  z.array(ApiFormattedBankSchema),
);

export const CancelDirectDebitContractResponseSchema = createApiResponseSchema(
  z.object({
    contractId: CoreSchemas.uuid(),
    cancelled: z.boolean(),
    cancelledAt: CoreSchemas.timestamp(),
  }),
);

// Path parameter schemas following codebase patterns
export const DirectDebitContractParamsSchema = z.object({
  contractId: z.string().uuid().openapi({
    param: { name: 'contractId', in: 'path' },
    example: 'contract_abc123',
    description: 'Direct debit contract ID',
  }),
});

// Query parameter schemas following codebase patterns
export const DirectDebitCallbackQuerySchema = z.object({
  payman_authority: z.string().length(36).openapi({
    example: 'A00000000000000000000000000123456789',
    description: 'ZarinPal payman authority from contract signing',
  }),
  status: z.enum(['OK', 'NOK']).openapi({
    example: 'OK',
    description: 'Contract signing status from ZarinPal',
  }),
});

// Iranian mobile number validation schema
export const IranianMobileSchema = z.string()
  .regex(/^(?:\+98|0)?9\d{9}$/, 'Invalid mobile number. Please use Iranian mobile format (09xxxxxxxxx)')
  .openapi({
    description: 'Iranian mobile number',
    example: '09123456789',
  });

// Enhanced validation helpers using discriminated unions per API guide
export function validateMobileNumber(mobile: string) {
  return validateWithSchema(IranianMobileSchema, mobile);
}

// Export types
export type DirectDebitContractParams = z.infer<typeof DirectDebitContractParamsSchema>;
export type DirectDebitCallbackQuery = z.infer<typeof DirectDebitCallbackQuerySchema>;
export type ExecuteDirectDebitPaymentRequest = z.infer<typeof ExecuteDirectDebitPaymentRequestSchema>;
