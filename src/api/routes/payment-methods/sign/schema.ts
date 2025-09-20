import { z } from '@hono/zod-openapi';

import { CoreSchemas, createApiResponseSchema } from '@/api/core/schemas';

// Route parameter schemas
export const SignContractParamsSchema = z.object({
  id: CoreSchemas.uuid(),
}).openapi('SignContractParams');

// Bank selection request schema
export const BankSelectionRequestSchema = z.object({
  bankCode: z.string().min(1, 'Bank code is required').openapi({
    example: 'SABCIR',
    description: 'ZarinPal bank code for contract signing',
  }),
}).openapi('BankSelectionRequest');

// Contract signing info response data schema
export const ContractSigningInfoResponseDataSchema = z.object({
  contract: z.object({
    id: CoreSchemas.uuid(),
    status: z.string(),
    paymanAuthority: z.string(),
    mobile: z.string(),
    maxDailyAmount: z.number().int(),
    maxDailyCount: z.number().int(),
    maxMonthlyCount: z.number().int(),
  }),
  availableBanks: z.array(z.object({
    name: z.string(),
    slug: z.string(),
    bankCode: z.string(),
    maxDailyAmount: z.number().int(),
    maxDailyCount: z.number().int().nullable(),
  })),
  canSign: z.boolean(),
  guidance: z.string(),
}).openapi('ContractSigningInfoResponseData');

// Signing URL response data schema
export const SigningUrlResponseDataSchema = z.object({
  signingUrl: CoreSchemas.url().openapi({
    example: 'https://www.zarinpal.com/pg/StartPayman/payman_abc123/SABCIR',
    description: 'ZarinPal signing URL for bank contract',
  }),
  paymanAuthority: z.string().openapi({
    example: 'payman_abc123',
    description: 'Payman authority for this contract',
  }),
  bankInfo: z.object({
    name: z.string(),
    code: z.string(),
    maxDailyAmount: z.number().int(),
    maxDailyCount: z.number().int().nullable(),
  }).openapi({
    description: 'Selected bank information',
  }),
  contractId: CoreSchemas.uuid(),
  expiresAt: CoreSchemas.timestamp().openapi({
    description: 'When the signing URL expires',
  }),
}).openapi('SigningUrlResponseData');

// Response schemas following established patterns
export const GetContractSigningInfoResponseSchema = createApiResponseSchema(ContractSigningInfoResponseDataSchema);
export const GenerateSigningUrlResponseSchema = createApiResponseSchema(SigningUrlResponseDataSchema);

// Export inferred types
export type SignContractParams = z.infer<typeof SignContractParamsSchema>;
export type BankSelectionRequest = z.infer<typeof BankSelectionRequestSchema>;
export type ContractSigningInfoResponseData = z.infer<typeof ContractSigningInfoResponseDataSchema>;
export type SigningUrlResponseData = z.infer<typeof SigningUrlResponseDataSchema>;
