/**
 * Fresh Database Seeding - Clean Start Products Only
 * Minimal seeding for new user testing - only creates products
 */

import type { DbType } from './index';
import { product } from './tables/billing';

// Clean product catalog for new user testing
export const freshProducts = [
  {
    id: 'prod_basic_starter',
    name: 'Starter Plan',
    description: 'Perfect for trying out our platform',
    price: 990000, // 9,900 IRR (~$0.24) per month - very affordable for testing
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: [
        '1GB Storage',
        '10GB Bandwidth',
        '1 User Account',
        'Email Support',
        'Basic Dashboard',
      ],
      tier: 'starter',
      popular: false,
      color: 'blue',
    },
  },
  {
    id: 'prod_professional',
    name: 'Professional Plan',
    description: 'Most popular choice for small businesses',
    price: 4900000, // 49,000 IRR (~$1.20) per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: [
        '10GB Storage',
        '100GB Bandwidth',
        '5 User Accounts',
        'Priority Email Support',
        'Advanced Analytics',
        'API Access',
      ],
      tier: 'professional',
      popular: true,
      color: 'green',
    },
  },
  {
    id: 'prod_business',
    name: 'Business Plan',
    description: 'Scale your business with advanced features',
    price: 9900000, // 99,000 IRR (~$2.40) per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: [
        '100GB Storage',
        '1TB Bandwidth',
        '25 User Accounts',
        '24/7 Phone & Email Support',
        'Advanced Analytics',
        'Full API Access',
        'Custom Integrations',
      ],
      tier: 'business',
      popular: false,
      color: 'purple',
    },
  },
  {
    id: 'prod_enterprise',
    name: 'Enterprise Plan',
    description: 'Everything you need for large organizations',
    price: 29900000, // 299,000 IRR (~$7.20) per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: [
        'Unlimited Storage',
        'Unlimited Bandwidth',
        'Unlimited Users',
        'Dedicated Account Manager',
        'Custom Solutions',
        'SLA Guarantee',
        'On-premise Deployment Option',
      ],
      tier: 'enterprise',
      popular: false,
      color: 'gold',
    },
  },
  {
    id: 'prod_annual_pro',
    name: 'Professional Annual',
    description: 'Professional plan paid yearly (2 months free)',
    price: 49000000, // 490,000 IRR (~$12) per year (10 months price)
    billingPeriod: 'one_time' as const,
    isActive: true,
    metadata: {
      features: [
        '10GB Storage',
        '100GB Bandwidth',
        '5 User Accounts',
        'Priority Email Support',
        'Advanced Analytics',
        'API Access',
        '2 Months FREE (17% savings)',
      ],
      tier: 'professional_annual',
      popular: false,
      color: 'green',
      discount: '17% discount',
      originalMonthlyPrice: 4900000,
    },
  },
  {
    id: 'prod_addon_storage',
    name: 'Extra Storage Add-on',
    description: 'Additional 50GB storage for any plan',
    price: 990000, // 9,900 IRR per month
    billingPeriod: 'monthly' as const,
    isActive: true,
    metadata: {
      features: [
        '50GB Additional Storage',
        'Compatible with all plans',
        'Instant activation',
      ],
      tier: 'addon',
      popular: false,
      color: 'gray',
      isAddon: true,
    },
  },
] as const;

/**
 * Seeds database with fresh products only
 * Perfect for clean testing with new user signups
 */
export async function seedFreshProducts(db: DbType) {
  console.log('🌱 Seeding fresh products for testing...');

  // Clear existing products first
  console.log('🧹 Clearing existing products...');
  await db.delete(product);

  // Insert fresh products
  console.log('📦 Adding fresh products...');
  for (const productData of freshProducts) {
    await db.insert(product).values(productData);
    console.log(`✅ Added: ${productData.name} (${productData.price.toLocaleString()} IRR)`);
  }

  console.log('');
  console.log('✅ Fresh product seeding completed!');
  console.log('');
  console.log('🎯 Available Products for Testing:');
  console.log('   • Starter Plan - 9,900 IRR/month (Perfect for testing)');
  console.log('   • Professional Plan - 49,000 IRR/month (Most popular)');
  console.log('   • Business Plan - 99,000 IRR/month (Advanced features)');
  console.log('   • Enterprise Plan - 299,000 IRR/month (Full features)');
  console.log('   • Professional Annual - 490,000 IRR/year (17% savings)');
  console.log('   • Extra Storage Add-on - 9,900 IRR/month');
  console.log('');
  console.log('💡 Ready for fresh user signup and subscription testing!');
}

/**
 * Quick database status check
 */
export async function checkDatabaseStatus(db: DbType) {
  try {
    const products = await db.select().from(product);
    console.log(`📊 Database Status: ${products.length} products available`);
    return products.length;
  } catch (error) {
    console.error('❌ Database check failed:', error);
    return 0;
  }
}
