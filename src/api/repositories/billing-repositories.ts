/**
 * Billing Domain Repositories
 *
 * Type-safe repository implementations for all billing entities.
 * Provides consistent patterns for database access with audit trails,
 * pagination, filtering, and specialized business logic.
 */

import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { and, asc, desc, eq, gte, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';

import { createError } from '@/api/common/error-handling';
import type { QueryOptions } from '@/api/patterns/base-repository';
import { BaseRepository } from '@/api/patterns/base-repository';
import { db } from '@/db';
import {
  billingEvent,
  payment,
  paymentMethod,
  product,
  subscription,
  webhookEvent,
} from '@/db/tables/billing';

// Transaction type from Drizzle ORM following official patterns
type DrizzleTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ProductSelect = InferSelectModel<typeof product>;
export type ProductInsert = InferInsertModel<typeof product>;
export type ProductUpdate = Partial<ProductInsert>;

export type PaymentMethodSelect = InferSelectModel<typeof paymentMethod>;
export type PaymentMethodInsert = InferInsertModel<typeof paymentMethod>;
export type PaymentMethodUpdate = Partial<PaymentMethodInsert>;

export type SubscriptionSelect = InferSelectModel<typeof subscription>;
export type SubscriptionInsert = InferInsertModel<typeof subscription>;
export type SubscriptionUpdate = Partial<SubscriptionInsert>;

export type PaymentSelect = InferSelectModel<typeof payment>;
export type PaymentInsert = InferInsertModel<typeof payment>;
export type PaymentUpdate = Partial<PaymentInsert>;

export type BillingEventSelect = InferSelectModel<typeof billingEvent>;
export type BillingEventInsert = InferInsertModel<typeof billingEvent>;

export type WebhookEventSelect = InferSelectModel<typeof webhookEvent>;
export type WebhookEventInsert = InferInsertModel<typeof webhookEvent>;

// ============================================================================
// PRODUCT REPOSITORY
// ============================================================================

export class ProductRepository extends BaseRepository<
  typeof product,
  ProductSelect,
  ProductInsert,
  ProductUpdate
> {
  constructor() {
    super(product, {
      tableName: 'product',
      primaryKey: 'id',
      hasUserId: false,
      hasSoftDelete: false,
      hasAuditFields: true,
    });
  }

  /**
   * Find all active products
   */
  async findActive(options: QueryOptions = {}): Promise<ProductSelect[]> {
    try {
      const query = db.select().from(product).where(eq(product.isActive, true));

      if (options.sort?.length) {
        const sortOrder = options.sort[0]!;
        const direction = sortOrder.direction === 'desc' ? desc : asc;
        query.orderBy(direction(product[sortOrder.field as keyof typeof product._.columns]));
      } else {
        query.orderBy(asc(product.name));
      }

      return await query;
    } catch (error) {
      throw createError.database(`Failed to find active products: ${error}`);
    }
  }

  /**
   * Find products by billing period
   */
  async findByBillingPeriod(
    billingPeriod: 'one_time' | 'monthly',
    _options: QueryOptions = {},
  ): Promise<ProductSelect[]> {
    try {
      return await db
        .select()
        .from(product)
        .where(
          and(
            eq(product.billingPeriod, billingPeriod),
            eq(product.isActive, true),
          ),
        )
        .orderBy(asc(product.price));
    } catch (error) {
      throw createError.database(`Failed to find products by billing period: ${error}`);
    }
  }
}

// ============================================================================
// PAYMENT METHOD REPOSITORY
// ============================================================================

export class PaymentMethodRepository extends BaseRepository<
  typeof paymentMethod,
  PaymentMethodSelect,
  PaymentMethodInsert,
  PaymentMethodUpdate
> {
  constructor() {
    super(paymentMethod, {
      tableName: 'payment_method',
      primaryKey: 'id',
      hasUserId: true,
      hasSoftDelete: false,
      hasAuditFields: true,
    });
  }

  /**
   * Find active payment methods for a user
   */
  async findPaymentMethodsByUserId(
    userId: string,
    options: { includeInactive?: boolean } = {},
  ): Promise<PaymentMethodSelect[]> {
    try {
      const conditions = [eq(paymentMethod.userId, userId)];

      if (!options.includeInactive) {
        conditions.push(eq(paymentMethod.isActive, true));
      }

      return await db
        .select()
        .from(paymentMethod)
        .where(and(...conditions))
        .orderBy(desc(paymentMethod.isPrimary), desc(paymentMethod.createdAt));
    } catch (error) {
      throw createError.database(`Failed to find payment methods for user: ${error}`);
    }
  }

  /**
   * Find primary payment method for a user
   */
  async findPrimaryByUserId(userId: string): Promise<PaymentMethodSelect | null> {
    try {
      const results = await db
        .select()
        .from(paymentMethod)
        .where(
          and(
            eq(paymentMethod.userId, userId),
            eq(paymentMethod.isPrimary, true),
            eq(paymentMethod.isActive, true),
            eq(paymentMethod.contractStatus, 'active'),
          ),
        )
        .limit(1);

      return results[0] || null;
    } catch (error) {
      throw createError.database(`Failed to find primary payment method: ${error}`);
    }
  }

  /**
   * Find by contract signature
   */
  async findByContractSignature(signature: string): Promise<PaymentMethodSelect | null> {
    try {
      const results = await db
        .select()
        .from(paymentMethod)
        .where(eq(paymentMethod.contractSignature, signature))
        .limit(1);

      return results[0] || null;
    } catch (error) {
      throw createError.database(`Failed to find payment method by contract: ${error}`);
    }
  }

  /**
   * Set primary payment method (ensuring only one primary per user)
   */
  async setPrimary(id: string, userId: string, tx: typeof db | DrizzleTransaction = db): Promise<PaymentMethodSelect> {
    try {
      // Remove primary flag from all other payment methods for this user
      await tx
        .update(paymentMethod)
        .set({ isPrimary: false })
        .where(
          and(
            eq(paymentMethod.userId, userId),
            eq(paymentMethod.isPrimary, true),
          ),
        );

      // Set this payment method as primary
      await tx
        .update(paymentMethod)
        .set({ isPrimary: true })
        .where(eq(paymentMethod.id, id));

      const result = await tx
        .select()
        .from(paymentMethod)
        .where(eq(paymentMethod.id, id))
        .limit(1);

      if (!result[0]) {
        throw createError.notFound('Payment method');
      }

      return result[0];
    } catch (error) {
      throw createError.database(`Failed to set primary payment method: ${error}`);
    }
  }
}

// ============================================================================
// SUBSCRIPTION REPOSITORY
// ============================================================================

export class SubscriptionRepository extends BaseRepository<
  typeof subscription,
  SubscriptionSelect,
  SubscriptionInsert,
  SubscriptionUpdate
> {
  constructor() {
    super(subscription, {
      tableName: 'subscription',
      primaryKey: 'id',
      hasUserId: true,
      hasSoftDelete: false,
      hasAuditFields: true,
    });
  }

  /**
   * Find subscriptions for a user
   */
  async findSubscriptionsByUserId(
    userId: string,
    options: { status?: 'active' | 'expired' | 'canceled' | 'pending'; includeExpired?: boolean } = {},
  ): Promise<SubscriptionSelect[]> {
    try {
      const conditions = [eq(subscription.userId, userId)];

      if (options.status) {
        conditions.push(eq(subscription.status, options.status));
      }

      if (!options.includeExpired) {
        const endDateCondition = or(isNull(subscription.endDate), gte(subscription.endDate, new Date()));
        if (endDateCondition) {
          conditions.push(endDateCondition);
        }
      }

      return await db
        .select()
        .from(subscription)
        .where(and(...conditions))
        .orderBy(desc(subscription.createdAt));
    } catch (error) {
      throw createError.database(`Failed to find subscriptions for user: ${error}`);
    }
  }

  /**
   * Find active subscriptions for a user and product
   */
  async findActiveByUserAndProduct(
    userId: string,
    productId: string,
  ): Promise<SubscriptionSelect | null> {
    try {
      const results = await db
        .select()
        .from(subscription)
        .where(
          and(
            eq(subscription.userId, userId),
            eq(subscription.productId, productId),
            eq(subscription.status, 'active'),
          ),
        )
        .limit(1);

      return results[0] || null;
    } catch (error) {
      throw createError.database(`Failed to find active subscription: ${error}`);
    }
  }

  /**
   * Find subscriptions due for billing
   */
  async findDueForBilling(dueDate: Date = new Date()): Promise<SubscriptionSelect[]> {
    try {
      return await db
        .select()
        .from(subscription)
        .where(
          and(
            eq(subscription.status, 'active'),
            isNotNull(subscription.nextBillingDate),
            lte(subscription.nextBillingDate, dueDate),
            isNotNull(subscription.paymentMethodId),
          ),
        )
        .orderBy(asc(subscription.nextBillingDate));
    } catch (error) {
      throw createError.database(`Failed to find subscriptions due for billing: ${error}`);
    }
  }

  /**
   * Update next billing date
   */
  async updateNextBillingDate(
    id: string,
    nextBillingDate: Date,
    tx: typeof db | DrizzleTransaction = db,
  ): Promise<void> {
    try {
      await tx
        .update(subscription)
        .set({
          nextBillingDate,
          billingCycleCount: sql`${subscription.billingCycleCount} + 1`,
          lastBillingAttempt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(subscription.id, id));
    } catch (error) {
      throw createError.database(`Failed to update next billing date: ${error}`);
    }
  }
}

// ============================================================================
// PAYMENT REPOSITORY
// ============================================================================

export class PaymentRepository extends BaseRepository<
  typeof payment,
  PaymentSelect,
  PaymentInsert,
  PaymentUpdate
> {
  constructor() {
    super(payment, {
      tableName: 'payment',
      primaryKey: 'id',
      hasUserId: true,
      hasSoftDelete: false,
      hasAuditFields: true,
    });
  }

  /**
   * Find payments for a user with optional filtering
   */
  async findPaymentsByUserId(
    userId: string,
    options: {
      status?: 'pending' | 'completed' | 'failed' | 'refunded' | 'canceled';
      limit?: number;
      offset?: number;
      subscriptionId?: string;
    } = {},
  ): Promise<PaymentSelect[]> {
    try {
      const conditions = [eq(payment.userId, userId)];

      if (options.status) {
        conditions.push(eq(payment.status, options.status));
      }

      if (options.subscriptionId) {
        conditions.push(eq(payment.subscriptionId, options.subscriptionId));
      }

      const baseQuery = db
        .select()
        .from(payment)
        .where(and(...conditions))
        .orderBy(desc(payment.createdAt));

      // Apply pagination if specified
      const results = await (options.limit || options.offset
        ? baseQuery
            .limit(options.limit || 1000)
            .offset(options.offset || 0)
        : baseQuery);

      return results;
    } catch (error) {
      throw createError.database(`Failed to find payments for user: ${error}`);
    }
  }

  /**
   * Find payment by ZarinPal authority
   */
  async findByZarinpalAuthority(authority: string): Promise<PaymentSelect | null> {
    try {
      const results = await db
        .select()
        .from(payment)
        .where(eq(payment.zarinpalAuthority, authority))
        .limit(1);

      return results[0] || null;
    } catch (error) {
      throw createError.database(`Failed to find payment by authority: ${error}`);
    }
  }

  /**
   * Find failed payments that can be retried
   */
  async findRetryableFailedPayments(now: Date = new Date()): Promise<PaymentSelect[]> {
    try {
      return await db
        .select()
        .from(payment)
        .where(
          and(
            eq(payment.status, 'failed'),
            lt(payment.retryCount, payment.maxRetries),
            isNotNull(payment.nextRetryAt),
            lte(payment.nextRetryAt, now),
          ),
        )
        .orderBy(asc(payment.nextRetryAt));
    } catch (error) {
      throw createError.database(`Failed to find retryable payments: ${error}`);
    }
  }

  /**
   * Update payment status with retry logic
   */
  async updateStatus(
    id: string,
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'canceled',
    updates: Partial<PaymentUpdate> = {},
    tx: typeof db | DrizzleTransaction = db,
  ): Promise<PaymentSelect> {
    try {
      const updateData: Partial<PaymentUpdate> = {
        status,
        updatedAt: new Date(),
        ...updates,
      };

      // Set timestamps based on status
      if (status === 'completed') {
        updateData.paidAt = new Date();
      } else if (status === 'failed') {
        updateData.failedAt = new Date();
        updateData.retryCount = (updateData.retryCount || 0) + 1;

        // Calculate next retry time (exponential backoff)
        const retryDelay = 2 ** updateData.retryCount * 60 * 1000; // Minutes in ms
        updateData.nextRetryAt = new Date(Date.now() + retryDelay);
      }

      await tx
        .update(payment)
        .set(updateData)
        .where(eq(payment.id, id));

      const result = await tx
        .select()
        .from(payment)
        .where(eq(payment.id, id))
        .limit(1);

      if (!result[0]) {
        throw createError.notFound('Payment');
      }

      return result[0];
    } catch (error) {
      throw createError.database(`Failed to update payment status: ${error}`);
    }
  }
}

// ============================================================================
// BILLING EVENT REPOSITORY
// ============================================================================

export class BillingEventRepository extends BaseRepository<
  typeof billingEvent,
  BillingEventSelect,
  BillingEventInsert,
  never
> {
  constructor() {
    super(billingEvent, {
      tableName: 'billing_event',
      primaryKey: 'id',
      hasUserId: true,
      hasSoftDelete: false,
      hasAuditFields: true,
    });
  }

  /**
   * Log a billing event
   */
  async logEvent(
    eventData: BillingEventInsert,
    tx: typeof db | DrizzleTransaction = db,
  ): Promise<BillingEventSelect> {
    try {
      const result = await tx
        .insert(billingEvent)
        .values({
          ...eventData,
          createdAt: new Date(),
        })
        .returning();

      if (!result[0]) {
        throw createError.database('Failed to create billing event');
      }

      return result[0];
    } catch (error) {
      throw createError.database(`Failed to log billing event: ${error}`);
    }
  }

  /**
   * Find billing events for a user
   */
  async findBillingEventsByUserId(
    userId: string,
    options: {
      eventType?: string;
      severity?: 'info' | 'warning' | 'error' | 'critical';
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<BillingEventSelect[]> {
    try {
      const conditions = [eq(billingEvent.userId, userId)];

      if (options.eventType) {
        conditions.push(eq(billingEvent.eventType, options.eventType));
      }

      if (options.severity) {
        conditions.push(eq(billingEvent.severity, options.severity));
      }

      const baseQuery = db
        .select()
        .from(billingEvent)
        .where(and(...conditions))
        .orderBy(desc(billingEvent.createdAt));

      // Apply pagination if specified
      const results = await (options.limit || options.offset
        ? baseQuery
            .limit(options.limit || 1000)
            .offset(options.offset || 0)
        : baseQuery);

      return results;
    } catch (error) {
      throw createError.database(`Failed to find billing events: ${error}`);
    }
  }
}

// ============================================================================
// WEBHOOK EVENT REPOSITORY
// ============================================================================

export class WebhookEventRepository extends BaseRepository<
  typeof webhookEvent,
  WebhookEventSelect,
  WebhookEventInsert,
  never
> {
  constructor() {
    super(webhookEvent, {
      tableName: 'webhook_event',
      primaryKey: 'id',
      hasUserId: false,
      hasSoftDelete: false,
      hasAuditFields: true,
    });
  }

  /**
   * Create webhook event record
   */
  async createEvent(
    eventData: WebhookEventInsert,
    tx: typeof db | DrizzleTransaction = db,
  ): Promise<WebhookEventSelect> {
    try {
      const result = await tx
        .insert(webhookEvent)
        .values({
          ...eventData,
          createdAt: new Date(),
        })
        .returning();

      if (!result[0]) {
        throw createError.database('Failed to create webhook event');
      }

      return result[0];
    } catch (error) {
      throw createError.database(`Failed to create webhook event: ${error}`);
    }
  }

  /**
   * Find unprocessed webhook events
   */
  async findUnprocessed(limit: number = 50): Promise<WebhookEventSelect[]> {
    try {
      return await db
        .select()
        .from(webhookEvent)
        .where(eq(webhookEvent.processed, false))
        .orderBy(asc(webhookEvent.createdAt))
        .limit(limit);
    } catch (error) {
      throw createError.database(`Failed to find unprocessed webhooks: ${error}`);
    }
  }

  /**
   * Mark webhook as processed
   */
  async markProcessed(
    id: string,
    success: boolean,
    error?: string,
    tx: typeof db | DrizzleTransaction = db,
  ): Promise<void> {
    try {
      await tx
        .update(webhookEvent)
        .set({
          processed: true,
          processedAt: new Date(),
          processingError: error || null,
        })
        .where(eq(webhookEvent.id, id));
    } catch (error) {
      throw createError.database(`Failed to mark webhook as processed: ${error}`);
    }
  }
}

// ============================================================================
// REPOSITORY FACTORY
// ============================================================================

export class BillingRepositories {
  private static _instance: BillingRepositories;

  public readonly products: ProductRepository;
  public readonly paymentMethods: PaymentMethodRepository;
  public readonly subscriptions: SubscriptionRepository;
  public readonly payments: PaymentRepository;
  public readonly billingEvents: BillingEventRepository;
  public readonly webhookEvents: WebhookEventRepository;

  private constructor() {
    this.products = new ProductRepository();
    this.paymentMethods = new PaymentMethodRepository();
    this.subscriptions = new SubscriptionRepository();
    this.payments = new PaymentRepository();
    this.billingEvents = new BillingEventRepository();
    this.webhookEvents = new WebhookEventRepository();
  }

  public static getInstance(): BillingRepositories {
    if (!BillingRepositories._instance) {
      BillingRepositories._instance = new BillingRepositories();
    }
    return BillingRepositories._instance;
  }
}

// Export singleton instance
export const billingRepositories = BillingRepositories.getInstance();
