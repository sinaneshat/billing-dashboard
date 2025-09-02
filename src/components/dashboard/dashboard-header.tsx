'use client';

import { usePathname } from 'next/navigation';

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

const breadcrumbMap: Record<string, { title: string; parent?: string }> = {
  '/dashboard': { title: 'Overview' },
  '/dashboard/billing': { title: 'Billing', parent: '/dashboard' },
  '/dashboard/billing/subscriptions': { title: 'Subscriptions', parent: '/dashboard/billing' },
  '/dashboard/billing/plans': { title: 'Plans', parent: '/dashboard/billing' },
  '/dashboard/billing/payments': { title: 'Payment History', parent: '/dashboard/billing' },
  '/dashboard/billing/methods': { title: 'Payment Methods', parent: '/dashboard/billing' },
};

export function DashboardHeader() {
  const pathname = usePathname();
  const currentPage = breadcrumbMap[pathname];
  const parentPage = currentPage?.parent ? breadcrumbMap[currentPage.parent] : null;

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        {currentPage && (
          <Breadcrumb>
            <BreadcrumbList>
              {parentPage && (
                <>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href={currentPage.parent!}>
                      {parentPage.title}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>{currentPage.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
    </header>
  );
}
