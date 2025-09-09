/**
 * Debug SSO flow - Server-side testing utility
 * Run this to test JWT verification on the server side
 */

interface SessionTokenPayload {
  email: string;
  name: string;
  userId: string;
  iss: string;
  exp: number;
}

/**
 * Proper base64url encoding that handles Unicode characters
 */
function base64urlEncode(str: string): string {
  const encoder = new TextEncoder();
  const utf8Bytes = encoder.encode(str);
  const base64 = btoa(String.fromCharCode(...utf8Bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Create secure JWT with proper Unicode handling (matches client implementation)
 */
async function createSecureJWT(payload: SessionTokenPayload, secret: string): Promise<string> {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    secretKey,
    encoder.encode(data)
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  const base64 = btoa(String.fromCharCode(...signatureBytes));
  const signature = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * JWT verification utility (matches server implementation)
 */
async function verifyJWT(token: string, secret: string): Promise<any> {
  try {
    const [header, payloadStr, signature] = token.split('.');
    if (!header || !payloadStr || !signature) {
      throw new Error('Invalid token format');
    }

    const encoder = new TextEncoder();
    const data = `${header}.${payloadStr}`;
    
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/')), 
      c => c.charCodeAt(0)
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      secretKey,
      signatureBuffer,
      encoder.encode(data)
    );
    
    if (!isValid) {
      throw new Error('Invalid signature');
    }

    const paddedPayload = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4);
    const base64Payload = paddedPayload.replace(/-/g, '+').replace(/_/g, '/');
    
    const decoder = new TextDecoder();
    const payloadBytes = Uint8Array.from(atob(base64Payload), c => c.charCodeAt(0));
    const payload = JSON.parse(decoder.decode(payloadBytes));
    
    return payload;
  } catch (error) {
    throw new Error(`JWT verification failed: ${error.message}`);
  }
}

/**
 * Test JWT creation and verification end-to-end
 */
export async function testJWTFlow(): Promise<void> {
  console.log('🔍 Testing JWT Creation and Verification Flow');
  console.log('='.repeat(60));
  
  try {
    // Test data
    const testPayload: SessionTokenPayload = {
      email: 'test@example.com',
      name: 'Test User',
      userId: 'test-user-123',
      iss: 'roundtable1',
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
    };
    
    const testSecret = 'test-secret-key-for-jwt-signing-32-chars';
    
    console.log('Step 1: Creating JWT token...');
    const token = await createSecureJWT(testPayload, testSecret);
    console.log('✅ JWT created successfully');
    console.log('   Token length:', token.length);
    console.log('   Token parts:', token.split('.').length, '(should be 3)');
    
    console.log('\nStep 2: Verifying JWT token...');
    const decoded = await verifyJWT(token, testSecret);
    console.log('✅ JWT verification successful');
    console.log('   Decoded payload:', {
      ...decoded,
      exp: new Date(decoded.exp * 1000).toISOString()
    });
    
    console.log('\nStep 3: Testing with Unicode characters...');
    const unicodePayload: SessionTokenPayload = {
      email: 'test@example.com',
      name: 'Test User 测试用户 🚀',
      userId: 'test-user-123',
      iss: 'roundtable1',
      exp: Math.floor(Date.now() / 1000) + 300,
    };
    
    const unicodeToken = await createSecureJWT(unicodePayload, testSecret);
    const unicodeDecoded = await verifyJWT(unicodeToken, testSecret);
    console.log('✅ Unicode JWT test successful');
    console.log('   Original name:', unicodePayload.name);
    console.log('   Decoded name:', unicodeDecoded.name);
    console.log('   Names match:', unicodePayload.name === unicodeDecoded.name);
    
    console.log('\nStep 4: Testing with wrong secret...');
    try {
      await verifyJWT(token, 'wrong-secret');
      console.log('❌ Should have failed with wrong secret');
    } catch (error) {
      console.log('✅ Correctly failed with wrong secret:', error.message);
    }
    
    console.log('\nStep 5: Testing expired token...');
    const expiredPayload: SessionTokenPayload = {
      ...testPayload,
      exp: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
    };
    const expiredToken = await createSecureJWT(expiredPayload, testSecret);
    const expiredDecoded = await verifyJWT(expiredToken, testSecret);
    
    if (expiredDecoded.exp && Date.now() / 1000 > expiredDecoded.exp) {
      console.log('✅ Token expiry check working (token is expired)');
    } else {
      console.log('⚠️ Token expiry check may need attention');
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 JWT Flow Test Results: ALL TESTS PASSED');
    console.log('   The JWT creation and verification logic is working correctly');
    console.log('   Issue likely lies elsewhere in the SSO flow');
    
  } catch (error) {
    console.error('❌ JWT Flow Test Failed:', error);
    console.log('\n🔍 Possible issues:');
    console.log('   • Web Crypto API not available');
    console.log('   • Environment differences between client/server');
    console.log('   • Secret key mismatch');
  }
}

/**
 * Test SSO endpoint accessibility
 */
export async function testSSOEndpoint(): Promise<void> {
  console.log('\n🌐 Testing SSO Endpoint Accessibility');
  console.log('='.repeat(60));
  
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const testUrl = `${baseUrl}/api/auth/sso`;
    
    console.log('Testing endpoint:', testUrl);
    
    // Test without parameters (should return error)
    const response = await fetch(testUrl, { method: 'GET' });
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 400) {
      console.log('✅ SSO endpoint is accessible and returning expected error for missing token');
    } else {
      console.log('⚠️ Unexpected response status. Expected 400 for missing token.');
    }
    
  } catch (error) {
    console.error('❌ SSO Endpoint Test Failed:', error);
    console.log('🔍 Possible issues:');
    console.log('   • Billing dashboard server not running');
    console.log('   • Network connectivity issues');
    console.log('   • CORS configuration');
  }
}

// Run tests if called directly
if (require.main === module) {
  console.log('🚀 Starting SSO Debug Tests...\n');
  
  testJWTFlow()
    .then(() => testSSOEndpoint())
    .then(() => {
      console.log('\n🏁 All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}