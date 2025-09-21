/**
 * Consolidated Payment Methods Route Handlers
 *
 * Simplified 3-endpoint direct debit contract flow following ZarinPal Payman API:
 * 1. POST /payment-methods/contracts - Create contract + get banks
 * 2. POST /payment-methods/contracts/{id}/verify - Verify signed contract
 * 3. DELETE /payment-methods/contracts/{id} - Cancel contract
 */

import crypto from 'node:crypto';

import type { RouteHandler } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import { createHandler, createHandlerWithTransaction, Responses } from '@/api/core';
import { ZarinPalDirectDebitService } from '@/api/services/zarinpal-direct-debit';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import { billingEvent, paymentMethod } from '@/db/tables/billing';

import type {
  cancelContractRoute,
  createContractRoute,
  getContractStatusRoute,
  getPaymentMethodsRoute,
  verifyContractRoute,
} from './route';
import {
  ContractParamsSchema,
  CreateContractRequestSchema,
  PaymentMethodParamsSchema,
  VerifyContractRequestSchema,
} from './schema';

// ============================================================================
// BASIC PAYMENT METHOD HANDLERS
// ============================================================================

export const getPaymentMethodsHandler: RouteHandler<typeof getPaymentMethodsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getPaymentMethods',
  },
  async (c) => {
    const user = c.get('user');
    const db = await getDbAsync();

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    // Get all payment methods for user with contract status details
    const paymentMethods = await db
      .select()
      .from(paymentMethod)
      .where(eq(paymentMethod.userId, user.id));

    return Responses.ok(c, paymentMethods);
  },
);

// ============================================================================
// CONSOLIDATED DIRECT DEBIT CONTRACT HANDLERS (3 ENDPOINTS)
// ============================================================================

/**
 * 1. Create Contract - Consolidated endpoint that:
 *    - Creates ZarinPal Payman contract
 *    - Returns available banks
 *    - Provides signing URL template
 */
export const createContractHandler: RouteHandler<typeof createContractRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'createDirectDebitContract',
    validateBody: CreateContractRequestSchema,
  },
  async (c) => {
    const user = c.get('user');
    const contractRequest = c.validated.body;

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    const zarinpalService = ZarinPalDirectDebitService.create();

    // Create contract with ZarinPal
    const contractResult = await zarinpalService.requestContract({
      mobile: contractRequest.mobile,
      ssn: contractRequest.ssn,
      expire_at: contractRequest.expireAt,
      max_daily_count: contractRequest.maxDailyCount,
      max_monthly_count: contractRequest.maxMonthlyCount,
      max_amount: contractRequest.maxAmount,
      callback_url: `${c.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
    });

    if (!contractResult.data || contractResult.errors?.length) {
      throw createError.badRequest('Failed to create contract with ZarinPal');
    }

    // Get available banks
    const banksResult = await zarinpalService.getBankList();
    if (!banksResult.data?.banks || banksResult.errors?.length) {
      throw createError.badRequest('Failed to get banks list');
    }

    // Transform banks data from snake_case to camelCase for frontend consistency
    const transformedBanks = banksResult.data.banks.map(bank => ({
      name: bank.name,
      slug: bank.slug,
      bankCode: bank.bank_code,
      maxDailyAmount: bank.max_daily_amount,
      maxDailyCount: bank.max_daily_count,
    }));

    // Generate contract ID for tracking
    const contractId = crypto.randomUUID();

    return Responses.created(c, {
      contractId,
      paymanAuthority: contractResult.data.payman_authority,
      banks: transformedBanks,
      signingUrlTemplate: `https://www.zarinpal.com/pg/StartPayman/${contractResult.data.payman_authority}/{bank_code}`,
    });
  },
);

/**
 * 2. Verify Contract - Handle callback from bank signing:
 *    - Verify contract signature with ZarinPal
 *    - Create payment method if successful
 *    - Return signature and payment method
 */
export const verifyContractHandler: RouteHandler<typeof verifyContractRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    operationName: 'verifyDirectDebitContract',
    validateParams: ContractParamsSchema,
    validateBody: VerifyContractRequestSchema,
  },
  async (c, db) => {
    const user = c.get('user');
    const { paymanAuthority, status } = c.validated.body;

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    if (status !== 'OK') {
      throw createError.badRequest('Contract signing was not successful');
    }

    const zarinpalService = ZarinPalDirectDebitService.create();

    // Verify contract and get signature
    const verifyResult = await zarinpalService.verifyContractAndGetSignature({
      payman_authority: paymanAuthority,
    });

    if (!verifyResult.data?.signature || verifyResult.errors?.length) {
      throw createError.badRequest('Failed to verify contract signature');
    }

    // Create payment method with contract signature
    const [newPaymentMethod] = await db
      .insert(paymentMethod)
      .values({
        userId: user.id,
        contractType: 'direct_debit_contract',
        contractSignature: verifyResult.data.signature,
        contractDisplayName: 'پرداخت مستقیم', // Direct Payment
        contractMobile: '', // Could extract from stored contract info if needed
        contractStatus: 'active',
        isPrimary: false, // User can set as primary later
        isActive: true,
      })
      .returning();

    // Log billing event
    await db.insert(billingEvent).values({
      userId: user.id,
      eventType: 'direct_debit_contract_verified',
      eventData: {
        paymentMethodId: newPaymentMethod!.id,
        paymanAuthority,
        contractSignature: verifyResult.data.signature,
      },
    });

    return Responses.ok(c, {
      signature: verifyResult.data.signature,
      paymentMethod: newPaymentMethod,
    });
  },
);

/**
 * 3. Cancel Contract - Cancel direct debit contract:
 *    - Calls ZarinPal contract cancellation API
 *    - Updates payment method status
 *    - Required by ZarinPal terms of service
 */
export const cancelContractHandler: RouteHandler<typeof cancelContractRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    operationName: 'cancelDirectDebitContract',
    validateParams: PaymentMethodParamsSchema,
  },
  async (c, db) => {
    const user = c.get('user');
    const { id } = c.validated.params;

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    // Find the payment method
    const [existingMethod] = await db
      .select()
      .from(paymentMethod)
      .where(and(eq(paymentMethod.id, id), eq(paymentMethod.userId, user.id)));

    if (!existingMethod) {
      throw createError.notFound('Payment method not found');
    }

    if (existingMethod.contractType !== 'direct_debit_contract' || !existingMethod.contractSignature) {
      throw createError.badRequest('Not a direct debit contract');
    }

    // Cancel contract with ZarinPal
    const zarinpalService = ZarinPalDirectDebitService.create();
    const cancelResult = await zarinpalService.cancelContract({
      signature: existingMethod.contractSignature,
    });

    if (cancelResult.code !== 100) {
      throw createError.badRequest('Failed to cancel contract with ZarinPal');
    }

    // Update payment method status
    await db
      .update(paymentMethod)
      .set({
        contractStatus: 'cancelled_by_user',
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethod.id, id));

    // Log billing event
    await db.insert(billingEvent).values({
      userId: user.id,
      eventType: 'direct_debit_contract_cancelled',
      eventData: { paymentMethodId: id },
    });

    return Responses.ok(c, {
      cancelled: true,
      message: 'Direct debit contract cancelled successfully',
    });
  },
);

// ============================================================================
// LEGACY CONTRACT STATUS HANDLER (KEPT FOR COMPATIBILITY)
// ============================================================================

export const getContractStatusHandler: RouteHandler<typeof getContractStatusRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getContractStatus',
  },
  async (c) => {
    const user = c.get('user');
    const db = await getDbAsync();

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    // Get active direct debit contracts
    const contracts = await db
      .select()
      .from(paymentMethod)
      .where(
        and(
          eq(paymentMethod.userId, user.id),
          eq(paymentMethod.contractType, 'direct_debit_contract'),
        ),
      );

    const activeContract = contracts.find(contract => contract.contractStatus === 'active');

    if (!activeContract) {
      return Responses.ok(c, {
        status: 'no_contract' as const,
        canMakePayments: false,
        needsSetup: true,
        message: 'هیچ قراردادی فعال نیست',
      });
    }

    return Responses.ok(c, {
      status: activeContract.contractStatus,
      contractId: activeContract.id,
      signature: activeContract.contractSignature,
      mobile: activeContract.contractMobile,
      canMakePayments: activeContract.isActive && activeContract.contractStatus === 'active',
      needsSetup: false,
      message: 'قرارداد فعال و آماده پرداخت',
    });
  },
);
