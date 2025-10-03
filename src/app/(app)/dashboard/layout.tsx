import type { Metadata } from 'next';
import type React from 'react';

import { DashboardContentWrapper } from '@/components/dashboard/dashboard-content-wrapper';
import { NavigationHeader } from '@/components/dashboard/dashboard-header';
import { AppSidebar } from '@/components/dashboard/dashboard-nav';
import { BreadcrumbStructuredData } from '@/components/seo';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { BRAND } from '@/constants/brand';
import { createMetadata } from '@/utils/metadata';

export async function generateMetadata(): Promise<Metadata> {
  return createMetadata({
    title: `Dashboard - ${BRAND.fullName}`,
    description: 'Manage your account, subscriptions, and settings.',
    robots: 'noindex, nofollow', // Dashboard is private, don't index
  });
}

export default async function DashboardLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal?: React.ReactNode;
}) {
  return (
    <>
      <BreadcrumbStructuredData
        items={[
          { name: 'Home', url: '/' },
          { name: 'Dashboard', url: '/dashboard' },
        ]}
      />
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <NavigationHeader />
          <DashboardContentWrapper>
            <div className="flex flex-1 flex-col gap-6 p-4 pt-0 lg:ps-6 lg:pe-6 lg:pt-0 w-full min-w-0">
              {children}
            </div>
          </DashboardContentWrapper>
        </SidebarInset>
      </SidebarProvider>
      {modal}
    </>
  );
}
