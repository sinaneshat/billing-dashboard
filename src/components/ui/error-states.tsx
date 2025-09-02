'use client';

import { AlertCircle, RefreshCw, Wifi, WifiOff, AlertTriangle, Info, CheckCircle, XCircle, Clock } from 'lucide-react';
import * as React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/tailwind-utils';

// Base error state interface
interface BaseErrorStateProps {
  className?: string;
  title?: string;
  description?: string;
  showRetry?: boolean;
  onRetry?: () => void;
  retryLabel?: string;
}

// Network Error States
interface NetworkErrorProps extends BaseErrorStateProps {
  variant?: 'offline' | 'timeout' | 'connection';
}

export function NetworkError({ 
  className, 
  title, 
  description, 
  showRetry = true, 
  onRetry,
  retryLabel = 'Try again',
  variant = 'connection' 
}: NetworkErrorProps) {
  const config = {
    offline: {
      icon: WifiOff,
      defaultTitle: 'No Internet Connection',
      defaultDescription: 'Please check your internet connection and try again.',
      variant: 'destructive' as const,
      badgeText: 'Offline',
      badgeVariant: 'destructive' as const
    },
    timeout: {
      icon: Clock,
      defaultTitle: 'Request Timed Out',
      defaultDescription: 'The request took too long to complete. Please try again.',
      variant: 'destructive' as const,
      badgeText: 'Timeout',
      badgeVariant: 'warning' as const
    },
    connection: {
      icon: Wifi,
      defaultTitle: 'Connection Issue',
      defaultDescription: 'Unable to connect to the server. Please try again.',
      variant: 'destructive' as const,
      badgeText: 'Connection Error',
      badgeVariant: 'destructive' as const
    }
  };

  const { icon: Icon, defaultTitle, defaultDescription, variant: alertVariant, badgeText, badgeVariant } = config[variant];

  return (
    <Alert variant={alertVariant} className={cn("border-dashed", className)}>
      <Icon className="h-4 w-4" />
      <div className="flex items-center justify-between w-full">
        <div className="space-y-1">
          <AlertTitle className="flex items-center gap-2">
            {title || defaultTitle}
            <Badge variant={badgeVariant} className="text-xs">
              {badgeText}
            </Badge>
          </AlertTitle>
          <AlertDescription>
            {description || defaultDescription}
            {showRetry && onRetry && (
              <Button
                variant="link"
                className="h-auto p-0 ml-1 text-inherit underline"
                onClick={onRetry}
              >
                {retryLabel}
              </Button>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

// Data State Indicators  
interface DataStateProps extends BaseErrorStateProps {
  variant?: 'loading' | 'stale' | 'updating' | 'error';
}

export function DataStateIndicator({
  className,
  title,
  description,
  variant = 'updating',
  showRetry = false,
  onRetry,
  retryLabel = 'Refresh'
}: DataStateProps) {
  const config = {
    loading: {
      icon: RefreshCw,
      defaultTitle: 'Loading Data',
      defaultDescription: 'Please wait while we load your data...',
      variant: 'default' as const,
      iconClass: 'animate-spin'
    },
    stale: {
      icon: AlertTriangle,
      defaultTitle: 'Data May Be Outdated',
      defaultDescription: 'The displayed data may not be current.',
      variant: 'default' as const,
      iconClass: ''
    },
    updating: {
      icon: RefreshCw,
      defaultTitle: 'Updating Data',
      defaultDescription: 'Refreshing data in background...',
      variant: 'default' as const,
      iconClass: 'animate-spin'
    },
    error: {
      icon: XCircle,
      defaultTitle: 'Failed to Load Data',
      defaultDescription: 'There was an error loading the data.',
      variant: 'destructive' as const,
      iconClass: ''
    }
  };

  const { icon: Icon, defaultTitle, defaultDescription, variant: alertVariant, iconClass } = config[variant];

  return (
    <Alert variant={alertVariant} className={className}>
      <Icon className={cn("h-4 w-4", iconClass)} />
      <AlertDescription>
        <span className="font-medium">{title || defaultTitle}</span>
        {(description || defaultDescription) && (
          <span className="ml-2">{description || defaultDescription}</span>
        )}
        {showRetry && onRetry && (
          <Button
            variant="link"
            className="h-auto p-0 ml-2 text-inherit underline"
            onClick={onRetry}
          >
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// Empty State Component
interface EmptyStateProps {
  className?: string;
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'dashed' | 'gradient';
}

export function EmptyState({
  className,
  icon: Icon = AlertCircle,
  title,
  description,
  action,
  variant = 'default'
}: EmptyStateProps) {
  const containerClasses = {
    default: "border bg-card",
    dashed: "border-2 border-dashed border-border/50 bg-gradient-to-br from-muted/30 to-background",
    gradient: "border bg-gradient-to-br from-card to-card/50 shadow-lg"
  };

  return (
    <Card className={cn(containerClasses[variant], className)}>
      <CardContent className="text-center py-12 space-y-6">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-dashed border-primary/20 flex items-center justify-center mx-auto">
          <Icon className="h-12 w-12 text-primary/60" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-bold">{title}</h3>
          {description && (
            <p className="text-muted-foreground max-w-lg mx-auto leading-relaxed">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="pt-4">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Error Boundary Fallback
interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  className?: string;
}

export function ErrorFallback({ error, resetError, className }: ErrorFallbackProps) {
  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardHeader className="text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <CardTitle className="text-destructive">Something went wrong</CardTitle>
        <CardDescription>
          {error?.message || 'An unexpected error occurred while loading this content.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        {resetError && (
          <Button 
            onClick={resetError} 
            variant="outline" 
            startIcon={<RefreshCw className="h-4 w-4" />}
          >
            Try Again
          </Button>
        )}
        <div className="text-xs text-muted-foreground font-mono bg-muted p-3 rounded-lg max-w-md mx-auto overflow-auto">
          {error?.stack?.split('\n')[0] || 'Error details not available'}
        </div>
      </CardContent>
    </Card>
  );
}

// Success State Component
interface SuccessStateProps {
  className?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SuccessState({ className, title, description, action }: SuccessStateProps) {
  return (
    <Alert className={cn("border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10", className)}>
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800 dark:text-green-400">{title}</AlertTitle>
      {description && (
        <AlertDescription className="text-green-700 dark:text-green-300">
          {description}
        </AlertDescription>
      )}
      {action && <div className="mt-3">{action}</div>}
    </Alert>
  );
}

// Info State Component  
interface InfoStateProps {
  className?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'info' | 'warning';
}

export function InfoState({ className, title, description, action, variant = 'info' }: InfoStateProps) {
  const config = {
    info: {
      icon: Info,
      borderClass: "border-blue-200 dark:border-blue-800",
      bgClass: "bg-blue-50/50 dark:bg-blue-900/10",
      titleClass: "text-blue-800 dark:text-blue-400",
      descClass: "text-blue-700 dark:text-blue-300",
      iconClass: "text-blue-600"
    },
    warning: {
      icon: AlertTriangle,
      borderClass: "border-yellow-200 dark:border-yellow-800",
      bgClass: "bg-yellow-50/50 dark:bg-yellow-900/10",
      titleClass: "text-yellow-800 dark:text-yellow-400",
      descClass: "text-yellow-700 dark:text-yellow-300",
      iconClass: "text-yellow-600"
    }
  };

  const { icon: Icon, borderClass, bgClass, titleClass, descClass, iconClass } = config[variant];

  return (
    <Alert className={cn(borderClass, bgClass, className)}>
      <Icon className={cn("h-4 w-4", iconClass)} />
      <AlertTitle className={titleClass}>{title}</AlertTitle>
      {description && (
        <AlertDescription className={descClass}>
          {description}
        </AlertDescription>
      )}
      {action && <div className="mt-3">{action}</div>}
    </Alert>
  );
}