#!/usr/bin/env tsx

/**
 * API Testing Script
 * Tests all API endpoints with seeded data
 */

import { promises as fs } from 'node:fs';

const BASE_URL = 'http://localhost:3001';

type TestResult = {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
  data?: unknown;
};

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method = 'GET',
  headers: Record<string, string> = {},
  body?: unknown,
): Promise<TestResult> {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json();

    const result: TestResult = {
      endpoint,
      method,
      status: response.status,
      success: response.ok,
      data: response.ok ? data : undefined,
      error: !response.ok ? `${response.status}: ${data.message || 'Unknown error'}` : undefined,
    };

    results.push(result);
    return result;
  } catch (error) {
    const result: TestResult = {
      endpoint,
      method,
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    results.push(result);
    return result;
  }
}

async function runTests() {
  console.log('🧪 Starting API tests...\n');

  // Test public endpoints (no auth required)
  console.log('📦 Testing Products API...');
  const productsTest = await testEndpoint('/api/v1/products');
  if (productsTest.success) {
    console.log(`✅ Products API: ${productsTest.data?.data?.length || 0} products found`);
  } else {
    console.log(`❌ Products API failed: ${productsTest.error}`);
  }

  console.log('\n🏥 Testing System Health...');
  const healthTest = await testEndpoint('/api/v1/system/health');
  if (healthTest.success) {
    console.log(`✅ System Health: ${healthTest.data?.data?.status || 'unknown'}`);
  } else {
    console.log(`❌ System Health failed: ${healthTest.error}`);
  }

  // Test endpoints that require authentication (expect 401)
  console.log('\n🔐 Testing Protected Endpoints (should return 401)...');

  const protectedEndpoints = [
    '/api/v1/subscriptions',
    '/api/v1/payments',
    '/api/v1/webhooks/events',
  ];

  for (const endpoint of protectedEndpoints) {
    const test = await testEndpoint(endpoint);
    if (test.status === 401) {
      console.log(`✅ ${endpoint}: Properly protected (401)`);
    } else {
      console.log(`⚠️ ${endpoint}: Expected 401, got ${test.status}`);
    }
  }

  // Test API documentation endpoint
  console.log('\n📖 Testing API Documentation...');
  const docsTest = await testEndpoint('/api/v1/scalar');
  if (docsTest.success) {
    console.log('✅ API Documentation: Available');
  } else {
    console.log(`❌ API Documentation failed: ${docsTest.error}`);
  }

  // Summary
  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.success || r.status === 401).length;
  const total = results.length;
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (total - passed > 0) {
    console.log('\n❌ Failed Tests:');
    results
      .filter(r => !r.success && r.status !== 401)
      .forEach((r) => {
        console.log(`   ${r.method} ${r.endpoint}: ${r.error}`);
      });
  }

  // Save detailed results
  await fs.writeFile(
    'api-test-results.json',
    JSON.stringify(results, null, 2),
  );
  console.log('\n💾 Detailed results saved to api-test-results.json');

  // Test specific seeded data
  console.log('\n🧪 Testing Seeded Data...');
  if (productsTest.success && productsTest.data?.data) {
    const products = productsTest.data.data;
    const expectedProducts = ['Starter Plan', 'Basic Plan', 'Pro Plan', 'Enterprise Plan', 'Premium Annual'];

    for (const expectedName of expectedProducts) {
      const found = products.find((p: { name: string; price: number }) => p.name === expectedName);
      if (found) {
        console.log(`✅ ${expectedName}: ${found.price.toLocaleString()} IRR`);
      } else {
        console.log(`❌ ${expectedName}: Not found`);
      }
    }
  }

  console.log('\n🎉 API testing completed!');
}

if (require.main === module) {
  runTests().catch(console.error);
}
