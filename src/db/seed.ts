/**
 * Comprehensive Database Seeding for Billing Dashboard
 * Creates realistic test scenarios for complete user journey testing
 */

import type { DbType } from './index';
import { user } from './tables/auth';
import { payment, product, subscription, webhookEvent } from './tables/billing';

// Products with different pricing tiers and billing periods
export const seedProducts = [
  {
    id: 'prod_starter_monthly',
    name: 'Starter Plan',
    description: 'Perfect for individuals getting started',
    price: 1900000, // 19,000 IRR per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: ['5GB Storage', '50GB Bandwidth', '1 User', 'Email Support'],
      popular: false,
      tier: 'starter',
    },
  },
  {
    id: 'prod_basic_monthly',
    name: 'Basic Plan',
    description: 'Great for small teams',
    price: 4900000, // 49,000 IRR per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: ['25GB Storage', '250GB Bandwidth', '3 Users', 'Email Support'],
      popular: false,
      tier: 'basic',
    },
  },
  {
    id: 'prod_pro_monthly',
    name: 'Pro Plan',
    description: 'Best for growing businesses',
    price: 9900000, // 99,000 IRR per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: ['100GB Storage', '1TB Bandwidth', '10 Users', 'Priority Email Support'],
      popular: true,
      tier: 'pro',
    },
  },
  {
    id: 'prod_enterprise_monthly',
    name: 'Enterprise Plan',
    description: 'For large organizations',
    price: 29900000, // 299,000 IRR per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: ['Unlimited Storage', 'Unlimited Bandwidth', 'Unlimited Users', '24/7 Phone & Email'],
      popular: false,
      tier: 'enterprise',
    },
  },
  {
    id: 'prod_premium_yearly',
    name: 'Premium Annual',
    description: 'Pro plan with annual discount',
    price: 99000000, // 990,000 IRR per year (2 months free)
    billingPeriod: 'one_time' as const,
    isActive: true,
    metadata: {
      features: ['100GB Storage', '1TB Bandwidth', '10 Users', 'Priority Support', '2 Months Free'],
      popular: false,
      tier: 'premium_yearly',
      discount: '17% off monthly',
    },
  },
] as const;

// Test users with different scenarios
export const seedTestUsers = [
  {
    id: 'user_active_pro',
    name: 'John Doe',
    email: 'john.doe@example.com',
    emailVerified: true,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'user_canceled_basic',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    emailVerified: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-02-01'),
  },
  {
    id: 'user_failed_payments',
    name: 'Bob Wilson',
    email: 'bob.wilson@example.com',
    emailVerified: true,
    createdAt: new Date('2024-01-20'),
    updatedAt: new Date('2024-01-20'),
  },
  {
    id: 'user_new_customer',
    name: 'Alice Brown',
    email: 'alice.brown@example.com',
    emailVerified: false,
    createdAt: new Date('2024-08-25'),
    updatedAt: new Date('2024-08-25'),
  },
] as const;

// Test subscriptions covering all scenarios
export const seedSubscriptions = [
  // Active subscription - Pro plan
  {
    id: 'sub_active_pro_001',
    userId: 'user_active_pro',
    productId: 'prod_pro_monthly',
    status: 'active' as const,
    startDate: new Date('2024-07-01'),
    nextBillingDate: new Date('2024-09-01'),
    currentPrice: 9900000,
    billingPeriod: 'monthly' as const,
    zarinpalDirectDebitToken: 'card_hash_abc123',
    createdAt: new Date('2024-07-01'),
    updatedAt: new Date('2024-08-01'),
  },
  // Canceled subscription - Basic plan
  {
    id: 'sub_canceled_basic_001',
    userId: 'user_canceled_basic',
    productId: 'prod_basic_monthly',
    status: 'canceled' as const,
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-08-15'),
    currentPrice: 4900000,
    billingPeriod: 'monthly' as const,
    zarinpalDirectDebitToken: 'card_hash_def456',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-08-15'),
  },
  // Failed payment subscription - Starter plan
  {
    id: 'sub_failed_starter_001',
    userId: 'user_failed_payments',
    productId: 'prod_starter_monthly',
    status: 'active' as const,
    startDate: new Date('2024-07-15'),
    nextBillingDate: new Date('2024-09-05'), // Overdue
    currentPrice: 1900000,
    billingPeriod: 'monthly' as const,
    zarinpalDirectDebitToken: 'card_hash_ghi789',
    createdAt: new Date('2024-07-15'),
    updatedAt: new Date('2024-08-15'),
  },
] as const;

// Test payments with various scenarios
export const seedPayments = [
  // Successful payment for active subscription
  {
    id: 'pay_success_001',
    userId: 'user_active_pro',
    subscriptionId: 'sub_active_pro_001',
    productId: 'prod_pro_monthly',
    amount: 9900000,
    status: 'completed' as const,
    paymentMethod: 'zarinpal',
    zarinpalAuthority: 'A00000000000000000000000000001',
    zarinpalRefId: '987654321',
    zarinpalCardHash: 'card_hash_abc123',
    paidAt: new Date('2024-08-01T09:15:00Z'),
    createdAt: new Date('2024-08-01T09:00:00Z'),
    updatedAt: new Date('2024-08-01T09:15:00Z'),
  },
  // Initial payment for canceled subscription
  {
    id: 'pay_canceled_initial_001',
    userId: 'user_canceled_basic',
    subscriptionId: 'sub_canceled_basic_001',
    productId: 'prod_basic_monthly',
    amount: 4900000,
    status: 'completed' as const,
    paymentMethod: 'zarinpal',
    zarinpalAuthority: 'A00000000000000000000000000002',
    zarinpalRefId: '876543210',
    zarinpalCardHash: 'card_hash_def456',
    paidAt: new Date('2024-06-01T14:30:00Z'),
    createdAt: new Date('2024-06-01T14:15:00Z'),
    updatedAt: new Date('2024-06-01T14:30:00Z'),
  },
  // Second successful payment for canceled subscription
  {
    id: 'pay_canceled_second_001',
    userId: 'user_canceled_basic',
    subscriptionId: 'sub_canceled_basic_001',
    productId: 'prod_basic_monthly',
    amount: 4900000,
    status: 'completed' as const,
    paymentMethod: 'zarinpal',
    zarinpalAuthority: 'A00000000000000000000000000003',
    zarinpalRefId: '765432109',
    zarinpalCardHash: 'card_hash_def456',
    paidAt: new Date('2024-07-01T10:45:00Z'),
    createdAt: new Date('2024-07-01T10:30:00Z'),
    updatedAt: new Date('2024-07-01T10:45:00Z'),
  },
  // Failed payment attempts
  {
    id: 'pay_failed_001',
    userId: 'user_failed_payments',
    subscriptionId: 'sub_failed_starter_001',
    productId: 'prod_starter_monthly',
    amount: 1900000,
    status: 'failed' as const,
    paymentMethod: 'zarinpal',
    zarinpalAuthority: 'A00000000000000000000000000004',
    retryCount: 2,
    maxRetries: 3,
    nextRetryAt: new Date('2024-09-06T12:00:00Z'),
    failureReason: 'Insufficient funds',
    failedAt: new Date('2024-08-15T11:30:00Z'),
    createdAt: new Date('2024-08-15T11:00:00Z'),
    updatedAt: new Date('2024-08-15T11:30:00Z'),
  },
  // Successful initial payment for failed user
  {
    id: 'pay_failed_initial_001',
    userId: 'user_failed_payments',
    subscriptionId: 'sub_failed_starter_001',
    productId: 'prod_starter_monthly',
    amount: 1900000,
    status: 'completed' as const,
    paymentMethod: 'zarinpal',
    zarinpalAuthority: 'A00000000000000000000000000005',
    zarinpalRefId: '654321098',
    zarinpalCardHash: 'card_hash_ghi789',
    paidAt: new Date('2024-07-15T16:20:00Z'),
    createdAt: new Date('2024-07-15T16:00:00Z'),
    updatedAt: new Date('2024-07-15T16:20:00Z'),
  },
  // Pending payment for new customer
  {
    id: 'pay_pending_001',
    userId: 'user_new_customer',
    subscriptionId: null,
    productId: 'prod_basic_monthly',
    amount: 4900000,
    status: 'pending' as const,
    paymentMethod: 'zarinpal',
    zarinpalAuthority: 'A00000000000000000000000000006',
    createdAt: new Date('2024-08-30T13:45:00Z'),
    updatedAt: new Date('2024-08-30T13:45:00Z'),
  },
] as const;

// Sample webhook events for testing
export const seedWebhookEvents = [
  {
    id: 'webhook_001',
    source: 'zarinpal',
    eventType: 'payment.completed',
    paymentId: 'pay_success_001',
    rawPayload: {
      authority: 'A00000000000000000000000000001',
      status: 'OK',
      ref_id: '987654321',
      card_hash: 'card_hash_abc123',
    },
    processed: true,
    processedAt: new Date('2024-08-01T09:15:30Z'),
    forwardedToExternal: true,
    forwardedAt: new Date('2024-08-01T09:15:45Z'),
    createdAt: new Date('2024-08-01T09:15:15Z'),
    updatedAt: new Date('2024-08-01T09:15:45Z'),
  },
  {
    id: 'webhook_002',
    source: 'zarinpal',
    eventType: 'payment.failed',
    paymentId: 'pay_failed_001',
    rawPayload: {
      authority: 'A00000000000000000000000000004',
      status: 'NOK',
      error_message: 'Insufficient funds',
    },
    processed: true,
    processedAt: new Date('2024-08-15T11:30:15Z'),
    forwardedToExternal: false,
    createdAt: new Date('2024-08-15T11:30:00Z'),
    updatedAt: new Date('2024-08-15T11:30:15Z'),
  },
] as const;

/**
 * Comprehensive database seeding for complete user journey testing
 * Creates products, users, subscriptions, payments, and webhook events
 */
export async function seedDatabase(db: DbType) {
  console.warn('🌱 Starting comprehensive database seeding...');

  // Seed products
  console.warn('📦 Seeding products...');
  for (const productData of seedProducts) {
    await db.insert(product).values(productData).onConflictDoNothing();
    console.warn(`✓ Added product: ${productData.name}`);
  }

  // Seed test users
  console.warn('👥 Seeding test users...');
  for (const userData of seedTestUsers) {
    await db.insert(user).values(userData).onConflictDoNothing();
    console.warn(`✓ Added user: ${userData.email}`);
  }

  // Seed subscriptions
  console.warn('📋 Seeding subscriptions...');
  for (const subscriptionData of seedSubscriptions) {
    await db.insert(subscription).values(subscriptionData).onConflictDoNothing();
    console.warn(`✓ Added subscription: ${subscriptionData.id}`);
  }

  // Seed payments
  console.warn('💳 Seeding payments...');
  for (const paymentData of seedPayments) {
    await db.insert(payment).values(paymentData).onConflictDoNothing();
    console.warn(`✓ Added payment: ${paymentData.id} (${paymentData.status})`);
  }

  // Seed webhook events
  console.warn('🔔 Seeding webhook events...');
  for (const webhookData of seedWebhookEvents) {
    await db.insert(webhookEvent).values(webhookData).onConflictDoNothing();
    console.warn(`✓ Added webhook: ${webhookData.eventType}`);
  }

  console.warn('✅ Database seeding completed successfully');
  console.warn('');
  console.warn('🎯 Test Scenarios Available:');
  console.warn('   • john.doe@example.com - Active Pro subscription with successful payments');
  console.warn('   • jane.smith@example.com - Canceled Basic subscription (can resubscribe)');
  console.warn('   • bob.wilson@example.com - Active subscription with failed payment attempts');
  console.warn('   • alice.brown@example.com - New customer with pending payment');
}
