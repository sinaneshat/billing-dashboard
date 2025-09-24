/**
 * Consolidated Payment Methods Route Handlers
 *
 * Simplified 3-endpoint direct debit contract flow following ZarinPal Payman API:
 * 1. POST /payment-methods/contracts - Create contract + get banks
 * 2. POST /payment-methods/contracts/{id}/verify - Verify signed contract
 * 3. DELETE /payment-methods/contracts/{id} - Cancel contract
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import { createHandler, createHandlerWithBatch, Responses } from '@/api/core';
import { apiLogger } from '@/api/middleware/hono-logger';
import { ZarinPalDirectDebitService } from '@/api/services/zarinpal-direct-debit';
import type { ApiEnv } from '@/api/types';
import { decryptSignature, encryptSignature } from '@/api/utils/crypto';
import { getDbAsync } from '@/db';
import { billingEvent, paymentMethod, subscription } from '@/db/tables/billing';

import type {
  cancelContractRoute,
  contractCallbackRoute,
  createContractRoute,
  getPaymentMethodsRoute,
  recoverContractRoute,
  setDefaultPaymentMethodRoute,
  verifyContractRoute,
} from './route';
import {
  ContractCallbackQuerySchema,
  ContractParamsSchema,
  CreateContractRequestSchema,
  PaymentMethodParamsSchema,
  RecoverContractRequestSchema,
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
export const setDefaultPaymentMethodHandler: RouteHandler<typeof setDefaultPaymentMethodRoute, ApiEnv> = createHandlerWithBatch(
  {
    auth: 'session',
    operationName: 'setDefaultPaymentMethod',
    validateParams: PaymentMethodParamsSchema,
  },
  async (c, batch) => {
    const user = c.get('user');
    const { id } = c.validated.params;

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    // Find the payment method and verify ownership using batch database
    const [targetMethod] = await batch.db
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
    const [currentPrimary] = await batch.db
      .select()
      .from(paymentMethod)
      .where(and(eq(paymentMethod.userId, user.id), eq(paymentMethod.isPrimary, true)));

    // Check if we're in real batch mode (D1) or transaction fallback mode
    const isBatchMode = typeof batch.execute === 'function' && batch.add.toString().includes('push');

    if (isBatchMode) {
      // D1 batch mode - add operations to batch
      batch.add(batch.db
        .update(paymentMethod)
        .set({ isPrimary: false })
        .where(eq(paymentMethod.userId, user.id)));

      batch.add(batch.db
        .update(paymentMethod)
        .set({
          isPrimary: true,
          lastUsedAt: new Date(),
        })
        .where(eq(paymentMethod.id, id)));

      batch.add(batch.db.insert(billingEvent).values({
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
      }));

      // Execute batch operations
      await batch.execute();
    } else {
      // Transaction fallback mode - execute operations immediately
      await batch.db
        .update(paymentMethod)
        .set({ isPrimary: false })
        .where(eq(paymentMethod.userId, user.id));

      await batch.db
        .update(paymentMethod)
        .set({
          isPrimary: true,
          lastUsedAt: new Date(),
        })
        .where(eq(paymentMethod.id, id));

      await batch.db.insert(billingEvent).values({
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
    }

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

    const zarinpalService = ZarinPalDirectDebitService.create(c.env);

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
        `Maximum transaction amount (${(requestedMaxAmount / 10).toLocaleString('fa-IR')} Toman) exceeds the maximum supported by banks (${(maxSupportedDailyAmount / 10).toLocaleString('fa-IR')} Toman). Please reduce the amount.`,
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
      callback_url: `${c.env.NEXT_PUBLIC_APP_URL || 'https://billing.roundtable.now'}/payment/callback`,
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

    // Store the payman authority and user ID in a secure cookie for callback verification
    // This ensures we can recover the user context when ZarinPal redirects back
    const cookieData = {
      paymanAuthority: contractResult.data.payman_authority,
      userId: user.id,
      timestamp: Date.now(),
    };

    // Set a secure HTTP-only cookie that will survive the redirect
    c.header('Set-Cookie', `pending-contract=${encodeURIComponent(JSON.stringify(cookieData))}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`);

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
export const verifyContractHandler: RouteHandler<typeof verifyContractRoute, ApiEnv> = createHandlerWithBatch(
  {
    auth: 'session',
    operationName: 'verifyDirectDebitContract',
    validateParams: ContractParamsSchema,
    validateBody: VerifyContractRequestSchema,
  },
  async (c, batch) => {
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
    const existingPaymentMethods = await batch.db
      .select()
      .from(paymentMethod)
      .where(eq(paymentMethod.userId, user.id));

    const zarinpalService = ZarinPalDirectDebitService.create(c.env);

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

    // Generate payment method ID upfront for batch operations
    const newPaymentMethodId = crypto.randomUUID();
    const now = new Date();

    // Prepare payment method data
    const paymentMethodData = {
      id: newPaymentMethodId,
      userId: user.id,
      contractType: 'direct_debit_contract' as const,
      contractSignatureEncrypted: encrypted,
      contractSignatureHash: hash,
      contractDisplayName: 'پرداخت مستقیم', // Direct Payment
      contractMobile: '', // Could extract from stored contract info if needed
      contractStatus: 'active' as const,
      isPrimary: false, // User can set as primary later
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    // Add payment method creation to batch
    batch.add(batch.db.insert(paymentMethod).values(paymentMethodData));

    // Add billing event to batch
    batch.add(batch.db.insert(billingEvent).values({
      userId: user.id,
      eventType: 'direct_debit_contract_verified',
      eventData: {
        paymentMethodId: newPaymentMethodId,
        paymanAuthority,
        contractSignature: verifyResult.data.signature,
        contractId, // Include the contract ID for debugging
      },
      severity: 'info',
    }));

    // Execute all batch operations
    await batch.execute();

    return Responses.ok(c, {
      signature: verifyResult.data.signature,
      paymentMethod: paymentMethodData,
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
export const cancelContractHandler: RouteHandler<typeof cancelContractRoute, ApiEnv> = createHandlerWithBatch(
  {
    auth: 'session',
    operationName: 'cancelDirectDebitContract',
    validateParams: PaymentMethodParamsSchema,
  },
  async (c, batch) => {
    const user = c.get('user');
    const { id } = c.validated.params;

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    // Find the payment method using batch database
    const [existingMethod] = await batch.db
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
    const dependentSubscriptions = await batch.db
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
    const zarinpalService = ZarinPalDirectDebitService.create(c.env);

    // Decrypt signature to call ZarinPal cancel contract API
    const decryptedSignature = await decryptSignature(existingMethod.contractSignatureEncrypted);

    let zarinpalCancellationSuccess = false;
    let zarinpalCancellationError = null;

    try {
      const cancelResult = await zarinpalService.cancelContract({
        signature: decryptedSignature,
      });

      if (cancelResult.data && cancelResult.data.code === 100) {
        zarinpalCancellationSuccess = true;
      } else {
        zarinpalCancellationError = 'ZarinPal returned non-success code';
      }
    } catch (error) {
      // Handle ZarinPal API errors gracefully
      // Common case: "Contract is not active" (error -70) - this should not prevent cancellation
      zarinpalCancellationError = error instanceof Error ? error.message : 'Unknown error';
      console.error('ZarinPal contract cancellation failed:', error);

      // Continue with local cancellation for user control
      // This ensures users can still cancel contracts even if ZarinPal API reports issues
    }

    // Add billing event to batch (BEFORE deletion for audit trail)
    // NOTE: Do NOT set paymentMethodId FK since we're deleting the payment method in the same batch
    // This avoids foreign key constraint violations
    batch.add(batch.db.insert(billingEvent).values({
      userId: user.id,
      paymentMethodId: null, // Don't set FK to avoid constraint violation on deletion
      eventType: 'payment_method_hard_deleted',
      eventData: {
        paymentMethodId: id, // Store in JSON for audit purposes
        contractSignatureHash: existingMethod.contractSignatureHash, // Log hash instead of sensitive data
        contractDisplayName: existingMethod.contractDisplayName,
        contractMobile: existingMethod.contractMobile,
        contractType: existingMethod.contractType,
        contractStatus: existingMethod.contractStatus,
        deletionReason: 'user_requested',
        zarinpalCancellationSuccess,
        zarinpalCancellationError,
      },
      severity: 'info',
    }));

    // Add hard delete to batch
    batch.add(batch.db.delete(paymentMethod).where(eq(paymentMethod.id, id)));

    // Execute all batch operations (billing event first, then deletion)
    await batch.execute();

    return Responses.ok(c, {
      cancelled: true,
      message: 'Direct debit contract deleted successfully',
    });
  },
);

/**
 * 4. Public Contract Callback Handler - Handle ZarinPal redirects
 */
export const contractCallbackHandler: RouteHandler<typeof contractCallbackRoute, ApiEnv> = createHandler(
  {
    auth: 'session-optional', // Session is optional - ZarinPal calls this directly
    operationName: 'handleContractCallback',
    validateQuery: ContractCallbackQuerySchema,
  },
  async (c) => {
    const { payman_authority: paymanAuthority, status } = c.validated.query;
    let user = c.get('user'); // Try to get user if authenticated

    // If no user session, try to recover from cookie
    if (!user) {
      const cookieHeader = c.req.header('Cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const pendingContract = cookies.find(c => c.startsWith('pending-contract='));

        if (pendingContract) {
          try {
            const cookieParts = pendingContract.split('=');
            if (cookieParts.length < 2 || !cookieParts[1]) {
              throw new Error('Invalid cookie format');
            }
            const cookieValue = decodeURIComponent(cookieParts[1]);
            const cookieData = JSON.parse(cookieValue);

            // Validate cookie data
            if (cookieData.paymanAuthority === paymanAuthority) {
              // Cookie is valid, we have the user ID
              // For security, we should verify this is still valid
              const db = await getDbAsync();
              const userResult = await db
                .select()
                .from(await import('@/db/tables/auth').then(m => m.user))
                .where(eq((await import('@/db/tables/auth').then(m => m.user)).id, cookieData.userId))
                .limit(1);

              if (userResult[0]) {
                user = userResult[0];
                apiLogger.info('User recovered from cookie', { userId: user.id });
              }
            }
          } catch (error) {
            apiLogger.warn('Failed to parse pending-contract cookie', { error });
          }
        }
      }
    }

    apiLogger.info('Contract callback received', {
      paymanAuthority,
      status,
      hasUser: !!user,
      userId: user?.id,
      recoveredFromCookie: !c.get('user') && !!user,
    });

    // Only handle successful callbacks
    if (status !== 'OK') {
      return Responses.ok(c, {
        success: false,
        message: 'Contract signing was not completed successfully',
      });
    }

    try {
      const zarinpalService = ZarinPalDirectDebitService.create(c.env);

      // Verify contract and get signature from ZarinPal
      const verifyResult = await zarinpalService.verifyContractAndGetSignature({
        payman_authority: paymanAuthority,
      });

      if (!verifyResult.data?.signature || verifyResult.errors?.length) {
        apiLogger.error('ZarinPal verification failed', {
          paymanAuthority,
          errors: verifyResult.errors,
          hasSignature: !!verifyResult.data?.signature,
        });
        return Responses.ok(c, {
          success: false,
          message: 'Failed to verify contract with ZarinPal',
        });
      }

      apiLogger.info('ZarinPal verification successful', {
        paymanAuthority,
        signatureLength: verifyResult.data.signature.length,
      });

      // If user is authenticated, create the payment method immediately
      if (user) {
        try {
          const db = await getDbAsync();

          // Check if this signature already exists (prevent duplicates)
          const { hash } = await encryptSignature(verifyResult.data.signature);
          const existingPaymentMethods = await db
            .select()
            .from(paymentMethod)
            .where(eq(paymentMethod.userId, user.id));

          const existingMethodWithSignature = existingPaymentMethods.find(
            pm => pm.contractSignatureHash === hash,
          );

          if (existingMethodWithSignature) {
            apiLogger.info('Payment method already exists', { paymentMethodId: existingMethodWithSignature.id });
            return Responses.ok(c, {
              success: true,
              signature: verifyResult.data.signature,
              paymentMethodId: existingMethodWithSignature.id,
              message: 'Contract verified successfully (existing)',
            });
          }

          // Encrypt the signature before storing
          const { encrypted } = await encryptSignature(verifyResult.data.signature);
          const newPaymentMethodId = crypto.randomUUID();
          const now = new Date();

          // Create payment method directly
          await db.insert(paymentMethod).values({
            id: newPaymentMethodId,
            userId: user.id,
            contractType: 'direct_debit_contract' as const,
            contractSignatureEncrypted: encrypted,
            contractSignatureHash: hash,
            contractDisplayName: 'پرداخت مستقیم', // Direct Payment
            contractMobile: '',
            contractStatus: 'active' as const,
            isPrimary: false,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });

          // Create billing event
          await db.insert(billingEvent).values({
            userId: user.id,
            eventType: 'direct_debit_contract_verified',
            eventData: {
              paymentMethodId: newPaymentMethodId,
              paymanAuthority,
              contractSignature: verifyResult.data.signature,
              source: 'callback',
            },
            severity: 'info',
            createdAt: now,
            updatedAt: now,
          });

          apiLogger.info('Payment method created successfully', {
            paymentMethodId: newPaymentMethodId,
            userId: user.id,
          });

          // Clear the pending-contract cookie after successful creation
          c.header('Set-Cookie', 'pending-contract=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');

          return Responses.ok(c, {
            success: true,
            signature: verifyResult.data.signature,
            paymentMethodId: newPaymentMethodId,
            message: 'Contract verified and payment method created successfully',
          });
        } catch (dbError) {
          apiLogger.error('Database error creating payment method', dbError as Error, {
            userId: user.id,
            paymanAuthority,
          });
          // Fall through to just return signature
        }
      } else {
        apiLogger.warn('No authenticated user found in callback', { paymanAuthority });
      }

      // For now, just return success with signature
      return Responses.ok(c, {
        success: true,
        signature: verifyResult.data.signature,
        message: 'Contract verified successfully',
      });
    } catch (error) {
      apiLogger.error('Contract callback verification failed', error as Error, {
        paymanAuthority,
        status,
        component: 'contract-callback',
      });

      return Responses.ok(c, {
        success: false,
        message: 'An error occurred while verifying the contract',
      });
    }
  },
);

/**
 * 5. Recover Contract Handler - Recover failed contract verifications
 */
export const recoverContractHandler: RouteHandler<typeof recoverContractRoute, ApiEnv> = createHandlerWithBatch(
  {
    auth: 'session',
    operationName: 'recoverDirectDebitContract',
    validateBody: RecoverContractRequestSchema,
  },
  async (c, batch) => {
    const user = c.get('user');
    const { paymanAuthority } = c.validated.body;

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    apiLogger.info('Contract recovery attempt', {
      userId: user.id,
      paymanAuthority: paymanAuthority.slice(-8), // Log last 8 chars for privacy
    });

    // Check existing payment methods for this user
    const existingMethods = await batch.db
      .select()
      .from(paymentMethod)
      .where(eq(paymentMethod.userId, user.id));

    // Handle mock data for testing
    if (paymanAuthority.startsWith('payman_mock_')) {
      apiLogger.info('Mock recovery detected, simulating success', {
        userId: user.id,
        paymanAuthority,
      });

      const mockPaymentMethodId = `pm_mock_${crypto.randomUUID().slice(0, 8)}`;
      const mockSignature = `mock_signature_${crypto.randomUUID()}`;
      const mockSignatureHash = `mock_hash_${crypto.randomUUID().slice(0, 16)}`;

      // Create mock payment method
      batch.add(batch.db.insert(paymentMethod).values({
        id: mockPaymentMethodId,
        userId: user.id,
        isActive: true,
        isPrimary: existingMethods.length === 0,
        contractType: 'direct_debit_contract',
        contractStatus: 'active',
        contractSignatureEncrypted: mockSignature,
        contractSignatureHash: mockSignatureHash,
        contractDisplayName: 'Mock Test Bank',
        contractMobile: '09123456789',
        lastUsedAt: null,
      }));

      // Log billing event (don't set paymentMethodId FK as it doesn't exist yet)
      batch.add(batch.db.insert(billingEvent).values({
        userId: user.id,
        eventType: 'direct_debit_contract_verified',
        eventData: {
          paymentMethodId: mockPaymentMethodId, // Store in JSON data for reference
          paymanAuthority,
          contractSignature: mockSignature,
          source: 'recovery_mock',
        },
        severity: 'info',
      }));

      await batch.execute();

      return Responses.ok(c, {
        success: true,
        paymentMethod: {
          id: mockPaymentMethodId,
          contractType: 'direct_debit_contract',
          contractStatus: 'active',
          contractDisplayName: 'Mock Test Bank',
          contractMobile: '09123456789',
        },
        message: 'Mock contract recovered successfully',
      });
    }

    const zarinpalService = ZarinPalDirectDebitService.create(c.env);

    try {
      // Verify contract with ZarinPal to get signature
      const verifyResult = await zarinpalService.verifyContractAndGetSignature({
        payman_authority: paymanAuthority,
      });

      if (!verifyResult.data?.signature || verifyResult.errors?.length) {
        apiLogger.warn('Recovery verification failed', {
          userId: user.id,
          errors: verifyResult.errors,
        });

        return Responses.ok(c, {
          success: false,
          recovered: false,
          message: 'Contract verification failed. The contract may have expired or is invalid.',
        });
      }

      // Check if payment method already exists with this signature (idempotent check)
      const { hash, encrypted } = await encryptSignature(verifyResult.data.signature);
      const existingMethod = existingMethods.find(pm => pm.contractSignatureHash === hash);

      if (existingMethod) {
        // Payment method already exists - idempotent success
        apiLogger.info('Payment method already exists (idempotent recovery)', {
          paymentMethodId: existingMethod.id,
          userId: user.id,
        });

        // Add billing event for recovery attempt
        batch.add(batch.db.insert(billingEvent).values({
          userId: user.id,
          paymentMethodId: existingMethod.id,
          eventType: 'payment_method_recovery_idempotent',
          eventData: {
            paymanAuthority,
            source: 'recovery_endpoint',
          },
          severity: 'info',
        }));

        await batch.execute();

        return Responses.ok(c, {
          success: true,
          recovered: true,
          signature: verifyResult.data.signature,
          paymentMethod: existingMethod,
          message: 'Payment method already exists for this contract.',
        });
      }

      // Create new payment method
      const newPaymentMethodId = crypto.randomUUID();
      const now = new Date();

      const paymentMethodData = {
        id: newPaymentMethodId,
        userId: user.id,
        contractType: 'direct_debit_contract' as const,
        contractSignatureEncrypted: encrypted,
        contractSignatureHash: hash,
        contractDisplayName: 'پرداخت مستقیم', // Direct Payment
        contractMobile: '',
        contractStatus: 'active' as const,
        isPrimary: existingMethods.length === 0, // Set as primary if first method
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      // Add to batch
      batch.add(batch.db.insert(paymentMethod).values(paymentMethodData));
      batch.add(batch.db.insert(billingEvent).values({
        userId: user.id,
        // Don't set paymentMethodId FK - it doesn't exist yet in same batch
        eventType: 'payment_method_recovered',
        eventData: {
          paymentMethodId: newPaymentMethodId, // Store in JSON for reference
          paymanAuthority,
          source: 'recovery_endpoint',
          signature: verifyResult.data.signature,
        },
        severity: 'info',
        createdAt: now,
        updatedAt: now,
      }));

      await batch.execute();

      apiLogger.info('Payment method recovered successfully', {
        userId: user.id,
        paymentMethodId: newPaymentMethodId,
      });

      return Responses.ok(c, {
        success: true,
        recovered: true,
        signature: verifyResult.data.signature,
        paymentMethod: paymentMethodData,
        message: 'Contract recovered successfully and payment method created.',
      });
    } catch (error) {
      apiLogger.error('Recovery failed with error', error as Error, {
        userId: user.id,
        paymanAuthority: paymanAuthority.slice(-8),
      });

      return Responses.ok(c, {
        success: false,
        recovered: false,
        message: 'An error occurred during contract recovery. Please try again or contact support.',
      });
    }
  },
);
