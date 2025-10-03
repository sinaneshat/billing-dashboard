'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { auth } from '@/lib/auth';

/**
 * Server action to handle post-authentication redirect
 * Simplified version without organization handling
 */
export async function handlePostAuthRedirect(returnUrl?: string) {
  // 1. Get session or redirect to sign-in
  await getSessionOrRedirect();

  // 2. If returnUrl is valid, redirect to it
  if (returnUrl && returnUrl.startsWith('/')) {
    redirect(returnUrl);
  }

  // 3. Redirect to dashboard
  redirect('/dashboard');
}

/**
 * Get the current session or redirect to sign-in
 * @returns The authenticated session
 */
export async function getSessionOrRedirect() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (!session?.user) {
    redirect('/auth/sign-in');
  }

  return session;
}

/**
 * Simple auth check for pages that require authentication
 * @returns The authenticated session
 */
export async function requireAuth() {
  return getSessionOrRedirect();
}

/**
 * Redirect authenticated users away from auth pages (sign-in, sign-up)
 * This prevents logged-in users from accessing authentication pages
 */
export async function redirectIfAuthenticated() {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (session?.user) {
    redirect('/dashboard');
  }
}
