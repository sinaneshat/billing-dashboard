'use client';

import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import React, { Component, ReactNode } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toastManager } from '@/lib/toast/toast-manager';
import { cn } from '@/lib/ui/cn';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  level?: 'page' | 'section' | 'component';
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
  isolate?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  retryCount: number;
  isRecovering: boolean;
}

/**
 * Enhanced Error Boundary Component
 * 
 * Provides comprehensive error handling with:
 * - Different UI treatments based on error level
 * - Automatic retry mechanisms
 * - Error reporting and logging
 * - Graceful degradation options
 * - Reset capabilities
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  private retryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isRecovering: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { onError } = this.props;
    
    this.setState({ errorInfo });

    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Report error to external service (if configured)
    onError?.(error, errorInfo);

    // Show toast notification based on error level
    const { level = 'component' } = this.props;
    if (level === 'page') {
      toastManager.error(
        'Application Error',
        'A critical error occurred. Please refresh the page.',
        { duration: 10000 }
      );
    } else if (level === 'section') {
      toastManager.warning(
        'Section Error',
        'Part of the page encountered an error.',
        { duration: 6000 }
      );
    }

    // Auto-recovery for component-level errors
    if (level === 'component' && this.state.retryCount < 3) {
      this.scheduleAutoRetry();
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state when resetKeys change
    if (hasError && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );
      if (hasResetKeyChanged) {
        this.resetError();
      }
    }

    // Reset error state when any prop changes (if enabled)
    if (hasError && resetOnPropsChange) {
      const propsChanged = Object.keys(this.props).some(
        key => this.props[key as keyof ErrorBoundaryProps] !== prevProps[key as keyof ErrorBoundaryProps]
      );
      if (propsChanged) {
        this.resetError();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }
  }

  scheduleAutoRetry = () => {
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 10000); // Exponential backoff
    
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState(prevState => ({
        isRecovering: true,
        retryCount: prevState.retryCount + 1,
      }));

      // Attempt recovery
      this.resetTimeoutId = window.setTimeout(() => {
        this.resetError();
      }, 1000);
    }, delay);
  };

  resetError = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isRecovering: false,
    });
  };

  handleRetry = () => {
    this.setState({ isRecovering: true });
    
    // Small delay to show loading state
    setTimeout(() => {
      this.resetError();
    }, 500);
  };

  handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    
    // Copy error details to clipboard
    const errorDetails = {
      id: errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        toastManager.success('Error details copied to clipboard');
      })
      .catch(() => {
        toastManager.error('Failed to copy error details');
      });
  };

  render() {
    const { hasError, error, errorInfo, isRecovering, retryCount } = this.state;
    const { children, fallback, showDetails = false, level = 'component', isolate = false } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Show different UI based on error level
      if (level === 'page') {
        return <PageErrorFallback
          error={error}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
          onReportError={this.handleReportError}
          isRecovering={isRecovering}
          showDetails={showDetails}
        />;
      }

      if (level === 'section') {
        return <SectionErrorFallback
          error={error}
          errorInfo={errorInfo}
          onRetry={this.handleRetry}
          onReportError={this.handleReportError}
          isRecovering={isRecovering}
          showDetails={showDetails}
          retryCount={retryCount}
        />;
      }

      // Component level fallback
      return <ComponentErrorFallback
        error={error}
        errorInfo={errorInfo}
        onRetry={this.handleRetry}
        isRecovering={isRecovering}
        retryCount={retryCount}
        isolate={isolate}
      />;
    }

    return children;
  }
}

// Page-level error fallback
function PageErrorFallback({ 
  error, 
  onRetry, 
  onReportError, 
  isRecovering, 
  showDetails 
}: {
  error: Error | null;
  errorInfo?: React.ErrorInfo | null;
  onRetry: () => void;
  onReportError: () => void;
  isRecovering: boolean;
  showDetails: boolean;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Application Error</CardTitle>
          <CardDescription>
            Something went wrong. The application encountered an unexpected error.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {showDetails && error && (
            <Alert variant="destructive">
              <Bug className="h-4 w-4" />
              <AlertDescription className="font-mono text-xs">
                {error.message}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2">
            <Button 
              onClick={() => window.location.reload()} 
              disabled={isRecovering}
              className="flex-1"
            >
              {isRecovering ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Page
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onReportError}
            className="w-full"
          >
            <Bug className="h-4 w-4 mr-2" />
            Copy Error Details
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Section-level error fallback
function SectionErrorFallback({ 
  error, 
  onRetry, 
  isRecovering, 
  retryCount,
  showDetails 
}: {
  error: Error | null;
  errorInfo?: React.ErrorInfo | null;
  onRetry: () => void;
  onReportError: () => void;
  isRecovering: boolean;
  retryCount: number;
  showDetails: boolean;
}) {
  return (
    <Alert variant="destructive" className="my-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div>
          <p className="font-medium">Section Unavailable</p>
          <p className="text-sm">This section encountered an error and couldn't load properly.</p>
          {showDetails && error && (
            <p className="text-xs font-mono mt-2 opacity-75">{error.message}</p>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onRetry}
            disabled={isRecovering || retryCount >= 3}
          >
            {isRecovering ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry {retryCount > 0 && `(${retryCount}/3)`}
              </>
            )}
          </Button>
          
          {retryCount >= 3 && (
            <Button size="sm" variant="ghost" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

// Component-level error fallback
function ComponentErrorFallback({ 
  error, 
  onRetry, 
  isRecovering, 
  retryCount,
  isolate 
}: {
  error: Error | null;
  errorInfo?: React.ErrorInfo | null;
  onRetry: () => void;
  isRecovering: boolean;
  retryCount: number;
  isolate: boolean;
}) {
  if (isolate) {
    return (
      <div className={cn(
        "border-2 border-dashed border-destructive/20 rounded-lg p-4 bg-destructive/5",
        "flex items-center justify-center min-h-[100px]"
      )}>
        <div className="text-center space-y-2">
          <AlertTriangle className="h-5 w-5 text-destructive mx-auto" />
          <p className="text-sm text-muted-foreground">Component Error</p>
          {retryCount < 3 && (
            <Button size="sm" variant="outline" onClick={onRetry} disabled={isRecovering}>
              {isRecovering ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // For non-isolated components, show minimal disruption
  return (
    <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
      <AlertTriangle className="h-4 w-4 text-destructive" />
      <span>Component unavailable</span>
      {retryCount < 3 && (
        <Button size="sm" variant="ghost" onClick={onRetry} disabled={isRecovering}>
          <RefreshCw className={cn("h-3 w-3", isRecovering && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}

// Hook for easier usage
export function useErrorBoundary() {
  return {
    captureError: (error: Error) => {
      // This would need to be implemented with a context provider
      throw error;
    },
  };
}

// HOC for wrapping components with error boundaries
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default ErrorBoundary;