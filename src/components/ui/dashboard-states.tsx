'use client';

import { type ReactNode } from 'react';
import { AlertCircle, Package, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FadeIn, PageTransition } from '@/components/ui/motion';

// Standardized loading state for dashboard pages
type DashboardLoadingProps = {
  title?: string;
  message?: string;
  className?: string;
};

export function DashboardLoading({ 
  title = "Loading",
  message = "Please wait while we fetch your data...",
  className
}: DashboardLoadingProps) {
  return (
    <PageTransition>
      <FadeIn delay={0.05} className={className}>
        <div className="text-center py-12">
          <div className="flex items-center justify-center mb-4">
            <LoadingSpinner className="h-8 w-8 mr-2" />
            <span className="text-xl font-medium">{title}</span>
          </div>
          <p className="text-muted-foreground">{message}</p>
        </div>
      </FadeIn>
    </PageTransition>
  );
}

// Standardized error state for dashboard pages
type DashboardErrorProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
  icon?: ReactNode;
};

export function DashboardError({
  title = "Something went wrong", 
  message = "There was an error loading your data. Please try again.",
  onRetry,
  className,
  icon
}: DashboardErrorProps) {
  const ErrorIcon = icon || AlertCircle;
  
  return (
    <PageTransition>
      <FadeIn delay={0.05} className={className}>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                {typeof ErrorIcon === 'function' ? <ErrorIcon className="h-8 w-8 text-destructive" /> : ErrorIcon}
              </div>
              <h3 className="text-lg font-semibold mb-2 text-destructive">{title}</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>
              {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </FadeIn>
    </PageTransition>
  );
}

// Standardized empty state for dashboard pages
type DashboardEmptyProps = {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function DashboardEmpty({
  title = "No data found",
  description = "There's no data to display yet.",
  action,
  icon,
  className
}: DashboardEmptyProps) {
  const EmptyIcon = icon || Package;
  
  return (
    <FadeIn className={className}>
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          {typeof EmptyIcon === 'function' ? <EmptyIcon className="h-8 w-8 text-muted-foreground" /> : EmptyIcon}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">{description}</p>
        {action}
      </div>
    </FadeIn>
  );
}

// Standardized page wrapper with consistent animations and layout
type DashboardPageProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardPage({ children, className }: DashboardPageProps) {
  return (
    <PageTransition>
      <div className={`space-y-6 ${className || ''}`}>
        {children}
      </div>
    </PageTransition>
  );
}

// Standardized section wrapper for dashboard content
type DashboardSectionProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

export function DashboardSection({ children, delay = 0.05, className }: DashboardSectionProps) {
  return (
    <FadeIn delay={delay} className={className}>
      {children}
    </FadeIn>
  );
}