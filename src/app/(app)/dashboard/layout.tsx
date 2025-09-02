import type React from 'react';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { AppSidebar } from '@/components/dashboard/dashboard-nav';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <DashboardHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-8 lg:pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
