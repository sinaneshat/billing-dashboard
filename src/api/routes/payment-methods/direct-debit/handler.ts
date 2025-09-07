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
import { ZarinPalDirectDebitService } from '@/api/services/zarinpal-direct-debit';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { paymentMethod } from '@/db/tables/billing';

import type {
  initiateDirectDebitContractRoute,
  verifyDirectDebitContractRoute,
} from './route';
import {
  InitiateDirectDebitRequestSchema,
  VerifyDirectDebitContractRequestSchema,
} from './schema';

// Contract storage - using database for serverless compatibility
// This stores contract requests temporarily during the signing process

/**
 * Handler for POST /payment-methods/direct-debit-setup
 * Step 1: Creates ZarinPal Payman contract request
 * ✅ Refactored: Now uses createHandler factory pattern with proper auth
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
    const user = c.get('user')!; // Safe to use ! because createHandler validates session auth

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
    // Validate mobile number format (Iranian format)
      if (!/^(?:\+98|0)?9\d{9}$/.test(mobile)) {
        throw createError.notFound('Invalid mobile number. Please use Iranian mobile format (09xxxxxxxxx)');
      }

      const zarinpalService = ZarinPalDirectDebitService.create(c.env);

      // Calculate contract expiry date
      const expireAt = new Date();
      expireAt.setDate(expireAt.getDate() + contractDurationDays);
      const expireAtString = expireAt.toISOString().replace('T', ' ').slice(0, 19);

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
      // Check if this is a structured ZarinPal error
        const cause = error.cause as {
          provider?: string;
          zarinpal_code?: number;
          zarinpal_message?: string;
        };
        if (cause?.provider === 'zarinpal' && cause?.zarinpal_code) {
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
          throw createError.zarinpal(cause.zarinpal_message || `Contract setup failed (Code: ${zarinpalCode})`);
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
 * ✅ Refactored: Now uses createHandler factory pattern with proper auth
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
    const user = c.get('user')!; // Safe to use ! because createHandler validates session auth

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

      if (!storedContract.length) {
        throw createError.notFound('Direct debit contract request');
      }

      const contract = storedContract[0]!;

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
      // Check if this is a structured ZarinPal error
        const cause = error.cause as {
          provider?: string;
          zarinpal_code?: number;
          zarinpal_message?: string;
        };
        if (cause?.provider === 'zarinpal' && cause?.zarinpal_code) {
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
          throw createError.zarinpal(cause.zarinpal_message || `Transaction verification failed (Code: ${zarinpalCode})`);
        }

        throw error;
      }
      throw createError.internal('Failed to verify direct debit contract');
    }
  },
);
