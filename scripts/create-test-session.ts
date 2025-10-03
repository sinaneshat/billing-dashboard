import { db } from '../src/db';
import { user, session } from '../src/db/tables/auth';

async function createTestSession() {
  const testUserId = 'test-user-' + Date.now();
  const testSessionId = 'test-session-' + Date.now();
  const testSessionToken = crypto.randomUUID();

  // Create test user
  await db.insert(user).values({
    id: testUserId,
    name: 'Test User',
    email: 'test@roundtable.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Create session (expires in 7 days)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await db.insert(session).values({
    id: testSessionId,
    userId: testUserId,
    token: testSessionToken,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log('Test session created!');
  console.log('Session Token:', testSessionToken);
  console.log('\nSet this cookie in your browser:');
  console.log(`better-auth.session_token=${testSessionToken}; path=/; max-age=604800`);
}

createTestSession().catch(console.error);
