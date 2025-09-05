'use client';

import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface MetricGridProps {
  children: ReactNode;
  className?: string;
}

/**
 * @deprecated Use DashboardMetricGrid from @/components/ui/dashboard-layout instead
 * This component is kept for backward compatibility
 */
export function MetricGrid({ children, className }: MetricGridProps) {
  return (
    <div 
      className={cn(
        // Official shadcn/ui dashboard-01 block pattern
        'grid grid-cols-1 gap-4 px-4 lg:px-6',
        // Responsive columns using standard breakpoints (no minimum widths)
        'sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4',
        // Card styling using data attributes for consistency
        '*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card',
        '*:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs',
        'dark:*:data-[slot=card]:bg-card',
        className
      )}
    >
      {children}
    </div>
  );
}