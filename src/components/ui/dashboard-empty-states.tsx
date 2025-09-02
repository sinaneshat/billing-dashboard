'use client';

import { type ReactNode } from 'react';
import { Package, CreditCard, FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Standardized empty state variants using Shadcn patterns
type DashboardEmptyStateProps = {
  variant?: 'subscriptions' | 'payments' | 'plans' | 'methods' | 'general';
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

const emptyStateConfig = {
  subscriptions: {
    icon: Package,
    title: 'No Subscriptions Found',
    description: "You don't have any active subscriptions yet. Browse our plans to get started."
  },
  payments: {
    icon: CreditCard,
    title: 'No Payment History',
    description: 'Your payment transactions will appear here once you make your first purchase.'
  },
  plans: {
    icon: FileText,
    title: 'No Plans Available',
    description: 'No subscription plans are currently available. Please check back later.'
  },
  methods: {
    icon: CreditCard,
    title: 'No Payment Methods',
    description: 'Add a payment method to enable automatic billing for your subscriptions.'
  },
  general: {
    icon: Package,
    title: 'No Data Found',
    description: 'There is no data to display at the moment.'
  }
};

export function DashboardEmptyState({ 
  variant = 'general', 
  title, 
  description, 
  action,
  className = ''
}: DashboardEmptyStateProps) {
  const config = emptyStateConfig[variant];
  const Icon = config.icon;
  
  return (
    <Card className={`border-2 border-dashed border-border/50 bg-gradient-to-br from-muted/30 to-background ${className}`}>
      <CardContent className="pt-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{title || config.title}</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            {description || config.description}
          </p>
          {action}
        </div>
      </CardContent>
    </Card>
  );
}

// Error state component using Shadcn Alert
type DashboardErrorStateProps = {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
};

export function DashboardErrorState({
  title = 'Something went wrong',
  description = 'There was an error loading your data. Please try again.',
  onRetry,
  className = ''
}: DashboardErrorStateProps) {
  return (
    <Card className={`border-0 shadow-lg ${className}`}>
      <CardContent className="pt-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-3">
              <div>
                <div className="font-semibold">{title}</div>
                <div className="text-sm">{description}</div>
              </div>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}