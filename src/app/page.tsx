import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { BRAND } from '@/constants';
import { auth } from '@/lib/auth';
import { createMetadata } from '@/utils/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    title: BRAND.tagline,
    description: BRAND.description,
  });
}

export default async function Home() {
  // Check if user is authenticated
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });

  if (session?.user) {
    // User is authenticated, redirect to chat
    redirect('/chat');
  } else {
    // User is not authenticated, redirect to sign-in
    redirect('/auth/sign-in');
  }
}
