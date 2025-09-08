'use client';

import type { ReactNode } from 'react';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type DashboardPageWrapperProps = {
  children: ReactNode;
  title: string;
  description?: string;
  className?: string;
  headerClassName?: string;
  actions?: ReactNode;
  showSeparator?: boolean;
};

/**
 * Reusable dashboard page wrapper with consistent title, description, and underline
 * Following shadcn/ui dashboard-01 block patterns for header styling
 */
export function DashboardPageWrapper({
  children,
  title,
  description,
  className,
  headerClassName,
  actions,
  showSeparator = true,
}: DashboardPageWrapperProps) {
  return (
    <div className={cn('flex flex-1 flex-col w-full min-w-0', className)}>
      {/* Page Header with Title, Description and Optional Actions */}
      <div className={cn('space-y-4 pb-4 md:pb-6', headerClassName)}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground max-w-2xl">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>

        {/* Separator (underline) following shadcn/ui patterns */}
        {showSeparator && (
          <Separator className="bg-border" data-slot="separator" />
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}

type DashboardPageHeaderOnlyProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  showSeparator?: boolean;
};

/**
 * Standalone dashboard page header component
 * For use in pages that need more control over layout
 */
export function DashboardPageHeader({
  title,
  description,
  actions,
  className,
  showSeparator = true,
}: DashboardPageHeaderOnlyProps) {
  return (
    <div className={cn('space-y-4 pb-4 md:pb-6', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="text-muted-foreground max-w-2xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {showSeparator && (
        <Separator className="bg-border" data-slot="separator" />
      )}
    </div>
  );
}

type DashboardSectionHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Section header for dashboard content areas
 * Smaller variant for sections within pages
 */
export function DashboardSectionHeader({
  title,
  description,
  actions,
  className,
}: DashboardSectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between pb-4', className)}>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

type DashboardSubsectionHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

/**
 * Subsection header for smaller content areas
 * Even smaller variant for subsections within dashboard sections
 */
export function DashboardSubsectionHeader({
  title,
  description,
  actions,
  className,
}: DashboardSubsectionHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between pb-3', className)}>
      <div className="space-y-0.5">
        <h3 className="text-base font-medium tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
