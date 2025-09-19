import { z } from '@hono/zod-openapi';

import { createApiResponseSchema } from '@/api/core/schemas';

// Direct debit contract status schema based on database enum values
const DirectDebitContractStatusSchema = z.enum([
  'no_contract',
  'pending',
  'active',
  'expired',
  'cancelled',
  'invalid',
]).openapi('DirectDebitContractStatus');

// Direct debit contract status response
const DirectDebitContractSchema = z.object({
  status: DirectDebitContractStatusSchema,
  contractId: z.string().optional(),
  signature: z.string().optional(),
  mobile: z.string().optional(),
  maxDailyAmount: z.number().optional(),
  maxDailyCount: z.number().optional(),
  maxMonthlyCount: z.number().optional(),
  expiresAt: z.string().optional(),
  verifiedAt: z.string().optional(),
  canMakePayments: z.boolean(),
  needsSetup: z.boolean(),
  message: z.string(),
}).openapi({
  example: {
    status: 'active',
    contractId: 'pm_123',
    signature: 'sig_abc123',
    mobile: '09123456789',
    canMakePayments: true,
    needsSetup: false,
    message: 'Direct debit contract is active. You can choose your plan.',
  },
});

// GET /payment-methods/contract-status response
export const GetContractStatusResponseSchema = createApiResponseSchema(
  DirectDebitContractSchema,
).openapi('GetContractStatusResponse');

// Export types
export type DirectDebitContractStatus = z.infer<typeof DirectDebitContractStatusSchema>;
export type DirectDebitContract = z.infer<typeof DirectDebitContractSchema>;
export type GetContractStatusResponse = z.infer<typeof GetContractStatusResponseSchema>;
