/**
 * Payment Methods Route Handlers - Refactored
 *
 * Uses the factory pattern for consistent authentication, validation,
 * transaction management, and error handling. Leverages the repository
 * pattern for clean data access.
 */

import type { RouteHandler } from '@hono/zod-openapi';

import { createError } from '@/api/common/error-handling';
import { ok } from '@/api/common/responses';
import { createHandler, createHandlerWithTransaction } from '@/api/patterns/route-handler-factory';
import { billingRepositories } from '@/api/repositories/billing-repositories';
import type { ApiEnv } from '@/api/types';

import type {
  createPaymentMethodRoute,
  deletePaymentMethodRoute,
  getPaymentMethodsRoute,
  setDefaultPaymentMethodRoute,
} from './route';
import type { PaymentMethodParams } from './schema';
import {
  CreatePaymentMethodRequestSchema,
  PaymentMethodParamsSchema,
} from './schema';

// ============================================================================
// PAYMENT METHOD HANDLERS
// ============================================================================

/**
 * GET /payment-methods - Get user payment methods
 * ✅ Refactored: Uses factory pattern + repositories
 */
export const getPaymentMethodsHandler: RouteHandler<typeof getPaymentMethodsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getPaymentMethods',
  },
  async (c) => {
    const user = c.get('user')!; // Guaranteed by auth: 'session'
    c.logger.info('Fetching payment methods for user', { userId: user.id });

    // Use repository instead of direct DB query
    const paymentMethods = await billingRepositories.paymentMethods.findPaymentMethodsByUserId(user.id);

    c.logger.info('Payment methods retrieved successfully', {
      count: paymentMethods.length,
    });

    return ok(c, paymentMethods);
  },
);

/**
 * POST /payment-methods - Create new payment method
 * ✅ Refactored: Uses factory pattern + repositories + transaction
 * Note: This is currently not supported as payment methods are created through direct debit contract setup
 */
export const createPaymentMethodHandler: RouteHandler<typeof createPaymentMethodRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    validateBody: CreatePaymentMethodRequestSchema,
    operationName: 'createPaymentMethod',
  },
  async (c) => {
    const user = c.get('user')!;

    c.logger.warn('Direct payment method creation attempted', { userId: user.id });

    // Payment methods are created through direct debit contract setup process
    // This maintains the existing business logic but with proper factory patterns
    throw createError.internal('Direct payment method creation is not supported. Use the direct debit contract setup process.');
  },
);

/**
 * DELETE /payment-methods/{id} - Delete payment method
 * ✅ Refactored: Uses factory pattern + repositories + transaction
 */
export const deletePaymentMethodHandler: RouteHandler<typeof deletePaymentMethodRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    validateParams: PaymentMethodParamsSchema,
    operationName: 'deletePaymentMethod',
  },
  async (c, tx) => {
    const user = c.get('user')!;
    const { id } = c.validated.params as PaymentMethodParams;

    c.logger.info('Deleting payment method', {
      paymentMethodId: id,
      userId: user.id,
    });

    // Find payment method using repository
    const paymentMethodRecord = await billingRepositories.paymentMethods.findById(id);

    if (!paymentMethodRecord || paymentMethodRecord.userId !== user.id || !paymentMethodRecord.isActive) {
      c.logger.warn('Payment method not found for deletion', {
        paymentMethodId: id,
        userId: user.id,
      });
      throw createError.notFound('Payment method');
    }

    // Check if payment method is being used by any active subscriptions
    const activeSubscriptions = await billingRepositories.subscriptions.findSubscriptionsByUserId(
      user.id,
      { status: 'active' },
    );

    const isUsedBySubscription = activeSubscriptions.some(sub => sub.paymentMethodId === id);

    if (isUsedBySubscription) {
      c.logger.warn('Cannot delete payment method in use by active subscription', {
        paymentMethodId: id,
      });
      throw createError.conflict('Cannot delete payment method that is used by active subscriptions');
    }

    const deletedAt = new Date();

    // Soft delete the payment method
    await billingRepositories.paymentMethods.update(
      id,
      {
        isActive: false,
        isPrimary: false, // Remove primary status when deleting
        updatedAt: deletedAt,
      },
      { tx },
    );

    // Log deletion event
    await billingRepositories.billingEvents.logEvent({
      userId: user.id,
      subscriptionId: null,
      paymentId: null,
      paymentMethodId: id,
      eventType: 'payment_method_deleted',
      eventData: {
        contractSignature: paymentMethodRecord.contractSignature,
        contractType: paymentMethodRecord.contractType,
        wasPrimary: paymentMethodRecord.isPrimary,
        deletedAt: deletedAt.toISOString(),
      },
      severity: 'info',
    }, tx);

    c.logger.info('Payment method deleted successfully', { paymentMethodId: id });

    return ok(c, {
      id,
      deleted: true,
      deletedAt: deletedAt.toISOString(),
    });
  },
);

/**
 * PATCH /payment-methods/{id}/default - Set primary payment method
 * ✅ Refactored: Uses factory pattern + repositories + transaction
 */
export const setDefaultPaymentMethodHandler: RouteHandler<typeof setDefaultPaymentMethodRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    validateParams: PaymentMethodParamsSchema,
    operationName: 'setDefaultPaymentMethod',
  },
  async (c, tx) => {
    const user = c.get('user')!;
    const { id } = c.validated.params as PaymentMethodParams;

    c.logger.info('Setting primary payment method', {
      paymentMethodId: id,
      userId: user.id,
    });

    // Find payment method using repository
    const paymentMethodRecord = await billingRepositories.paymentMethods.findById(id);

    if (!paymentMethodRecord || paymentMethodRecord.userId !== user.id || !paymentMethodRecord.isActive) {
      c.logger.warn('Payment method not found for primary setting', {
        paymentMethodId: id,
        userId: user.id,
      });
      throw createError.notFound('Payment method');
    }

    if (paymentMethodRecord.contractStatus !== 'active') {
      c.logger.warn('Cannot set inactive contract as primary', {
        paymentMethodId: id,
        contractStatus: paymentMethodRecord.contractStatus,
      });
      throw createError.internal('Cannot set inactive payment contract as primary');
    }

    // Use repository method to set primary (handles removing primary from others)
    const updatedPaymentMethod = await billingRepositories.paymentMethods.setPrimary(id, user.id, tx);

    // Log primary change event
    await billingRepositories.billingEvents.logEvent({
      userId: user.id,
      subscriptionId: null,
      paymentId: null,
      paymentMethodId: id,
      eventType: 'payment_method_set_primary',
      eventData: {
        contractSignature: paymentMethodRecord.contractSignature,
        contractType: paymentMethodRecord.contractType,
        updatedAt: updatedPaymentMethod.updatedAt,
      },
      severity: 'info',
    }, tx);

    c.logger.info('Primary payment method set successfully', { paymentMethodId: id });

    return ok(c, {
      id,
      isPrimary: true,
      updatedAt: updatedPaymentMethod.updatedAt.toISOString(),
    });
  },
);
