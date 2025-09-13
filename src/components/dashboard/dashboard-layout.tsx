'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib';

// Following shadcn/ui dashboard-01 block official spacing patterns
type DashboardContainerProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Main dashboard container following shadcn/ui dashboard-01 block pattern
 * Provides consistent spacing and responsive layout structure
 */
export function DashboardContainer({ children, className }: DashboardContainerProps) {
  return (
    <div className={cn('@container/main flex flex-1 flex-col w-full min-w-0', className)}>
      {children}
    </div>
  );
}

type DashboardSectionProps = {
  children: ReactNode;
  className?: string;
  spacing?: 'compact' | 'default' | 'spacious';
};

/**
 * Dashboard section with consistent spacing following official patterns
 * Provides standardized spacing between dashboard sections
 */
export function DashboardSection({
  children,
  className,
  spacing = 'default',
}: DashboardSectionProps) {
  const spacingClasses = {
    compact: 'space-y-3 md:space-y-4',
    default: 'space-y-4 md:space-y-6',
    spacious: 'space-y-6 md:space-y-8',
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}

type DashboardGridProps = {
  children: ReactNode;
  columns?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'compact' | 'default' | 'spacious';
  className?: string;
};

const DEFAULT_GRID_COLUMNS = { default: 1, md: 2, lg: 3 };

/**
 * Responsive dashboard grid following Tailwind best practices
 * No minimum widths, proper responsive breakpoints, consistent spacing
 */
export function DashboardGrid({
  children,
  columns = DEFAULT_GRID_COLUMNS,
  gap = 'default',
  className,
}: DashboardGridProps) {
  const gapClasses = {
    compact: 'gap-3 md:gap-4',
    default: 'gap-4 md:gap-6',
    spacious: 'gap-6 md:gap-8',
  };

  // Build responsive column classes
  const columnClasses = [
    `grid-cols-${columns.default || 1}`,
    columns.sm && `sm:grid-cols-${columns.sm}`,
    columns.md && `md:grid-cols-${columns.md}`,
    columns.lg && `lg:grid-cols-${columns.lg}`,
    columns.xl && `xl:grid-cols-${columns.xl}`,
  ].filter(Boolean).join(' ');

  return (
    <div className={cn(
      'grid',
      columnClasses,
      gapClasses[gap],
      'w-full max-w-none min-w-0', // Ensure full width utilization and prevent overflow
      className,
    )}
    >
      {children}
    </div>
  );
}

type DashboardCardSectionProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
};

/**
 * Standardized card section for dashboard content
 * Ensures consistent card heights and no minimum width constraints
 */
export function DashboardCardSection({
  children,
  title,
  description,
  className,
}: DashboardCardSectionProps) {
  return (
    <div className={cn('space-y-4 md:space-y-6', className)}>
      {(title || description) && (
        <div className="">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

type DashboardMetricGridProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Specialized grid for metric cards following shadcn/ui dashboard-01 block
 * Implements the exact pattern from the official block
 */
export function DashboardMetricGrid({ children, className }: DashboardMetricGridProps) {
  return (
    <div className={cn(
      // Official shadcn/ui dashboard-01 metric grid pattern
      'grid grid-cols-1 gap-4 w-full min-w-0',
      // Responsive columns following official pattern
      'sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4',
      // Card styling using data attributes for consistency
      '*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card',
      '*:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs',
      'dark:*:data-[slot=card]:bg-card',
      className,
    )}
    >
      {children}
    </div>
  );
}

type DashboardContentGridProps = {
  children: ReactNode;
  layout?: 'equal' | 'sidebar' | 'main-sidebar' | 'three-column';
  className?: string;
};

/**
 * Content grid for main dashboard layouts
 * Provides common layout patterns without minimum widths
 */
export function DashboardContentGrid({
  children,
  layout = 'equal',
  className,
}: DashboardContentGridProps) {
  const layoutClasses = {
    'equal': 'grid-cols-1 md:grid-cols-2',
    'sidebar': 'grid-cols-1 lg:grid-cols-[250px_1fr]',
    'main-sidebar': 'grid-cols-1 lg:grid-cols-[1fr_300px]',
    'three-column': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={cn(
      'grid gap-4 md:gap-6 w-full min-w-0',
      layoutClasses[layout],
      className,
    )}
    >
      {children}
    </div>
  );
}

/**
 * Two-column layout with 2:1 ratio (following dashboard patterns)
 */
export function DashboardTwoColumnGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DashboardContentGrid layout="equal" className={className}>
      {children}
    </DashboardContentGrid>
  );
}

/**
 * Three-column equal layout
 */
export function DashboardThreeColumnGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <DashboardContentGrid layout="three-column" className={className}>
      {children}
    </DashboardContentGrid>
  );
}
