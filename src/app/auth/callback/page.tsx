import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getSessionOrRedirect } from '@/app/auth/actions';

export const metadata: Metadata = {
  title: 'Authenticating...',
  description: 'Completing sign in process',
};

// Force dynamic rendering to ensure this runs server-side
export const dynamic = 'force-dynamic';

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ returnUrl?: string }>;
}) {
  const params = await searchParams;

  // 1. Verify session exists
  await getSessionOrRedirect();

  // 2. If valid return URL is provided, redirect to it
  if (params.returnUrl && params.returnUrl.startsWith('/')) {
    redirect(params.returnUrl);
  }

  // 3. Redirect to dashboard
  redirect('/dashboard');
}
