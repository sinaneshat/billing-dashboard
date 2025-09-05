'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

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
import { DashboardSection } from './dashboard-states';
import { cn } from '@/lib';

// =============================================================================
// UNIFIED HEADER SYSTEM FOR DASHBOARD
// Consolidates: dashboard-header.tsx + page-header.tsx + dashboard/dashboard-header.tsx
// Eliminates ~128 lines of duplicate code with consistent API
// =============================================================================

const breadcrumbMap: Record<string, { titleKey: string; parent?: string }> = {
  '/dashboard': { titleKey: 'navigation.overview' },
  '/dashboard/billing': { titleKey: 'navigation.billing', parent: '/dashboard' },
  '/dashboard/billing/subscriptions': { titleKey: 'navigation.subscriptions', parent: '/dashboard/billing' },
  '/dashboard/billing/plans': { titleKey: 'navigation.plans', parent: '/dashboard/billing' },
  '/dashboard/billing/payments': { titleKey: 'navigation.paymentHistory', parent: '/dashboard/billing' },
  '/dashboard/billing/methods': { titleKey: 'navigation.paymentMethods', parent: '/dashboard/billing' },
};

// Navigation Header - replaces dashboard-header.tsx
type NavigationHeaderProps = {
  className?: string;
};

export function NavigationHeader({ className }: NavigationHeaderProps = {}) {
  const pathname = usePathname();
  const t = useTranslations();
  const currentPage = breadcrumbMap[pathname];
  const parentPage = currentPage?.parent ? breadcrumbMap[currentPage.parent] : null;

  return (
    <header className={cn(
      "flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
      className
    )}>
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ms-1" />
        <Separator orientation="vertical" className="me-2 h-4" />
        {currentPage && (
          <Breadcrumb>
            <BreadcrumbList>
              {parentPage && (
                <>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href={currentPage.parent!}>
                      {t(parentPage.titleKey)}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage>{t(currentPage.titleKey)}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>
    </header>
  );
}

// Page Header - replaces page-header.tsx
type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  showSeparator?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function PageHeader({ 
  title, 
  description, 
  action, 
  children,
  showSeparator = true,
  size = 'md',
  className 
}: PageHeaderProps) {
  const sizeConfig = {
    sm: {
      title: 'text-lg font-semibold tracking-tight',
      description: 'text-xs text-muted-foreground',
      spacing: 'space-y-3'
    },
    md: {
      title: 'text-2xl font-semibold tracking-tight',
      description: 'text-sm text-muted-foreground',
      spacing: 'space-y-6'
    },
    lg: {
      title: 'text-3xl font-bold tracking-tight',
      description: 'text-base text-muted-foreground',
      spacing: 'space-y-8'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className={cn(config.spacing, className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className={config.title}>{title}</h1>
          {description && (
            <p className={config.description}>{description}</p>
          )}
        </div>
        {action && <div className="flex items-center space-x-2">{action}</div>}
      </div>
      {children}
      {showSeparator && <Separator />}
    </div>
  );
}

// Dashboard Page Header - replaces ui/dashboard-header.tsx
type DashboardPageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function DashboardPageHeader({ 
  title, 
  description, 
  action,
  size = 'md',
  className 
}: DashboardPageHeaderProps) {
  return (
    <DashboardSection className={className}>
      <div className="flex items-center justify-between">
        <PageHeader
          title={title}
          description={description}
          size={size}
          showSeparator={false}
        />
        {action && (
          <div className="flex items-center gap-2">
            {action}
          </div>
        )}
      </div>
    </DashboardSection>
  );
}

// Header Action Wrapper
export function PageHeaderAction({ children }: { children: ReactNode }) {
  return <div className="flex items-center space-x-2">{children}</div>;
}

