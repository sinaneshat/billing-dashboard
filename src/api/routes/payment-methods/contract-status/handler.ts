import type { RouteHandler } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';

import { createHandler, Responses } from '@/api/core';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
import { paymentMethod } from '@/db/tables/billing';

import type { getContractStatusRoute } from './route';
import type { DirectDebitContract } from './schema';

export const getContractStatusHandler: RouteHandler<typeof getContractStatusRoute, ApiEnv> = createHandler({
  auth: 'session',
  operationName: 'GetContractStatus',
}, async (c) => {
  const user = c.get('user');
  if (!user?.id) {
    throw new Error('User not authenticated');
  }

  const db = await getDbAsync();

  // Fetch user's payment methods
  const paymentMethods = await db
    .select()
    .from(paymentMethod)
    .where(eq(paymentMethod.userId, user.id))
    .all();

  // Find direct debit contracts
  const directDebitContracts = paymentMethods.filter(method =>
    method.contractType === 'direct_debit_contract',
  );

  // No direct debit contracts found
  if (directDebitContracts.length === 0) {
    const result: DirectDebitContract = {
      status: 'no_contract',
      canMakePayments: false,
      needsSetup: true,
      message: 'bankSetup.status.noContract',
    };
    return Responses.ok(c, result);
  }

  // Find active contract
  const activeContract = directDebitContracts.find(contract =>
    contract.isActive
    && contract.contractStatus === 'active'
    && contract.contractSignature,
  );

  if (activeContract) {
    // Check if contract is expired
    const now = new Date();
    const expiresAt = activeContract.contractExpiresAt ? new Date(activeContract.contractExpiresAt) : null;

    if (expiresAt && expiresAt < now) {
      const result: DirectDebitContract = {
        status: 'expired',
        contractId: activeContract.id,
        canMakePayments: false,
        needsSetup: true,
        message: 'bankSetup.status.expired',
      };
      return Responses.ok(c, result);
    }

    const result: DirectDebitContract = {
      status: 'active',
      contractId: activeContract.id,
      signature: activeContract.contractSignature || undefined,
      mobile: activeContract.contractMobile || undefined,
      maxDailyAmount: activeContract.maxDailyAmount || undefined,
      maxDailyCount: activeContract.maxDailyCount || undefined,
      maxMonthlyCount: activeContract.maxMonthlyCount || undefined,
      expiresAt: activeContract.contractExpiresAt?.toString() || undefined,
      verifiedAt: activeContract.contractVerifiedAt?.toString() || undefined,
      canMakePayments: true,
      needsSetup: false,
      message: 'bankSetup.status.active',
    };
    return Responses.ok(c, result);
  }

  // Check for pending contracts
  const pendingContract = directDebitContracts.find(contract =>
    contract.contractStatus === 'pending_signature',
  );

  if (pendingContract) {
    const result: DirectDebitContract = {
      status: 'pending',
      contractId: pendingContract.id,
      canMakePayments: false,
      needsSetup: true,
      message: 'bankSetup.status.pending',
    };
    return Responses.ok(c, result);
  }

  // Check for cancelled contracts
  const cancelledContract = directDebitContracts.find(contract =>
    contract.contractStatus === 'cancelled_by_user',
  );

  if (cancelledContract) {
    const result: DirectDebitContract = {
      status: 'cancelled',
      contractId: cancelledContract.id,
      canMakePayments: false,
      needsSetup: true,
      message: 'bankSetup.status.cancelled',
    };
    return Responses.ok(c, result);
  }

  // Invalid contract state
  const result: DirectDebitContract = {
    status: 'invalid',
    canMakePayments: false,
    needsSetup: true,
    message: 'bankSetup.status.unknown',
  };
  return Responses.ok(c, result);
});
