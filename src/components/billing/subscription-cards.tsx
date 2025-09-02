'use client';

import {
  Calendar,
  EllipsisVerticalIcon,
  Package,
  Settings,
} from 'lucide-react';
import { memo } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionStatusBadge } from '@/components/ui/status-badge';
import { formatTomanCurrency } from '@/lib/i18n/currency-utils';
import type { GetSubscriptionsResponse } from '@/services/api/subscriptions';

// Extract subscription type from API response
type Subscription = NonNullable<GetSubscriptionsResponse['data']>[number];

type SubscriptionCardsProps = {
  subscriptions: Subscription[];
  loading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
};

// Loading skeleton for subscription cards
function SubscriptionCardSkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-6" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const SubscriptionCards = memo(({
  subscriptions,
  loading = false,
  emptyStateTitle = 'No subscriptions found',
  emptyStateDescription = 'You don\'t have any active subscriptions yet. Browse our plans to get started.',
  className,
}: SubscriptionCardsProps) => {
  // Render individual subscription card
  const renderSubscriptionCard = (subscription: Subscription, index: number) => {
    const isActive = subscription.status === 'active';
    const isCanceled = subscription.status === 'canceled';
    const isExpired = subscription.status === 'expired';

    return (
      <StaggerItem key={subscription.id} delay={index * 0.05}>
        <Card className="w-full hover:shadow-md transition-shadow" data-slot="subscription-card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isActive
                    ? 'bg-green-50 dark:bg-green-900/30'
                    : isCanceled || isExpired
                      ? 'bg-red-50 dark:bg-red-900/30'
                      : 'bg-gray-50 dark:bg-gray-900/30'
                }`}
                >
                  <Package className={`h-4 w-4 ${
                    isActive
                      ? 'text-green-600 dark:text-green-400'
                      : isCanceled || isExpired
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-600 dark:text-gray-400'
                  }`}
                  />
                </div>
                <div>
                  <CardTitle className="text-base font-medium">
                    {subscription.product?.name || 'Unknown Plan'}
                  </CardTitle>
                  <CardDescription>
                    {subscription.product?.description || 'Subscription service'}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SubscriptionStatusBadge status={subscription.status} size="sm" />
                <CardAction>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        aria-label="Open subscription actions"
                      >
                        <EllipsisVerticalIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Subscription
                      </DropdownMenuItem>
                      <DropdownMenuItem>View Usage</DropdownMenuItem>
                      <DropdownMenuItem>Download Invoice</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {isActive && (
                        <DropdownMenuItem variant="destructive">
                          Cancel Subscription
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardAction>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-2xl font-semibold text-foreground">
                    {formatTomanCurrency(subscription.currentPrice)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">
                    /month
                  </span>
                </div>
                {isCanceled && (
                  <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                    Cancelled
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    Start Date
                  </span>
                  <div className="flex items-center gap-1 text-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {new Date(subscription.startDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    {subscription.endDate ? 'End Date' : 'Next Billing'}
                  </span>
                  <div className="text-foreground">
                    {subscription.endDate
                      ? (
                          new Date(subscription.endDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        )
                      : subscription.nextBillingDate
                        ? (
                            new Date(subscription.nextBillingDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          )
                        : (
                            'TBD'
                          )}
                  </div>
                </div>
              </div>

              {isActive && !isCanceled && (
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Auto-renewal enabled</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </StaggerItem>
    );
  };

  if (loading) {
    return (
      <FadeIn className={className}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Subscriptions</h3>
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <SubscriptionCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </FadeIn>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <FadeIn className={className}>
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">{emptyStateTitle}</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            {emptyStateDescription}
          </p>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn className={className}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your Subscriptions</h3>
          <span className="text-sm text-muted-foreground">
            {subscriptions.length}
            {' '}
            {subscriptions.length === 1 ? 'subscription' : 'subscriptions'}
          </span>
        </div>

        <StaggerContainer className="grid gap-4 lg:grid-cols-2">
          {subscriptions.map((subscription, index) => renderSubscriptionCard(subscription, index))}
        </StaggerContainer>
      </div>
    </FadeIn>
  );
});

SubscriptionCards.displayName = 'SubscriptionCards';
