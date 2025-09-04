'use client';

import { type ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { useLocale } from 'next-intl';

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getRTLUtils } from '@/lib/rtl';

// =============================================================================
// UNIFIED DASHBOARD CARD SYSTEM
// Consolidates dashboard-cards.tsx + dashboard-card.tsx + metric-card.tsx
// Eliminates ~400+ lines of duplicate code with consistent shadcn v4 API
// =============================================================================

// Base Dashboard Card - replaces all basic card implementations
type DashboardCardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  headerAction?: ReactNode; // For backwards compatibility
  footer?: ReactNode;
  icon?: ReactNode;
  variant?: 'default' | 'elevated' | 'bordered';
  shadow?: 'sm' | 'lg' | 'none'; // For backwards compatibility
};

export function DashboardCard({
  title,
  description,
  children,
  className,
  action,
  headerAction,
  footer,
  icon,
  variant = 'default',
  shadow,
}: DashboardCardProps) {
  const locale = useLocale();
  const { createClass } = getRTLUtils(locale);
  const finalAction = action || headerAction;
  return (
    <Card className={cn(
      'h-full',
      variant === 'elevated' && 'hover:shadow-md transition-shadow duration-200',
      variant === 'bordered' && 'border-2',
      className
    )}>
      {(title || description || action || icon) && (
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              {icon && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                  {icon}
                </div>
              )}
              <div className={createClass('flex-1 space-y-1')}>
                {title && <CardTitle>{title}</CardTitle>}
                {description && <CardDescription>{description}</CardDescription>}
              </div>
            </div>
            {finalAction && <CardAction>{finalAction}</CardAction>}
          </div>
        </CardHeader>
      )}
      <CardContent className={title || description ? undefined : 'pt-6'}>
        {children}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}

// Metric Card - unified implementation for KPIs and metrics
type MetricCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number | string;
    label?: string;
    direction?: 'up' | 'down' | 'neutral';
    icon?: any; // Allow any React component type
  };
  badge?: ReactNode | {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary';
    label: string;
  };
  className?: string;
  action?: ReactNode;
  footer?: string;
};

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  badge,
  className,
  action,
  footer,
}: MetricCardProps) {
  const trendValue = typeof trend?.value === 'string' ? parseFloat(trend.value) || 0 : trend?.value || 0;
  const isPositiveTrend = trend && (trend.direction === 'up' || (trend.direction !== 'down' && trend.direction !== 'neutral' && trendValue > 0));
  const isNegativeTrend = trend && (trend.direction === 'down' || (trend.direction !== 'up' && trend.direction !== 'neutral' && trendValue < 0));

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                {icon}
              </div>
            )}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {action && <CardAction>{action}</CardAction>}
        </div>
        {badge && (
          <div className="pt-2">
            {typeof badge === 'object' && badge !== null && 'variant' in badge ? (
              <div className={cn(
                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                badge.variant === 'outline' ? 'border border-border bg-transparent' :
                badge.variant === 'secondary' ? 'bg-secondary text-secondary-foreground' :
                badge.variant === 'destructive' ? 'bg-destructive text-destructive-foreground' :
                'bg-primary text-primary-foreground'
              )}>
                {(badge as { label: string }).label}
              </div>
            ) : (
              <>{badge}</>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
          {(description || trend) && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {trend && (
                <div className="flex items-center gap-1">
                  {isPositiveTrend && (
                    <TrendingUp className="h-3 w-3 text-emerald-500" />
                  )}
                  {isNegativeTrend && (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span className={cn(
                    'font-medium',
                    isPositiveTrend && 'text-emerald-600',
                    isNegativeTrend && 'text-red-600'
                  )}>
                    {trendValue > 0 ? '+' : ''}{typeof trend.value === 'string' ? trend.value : `${trend.value}%`}
                  </span>
                  {trend.label && <span>{trend.label}</span>}
                </div>
              )}
              {description && <span>{description}</span>}
            </div>
          )}
          {footer && (
            <div className="text-xs text-muted-foreground pt-1">
              {footer}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Status Card - for displaying items with status indicators (payments, subscriptions)
type StatusCardProps = {
  title: string;
  subtitle?: string | ReactNode;
  status: ReactNode;
  icon?: ReactNode;
  primaryInfo: ReactNode;
  secondaryInfo?: ReactNode;
  metadata?: ReactNode;
  action?: ReactNode;
  className?: string;
  statusColor?: 'default' | 'success' | 'warning' | 'error';
};

export function StatusCard({
  title,
  subtitle,
  status,
  icon,
  primaryInfo,
  secondaryInfo,
  metadata,
  action,
  className,
  statusColor = 'default',
}: StatusCardProps) {
  const getStatusColor = () => {
    switch (statusColor) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400';
      default:
        return 'bg-gray-50 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Card className={cn('h-full hover:shadow-md transition-shadow duration-200', className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {icon && (
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', getStatusColor())}>
                {icon}
              </div>
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-medium">{title}</CardTitle>
                {status}
              </div>
              {subtitle && (
                <CardDescription className="text-sm">{subtitle}</CardDescription>
              )}
            </div>
          </div>
          {action && <CardAction>{action}</CardAction>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {primaryInfo}
          </div>
          {secondaryInfo && (
            <div className="space-y-2">
              {secondaryInfo}
            </div>
          )}
          {metadata && (
            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              {metadata}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Content Card - flexible card for general content with optional status
type ContentCardProps = {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  status?: ReactNode;
  primaryContent: ReactNode;
  secondaryContent?: ReactNode;
  footer?: ReactNode;
  action?: ReactNode;
  className?: string;
  variant?: 'default' | 'elevated';
};

export function ContentCard({
  title,
  subtitle,
  description,
  icon,
  status,
  primaryContent,
  secondaryContent,
  footer,
  action,
  className,
  variant = 'default',
}: ContentCardProps) {
  return (
    <Card className={cn(
      'h-full',
      variant === 'elevated' && 'hover:shadow-md transition-shadow duration-200',
      className
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
                {icon}
              </div>
            )}
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold">{title}</CardTitle>
                {status}
              </div>
              {subtitle && (
                <CardDescription className="text-sm">{subtitle}</CardDescription>
              )}
              {description && (
                <CardDescription className="text-xs">{description}</CardDescription>
              )}
            </div>
          </div>
          {action && <CardAction>{action}</CardAction>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {primaryContent}
          {secondaryContent}
        </div>
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}

// Empty Card - for empty states
type EmptyCardProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyCard({
  title,
  description,
  icon,
  action,
  className,
}: EmptyCardProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {icon && (
          <div className="mb-4 rounded-full bg-muted p-3">
            {icon}
          </div>
        )}
        <CardTitle className="mb-2 text-lg">{title}</CardTitle>
        {description && (
          <CardDescription className="mb-4 max-w-sm">{description}</CardDescription>
        )}
        {action}
      </CardContent>
    </Card>
  );
}

// Loading Card - for loading states
type LoadingCardProps = {
  title?: string;
  className?: string;
  rows?: number;
  variant?: 'default' | 'metric' | 'status';
};

export function LoadingCard({
  title = 'Loading...',
  className,
  rows = 3,
  variant = 'default',
}: LoadingCardProps) {
  return (
    <Card className={cn('h-full', className)}>
      {title && variant !== 'metric' && (
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {variant === 'metric' ? (
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        ) : (
          <div className="space-y-3">
            {Array.from({ length: rows }, (_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// DashboardDataCard - backwards compatible component for data display
type DashboardDataCardProps = {
  title: string;
  subtitle?: string;
  status?: ReactNode;
  icon?: ReactNode;
  primaryInfo: ReactNode;
  secondaryInfo?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function DashboardDataCard({
  title,
  subtitle,
  status,
  icon,
  primaryInfo,
  secondaryInfo,
  actions,
  className,
}: DashboardDataCardProps) {
  return (
    <Card className={cn('w-full hover:shadow-md transition-shadow', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {icon && (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/20">
                {icon}
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base">{title}</h3>
                {status}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
              {secondaryInfo && (
                <div className="text-sm text-muted-foreground">
                  {secondaryInfo}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {primaryInfo}
            {actions}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// All components are already exported above - no need for separate export statement