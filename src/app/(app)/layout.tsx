import type React from 'react';

import { requireAuth } from '@/app/auth/actions';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Require authentication before rendering
  await requireAuth();

  return children;
}
