/**
 * Payment Methods Route Handlers - Direct Database Access
 *
 * Uses the factory pattern for consistent authentication, validation,
 * transaction management, and error handling. Uses direct database
 * access for all operations following unified backend pattern.
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { and, eq } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import { createHandler, createHandlerWithTransaction, Responses } from '@/api/core';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { billingEvent, paymentMethod, subscription } from '@/db/tables/billing';

import type {
  createPaymentMethodRoute,
  deletePaymentMethodRoute,
  getPaymentMethodsRoute,
  setDefaultPaymentMethodRoute,
} from './route';
import {
  CreatePaymentMethodRequestSchema,
} from './schema';

/**
 * Get all payment methods for the authenticated user
 */
export const getPaymentMethodsHandler: RouteHandler<typeof getPaymentMethodsRoute, ApiEnv> = createHandler(
  {
    auth: 'session',
    operationName: 'getPaymentMethods',
  },
  async (c) => {
    const user = c.get('user')!; // Guaranteed by auth: 'session'
    c.logger.info('Fetching payment methods for user', { logType: 'operation', operationName: 'getPaymentMethods', userId: user.id });

    // Direct database access for payment methods
    const paymentMethods = await db.select().from(paymentMethod).where(and(
      eq(paymentMethod.userId, user.id),
      eq(paymentMethod.isActive, true),
    ));

    c.logger.info('Payment methods retrieved successfully', {
      logType: 'operation',
      operationName: 'getPaymentMethods',
      userId: user.id,
      resource: `methods[${paymentMethods.length}]`,
    });

    return Responses.ok(c, paymentMethods);
  },
);

/**
 * Create a new payment method
 */
export const createPaymentMethodHandler: RouteHandler<typeof createPaymentMethodRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    validateBody: CreatePaymentMethodRequestSchema,
    operationName: 'createPaymentMethod',
  },
  async (c, tx) => {
    const user = c.get('user')!;
    const { zarinpalCardHash, cardMask, cardType, expiresAt, setPrimary } = c.validated.body;

    c.logger.info('Creating payment method from tokenized card', {
      logType: 'operation',
      operationName: 'createPaymentMethod',
      userId: user.id,
    });

    // Check if card hash already exists
    const existingMethod = await db.select().from(paymentMethod).where(eq(paymentMethod.contractSignature, zarinpalCardHash)).limit(1);

    if (existingMethod.length > 0) {
      throw createError.conflict('Payment method with this card already exists');
    }

    // If setting as primary, remove primary from other methods first
    if (setPrimary) {
      await tx.update(paymentMethod)
        .set({ isPrimary: false, updatedAt: new Date() })
        .where(and(
          eq(paymentMethod.userId, user.id),
          eq(paymentMethod.isActive, true),
        ));
    }

    // Create new payment method from tokenized card
    const newPaymentMethod = {
      id: crypto.randomUUID(),
      userId: user.id,
      contractType: 'direct_debit_contract' as const,
      contractSignature: zarinpalCardHash, // Store card hash as signature
      contractStatus: 'active' as const,
      contractDisplayName: `Card ending in ${cardMask.slice(-4)}`,
      contractMobile: null, // Not provided for tokenized cards
      isPrimary: setPrimary,
      isActive: true,
      contractExpiresAt: expiresAt ? new Date(expiresAt) : null,
      metadata: {
        cardMask,
        cardType,
        source: 'zarinpal_tokenization',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tx.insert(paymentMethod).values(newPaymentMethod);

    // Log creation event
    await tx.insert(billingEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      subscriptionId: null,
      paymentId: null,
      paymentMethodId: newPaymentMethod.id,
      eventType: 'payment_method_created',
      eventData: {
        cardMask,
        cardType,
        source: 'zarinpal_tokenization',
        isPrimary: setPrimary,
        createdAt: newPaymentMethod.createdAt.toISOString(),
      },
      createdAt: new Date(),
    });

    c.logger.info('Payment method created successfully from tokenized card', {
      logType: 'operation',
      operationName: 'createPaymentMethod',
      userId: user.id,
      resource: newPaymentMethod.id,
    });

    return Responses.created(c, newPaymentMethod);
  },
);

/**
 * Delete (soft delete) a payment method
 */
export const deletePaymentMethodHandler: RouteHandler<typeof deletePaymentMethodRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    operationName: 'deletePaymentMethod',
  },
  async (c, tx) => {
    const { id } = c.req.param();
    const user = c.get('user')!;

    if (!id) {
      throw createError.notFound('Payment method ID is required');
    }

    c.logger.info('Deleting payment method', {
      logType: 'operation',
      operationName: 'deletePaymentMethod',
      userId: user.id,
      resource: id,
    });

    // Find payment method using direct DB access
    const paymentMethodResults = await db.select().from(paymentMethod).where(and(
      eq(paymentMethod.id, id),
      eq(paymentMethod.isActive, true),
    )).limit(1);
    const paymentMethodRecord = paymentMethodResults[0];

    if (!paymentMethodRecord || paymentMethodRecord.userId !== user.id || !paymentMethodRecord.isActive) {
      c.logger.warn('Payment method not found for deletion', {
        logType: 'operation',
        operationName: 'deletePaymentMethod',
        userId: user.id,
        resource: id,
      });
      throw createError.notFound('Payment method not found or already deleted');
    }

    // Check if payment method is used by active subscriptions
    const activeSubscriptions = await db.select().from(subscription).where(and(
      eq(subscription.userId, user.id),
      eq(subscription.status, 'active'),
    ));

    const hasActiveSubscriptions = activeSubscriptions.some(sub =>
      sub.paymentMethodId === id,
    );

    if (hasActiveSubscriptions) {
      throw createError.conflict(
        'Cannot delete payment method: it is currently used by active subscriptions. Please cancel subscriptions first.',
      );
    }

    const deletedAt = new Date();

    // Soft delete the payment method using direct DB access
    await tx.update(paymentMethod)
      .set({
        isActive: false,
        isPrimary: false, // Remove primary status when deleting
        updatedAt: deletedAt,
      })
      .where(eq(paymentMethod.id, id));

    // Log deletion event using direct DB access
    await tx.insert(billingEvent).values({
      id: crypto.randomUUID(),
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
      createdAt: new Date(),
    });

    c.logger.info('Payment method deleted successfully', {
      logType: 'operation',
      operationName: 'deletePaymentMethod',
      userId: user.id,
      resource: id,
    });

    return Responses.ok(c, { deleted: true });
  },
);

/**
 * Set a payment method as the default (primary) payment method
 */
export const setDefaultPaymentMethodHandler: RouteHandler<typeof setDefaultPaymentMethodRoute, ApiEnv> = createHandlerWithTransaction(
  {
    auth: 'session',
    operationName: 'setDefaultPaymentMethod',
  },
  async (c, tx) => {
    const { id } = c.req.param();
    const user = c.get('user')!;

    if (!id) {
      throw createError.notFound('Payment method ID is required');
    }

    c.logger.info('Setting primary payment method', {
      logType: 'operation',
      operationName: 'setPrimaryPaymentMethod',
      userId: user.id,
      resource: id,
    });

    // Find payment method using direct DB access
    const paymentMethodResults = await db.select().from(paymentMethod).where(and(
      eq(paymentMethod.id, id),
      eq(paymentMethod.isActive, true),
    )).limit(1);
    const paymentMethodRecord = paymentMethodResults[0];

    if (!paymentMethodRecord || paymentMethodRecord.userId !== user.id || !paymentMethodRecord.isActive) {
      c.logger.warn('Payment method not found for primary setting', {
        logType: 'operation',
        operationName: 'setPrimaryPaymentMethod',
        userId: user.id,
        resource: id,
      });
      throw createError.notFound('Payment method not found');
    }

    // Remove primary status from all other payment methods for this user
    await tx.update(paymentMethod)
      .set({
        isPrimary: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(paymentMethod.userId, user.id),
        eq(paymentMethod.isActive, true),
      ));

    // Set this payment method as primary
    await tx.update(paymentMethod)
      .set({
        isPrimary: true,
        updatedAt: new Date(),
      })
      .where(eq(paymentMethod.id, id));

    // Get updated payment method
    const updatedResults = await tx.select().from(paymentMethod).where(eq(paymentMethod.id, id)).limit(1);
    const updatedPaymentMethod = updatedResults[0];

    // Log primary change event using direct DB access
    await tx.insert(billingEvent).values({
      id: crypto.randomUUID(),
      userId: user.id,
      subscriptionId: null,
      paymentId: null,
      paymentMethodId: id,
      eventType: 'payment_method_set_primary',
      eventData: {
        contractSignature: paymentMethodRecord.contractSignature,
        contractType: paymentMethodRecord.contractType,
        wasPreviouslyPrimary: paymentMethodRecord.isPrimary,
        setAt: new Date().toISOString(),
      },
      createdAt: new Date(),
    });

    c.logger.info('Payment method set as primary successfully', {
      logType: 'operation',
      operationName: 'setPrimaryPaymentMethod',
      userId: user.id,
      resource: id,
    });

    return Responses.ok(c, updatedPaymentMethod);
  },
);
