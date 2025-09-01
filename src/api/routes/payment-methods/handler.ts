import type { RouteHandler } from '@hono/zod-openapi';
import { and, desc, eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as HttpStatusCodes from 'stoker/http-status-codes';

import { created, ok } from '@/api/common/responses';
import type { ApiEnv } from '@/api/types';
import { db } from '@/db';
import { paymentMethod } from '@/db/tables/billing';

import type {
  createPaymentMethodRoute,
  deletePaymentMethodRoute,
  getPaymentMethodsRoute,
  setDefaultPaymentMethodRoute,
} from './route';

/**
 * Handler for GET /payment-methods
 * Returns all active payment methods for the authenticated user
 */
export const getPaymentMethodsHandler: RouteHandler<typeof getPaymentMethodsRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'payment-methods');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  try {
    const paymentMethods = await db
      .select()
      .from(paymentMethod)
      .where(and(eq(paymentMethod.userId, user.id), eq(paymentMethod.isActive, true)))
      .orderBy(desc(paymentMethod.isPrimary), desc(paymentMethod.lastUsedAt), desc(paymentMethod.createdAt));

    const transformedPaymentMethods = paymentMethods.map(pm => ({
      id: pm.id,
      userId: pm.userId,
      zarinpalCardHash: pm.zarinpalCardHash,
      cardMask: pm.cardMask,
      cardType: pm.cardType,
      isPrimary: pm.isPrimary ?? false,
      isActive: pm.isActive ?? true,
      lastUsedAt: pm.lastUsedAt?.toISOString() ?? null,
      expiresAt: pm.expiresAt?.toISOString() ?? null,
      createdAt: pm.createdAt.toISOString(),
      updatedAt: pm.updatedAt.toISOString(),
    }));

    return ok(c, transformedPaymentMethods);
  } catch (error) {
    console.error('Failed to fetch payment methods:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to fetch payment methods',
    });
  }
};

/**
 * Handler for POST /payment-methods
 * Creates a new saved payment method for the user
 */
export const createPaymentMethodHandler: RouteHandler<typeof createPaymentMethodRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'create-payment-method');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { zarinpalCardHash, cardMask, cardType, expiresAt, setPrimary } = c.req.valid('json');

  try {
    // Check if this card hash already exists for the user
    const existingPaymentMethod = await db
      .select()
      .from(paymentMethod)
      .where(
        and(
          eq(paymentMethod.userId, user.id),
          eq(paymentMethod.zarinpalCardHash, zarinpalCardHash),
          eq(paymentMethod.isActive, true),
        ),
      )
      .limit(1);

    if (existingPaymentMethod.length > 0) {
      throw new HTTPException(HttpStatusCodes.CONFLICT, {
        message: 'Payment method already exists',
      });
    }

    // If setting as primary, unset other primary payment methods
    if (setPrimary) {
      await db
        .update(paymentMethod)
        .set({ isPrimary: false })
        .where(and(eq(paymentMethod.userId, user.id), eq(paymentMethod.isPrimary, true)));
    }

    // Create the new payment method
    const paymentMethodId = crypto.randomUUID();
    const now = new Date();

    await db.insert(paymentMethod).values({
      id: paymentMethodId,
      userId: user.id,
      zarinpalCardHash,
      cardMask,
      cardType,
      isPrimary: setPrimary,
      isActive: true,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      lastUsedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    // Fetch the created payment method
    const createdPaymentMethod = await db
      .select()
      .from(paymentMethod)
      .where(eq(paymentMethod.id, paymentMethodId))
      .limit(1);

    if (!createdPaymentMethod.length) {
      throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
        message: 'Failed to create payment method',
      });
    }

    const pm = createdPaymentMethod[0]!;
    const transformedPaymentMethod = {
      id: pm.id,
      userId: pm.userId,
      zarinpalCardHash: pm.zarinpalCardHash,
      cardMask: pm.cardMask,
      cardType: pm.cardType,
      isPrimary: pm.isPrimary ?? false,
      isActive: pm.isActive ?? true,
      lastUsedAt: pm.lastUsedAt?.toISOString() ?? null,
      expiresAt: pm.expiresAt?.toISOString() ?? null,
      createdAt: pm.createdAt.toISOString(),
      updatedAt: pm.updatedAt.toISOString(),
    };

    return created(c, transformedPaymentMethod);
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to create payment method:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to create payment method',
    });
  }
};

/**
 * Handler for DELETE /payment-methods/:id
 * Soft-deletes a payment method (sets isActive to false)
 */
export const deletePaymentMethodHandler: RouteHandler<typeof deletePaymentMethodRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'delete-payment-method');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { id } = c.req.valid('param');

  try {
    // Check if payment method exists and belongs to user
    const existingPaymentMethod = await db
      .select()
      .from(paymentMethod)
      .where(
        and(
          eq(paymentMethod.id, id),
          eq(paymentMethod.userId, user.id),
          eq(paymentMethod.isActive, true),
        ),
      )
      .limit(1);

    if (!existingPaymentMethod.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Payment method not found',
      });
    }

    const pm = existingPaymentMethod[0]!;

    // If this was the primary method, we should set another method as primary
    // TODO: Implement setting another method as primary after deletion
    if (pm.isPrimary) {
      // Logic to set another method as primary will be implemented here
      console.warn('Primary payment method deleted - should set another as primary');
    }

    // Soft delete the payment method
    const deletedAt = new Date();
    await db
      .update(paymentMethod)
      .set({
        isActive: false,
        isPrimary: false,
        updatedAt: deletedAt,
      })
      .where(eq(paymentMethod.id, id));

    // If we deleted the primary method, set another one as primary
    if (pm.isPrimary) {
      const remainingMethods = await db
        .select()
        .from(paymentMethod)
        .where(
          and(
            eq(paymentMethod.userId, user.id),
            eq(paymentMethod.isActive, true),
          ),
        )
        .orderBy(desc(paymentMethod.lastUsedAt), desc(paymentMethod.createdAt))
        .limit(1);

      if (remainingMethods.length > 0) {
        await db
          .update(paymentMethod)
          .set({ isPrimary: true })
          .where(eq(paymentMethod.id, remainingMethods[0]!.id));
      }
    }

    return ok(c, {
      id,
      deleted: true,
      deletedAt: deletedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to delete payment method:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to delete payment method',
    });
  }
};

/**
 * Handler for PATCH /payment-methods/:id/default
 * Sets a payment method as the primary/default method
 */
export const setDefaultPaymentMethodHandler: RouteHandler<typeof setDefaultPaymentMethodRoute, ApiEnv> = async (c) => {
  c.header('X-Route', 'set-default-payment-method');

  const user = c.get('user');
  if (!user) {
    throw new HTTPException(HttpStatusCodes.UNAUTHORIZED, {
      message: 'Authentication required',
    });
  }

  const { id } = c.req.valid('param');

  try {
    // Check if payment method exists and belongs to user
    const existingPaymentMethod = await db
      .select()
      .from(paymentMethod)
      .where(
        and(
          eq(paymentMethod.id, id),
          eq(paymentMethod.userId, user.id),
          eq(paymentMethod.isActive, true),
        ),
      )
      .limit(1);

    if (!existingPaymentMethod.length) {
      throw new HTTPException(HttpStatusCodes.NOT_FOUND, {
        message: 'Payment method not found',
      });
    }

    // First, unset all other primary payment methods for this user
    await db
      .update(paymentMethod)
      .set({ isPrimary: false })
      .where(and(eq(paymentMethod.userId, user.id), eq(paymentMethod.isPrimary, true)));

    // Set this payment method as primary
    const updatedAt = new Date();
    await db
      .update(paymentMethod)
      .set({
        isPrimary: true,
        lastUsedAt: updatedAt,
        updatedAt,
      })
      .where(eq(paymentMethod.id, id));

    return ok(c, {
      id,
      isPrimary: true,
      updatedAt: updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    console.error('Failed to set default payment method:', error);
    throw new HTTPException(HttpStatusCodes.INTERNAL_SERVER_ERROR, {
      message: 'Failed to set default payment method',
    });
  }
};
