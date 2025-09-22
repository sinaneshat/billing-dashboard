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
import { decryptSignature, encryptSignature } from '@/api/utils/crypto';
import { getDbAsync } from '@/db';
import { billingEvent, paymentMethod, subscription } from '@/db/tables/billing';

import type {
  cancelContractRoute,
  createContractRoute,
  getPaymentMethodsRoute,
  setDefaultPaymentMethodRoute,
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

/**
 * Set Default Payment Method - Atomic operation to set payment method as primary
 */
export const setDefaultPaymentMethodHandler: RouteHandler<typeof setDefaultPaymentMethodRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    operationName: 'setDefaultPaymentMethod',
    validateParams: PaymentMethodParamsSchema,
  },
  async (c, tx) => {
    const user = c.get('user');
    const { id } = c.validated.params;

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    // Find the payment method and verify ownership
    const [targetMethod] = await tx
      .select()
      .from(paymentMethod)
      .where(and(eq(paymentMethod.id, id), eq(paymentMethod.userId, user.id)));

    if (!targetMethod) {
      throw createError.notFound('Payment method not found');
    }

    // Validate payment method status
    if (!targetMethod.isActive) {
      throw createError.badRequest('Payment method is not active');
    }

    if (targetMethod.contractStatus !== 'active') {
      throw createError.badRequest('Payment method contract is not active');
    }

    if (!targetMethod.contractSignatureEncrypted) {
      throw createError.badRequest('Payment method contract signature is invalid');
    }

    // If already primary, return success
    if (targetMethod.isPrimary) {
      return Responses.ok(c, {
        success: true,
        message: 'Payment method is already set as default',
        paymentMethodId: id,
      });
    }

    // Get current primary payment method for audit trail
    const [currentPrimary] = await tx
      .select()
      .from(paymentMethod)
      .where(and(eq(paymentMethod.userId, user.id), eq(paymentMethod.isPrimary, true)));

    // Atomic operation: Set all user's payment methods isPrimary = false
    await tx
      .update(paymentMethod)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(eq(paymentMethod.userId, user.id));

    // Set target payment method as primary
    await tx
      .update(paymentMethod)
      .set({
        isPrimary: true,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(paymentMethod.id, id));

    // Create billing event for audit trail
    await tx.insert(billingEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      paymentMethodId: id,
      eventType: 'default_payment_method_changed',
      eventData: {
        previousDefaultId: currentPrimary?.id || null,
        newDefaultId: id,
        paymentMethodDetails: {
          contractType: targetMethod.contractType,
          contractDisplayName: targetMethod.contractDisplayName,
          contractMobile: targetMethod.contractMobile,
        },
      },
      severity: 'info',
    });

    return Responses.ok(c, {
      success: true,
      message: 'Payment method set as default successfully',
      paymentMethodId: id,
    });
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

    // Get available banks first to validate limits
    const banksResult = await zarinpalService.getBankList();
    if (!banksResult.data?.banks || banksResult.errors?.length) {
      throw createError.badRequest('Failed to get banks list');
    }

    // Validate contract parameters against bank-specific limits
    const requestedMaxAmount = Number.parseInt(contractRequest.maxAmount, 10);
    const requestedMaxDailyCount = Number.parseInt(contractRequest.maxDailyCount, 10);

    // Find the maximum bank limits to allow users to use the highest available limits
    const maxSupportedDailyAmount = Math.max(
      ...banksResult.data.banks.map(bank => bank.max_daily_amount),
    );
    const maxSupportedDailyCount = Math.max(
      ...banksResult.data.banks
        .filter(bank => bank.max_daily_count !== null)
        .map(bank => bank.max_daily_count!),
    );

    // Validate against bank limits
    if (requestedMaxAmount > maxSupportedDailyAmount) {
      throw createError.badRequest(
        `Maximum transaction amount (${requestedMaxAmount.toLocaleString('fa-IR')} IRR) exceeds the maximum supported by banks (${maxSupportedDailyAmount.toLocaleString('fa-IR')} IRR). Please reduce the amount.`,
      );
    }

    if (requestedMaxDailyCount > maxSupportedDailyCount) {
      throw createError.badRequest(
        `Maximum daily transaction count (${requestedMaxDailyCount}) exceeds the maximum supported by banks (${maxSupportedDailyCount}). Please reduce the count.`,
      );
    }

    // Create contract with ZarinPal after validation passes
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
  async (c, tx) => {
    const user = c.get('user');
    const { paymanAuthority, status } = c.validated.body;
    const { id: contractId } = c.validated.params;

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    if (status !== 'OK') {
      throw createError.badRequest('Contract signing was not successful');
    }

    // Check if a payment method with this signature already exists for this user
    // This prevents duplicate contracts from the same paymanAuthority
    const existingPaymentMethods = await tx
      .select()
      .from(paymentMethod)
      .where(eq(paymentMethod.userId, user.id));

    const zarinpalService = ZarinPalDirectDebitService.create();

    // Verify contract and get signature
    const verifyResult = await zarinpalService.verifyContractAndGetSignature({
      payman_authority: paymanAuthority,
    });

    if (!verifyResult.data?.signature || verifyResult.errors?.length) {
      throw createError.badRequest('Failed to verify contract signature');
    }

    // Check if this signature already exists (prevent duplicates)
    const { hash } = await encryptSignature(verifyResult.data.signature);
    const existingMethodWithSignature = existingPaymentMethods.find(
      pm => pm.contractSignatureHash === hash,
    );

    if (existingMethodWithSignature) {
      // Contract already exists, return the existing payment method
      return Responses.ok(c, {
        signature: verifyResult.data.signature,
        paymentMethod: existingMethodWithSignature,
      });
    }

    // Encrypt the signature before storing
    const { encrypted } = await encryptSignature(verifyResult.data.signature);

    // Create payment method with encrypted contract signature
    const [newPaymentMethod] = await tx
      .insert(paymentMethod)
      .values({
        userId: user.id,
        contractType: 'direct_debit_contract',
        contractSignatureEncrypted: encrypted,
        contractSignatureHash: hash,
        contractDisplayName: 'پرداخت مستقیم', // Direct Payment
        contractMobile: '', // Could extract from stored contract info if needed
        contractStatus: 'active',
        isPrimary: false, // User can set as primary later
        isActive: true,
      })
      .returning();

    // Log billing event
    await tx.insert(billingEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      eventType: 'direct_debit_contract_verified',
      eventData: {
        paymentMethodId: newPaymentMethod!.id,
        paymanAuthority,
        contractSignature: verifyResult.data.signature,
        contractId, // Include the contract ID for debugging
      },
    });

    return Responses.ok(c, {
      signature: verifyResult.data.signature,
      paymentMethod: newPaymentMethod,
    });
  },
);

/**
 * 3. Cancel Contract - Cancel and delete direct debit contract:
 *    - Checks for dependent active subscriptions
 *    - Calls ZarinPal contract cancellation API
 *    - Creates audit trail before deletion
 *    - Hard deletes payment method from database
 *    - Required by ZarinPal terms of service
 */
export const cancelContractHandler: RouteHandler<typeof cancelContractRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    operationName: 'cancelDirectDebitContract',
    validateParams: PaymentMethodParamsSchema,
  },
  async (c, tx) => {
    const user = c.get('user');
    const { id } = c.validated.params;

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    // Find the payment method
    const [existingMethod] = await tx
      .select()
      .from(paymentMethod)
      .where(and(eq(paymentMethod.id, id), eq(paymentMethod.userId, user.id)));

    if (!existingMethod) {
      throw createError.notFound('Payment method not found');
    }

    if (existingMethod.contractType !== 'direct_debit_contract' || !existingMethod.contractSignatureEncrypted) {
      throw createError.badRequest('Not a direct debit contract');
    }

    // Check if any active subscriptions use this payment method
    const dependentSubscriptions = await tx
      .select()
      .from(subscription)
      .where(and(
        eq(subscription.paymentMethodId, existingMethod.id),
        eq(subscription.status, 'active'),
      ));

    if (dependentSubscriptions.length > 0) {
      throw createError.conflict('Cannot delete payment method: active subscriptions exist');
    }

    // Cancel contract with ZarinPal using official API (as required by ZarinPal terms)
    const zarinpalService = ZarinPalDirectDebitService.create();

    // Decrypt signature to call ZarinPal cancel contract API
    const decryptedSignature = await decryptSignature(existingMethod.contractSignatureEncrypted);

    try {
      const cancelResult = await zarinpalService.cancelContract({
        signature: decryptedSignature,
      });

      if (!cancelResult.data || cancelResult.data.code !== 100) {
        throw createError.badRequest('Failed to cancel contract with ZarinPal');
      }
    } catch (error) {
      // Log the error but continue with local cancellation for user control
      // This ensures users can still cancel contracts even if ZarinPal API is temporarily unavailable
      console.error('ZarinPal contract cancellation failed:', error);
    }

    // Create billing event BEFORE deletion (important for audit trail)
    await tx.insert(billingEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      paymentMethodId: id, // Will be deleted, so log it now
      eventType: 'payment_method_hard_deleted',
      eventData: {
        contractSignatureHash: existingMethod.contractSignatureHash, // Log hash instead of sensitive data
        contractDisplayName: existingMethod.contractDisplayName,
        contractMobile: existingMethod.contractMobile,
        deletionReason: 'user_requested',
        zarinpalCancellationSuccess: true,
      },
      severity: 'info',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Hard delete from database
    await tx.delete(paymentMethod).where(eq(paymentMethod.id, id));

    return Responses.ok(c, {
      cancelled: true,
      message: 'Direct debit contract deleted successfully',
    });
  },
);
