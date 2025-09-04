import type React from 'react';

import { AppSidebar } from '@/components/dashboard/dashboard-nav';
import { NavigationHeader } from '@/components/ui/dashboard-header';
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
        <NavigationHeader />
        <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:p-8 lg:pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
