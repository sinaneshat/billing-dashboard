/**
 * Billing and Subscription Types
 * Type definitions for billing-related data structures
 */

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  currency?: string;
  interval?: 'monthly' | 'yearly' | 'one-time';
  features?: string[];
};

export type Subscription = {
  id: string;
  productId: string;
  productName: string;
  status: 'active' | 'inactive' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
  amount: number;
  currency?: string;
  billingPeriod: 'monthly' | 'yearly' | 'one-time';
  createdAt: string;
  updatedAt?: string;
  nextBillingDate?: string;
  canceledAt?: string;
};

export type PaymentMethod = {
  id: string;
  type: 'card' | 'bank' | 'wallet';
  last4?: string;
  brand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
};

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

export type BillingData = {
  subscriptions: Subscription[];
  products: Product[];
  paymentMethods: PaymentMethod[];
  invoices: Invoice[];
};
