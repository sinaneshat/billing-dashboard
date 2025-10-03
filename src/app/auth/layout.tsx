import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import type React from 'react';
import { Suspense } from 'react';

import { redirectIfAuthenticated } from '@/app/auth/actions';
import { AuthLayout } from '@/containers/layouts/auth';
import { getQueryClient } from '@/lib/data/query-client';

type AuthLayoutPageProps = {
  children: React.ReactNode;
};

export default async function AuthLayoutPage({ children }: AuthLayoutPageProps) {
  // Redirect authenticated users to dashboard
  await redirectIfAuthenticated();

  // Create query client for streaming SSR support
  const queryClient = getQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={(
        <div className="flex items-center justify-center min-h-screen bg-background">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading authentication...</p>
          </div>
        </div>
      )}
      >
        <AuthLayout>{children}</AuthLayout>
      </Suspense>
    </HydrationBoundary>
  );
}
