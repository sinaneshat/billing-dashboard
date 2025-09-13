/**
 * ZarinPal Direct Debit Handlers
 * Implementation following official ZarinPal Payman (Direct Debit) documentation
 * https://docs.zarinpal.com/paymentGateway/directPayment.html
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';

import { createError } from '@/api/common/error-handling';
import { parseMetadata } from '@/api/common/metadata-utils';
import {
  isZarinPalAuthError,
  isZarinPalServiceError,
} from '@/api/common/zarinpal-error-utils';
import { createHandler, Responses } from '@/api/core';
import { CurrencyExchangeService } from '@/api/services/currency-exchange';
import { ZarinPalService } from '@/api/services/zarinpal';
import { ZarinPalDirectDebitService } from '@/api/services/zarinpal-direct-debit';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { payment, paymentMethod, subscription } from '@/db/tables/billing';

import type {
  cancelDirectDebitContractRoute,
  directDebitCallbackRoute,
  executeDirectDebitPaymentRoute,
  getBankListRoute,
  initiateDirectDebitContractRoute,
  verifyDirectDebitContractRoute,
} from './route';
import {
  DirectDebitCallbackQuerySchema,
  DirectDebitContractParamsSchema,
  ExecuteDirectDebitPaymentRequestSchema,
  InitiateDirectDebitRequestSchema,
  validateMobileNumber,
  VerifyDirectDebitContractRequestSchema,
} from './schema';

// Contract storage - using database for serverless compatibility
// This stores contract requests temporarily during the signing process

/**
 * Handler for POST /payment-methods/direct-debit-setup
 * Step 1: Creates ZarinPal Payman contract request
 * Refactored: Now uses createHandler factory pattern with proper auth
 */
export const initiateDirectDebitContractHandler: RouteHandler<
  typeof initiateDirectDebitContractRoute,
  ApiEnv
> = createHandler(
  {
    auth: 'session',
    operationName: 'initiateDirectDebitContract',
    validateBody: InitiateDirectDebitRequestSchema,
  },
  async (c) => {
    const user = c.get('user');
    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    const {
      mobile,
      ssn,
      callbackUrl,
      contractDurationDays,
      maxDailyCount,
      maxMonthlyCount,
      maxAmount,
      metadata,
    } = c.validated.body;

    try {
      // Validate mobile number using schema-first approach with discriminated unions
      const mobileValidation = validateMobileNumber(mobile);
      if (!mobileValidation.success) {
        const errorMessage = mobileValidation.errors[0]?.message || 'Invalid mobile number format';
        throw createError.validation(errorMessage);
      }

      const zarinpalService = ZarinPalDirectDebitService.create(c.env);

      // Calculate contract expiry date
      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + contractDurationDays);
      const expireAtString = expireAt.toISOString();

      // Step 1: Request contract from ZarinPal
      const contractResult = await zarinpalService.requestContract({
        mobile,
        ssn,
        expire_at: expireAtString,
        max_daily_count: maxDailyCount.toString(),
        max_monthly_count: maxMonthlyCount.toString(),
        max_amount: maxAmount.toString(),
        callback_url: callbackUrl,
      });

      if (!contractResult.data?.payman_authority) {
        throw createError.zarinpal('Direct debit service temporarily unavailable');
      }

      const paymanAuthority = contractResult.data.payman_authority;

      // Step 2: Get available banks
      const bankListResult = await zarinpalService.getBankList();

      if (!bankListResult.data?.banks || bankListResult.data.banks.length === 0) {
        throw createError.zarinpal('Direct debit service temporarily unavailable');
      }

      const banks = bankListResult.data.banks;

      // Store contract request in database using payment_method table temporarily
      const contractId = crypto.randomUUID();
      const now = new Date();

      await db.insert(paymentMethod).values({
        id: contractId,
        userId: user.id,
        contractType: 'pending_contract',
        contractStatus: 'pending_signature',
        paymanAuthority, // Store payman authority temporarily
        contractDisplayName: 'Direct Debit Contract (Pending)',
        contractMobile: mobile,
        contractDurationDays,
        maxDailyAmount: maxAmount,
        maxDailyCount,
        maxMonthlyCount,
        isPrimary: false,
        isActive: false, // Will be activated after signature verification
        createdAt: now,
        updatedAt: now,
        metadata: {
          type: 'direct_debit_contract',
          ssn,
          expireAt: expireAtString,
          callbackUrl,
          userMetadata: metadata,
        },
      });

      // Return contract setup data
      return Responses.ok(c, {
        paymanAuthority,
        banks: banks.map(bank => ({
          name: bank.name,
          slug: bank.slug,
          bankCode: bank.bank_code,
          maxDailyAmount: bank.max_daily_amount,
          maxDailyCount: bank.max_daily_count,
        })),
        contractSigningUrl: 'https://www.zarinpal.com/pg/StartPayman/{PAYMAN_AUTHORITY}/{BANK_CODE}',
        contractId,
      });
    } catch (error) {
      if (error instanceof HTTPException) {
        // Check if this is a structured ZarinPal error following codebase patterns
        if (error.cause && typeof error.cause === 'object' && error.cause !== null) {
          const cause = error.cause;
          if (
            'provider' in cause
            && 'zarinpal_code' in cause
            && 'zarinpal_message' in cause
            && cause.provider === 'zarinpal'
            && typeof cause.zarinpal_code === 'number'
          ) {
            const zarinpalCode = cause.zarinpal_code;

            // Handle specific ZarinPal error cases
            if (isZarinPalAuthError(zarinpalCode)) {
              if (zarinpalCode === -74) {
                throw createError.unauthorized('Invalid merchant configuration');
              } else if (zarinpalCode === -80) {
                throw createError.unauthorized('Merchant access denied for direct debit');
              }
            }

            if (isZarinPalServiceError(zarinpalCode)) {
              throw createError.zarinpal('ZarinPal service temporarily unavailable');
            }

            // For other ZarinPal errors, use the generic contract failed error
            const errorMessage = typeof cause.zarinpal_message === 'string'
              ? cause.zarinpal_message
              : `Contract setup failed (Code: ${zarinpalCode})`;
            throw createError.zarinpal(errorMessage);
          }
        }

        throw error;
      }

      throw createError.internal('Failed to set up direct debit contract');
    }
  },
);
/**
 * Handler for POST /payment-methods/verify-direct-debit-contract
 * Step 2: Verifies contract signing and gets signature
 * Refactored: Now uses createHandler factory pattern with proper auth
 */
export const verifyDirectDebitContractHandler: RouteHandler<
  typeof verifyDirectDebitContractRoute,
  ApiEnv
> = createHandler(
  {
    auth: 'session',
    operationName: 'verifyDirectDebitContract',
    validateBody: VerifyDirectDebitContractRequestSchema,
  },
  async (c) => {
    const user = c.get('user');
    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    const { paymanAuthority, status, contractId } = c.validated.body;

    try {
    // Get stored contract request
      const storedContract = await db
        .select()
        .from(paymentMethod)
        .where(
          and(
            eq(paymentMethod.id, contractId),
            eq(paymentMethod.userId, user.id),
            eq(paymentMethod.paymanAuthority, paymanAuthority),
            eq(paymentMethod.contractType, 'pending_contract'),
          ),
        )
        .limit(1);

      if (!storedContract.length || !storedContract[0]) {
        throw createError.notFound('Direct debit contract request');
      }

      const contract = storedContract[0];

      // Check if user cancelled the contract
      if (status === 'NOK') {
        await db
          .update(paymentMethod)
          .set({
            contractStatus: 'cancelled_by_user',
            isActive: false,
            updatedAt: new Date(),
            metadata: {
              ...parseMetadata(contract.metadata),
              cancelledAt: new Date().toISOString(),
            },
          })
          .where(eq(paymentMethod.id, contractId));

        return Responses.ok(c, {
          contractVerified: false,
          error: {
            code: 'user_cancelled',
            message: 'Direct debit contract was cancelled by user',
          },
        });
      }

      const zarinpalService = ZarinPalDirectDebitService.create(c.env);

      // Step 3: Verify contract and get signature
      const signatureResult = await zarinpalService.verifyContractAndGetSignature({
        payman_authority: paymanAuthority,
      });

      if (!signatureResult.data?.signature) {
        await db
          .update(paymentMethod)
          .set({
            contractStatus: 'verification_failed',
            isActive: false,
            updatedAt: new Date(),
            metadata: {
              ...parseMetadata(contract.metadata),
              error: signatureResult.data?.message || 'Contract verification failed',
              failedAt: new Date().toISOString(),
            },
          })
          .where(eq(paymentMethod.id, contractId));

        return Responses.ok(c, {
          contractVerified: false,
          error: {
            code: signatureResult.data?.code?.toString() || 'verification_failed',
            message: signatureResult.data?.message || 'Contract verification failed',
          },
        });
      }

      const signature = signatureResult.data.signature;

      // Check if this signature already exists for this user
      const existingMethod = await db
        .select()
        .from(paymentMethod)
        .where(
          and(
            eq(paymentMethod.userId, user.id),
            eq(paymentMethod.isActive, true),
          ),
        );

      const existingSignature = existingMethod.find(
        pm => pm.contractSignature === signature,
      );

      if (existingSignature) {
        // Remove the temporary contract record
        await db.delete(paymentMethod).where(eq(paymentMethod.id, contractId));

        return Responses.ok(c, {
          contractVerified: true,
          signature,
          paymentMethodId: existingSignature.id,
        });
      }

      // Check if this should be the primary payment method
      const existingMethods = await db
        .select()
        .from(paymentMethod)
        .where(
          and(
            eq(paymentMethod.userId, user.id),
            eq(paymentMethod.isPrimary, true),
            eq(paymentMethod.isActive, true),
          ),
        );

      const shouldBePrimary = existingMethods.length === 0;

      // Update contract record to become active payment method
      const now = new Date();
      await db
        .update(paymentMethod)
        .set({
          contractType: 'direct_debit_contract',
          contractStatus: 'active',
          contractSignature: signature, // Store ZarinPal contract signature
          contractDisplayName: 'Direct Debit Contract',
          paymanAuthority: null, // Clear temporary authority
          isPrimary: shouldBePrimary,
          isActive: true,
          lastUsedAt: now,
          contractVerifiedAt: now,
          updatedAt: now,
          metadata: {
            ...parseMetadata(contract.metadata),
            paymanAuthority, // Keep in metadata for reference
          },
        })
        .where(eq(paymentMethod.id, contractId));

      return Responses.ok(c, {
        contractVerified: true,
        signature,
        paymentMethodId: contractId,
      });
    } catch (error) {
      if (error instanceof HTTPException) {
        // Check if this is a structured ZarinPal error following codebase patterns
        if (error.cause && typeof error.cause === 'object' && error.cause !== null) {
          const cause = error.cause;
          if (
            'provider' in cause
            && 'zarinpal_code' in cause
            && 'zarinpal_message' in cause
            && cause.provider === 'zarinpal'
            && typeof cause.zarinpal_code === 'number'
          ) {
            const zarinpalCode = cause.zarinpal_code;

            // Handle specific ZarinPal error cases
            if (isZarinPalAuthError(zarinpalCode)) {
              if (zarinpalCode === -74) {
                throw createError.unauthorized('Invalid merchant configuration');
              } else if (zarinpalCode === -80) {
                throw createError.unauthorized('Merchant access denied for direct debit');
              }
            }

            if (isZarinPalServiceError(zarinpalCode)) {
              throw createError.zarinpal('ZarinPal service temporarily unavailable');
            }

            // For transaction-related errors during verification, use transaction failed error
            const errorMessage = typeof cause.zarinpal_message === 'string'
              ? cause.zarinpal_message
              : `Transaction verification failed (Code: ${zarinpalCode})`;
            throw createError.zarinpal(errorMessage);
          }
        }

        throw error;
      }
      throw createError.internal('Failed to verify direct debit contract');
    }
  },
);

// ============================================================================
// NEW HANDLERS FOR COMPLETE DIRECT DEBIT FLOW
// ============================================================================

/**
 * Handler for GET /payment-methods/direct-debit/banks
 * Get list of available banks for contract signing
 */
export const getBankListHandler: RouteHandler<typeof getBankListRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getBankList',
  },
  async (c) => {
    try {
      const zarinpalService = ZarinPalDirectDebitService.create(c.env);

      const bankListResult = await zarinpalService.getBankList();

      if (!bankListResult.data?.banks || bankListResult.data.banks.length === 0) {
        throw createError.zarinpal('Direct debit service temporarily unavailable');
      }

      const banks = bankListResult.data.banks.map(bank => ({
        name: bank.name,
        slug: bank.slug,
        bankCode: bank.bank_code,
        maxDailyAmount: bank.max_daily_amount,
        maxDailyCount: bank.max_daily_count,
      }));

      return Responses.ok(c, { banks });
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw createError.internal('Failed to fetch bank list');
    }
  },
);

/**
 * Handler for POST /payment-methods/direct-debit/charge
 * Execute direct debit payment with automatic currency conversion
 */
export const executeDirectDebitPaymentHandler: RouteHandler<
  typeof executeDirectDebitPaymentRoute,
  ApiEnv
> = createHandler(
  {
    auth: 'session',
    operationName: 'executeDirectDebitPayment',
    validateBody: ExecuteDirectDebitPaymentRequestSchema,
  },
  async (c) => {
    const user = c.get('user');
    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    const { paymentMethodId, subscriptionId, usdAmount, description, metadata } = c.validated.body;

    c.logger.info('Executing direct debit payment', {
      logType: 'operation',
      operationName: 'executeDirectDebitPayment',
      userId: user.id,
      resource: `paymentMethod:${paymentMethodId}`,
    });

    try {
      // 1. Verify payment method belongs to user and is active
      const paymentMethodRecord = await db
        .select()
        .from(paymentMethod)
        .where(
          and(
            eq(paymentMethod.id, paymentMethodId),
            eq(paymentMethod.userId, user.id),
            eq(paymentMethod.isActive, true),
            eq(paymentMethod.contractType, 'direct_debit_contract'),
          ),
        )
        .limit(1);

      if (!paymentMethodRecord.length || !paymentMethodRecord[0]?.contractSignature) {
        throw createError.notFound('Active direct debit contract not found');
      }

      const contract = paymentMethodRecord[0];

      // 2. Verify subscription belongs to user
      const subscriptionRecord = await db
        .select()
        .from(subscription)
        .where(
          and(
            eq(subscription.id, subscriptionId),
            eq(subscription.userId, user.id),
          ),
        )
        .limit(1);

      if (!subscriptionRecord.length || !subscriptionRecord[0]) {
        throw createError.notFound('Subscription not found');
      }

      const subscriptionData = subscriptionRecord[0];

      // Convert USD to IRR using centralized service
      const currencyService = CurrencyExchangeService.create(c.env);
      const exchangeResult = await currencyService.convertUsdToToman(usdAmount);
      const exchangeRate = exchangeResult.exchangeRate;

      // Use the converted amount from the service
      const irrAmount = exchangeResult.tomanPrice;

      c.logger.info('Currency conversion completed', {
        logType: 'operation',
        operationName: 'currencyConversion',
        resource: `USD:${usdAmount} -> IRR:${irrAmount} (Rate:${exchangeRate})`,
      });

      // 4. Create payment record
      const paymentId = crypto.randomUUID();
      const now = new Date();

      const paymentRecord = {
        id: paymentId,
        userId: user.id,
        subscriptionId,
        productId: subscriptionData.productId,
        amount: irrAmount, // Store in IRR as expected by ZarinPal
        status: 'pending' as const,
        paymentMethod: 'zarinpal_direct_debit',
        zarinpalDirectDebitUsed: true,
        createdAt: now,
        updatedAt: now,
        metadata: {
          originalUsdAmount: usdAmount,
          exchangeRate,
          conversionTimestamp: now.toISOString(),
          description,
          directDebitContractId: contract.id,
          userMetadata: metadata,
        },
      };

      await db.insert(payment).values(paymentRecord);

      // 5. Create ZarinPal payment request first (Step 1)
      const zarinpalService = ZarinPalService.create(c.env);
      const paymentRequest = await zarinpalService.requestPayment({
        amount: irrAmount,
        currency: 'IRR',
        description,
        callbackUrl: `${c.env.NEXT_PUBLIC_APP_URL}/api/webhooks/zarinpal`, // Standard webhook
        metadata: {
          subscriptionId,
          paymentId,
          isDirectDebit: true,
        },
      });

      if (!paymentRequest.data?.authority) {
        throw createError.zarinpal('Failed to create payment request');
      }

      const authority = paymentRequest.data.authority;

      // 6. Update payment with authority
      await db
        .update(payment)
        .set({
          zarinpalAuthority: authority,
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentId));

      // 7. Execute direct debit transaction (Step 2)
      const directDebitService = ZarinPalDirectDebitService.create(c.env);

      // Contract signature was validated above, but TypeScript needs explicit check
      if (!contract.contractSignature) {
        throw createError.internal('Contract signature missing after validation');
      }

      const directResult = await directDebitService.executeDirectTransaction({
        authority,
        signature: contract.contractSignature,
      });

      if (directResult.data?.code === 100) {
        // Payment successful
        const refId = directResult.data.refrence_id?.toString();

        await db
          .update(payment)
          .set({
            status: 'completed',
            zarinpalRefId: refId,
            paidAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payment.id, paymentId));

        // Update payment method last used
        await db
          .update(paymentMethod)
          .set({
            lastUsedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(paymentMethod.id, paymentMethodId));

        c.logger.info('Direct debit payment successful', {
          logType: 'operation',
          operationName: 'directDebitSuccess',
          resource: `payment:${paymentId} zarinpal:${refId}`,
        });

        return Responses.ok(c, {
          success: true,
          paymentId,
          zarinpalRefId: refId,
          irrAmount,
          exchangeRate,
          transactionDate: new Date().toISOString(),
        });
      } else {
        // Payment failed
        const errorMessage = directResult.data?.message || 'Direct debit payment failed';

        await db
          .update(payment)
          .set({
            status: 'failed',
            failureReason: errorMessage,
            failedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(payment.id, paymentId));

        throw createError.paymentFailed(errorMessage);
      }
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw createError.internal('Failed to execute direct debit payment');
    }
  },
);

/**
 * Handler for DELETE /payment-methods/direct-debit/{contractId}
 * Cancel direct debit contract
 */
export const cancelDirectDebitContractHandler: RouteHandler<
  typeof cancelDirectDebitContractRoute,
  ApiEnv
> = createHandler(
  {
    auth: 'session',
    validateParams: DirectDebitContractParamsSchema,
    operationName: 'cancelDirectDebitContract',
  },
  async (c) => {
    const user = c.get('user');
    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    const { contractId } = c.validated.params;

    try {
      // Find the contract
      const contractRecord = await db
        .select()
        .from(paymentMethod)
        .where(
          and(
            eq(paymentMethod.id, contractId),
            eq(paymentMethod.userId, user.id),
            eq(paymentMethod.contractType, 'direct_debit_contract'),
            eq(paymentMethod.isActive, true),
          ),
        )
        .limit(1);

      if (!contractRecord.length || !contractRecord[0]?.contractSignature) {
        throw createError.notFound('Active direct debit contract not found');
      }

      const contract = contractRecord[0];
      const contractSignature = contract.contractSignature;

      if (!contractSignature) {
        throw createError.badRequest('Contract signature is missing');
      }

      // Cancel with ZarinPal
      const zarinpalService = ZarinPalDirectDebitService.create(c.env);
      await zarinpalService.cancelContract({
        signature: contractSignature,
      });

      // Update contract status in database
      const cancelledAt = new Date();
      await db
        .update(paymentMethod)
        .set({
          contractStatus: 'cancelled_by_user',
          isActive: false,
          updatedAt: cancelledAt,
          metadata: {
            ...parseMetadata(contract.metadata),
            cancelledAt: cancelledAt.toISOString(),
            cancelledBy: user.id,
          },
        })
        .where(eq(paymentMethod.id, contractId));

      // Pause related active subscriptions
      await db
        .update(subscription)
        .set({
          status: 'canceled',
          endDate: cancelledAt,
          updatedAt: cancelledAt,
          metadata: {
            pauseReason: 'direct_debit_contract_cancelled',
            pausedAt: cancelledAt.toISOString(),
          },
        })
        .where(
          and(
            eq(subscription.userId, user.id),
            eq(subscription.status, 'active'),
            eq(subscription.directDebitContractId, contract.id),
          ),
        );

      return Responses.ok(c, {
        success: true,
        message: 'Direct debit contract cancelled successfully',
        cancelledAt: cancelledAt.toISOString(),
      });
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      throw createError.internal('Failed to cancel direct debit contract');
    }
  },
);

/**
 * Handler for GET /payment-methods/direct-debit/callback
 * Handle ZarinPal redirect after contract signing
 */
export const directDebitCallbackHandler: RouteHandler<
  typeof directDebitCallbackRoute,
  ApiEnv
> = createHandler(
  {
    auth: 'public', // No auth needed for callback
    validateQuery: DirectDebitCallbackQuerySchema,
    operationName: 'directDebitCallback',
  },
  async (c) => {
    const { payman_authority, status } = c.validated.query;

    // Redirect to frontend with status information
    // Frontend will then call verify-direct-debit-contract endpoint
    const frontendUrl = new URL('/billing/payment-methods/direct-debit/callback', c.env.NEXT_PUBLIC_APP_URL);
    frontendUrl.searchParams.set('payman_authority', payman_authority);
    frontendUrl.searchParams.set('status', status);

    return c.redirect(frontendUrl.toString(), 302);
  },
);
