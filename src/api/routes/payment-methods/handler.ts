/**
 * Payment Methods Route Handlers - Direct Database Access
 *
 * Uses the factory pattern for consistent authentication, validation,
 * transaction management, and error handling. Uses direct database
 * access for all operations following unified backend pattern.
 */

import type { RouteHandler } from '@hono/zod-openapi';
import { and, eq, inArray, not } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import { createHandler, createHandlerWithTransaction, Responses } from '@/api/core';
import type { ApiEnv } from '@/api/types';
import { getDbAsync } from '@/db';
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
    const user = c.get('user');
    const db = await getDbAsync();

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    c.logger.info('Fetching payment methods for user', { logType: 'operation', operationName: 'getPaymentMethods', userId: user.id });

    // Direct database access for payment methods - show both active and pending contracts
    // but exclude soft-deleted ones and cancelled/failed contracts
    const paymentMethods = await db.select().from(paymentMethod).where(and(
      eq(paymentMethod.userId, user.id),
      // Include: active contracts OR pending contracts that haven't been cancelled/failed
      not(inArray(paymentMethod.contractStatus, [
        'cancelled_by_user' as const,
        'verification_failed' as const,
      ])),
    ));

    // Enhance payment methods with action metadata for UI
    const enhancedPaymentMethods = paymentMethods.map((method) => {
      const actions = getAvailableActions(method);
      const uiState = getUIState(method);

      return {
        ...method,
        ui: {
          state: uiState,
          actions,
          statusBadge: getStatusBadge(method),
          guidance: getGuidanceText(method),
        },
      };
    });

    c.logger.info('Payment methods retrieved successfully', {
      logType: 'operation',
      operationName: 'getPaymentMethods',
      userId: user.id,
      resource: `methods[${enhancedPaymentMethods.length}]`,
    });

    return Responses.ok(c, enhancedPaymentMethods);
  },
);

/**
 * Helper Functions for UI State Management
 */

type PaymentMethodRow = typeof paymentMethod.$inferSelect;

type UIAction = {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'destructive';
  icon?: string;
  route?: string;
  requiresConfirmation?: boolean;
};

type UIState = {
  phase: 'setup' | 'active' | 'cancelled' | 'failed' | 'expired';
  canUseForPayments: boolean;
  canSetPrimary: boolean;
  canCancel: boolean;
  requiresAction: boolean;
};

type StatusBadge = {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'info' | 'secondary';
  icon: string;
};

function getAvailableActions(method: PaymentMethodRow): UIAction[] {
  const actions: UIAction[] = [];

  switch (method.contractStatus) {
    case 'pending_signature':
      actions.push({
        id: 'complete-signing',
        label: 'Complete Bank Signing',
        type: 'primary',
        icon: 'externalLink',
        route: `/payment-methods/${method.id}/sign`,
      });
      actions.push({
        id: 'cancel-contract',
        label: 'Cancel Contract',
        type: 'destructive',
        icon: 'trash',
        requiresConfirmation: true,
      });
      break;

    case 'active':
      if (!method.isPrimary) {
        actions.push({
          id: 'set-primary',
          label: 'Set as Primary',
          type: 'secondary',
          icon: 'star',
        });
      }
      actions.push({
        id: 'view-transactions',
        label: 'View Transactions',
        type: 'secondary',
        icon: 'history',
        route: `/payment-methods/${method.id}/transactions`,
      });
      actions.push({
        id: 'cancel-contract',
        label: 'Cancel Contract',
        type: 'destructive',
        icon: 'trash',
        requiresConfirmation: true,
      });
      break;

    case 'verification_failed':
      actions.push({
        id: 'retry-signing',
        label: 'Retry Signing',
        type: 'primary',
        icon: 'refresh',
        route: `/payment-methods/${method.id}/sign`,
      });
      actions.push({
        id: 'delete-failed',
        label: 'Remove',
        type: 'destructive',
        icon: 'trash',
        requiresConfirmation: true,
      });
      break;

    case 'cancelled_by_user':
      actions.push({
        id: 'create-new',
        label: 'Create New Contract',
        type: 'primary',
        icon: 'plus',
        route: '/payment-methods/direct-debit-setup',
      });
      break;

    case 'expired':
      actions.push({
        id: 'renew-contract',
        label: 'Renew Contract',
        type: 'primary',
        icon: 'refresh',
        route: `/payment-methods/${method.id}/renew`,
      });
      actions.push({
        id: 'remove-expired',
        label: 'Remove',
        type: 'destructive',
        icon: 'trash',
        requiresConfirmation: true,
      });
      break;
  }

  return actions;
}

function getUIState(method: PaymentMethodRow): UIState {
  const phase
    = method.contractStatus === 'active'
      ? 'active'
      : method.contractStatus === 'pending_signature'
        ? 'setup'
        : method.contractStatus === 'verification_failed'
          ? 'failed'
          : method.contractStatus === 'expired'
            ? 'expired'
            : 'cancelled';

  return {
    phase,
    canUseForPayments: method.contractStatus === 'active' && (method.isActive ?? false),
    canSetPrimary: method.contractStatus === 'active' && !method.isPrimary,
    canCancel: ['active', 'pending_signature'].includes(method.contractStatus),
    requiresAction: ['pending_signature', 'verification_failed', 'expired'].includes(method.contractStatus),
  };
}

function getStatusBadge(method: PaymentMethodRow): StatusBadge {
  switch (method.contractStatus) {
    case 'active':
      return {
        label: method.isPrimary ? 'Primary Active' : 'Active',
        variant: 'success',
        icon: 'checkCircle',
      };
    case 'pending_signature':
      return {
        label: 'Pending Signing',
        variant: 'warning',
        icon: 'clock',
      };
    case 'verification_failed':
      return {
        label: 'Signing Failed',
        variant: 'error',
        icon: 'alertCircle',
      };
    case 'cancelled_by_user':
      return {
        label: 'Cancelled',
        variant: 'secondary',
        icon: 'x',
      };
    case 'expired':
      return {
        label: 'Expired',
        variant: 'error',
        icon: 'calendar',
      };
    default:
      return {
        label: 'Unknown',
        variant: 'secondary',
        icon: 'help',
      };
  }
}

function getGuidanceText(method: PaymentMethodRow): string {
  switch (method.contractStatus) {
    case 'pending_signature':
      return 'Complete the bank signing process to activate this payment method for automatic billing.';
    case 'active':
      return method.isPrimary
        ? 'This is your primary payment method and will be used for automatic billing.'
        : 'This payment method is ready to use. You can set it as primary or use it for individual payments.';
    case 'verification_failed':
      return 'The bank signing process failed. Please try again or contact support if the problem persists.';
    case 'cancelled_by_user':
      return 'This contract was cancelled. You can create a new contract if needed.';
    case 'expired':
      return 'This contract has expired. Renew it to continue using automatic payments.';
    default:
      return 'Payment method status unknown. Please contact support.';
  }
}

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
    const user = c.get('user');
    // Use transaction context 'tx' instead of creating duplicate connection

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }
    const { zarinpalCardHash, cardMask, cardType, expiresAt, setPrimary } = c.validated.body;

    c.logger.info('Creating payment method from tokenized card', {
      logType: 'operation',
      operationName: 'createPaymentMethod',
      userId: user.id,
    });

    // Check if card hash already exists
    const existingMethod = await tx.select().from(paymentMethod).where(eq(paymentMethod.contractSignature, zarinpalCardHash)).limit(1);

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
    const user = c.get('user');
    // Use transaction context 'tx' instead of creating duplicate connection

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    if (!id) {
      throw createError.notFound('Payment method ID is required');
    }

    c.logger.info('Deleting payment method', {
      logType: 'operation',
      operationName: 'deletePaymentMethod',
      userId: user.id,
      resource: id,
    });

    // Find payment method using direct DB access - allow deletion of both active and pending contracts
    const paymentMethodResults = await tx.select().from(paymentMethod).where(
      eq(paymentMethod.id, id),
    ).limit(1);
    const paymentMethodRecord = paymentMethodResults[0];

    if (!paymentMethodRecord || paymentMethodRecord.userId !== user.id) {
      c.logger.warn('Payment method not found for deletion', {
        logType: 'operation',
        operationName: 'deletePaymentMethod',
        userId: user.id,
        resource: id,
      });
      throw createError.notFound('Payment method not found or already deleted');
    }

    // Check if payment method is used by active subscriptions
    const activeSubscriptions = await tx.select().from(subscription).where(and(
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
        contractStatus: 'cancelled_by_user', // Update status to exclude from GET results
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
    const user = c.get('user');
    // Use transaction context 'tx' instead of creating duplicate connection

    if (!user) {
      throw createError.unauthenticated('User authentication required');
    }

    if (!id) {
      throw createError.notFound('Payment method ID is required');
    }

    c.logger.info('Setting primary payment method', {
      logType: 'operation',
      operationName: 'setPrimaryPaymentMethod',
      userId: user.id,
      resource: id,
    });

    // Find payment method using direct DB access - only active contracts can be set as default
    const paymentMethodResults = await tx.select().from(paymentMethod).where(and(
      eq(paymentMethod.id, id),
      eq(paymentMethod.userId, user.id),
    )).limit(1);
    const paymentMethodRecord = paymentMethodResults[0];

    if (!paymentMethodRecord) {
      c.logger.warn('Payment method not found for primary setting', {
        logType: 'operation',
        operationName: 'setPrimaryPaymentMethod',
        userId: user.id,
        resource: id,
      });
      throw createError.notFound('Payment method not found');
    }

    // Only active contracts can be set as default
    if (!paymentMethodRecord.isActive || paymentMethodRecord.contractStatus !== 'active') {
      throw createError.validation('Only active payment methods can be set as default. Please complete contract signing first.');
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
