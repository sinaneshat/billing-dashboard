/**
 * ZarinPal Direct Debit Handlers
 * Implementation following official ZarinPal Payman (Direct Debit) documentation
 * https://docs.zarinpal.com/paymentGateway/directPayment.html
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { ok } from '@/api/common/responses';
import { ZarinPalDirectDebitService } from '@/api/services/zarinpal-direct-debit';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { paymentMethod } from '@/db/tables/billing';

import type {
  initiateDirectDebitContractRoute,
  verifyDirectDebitContractRoute,
} from './direct-debit-routes';

// Contract storage - using database for serverless compatibility
// This stores contract requests temporarily during the signing process

/**
 * Handler for POST /payment-methods/direct-debit-setup
 * Step 1: Creates ZarinPal Payman contract request
 */
export const initiateDirectDebitContractHandler: RouteHandler<
  typeof initiateDirectDebitContractRoute,
  ApiEnv
> = async (c) => {
  c.header('X-Route', 'initiate-direct-debit-contract');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required to set up direct debit',
    });
  }

  if (!user.id || !user.email) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Invalid user session. Please log in again.',
    });
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
  } = c.req.valid('json');

  try {
    console.warn('[DIRECT_DEBIT] Starting contract setup for user:', user.id);

    // Validate mobile number format (Iranian format)
    if (!/^(?:\+98|0)?9\d{9}$/.test(mobile)) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Invalid mobile number. Please use Iranian mobile format (09xxxxxxxxx)',
      });
    }

    const zarinpalService = ZarinPalDirectDebitService.create(c.env);
    console.warn('[DIRECT_DEBIT] ZarinPal service created');

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
      throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
        message: 'Failed to create direct debit contract with ZarinPal',
      });
    }

    const paymanAuthority = contractResult.data.payman_authority;
    console.warn('[DIRECT_DEBIT] Got payman authority:', paymanAuthority);

    // Step 2: Get available banks
    const bankListResult = await zarinpalService.getBankList();

    if (!bankListResult.data?.banks || bankListResult.data.banks.length === 0) {
      throw new HTTPException(HttpStatusCodes.BAD_GATEWAY, {
        message: 'No banks available for direct debit contract signing',
      });
    }

    const banks = bankListResult.data.banks;
    console.warn('[DIRECT_DEBIT] Retrieved bank list:', banks.length, 'banks');

    // Store contract request in database using payment_method table temporarily
    const contractId = crypto.randomUUID();
    const now = new Date();

    await db.insert(paymentMethod).values({
      id: contractId,
      userId: user.id,
      zarinpalCardHash: paymanAuthority, // Store payman authority temporarily
      cardMask: 'CONTRACT_PENDING', // Marker for contract in progress
      cardType: 'direct_debit_contract',
      isPrimary: false,
      isActive: false, // Will be activated after signature verification
      createdAt: now,
      updatedAt: now,
      metadata: {
        type: 'direct_debit_contract',
        status: 'pending_signature',
        mobile,
        ssn,
        contractDurationDays,
        maxDailyCount,
        maxMonthlyCount,
        maxAmount,
        expireAt: expireAtString,
        callbackUrl,
        paymanAuthority,
        userMetadata: metadata,
      },
    });

    console.warn('[DIRECT_DEBIT] Contract request stored with ID:', contractId);

    // Return contract setup data
    return ok(c, {
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
      throw error;
    }
    console.error('[DIRECT_DEBIT] Contract setup error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to set up direct debit contract',
    });
  }
};
/**
 * Handler for POST /payment-methods/verify-direct-debit-contract
 * Step 2: Verifies contract signing and gets signature
 */
export const verifyDirectDebitContractHandler: RouteHandler<
  typeof verifyDirectDebitContractRoute,
  ApiEnv
> = async (c) => {
  c.header('X-Route', 'verify-direct-debit-contract');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { paymanAuthority, status, contractId } = c.req.valid('json');

  try {
    console.warn('[DIRECT_DEBIT] Verifying contract:', { paymanAuthority, status, contractId });

    // Get stored contract request
    const storedContract = await db
      .select()
      .from(paymentMethod)
      .where(
        and(
          eq(paymentMethod.id, contractId),
          eq(paymentMethod.userId, user.id),
          eq(paymentMethod.zarinpalCardHash, paymanAuthority),
          eq(paymentMethod.cardType, 'direct_debit_contract'),
        ),
      )
      .limit(1);

    if (!storedContract.length) {
      throw new HTTPException(HttpStatusCodes.BAD_REQUEST, {
        message: 'Invalid or expired direct debit contract request',
      });
    }

    const contract = storedContract[0]!;

    // Check if user cancelled the contract
    if (status === 'NOK') {
      await db
        .update(paymentMethod)
        .set({
          isActive: false,
          updatedAt: new Date(),
          metadata: {
            ...(contract.metadata as Record<string, unknown> || {}),
            status: 'cancelled_by_user',
            cancelledAt: new Date().toISOString(),
          },
        })
        .where(eq(paymentMethod.id, contractId));

      return ok(c, {
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
          isActive: false,
          updatedAt: new Date(),
          metadata: {
            ...(contract.metadata as Record<string, unknown> || {}),
            status: 'verification_failed',
            error: signatureResult.data?.message || 'Contract verification failed',
            failedAt: new Date().toISOString(),
          },
        })
        .where(eq(paymentMethod.id, contractId));

      return ok(c, {
        contractVerified: false,
        error: {
          code: signatureResult.data?.code?.toString() || 'verification_failed',
          message: signatureResult.data?.message || 'Contract verification failed',
        },
      });
    }

    const signature = signatureResult.data.signature;
    console.warn('[DIRECT_DEBIT] Got signature from ZarinPal');

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
      pm => (pm.metadata as Record<string, unknown>)?.signature === signature,
    );

    if (existingSignature) {
      // Remove the temporary contract record
      await db.delete(paymentMethod).where(eq(paymentMethod.id, contractId));

      return ok(c, {
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
        zarinpalCardHash: signature, // Store signature as the identifier
        cardMask: 'Direct Debit', // Display name
        cardType: 'direct_debit',
        isPrimary: shouldBePrimary,
        isActive: true,
        lastUsedAt: now,
        updatedAt: now,
        metadata: {
          ...(contract.metadata as Record<string, unknown> || {}),
          status: 'active',
          signature,
          paymanAuthority,
          contractVerifiedAt: now.toISOString(),
        },
      })
      .where(eq(paymentMethod.id, contractId));

    console.warn('[DIRECT_DEBIT] Payment method created/updated:', contractId);

    return ok(c, {
      contractVerified: true,
      signature,
      paymentMethodId: contractId,
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('[DIRECT_DEBIT] Contract verification error:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to verify direct debit contract',
    });
  }
};
