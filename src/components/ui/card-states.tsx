'use client';

import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Package,
  RefreshCw,
  WifiOff
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/ui/cn';

// =============================================================================
// UNIFIED CARD STATE SYSTEM
// Provides loading, empty, error, and success states for cards
// =============================================================================

// Enhanced loading state with better TanStack Query integration
export type CardLoadingStateProps = {
  title?: string;
  message?: string;
  variant?: 'skeleton' | 'spinner' | 'placeholder';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  rows?: number;
  showIcon?: boolean;
};

export function CardLoadingState({
  title,
  message,
  variant = 'skeleton',
  size = 'md',
  className,
  rows = 3,
  showIcon = true,
}: CardLoadingStateProps) {
  const t = useTranslations();

  const defaultTitle = title || t('states.loading.default');
  const defaultMessage = message || t('states.loading.please_wait');

  const sizeConfig = {
    sm: { container: 'py-4', iconSize: 'h-4 w-4', titleSize: 'text-sm', rows: 2 },
    md: { container: 'py-6', iconSize: 'h-6 w-6', titleSize: 'text-base', rows: 3 },
    lg: { container: 'py-8', iconSize: 'h-8 w-8', titleSize: 'text-lg', rows: 4 },
  };

  const config = sizeConfig[size];

  if (variant === 'spinner') {
    return (
      <Card className={cn('border-dashed border-2', className)}>
        <CardContent className={config.container}>
          <div className="flex flex-col items-center justify-center text-center space-y-3">
            {showIcon && <LoadingSpinner className={config.iconSize} />}
            <div className="space-y-1">
              <p className={cn(config.titleSize, 'font-medium')}>{defaultTitle}</p>
              <p className="text-sm text-muted-foreground">{defaultMessage}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'placeholder') {
    return (
      <Card className={cn('border-dashed border-2 bg-muted/20', className)}>
        <CardContent className={config.container}>
          <div className="flex items-center gap-3">
            {showIcon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <LoadingSpinner className="h-5 w-5" />
              </div>
            )}
            <div className="space-y-2 flex-1">
              <div className={cn('h-5 w-3/4 animate-pulse rounded bg-muted')} />
              <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default skeleton variant
  return (
    <Card className={cn('border-dashed border-2 bg-muted/20', className)}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {showIcon && (
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          )}
          <div className="space-y-2 flex-1">
            <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: config.rows }, (_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced empty state with better customization options
export type CardEmptyStateProps = {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  style?: 'default' | 'dashed' | 'minimal';
  className?: string;
};

export function CardEmptyState({
  title,
  description,
  icon,
  action,
  size = 'md',
  style = 'dashed',
  className,
}: CardEmptyStateProps) {
  const t = useTranslations();

  const defaultTitle = title || t('states.empty.default');
  const defaultDescription = description || t('states.empty.description');
  const IconComponent = icon || Package;

  const sizeConfig = {
    sm: {
      container: 'py-6',
      iconContainer: 'w-12 h-12',
      iconSize: 'h-6 w-6',
      title: 'text-sm font-medium',
      description: 'text-xs',
    },
    md: {
      container: 'py-8',
      iconContainer: 'w-16 h-16',
      iconSize: 'h-8 w-8',
      title: 'text-base font-medium',
      description: 'text-sm',
    },
    lg: {
      container: 'py-12',
      iconContainer: 'w-20 h-20',
      iconSize: 'h-10 w-10',
      title: 'text-lg font-semibold',
      description: 'text-base',
    },
  };

  const styleConfig = {
    default: 'border bg-card',
    dashed: 'border-2 border-dashed border-border/50 bg-gradient-to-br from-muted/30 to-background',
    minimal: 'border-0 shadow-none bg-transparent',
  };

  const sizeSettings = sizeConfig[size];

  return (
    <Card className={cn(styleConfig[style], className)}>
      <CardContent className={sizeSettings.container}>
        <div className="text-center space-y-4">
          <div className={cn(
            sizeSettings.iconContainer,
            'bg-muted rounded-lg flex items-center justify-center mx-auto',
            size === 'lg' && 'bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20',
          )}>
            {React.isValidElement(IconComponent) ? (
              IconComponent
            ) : IconComponent && typeof IconComponent === 'function' ? (
              <IconComponent className={cn(
                sizeSettings.iconSize,
                'text-muted-foreground',
                size === 'lg' && 'text-primary/60',
              )} />
            ) : null}
          </div>
          <div className="space-y-2">
            <h3 className={sizeSettings.title}>
              {defaultTitle}
            </h3>
            <p className={cn(
              sizeSettings.description,
              'text-muted-foreground max-w-md mx-auto',
            )}>
              {defaultDescription}
            </p>
          </div>
          {action && (
            <div className="pt-2">
              {action}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced error state with retry functionality
export type CardErrorStateProps = {
  title?: string;
  description?: string;
  error?: Error | null;
  onRetry?: () => void;
  retryLabel?: string;
  variant?: 'card' | 'alert' | 'network';
  severity?: 'error' | 'warning';
  className?: string;
  showErrorDetails?: boolean;
};

export function CardErrorState({
  title,
  description,
  error,
  onRetry,
  retryLabel,
  variant = 'card',
  severity = 'error',
  className,
  showErrorDetails = false,
}: CardErrorStateProps) {
  const t = useTranslations();

  const defaultTitle = title || t('states.error.default');
  const defaultDescription = description || t('states.error.description');
  const defaultRetryLabel = retryLabel || t('actions.tryAgain');

  if (variant === 'alert') {
    return (
      <Alert variant={severity === 'error' ? 'destructive' : 'default'} className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{defaultTitle}</AlertTitle>
        <AlertDescription>
          {defaultDescription}
          {showErrorDetails && error && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs">Error details</summary>
              <pre className="mt-1 text-xs whitespace-pre-wrap">{error.message}</pre>
            </details>
          )}
          {onRetry && (
            <Button
              variant="link"
              className="h-auto p-0 ms-2 text-inherit underline"
              onClick={onRetry}
            >
              {defaultRetryLabel}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (variant === 'network') {
    return (
      <Alert variant="destructive" className={cn('border-dashed', className)}>
        <WifiOff className="h-4 w-4" />
        <div className="flex items-center justify-between w-full">
          <div className="space-y-1">
            <AlertTitle className="flex items-center gap-2">
              {defaultTitle}
              <Badge variant="destructive" className="text-xs">
                {t('networkStatus.offline')}
              </Badge>
            </AlertTitle>
            <AlertDescription>
              {defaultDescription}
              {onRetry && (
                <Button
                  variant="link"
                  className="h-auto p-0 ms-1 text-inherit underline"
                  onClick={onRetry}
                >
                  {defaultRetryLabel}
                </Button>
              )}
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  }

  // Default card variant
  return (
    <Card className={cn('border-destructive/20 bg-destructive/5', className)}>
      <CardContent className="py-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-destructive">
              {defaultTitle}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {defaultDescription}
            </p>
            {showErrorDetails && error && (
              <details className="text-left">
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  Technical details
                </summary>
                <pre className="mt-2 text-xs text-left bg-muted p-2 rounded overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}
          </div>
          {onRetry && (
            <Button variant="outline" onClick={onRetry} className="border-destructive/30">
              <RefreshCw className="h-4 w-4 me-2" />
              {defaultRetryLabel}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Success state for completed actions
export type CardSuccessStateProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'card' | 'alert';
  className?: string;
};

export function CardSuccessState({
  title,
  description,
  action,
  variant = 'card',
  className,
}: CardSuccessStateProps) {
  if (variant === 'alert') {
    return (
      <Alert className={cn('border-chart-3/20 bg-chart-3/10', className)}>
        <CheckCircle className="h-4 w-4 text-chart-3" />
        <AlertTitle className="text-chart-3">{title}</AlertTitle>
        {description && (
          <AlertDescription className="text-chart-3/80">
            {description}
          </AlertDescription>
        )}
        {action && <div className="mt-3">{action}</div>}
      </Alert>
    );
  }

  return (
    <Card className={cn('border-chart-3/20 bg-chart-3/10', className)}>
      <CardContent className="text-center py-8 space-y-4">
        <div className="w-16 h-16 bg-chart-3/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-chart-3" />
        </div>
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-chart-3">{title}</h3>
          {description && (
            <p className="text-sm text-chart-3/80">{description}</p>
          )}
        </div>
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  );
}

// Card container with automatic state handling for TanStack Query
export type CardWithStatesProps<T> = {
  data?: T[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  loadingProps?: Partial<CardLoadingStateProps>;
  emptyProps?: Partial<CardEmptyStateProps>;
  errorProps?: Partial<CardErrorStateProps>;
  className?: string;
  children: (data: T[]) => React.ReactNode;
};

export function CardWithStates<T>({
  data,
  isLoading,
  isError,
  error,
  onRetry,
  loadingProps,
  emptyProps,
  errorProps,
  className,
  children,
}: CardWithStatesProps<T>) {
  // Loading state
  if (isLoading) {
    return (
      <CardLoadingState
        className={className}
        {...loadingProps}
      />
    );
  }

  // Error state
  if (isError) {
    return (
      <CardErrorState
        error={error}
        onRetry={onRetry}
        className={className}
        {...errorProps}
      />
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <CardEmptyState
        className={className}
        {...emptyProps}
      />
    );
  }

  // Render children with data
  return <>{children(data)}</>;
}
