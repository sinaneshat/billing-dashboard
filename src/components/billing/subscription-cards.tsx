'use client';

import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  Package,
  Settings,
  TrendingUp,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { memo, useCallback, useMemo, useState } from 'react';

import type { SubscriptionWithProduct } from '@/api/routes/subscriptions/schema';
import { BillingActionMenu } from '@/components/billing/shared/billing-action-menu';
import { BillingCardContainer } from '@/components/billing/shared/billing-card-container';
import { useBillingActions } from '@/components/billing/shared/use-billing-actions';
import { StatusCard } from '@/components/dashboard/dashboard-cards';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { SubscriptionStatusBadge } from '@/components/ui/status-badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useManageSubscriptionMutation, useViewUsageMutation } from '@/hooks/mutations/subscription-management';
import { useCancelSubscriptionMutation } from '@/hooks/mutations/subscriptions';
import { formatTomanCurrency } from '@/lib/format';
import { cn } from '@/lib/ui/cn';

// Use proper subscription type from schema with optional usage and cost tracking
type UsageData = {
  percentage: number;
  current?: number;
  limit?: number;
};

type CostTrendData = number; // percentage change

export type Subscription = SubscriptionWithProduct & {
  usage?: UsageData;
  costTrend?: CostTrendData;
};

type SubscriptionCardsProps = {
  subscriptions: Subscription[];
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
  enableFiltering?: boolean;
  enableUsageTracking?: boolean;
  showBillingInsights?: boolean;
  compactView?: boolean;
  onSubscriptionClick?: (subscription: Subscription) => void;
  error?: Error | null;
  retryFn?: () => void;
};

type SubscriptionViewMode = 'grid' | 'list' | 'table';
type SubscriptionFilter = 'all' | 'active' | 'inactive' | 'trial' | 'cancelled';

// Enhanced subscription card component with better error states and insights
function SubscriptionInsightCard({ subscription, locale, t }: {
  subscription: Subscription;
  locale: string;
  t: (key: string) => string;
}) {
  const nextBillingDate = subscription.nextBillingDate ? new Date(subscription.nextBillingDate) : null;
  const daysUntilBilling = nextBillingDate ? Math.ceil((nextBillingDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;

  const usagePercent = subscription.usage?.percentage ?? 0;
  const isNearLimit = usagePercent > 80;
  const isOverLimit = usagePercent > 100;

  return (
    <div className="space-y-3 text-sm">
      {/* Billing Timeline */}
      {nextBillingDate && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            {daysUntilBilling !== null && daysUntilBilling <= 7
              ? t('subscription.billingInDays').replace('{days}', daysUntilBilling.toString())
              : nextBillingDate.toLocaleDateString(locale, { month: 'short', day: 'numeric' })}
          </span>
        </div>
      )}

      {/* Usage Tracking */}
      {subscription.usage && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('subscription.usage')}</span>
            <span className={cn(
              'font-medium',
              isOverLimit ? 'text-destructive' : isNearLimit ? 'text-orange-600' : 'text-foreground',
            )}
            >
              {usagePercent.toFixed(1)}
              %
            </span>
          </div>
          <Progress
            value={Math.min(usagePercent, 100)}
            className={cn(
              'h-2',
              isOverLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-orange-500' : '',
            )}
          />
          {isNearLimit && (
            <div className="flex items-center gap-1 text-xs text-orange-600">
              <AlertTriangle className="h-3 w-3" />
              <span>{t('subscription.nearLimit')}</span>
            </div>
          )}
        </div>
      )}

      {/* Cost Trend */}
      {subscription.costTrend !== undefined && (
        <div className="flex items-center gap-2">
          <TrendingUp className={cn(
            'h-4 w-4',
            subscription.costTrend > 0 ? 'text-red-500' : 'text-green-500',
          )}
          />
          <span className="text-xs text-muted-foreground">
            {subscription.costTrend > 0 ? '+' : ''}
            {subscription.costTrend.toFixed(1)}
            %
            {' '}
            {t('subscription.thisMonth')}
          </span>
        </div>
      )}
    </div>
  );
}

// Enhanced loading skeleton for subscription cards
function SubscriptionCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-8" />
        </div>
      </CardContent>
    </Card>
  );
}

// Error state component for subscriptions
function SubscriptionErrorState({ error, retryFn, t }: {
  error: Error;
  retryFn?: () => void;
  t: (key: string) => string;
}) {
  return (
    <Alert variant="destructive" className="max-w-md mx-auto">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-3">
        <div>
          <p className="font-medium">{t('subscription.loadError')}</p>
          <p className="text-sm">{error.message}</p>
        </div>
        {retryFn && (
          <Button variant="outline" size="sm" onClick={retryFn}>
            {t('actions.tryAgain')}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

export const SubscriptionCards = memo(({
  subscriptions,
  isLoading = false,
  emptyStateTitle,
  emptyStateDescription,
  className,
  enableFiltering = true,
  enableUsageTracking = true,
  showBillingInsights = true,
  compactView = false,
  onSubscriptionClick,
  error,
  retryFn,
}: SubscriptionCardsProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const { createAsyncAction } = useBillingActions();

  // Mutation hooks for subscription management
  const manageSubscription = useManageSubscriptionMutation();
  const viewUsage = useViewUsageMutation();
  const cancelSubscription = useCancelSubscriptionMutation();

  // Simplified action handlers using shared hook
  const handleManage = createAsyncAction(
    async (subscription: Subscription) => {
      manageSubscription.mutate({ param: { id: subscription.id } });
    },
    {
      successMessage: t('subscription.managementStarted'),
      errorMessage: t('subscription.managementFailed'),
    },
  );

  const handleViewUsage = createAsyncAction(
    async (subscription: Subscription) => {
      viewUsage.mutate({ param: { id: subscription.id } });
    },
    {
      errorMessage: t('subscription.usageViewFailed'),
    },
  );

  const handleDownloadInvoice = createAsyncAction(
    async (_subscription: Subscription) => {
      // Simulate download action
    },
    {
      successMessage: t('subscription.invoiceDownloaded'),
      errorMessage: t('subscription.invoiceDownloadFailed'),
    },
  );

  const handleCancel = createAsyncAction(
    async (subscription: Subscription) => {
      cancelSubscription.mutate({
        param: { id: subscription.id },
        json: { reason: 'User requested cancellation' },
      });
    },
    {
      successMessage: t('subscription.cancelSuccess'),
      errorMessage: t('subscription.cancelFailed'),
    },
  );

  // Filter and view state management
  const [_viewMode, _setViewMode] = useState<SubscriptionViewMode>('grid');
  const [activeFilter, setActiveFilter] = useState<SubscriptionFilter>('all');

  // Filter subscriptions based on active filter
  const filteredSubscriptions = useMemo(() => {
    if (!enableFiltering || activeFilter === 'all')
      return subscriptions;

    return subscriptions.filter((subscription) => {
      switch (activeFilter) {
        case 'active':
          return subscription.status === 'active';
        case 'inactive':
          return subscription.status === 'canceled' || subscription.status === 'expired';
        case 'trial':
          // Note: trial status doesn't exist in current schema, treating as pending
          return subscription.status === 'pending';
        case 'cancelled':
          return subscription.status === 'canceled' || subscription.status === 'expired';
        default:
          return true;
      }
    });
  }, [subscriptions, activeFilter, enableFiltering]);

  // Enhanced action menu with context-aware options
  const createActionMenu = useCallback((subscription: Subscription) => {
    const isActive = subscription.status === 'active';
    const isCancellable = ['active', 'trial'].includes(subscription.status);
    const hasUsage = enableUsageTracking && subscription.usage;

    const actions = [
      {
        id: 'manage',
        label: t('subscription.manage'),
        icon: Settings,
        onClick: () => handleManage(subscription),
        disabled: !isActive,
      },
      ...(hasUsage
        ? [{
            id: 'view-usage',
            label: t('subscription.viewUsage'),
            icon: BarChart3,
            onClick: () => handleViewUsage(subscription),
          }]
        : []),
      {
        id: 'download-invoice',
        label: t('subscription.downloadInvoice'),
        icon: Download,
        onClick: () => handleDownloadInvoice(subscription),
      },
      ...(isCancellable
        ? [{
            id: 'cancel',
            label: t('subscription.cancel'),
            icon: X,
            onClick: () => handleCancel(subscription),
            variant: 'destructive' as const,
          }]
        : []),
    ];

    return <BillingActionMenu actions={actions} />;
  }, [handleManage, handleViewUsage, handleDownloadInvoice, handleCancel, t, enableUsageTracking]);

  // Enhanced card renderer with insights
  const renderSubscriptionCard = useCallback((subscription: Subscription) => {
    const cardProps = {
      title: subscription.product?.name || t('subscription.unknownProduct'),
      subtitle: subscription.product?.description || undefined,
      status: <SubscriptionStatusBadge status={subscription.status} />,
      icon: <Package className="h-6 w-6 text-primary" />,
      primaryInfo: (
        <div className="text-sm text-muted-foreground">
          {subscription.currentPrice && formatTomanCurrency(subscription.currentPrice)}
          {subscription.product?.billingPeriod && (
            <span className="text-xs ml-1">
              /
              {subscription.product.billingPeriod}
            </span>
          )}
        </div>
      ),
      secondaryInfo: showBillingInsights
        ? (
            <SubscriptionInsightCard
              subscription={subscription}
              locale={locale}
              t={t}
            />
          )
        : (
            <div className="text-xs text-muted-foreground space-y-1">
              {subscription.endDate && (
                <p>{t('subscription.endsOn', { date: new Date(subscription.endDate).toLocaleDateString(locale) })}</p>
              )}
              {subscription.nextBillingDate && (
                <p>{t('subscription.nextBilling', { date: new Date(subscription.nextBillingDate).toLocaleDateString(locale) })}</p>
              )}
            </div>
          ),
      action: createActionMenu(subscription),
      onClick: onSubscriptionClick ? () => onSubscriptionClick(subscription) : undefined,
      className: cn(
        'transition-all duration-200',
        compactView && 'h-auto',
        onSubscriptionClick && 'cursor-pointer hover:shadow-md',
      ),
    };

    return <StatusCard {...cardProps} />;
  }, [locale, t, showBillingInsights, createActionMenu, onSubscriptionClick, compactView]);

  // Handle error state
  if (error && !isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {enableFiltering && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('subscription.title')}</h3>
          </div>
        )}
        <SubscriptionErrorState error={error} retryFn={retryFn} t={t} />
      </div>
    );
  }

  // Loading state with enhanced skeletons
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {enableFiltering && (
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        )}
        <div className={cn(
          'grid gap-4',
          compactView ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2',
        )}
        >
          {Array.from({ length: 3 }, (_, i) => (
            <SubscriptionCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Enhanced Header with Filters */}
      {enableFiltering && filteredSubscriptions.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">{t('subscription.title')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('subscription.count', { count: filteredSubscriptions.length })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Tabs */}
            <Tabs value={activeFilter} onValueChange={value => setActiveFilter(value as SubscriptionFilter)}>
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="all" className="text-xs">{t('filter.all')}</TabsTrigger>
                <TabsTrigger value="active" className="text-xs">{t('filter.active')}</TabsTrigger>
                <TabsTrigger value="trial" className="text-xs">{t('filter.trial')}</TabsTrigger>
                <TabsTrigger value="inactive" className="text-xs">{t('filter.inactive')}</TabsTrigger>
                <TabsTrigger value="cancelled" className="text-xs">{t('filter.cancelled')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {/* Enhanced Container with Filter Support */}
      <BillingCardContainer<Subscription>
        items={filteredSubscriptions}
        isLoading={false}
        emptyStateTitle={activeFilter === 'all'
          ? (emptyStateTitle || t('subscription.noSubscriptions'))
          : t('subscription.noFilteredSubscriptions', { filter: t(`filter.${activeFilter}`) })}
        emptyStateDescription={activeFilter === 'all'
          ? (emptyStateDescription || t('subscription.noSubscriptionsDescription'))
          : t('subscription.noFilteredSubscriptionsDescription')}
        className={cn(
          compactView ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 lg:grid-cols-2',
        )}
        loadingCardCount={6}
      >
        {renderSubscriptionCard}
      </BillingCardContainer>
    </div>
  );
});

SubscriptionCards.displayName = 'SubscriptionCards';

// Export additional components for custom implementations
export { SubscriptionCardSkeleton, SubscriptionErrorState, SubscriptionInsightCard };
