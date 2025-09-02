'use client';

import { type ReactNode } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { DashboardSection } from '@/components/ui/dashboard-states';

// Unified dashboard page header component for absolute consistency
type DashboardPageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function DashboardPageHeader({ 
  title, 
  description, 
  action,
  className 
}: DashboardPageHeaderProps) {
  return (
    <DashboardSection className={className}>
      <div className="flex items-center justify-between">
        <PageHeader
          title={title}
          description={description}
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