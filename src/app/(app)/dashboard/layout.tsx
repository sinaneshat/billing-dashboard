import { headers } from 'next/headers';
import type React from 'react';

import { DashboardHeader, DashboardNav } from '@/components/dashboard';
import { auth } from '@/lib/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      {/* Main content area */}
      <div className="md:pl-64">
        <DashboardHeader user={session?.user} />

        {/* Page content */}
        <main className="flex-1">
          <div className="container mx-auto px-4 py-6 md:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
