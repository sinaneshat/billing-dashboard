/**
 * Contract Signing Handlers - Bank Selection and Signing Flow
 * Handles the ZarinPal bank contract signing process with enhanced UI guidance
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import { createHandler, Responses } from '@/api/core';
import { ZarinPalDirectDebitService } from '@/api/services/zarinpal-direct-debit';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import { paymentMethod } from '@/db/tables/billing';

import type {
  generateSigningUrlRoute,
  getContractSigningInfoRoute,
} from './route';
import { BankSelectionRequestSchema, SignContractParamsSchema } from './schema';

/**
 * GET /payment-methods/{id}/sign - Get contract signing information
 */
export const getContractSigningInfoHandler: RouteHandler<typeof getContractSigningInfoRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateParams: SignContractParamsSchema,
    operationName: 'getContractSigningInfo',
  },
  async (c) => {
    const { id } = c.validated.params;
    const user = c.get('user');
    const db = await getDbAsync();

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    c.logger.info('Getting contract signing info', { logType: 'operation', operationName: 'getContractSigningInfo', userId: user.id, resource: id });

    // Find the contract
    const contractResults = await db.select().from(paymentMethod).where(and(
      eq(paymentMethod.id, id),
      eq(paymentMethod.userId, user.id),
    )).limit(1);

    const contract = contractResults[0];
    if (!contract) {
      throw createError.notFound('Contract not found');
    }

    // Check if contract can be signed
    const canSign = contract.contractStatus === 'pending_signature'
      && contract.contractType === 'pending_contract'
      && contract.paymanAuthority;

    if (!canSign) {
      throw createError.validation(`Contract cannot be signed. Status: ${contract.contractStatus}`);
    }

    // Get available banks from ZarinPal
    const zarinpalService = ZarinPalDirectDebitService.create();
    const banksResponse = await zarinpalService.getBankList();

    if (!banksResponse.data?.banks) {
      throw createError.internal('Failed to retrieve bank list from ZarinPal');
    }

    const guidance = getSigningGuidance(contract);

    c.logger.info('Contract signing info retrieved successfully', { logType: 'operation', operationName: 'getContractSigningInfo', userId: user.id, resource: id });

    return Responses.ok(c, {
      contract: {
        id: contract.id,
        status: contract.contractStatus,
        paymanAuthority: contract.paymanAuthority!,
        mobile: contract.contractMobile!,
        maxDailyAmount: contract.maxDailyAmount!,
        maxDailyCount: contract.maxDailyCount!,
        maxMonthlyCount: contract.maxMonthlyCount!,
      },
      availableBanks: banksResponse.data.banks,
      canSign,
      guidance,
    });
  },
);

/**
 * POST /payment-methods/{id}/sign - Generate bank signing URL
 */
export const generateSigningUrlHandler: RouteHandler<typeof generateSigningUrlRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateParams: SignContractParamsSchema,
    validateBody: BankSelectionRequestSchema,
    operationName: 'generateSigningUrl',
  },
  async (c) => {
    const { id } = c.validated.params;
    const { bankCode } = c.validated.body;
    const user = c.get('user');
    const db = await getDbAsync();

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    c.logger.info('Generating signing URL', { logType: 'operation', operationName: 'generateSigningUrl', userId: user.id, resource: id });

    // Find the contract
    const contractResults = await db.select().from(paymentMethod).where(and(
      eq(paymentMethod.id, id),
      eq(paymentMethod.userId, user.id),
      eq(paymentMethod.contractStatus, 'pending_signature'),
    )).limit(1);

    const contract = contractResults[0];
    if (!contract) {
      throw createError.notFound('Contract not found or cannot be signed');
    }

    if (!contract.paymanAuthority) {
      throw createError.validation('Contract does not have a valid payman authority');
    }

    // Get bank information to validate the selection
    const zarinpalService = ZarinPalDirectDebitService.create();
    const banksResponse = await zarinpalService.getBankList();

    if (!banksResponse.data?.banks) {
      throw createError.internal('Failed to retrieve bank list from ZarinPal');
    }

    const selectedBank = banksResponse.data.banks.find(bank => bank.bank_code === bankCode);
    if (!selectedBank) {
      throw createError.validation('Invalid bank selection');
    }

    // Validate contract limits against bank limits
    if (contract.maxDailyAmount! > selectedBank.max_daily_amount) {
      throw createError.validation(
        `Daily amount limit (${contract.maxDailyAmount} IRR) exceeds bank limit (${selectedBank.max_daily_amount} IRR)`,
      );
    }

    if (selectedBank.max_daily_count && contract.maxDailyCount! > selectedBank.max_daily_count) {
      throw createError.validation(
        `Daily transaction count (${contract.maxDailyCount}) exceeds bank limit (${selectedBank.max_daily_count})`,
      );
    }

    // Generate signing URL
    const signingUrl = zarinpalService.getContractSigningUrl(contract.paymanAuthority, bankCode);

    // URL expires in 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Store the selected bank in metadata for tracking
    let existingMetadata: Record<string, unknown> = {};
    if (contract.metadata && typeof contract.metadata === 'string') {
      try {
        const parsed = JSON.parse(contract.metadata);
        if (parsed && typeof parsed === 'object') {
          existingMetadata = parsed;
        }
      } catch {
        // Invalid JSON, use empty object
      }
    }

    await db.update(paymentMethod)
      .set({
        metadata: JSON.stringify({
          ...existingMetadata,
          selectedBank: {
            name: selectedBank.name,
            code: bankCode,
            selectedAt: new Date().toISOString(),
          },
        }),
        updatedAt: new Date(),
      })
      .where(eq(paymentMethod.id, id));

    c.logger.info('Signing URL generated successfully', { logType: 'operation', operationName: 'generateSigningUrl', userId: user.id, resource: id });

    return Responses.ok(c, {
      signingUrl,
      paymanAuthority: contract.paymanAuthority,
      bankInfo: {
        name: selectedBank.name,
        code: bankCode,
        maxDailyAmount: selectedBank.max_daily_amount,
        maxDailyCount: selectedBank.max_daily_count,
      },
      contractId: contract.id,
      expiresAt: expiresAt.toISOString(),
    });
  },
);

/**
 * Helper function to generate user guidance based on contract state
 */
function getSigningGuidance(contract: typeof paymentMethod.$inferSelect): string {
  let bankName: string | null = null;

  if (contract.metadata && typeof contract.metadata === 'string') {
    try {
      const metadata = JSON.parse(contract.metadata);
      if (metadata && typeof metadata === 'object' && 'selectedBank' in metadata) {
        const selectedBank = metadata.selectedBank;
        if (selectedBank && typeof selectedBank === 'object' && 'name' in selectedBank) {
          bankName = typeof selectedBank.name === 'string' ? selectedBank.name : null;
        }
      }
    } catch {
      // Invalid JSON, ignore
    }
  }

  if (bankName) {
    return `Continue signing your direct debit contract with ${bankName}. The signing process will redirect you to your bank's secure portal.`;
  }

  return `Select your bank to continue with the direct debit contract signing. You'll be redirected to your bank's secure portal to complete the process.`;
}
