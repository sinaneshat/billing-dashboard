'use client';

import { type ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Standardized dashboard card component for consistent styling
type DashboardCardProps = {
  title?: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  headerAction?: ReactNode;
  shadow?: 'sm' | 'lg' | 'none';
  gradient?: boolean;
};

export function DashboardCard({
  title,
  description,
  icon,
  children,
  className = '',
  headerAction,
  shadow = 'lg',
  gradient = false
}: DashboardCardProps) {
  const cardClasses = [
    'border-0',
    shadow === 'lg' ? 'shadow-lg' : shadow === 'sm' ? 'shadow-sm' : '',
    gradient ? 'bg-gradient-to-br from-card to-card/50' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <Card className={cardClasses} data-slot="dashboard-card">
      {(title || description || headerAction) && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  {icon}
                </div>
              )}
              <div>
                {title && (
                  <CardTitle className="text-xl">{title}</CardTitle>
                )}
                {description && (
                  <CardDescription>{description}</CardDescription>
                )}
              </div>
            </div>
            {headerAction}
          </div>
        </CardHeader>
      )}
      <CardContent className={title || description ? undefined : 'pt-6'}>
        {children}
      </CardContent>
    </Card>
  );
}

// Variant for data display cards (subscriptions, payments, etc.)
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
  className = ''
}: DashboardDataCardProps) {
  return (
    <Card className={`w-full hover:shadow-md transition-shadow ${className}`} data-slot="data-card">
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