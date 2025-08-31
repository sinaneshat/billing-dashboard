/* eslint-disable react-refresh/only-export-components */
'use client';

import { AlertTriangle, RefreshCw } from 'lucide-react';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type BillingErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class BillingErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  BillingErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): BillingErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Billing Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <BillingErrorFallback error={this.state.error} reset={() => this.setState({ hasError: false, error: undefined })} />;
    }

    return this.props.children;
  }
}

type BillingErrorFallbackProps = {
  error?: Error;
  reset: () => void;
};

function BillingErrorFallback({ error, reset }: BillingErrorFallbackProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Billing System Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>
              We encountered an error while loading your billing information.
              This might be a temporary issue.
            </AlertDescription>
          </Alert>

          {process.env.NODE_ENV === 'development' && error && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-mono text-muted-foreground">
                Error:
                {' '}
                {error.message}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Reload Page
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              If this problem persists, please
              {' '}
              <a href="mailto:support@example.com" className="text-primary hover:underline">
                contact support
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Higher-order component for easier usage
export function withBillingErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode,
) {
  return function BillingErrorBoundaryWrapper(props: P) {
    return (
      <BillingErrorBoundary fallback={fallback}>
        <Component {...props} />
      </BillingErrorBoundary>
    );
  };
}
