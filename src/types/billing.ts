/**
 * Billing and Subscription Types
 * Single source of truth - imports from drizzle-zod schemas
 * ✅ Fixed: No more type mismatches or duplication
 */

// Import for local use in type definitions
import type { PaymentMethod, Product, Subscription } from '@/db/validation/billing';

// ✅ Export correct types from drizzle-zod schemas (single source of truth)
export type {
  BillingEvent,
  BillingEventInsert,
  BillingEventUpdate,
  Payment,
  PaymentInsert,
  PaymentMethod,
  PaymentMethodInsert,
  PaymentMethodUpdate,
  PaymentUpdate,
  Product,
  ProductInsert,
  ProductUpdate,
  Subscription,
  SubscriptionInsert,
  SubscriptionUpdate,
  WebhookEvent,
  WebhookEventInsert,
  WebhookEventUpdate,
} from '@/db/validation/billing';

/** @deprecated Use Payment from drizzle-zod instead */
export type Invoice = {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  createdAt: string;
  paidAt?: string;
  dueAt?: string;
};

// Re-export for legacy compatibility
export type BillingData = {
  subscriptions: Subscription[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
};
