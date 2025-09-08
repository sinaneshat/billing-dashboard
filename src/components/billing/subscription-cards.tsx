'use client';

import {
  BarChart3,
  Download,
  EllipsisVerticalIcon,
  Package,
  Settings,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { memo, useCallback } from 'react';

import { EmptyCard, LoadingCard, StatusCard } from '@/components/dashboard/dashboard-cards';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { SubscriptionStatusBadge } from '@/components/ui/status-badge';
import { useDownloadSubscriptionInvoiceMutation, useManageSubscriptionMutation, useViewUsageMutation } from '@/hooks/mutations/subscription-management';
import { useCancelSubscriptionMutation } from '@/hooks/mutations/subscriptions';
import { formatTomanCurrency, showErrorToast, showSuccessToast } from '@/lib';
import type { GetSubscriptionsResponse } from '@/services/api/subscriptions';

// Extract subscription type from API response
// API response structure: { success: boolean, data?: SubscriptionWithProduct[] }
type Subscription = GetSubscriptionsResponse extends { data?: infer T }
  ? T extends readonly (infer U)[]
    ? U
    : never
  : never;

type SubscriptionCardsProps = {
  subscriptions: Subscription[];
  isLoading?: boolean;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  className?: string;
};

export const SubscriptionCards = memo(({
  subscriptions,
  isLoading = false,
  emptyStateTitle,
  emptyStateDescription,
  className,
}: SubscriptionCardsProps) => {
  const t = useTranslations();
  const locale = useLocale();

  // Mutations for subscription actions
  const cancelSubscriptionMutation = useCancelSubscriptionMutation();
  const viewUsageMutation = useViewUsageMutation();
  const downloadInvoiceMutation = useDownloadSubscriptionInvoiceMutation();
  const manageSubscriptionMutation = useManageSubscriptionMutation();

  // Action handlers
  const handleManageSubscription = useCallback(async (subscriptionId: string) => {
    try {
      await manageSubscriptionMutation.mutateAsync({ param: { id: subscriptionId } });
    } catch {
      showErrorToast(t('subscription.managementFailed'));
    }
  }, [manageSubscriptionMutation, t]);

  const handleViewUsage = useCallback(async (subscriptionId: string) => {
    try {
      await viewUsageMutation.mutateAsync({ param: { id: subscriptionId } });
    } catch {
      showErrorToast(t('subscription.usageViewFailed'));
    }
  }, [viewUsageMutation, t]);

  const handleDownloadInvoice = useCallback(async (subscriptionId: string) => {
    try {
      await downloadInvoiceMutation.mutateAsync({ param: { id: subscriptionId } });
      showSuccessToast(t('subscription.invoiceDownloaded'));
    } catch {
      showErrorToast(t('subscription.invoiceDownloadFailed'));
    }
  }, [downloadInvoiceMutation, t]);

  const handleCancelSubscription = useCallback(async (subscriptionId: string) => {
    const reason = t('subscription.userCancellationReason'); // In real app, this would come from a modal/form
    try {
      await cancelSubscriptionMutation.mutateAsync({
        param: { id: subscriptionId },
        json: { reason },
      });
      showSuccessToast(t('subscription.cancelSuccess'));
    } catch {
      showErrorToast(t('subscription.cancelFailed'));
    }
  }, [cancelSubscriptionMutation, t]);

  const defaultEmptyTitle = emptyStateTitle || t('subscription.empty');
  const defaultEmptyDescription = emptyStateDescription || t('subscription.emptyDescription');
  // Render individual subscription card
  const renderSubscriptionCard = (subscription: Subscription, index: number) => {
    const isActive = subscription.status === 'active';
    const isCanceled = subscription.status === 'canceled';
    const isExpired = subscription.status === 'expired';

    const getStatusColor = () => {
      if (isActive)
        return 'success';
      if (isCanceled || isExpired)
        return 'error';
      return 'default';
    };

    return (
      <StaggerItem key={subscription.id} delay={index * 0.05}>
        <StatusCard
          title={subscription.product?.name || t('subscription.unknownPlan')}
          subtitle={subscription.product?.description}
          status={<SubscriptionStatusBadge status={subscription.status} size="sm" />}
          icon={<Package className="h-4 w-4" />}
          statusColor={getStatusColor()}
          primaryInfo={(
            <span className="text-2xl font-semibold text-foreground">
              {formatTomanCurrency(subscription.currentPrice)}
            </span>
          )}
          secondaryInfo={(
            <div className="text-sm text-muted-foreground">
              {subscription.endDate
                ? `${t('subscription.endDate')}: ${new Date(subscription.endDate).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`
                : subscription.nextBillingDate
                  ? `${t('subscription.nextBilling')}: ${new Date(subscription.nextBillingDate).toLocaleDateString(locale, { month: 'short', day: 'numeric' })}`
                  : t('subscription.toBeDecided')}
            </div>
          )}
          metadata={undefined}
          action={(
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label={t('subscription.openSubscriptionActions')}
                  aria-haspopup="menu"
                >
                  <EllipsisVerticalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleManageSubscription(subscription.id)}
                  className="cursor-pointer"
                  disabled={manageSubscriptionMutation.isPending}
                  aria-label={manageSubscriptionMutation.isPending ? t('states.loading.opening') : t('subscription.manage')}
                >
                  <Settings className="h-4 w-4 me-2" />
                  {manageSubscriptionMutation.isPending ? t('states.loading.opening') : t('subscription.manage')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleViewUsage(subscription.id)}
                  className="cursor-pointer"
                  disabled={viewUsageMutation.isPending}
                  aria-label={viewUsageMutation.isPending ? t('states.loading.loading') : t('subscription.viewUsage')}
                >
                  <BarChart3 className="h-4 w-4 me-2" />
                  {viewUsageMutation.isPending ? t('states.loading.loading') : t('subscription.viewUsage')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDownloadInvoice(subscription.id)}
                  className="cursor-pointer"
                  disabled={downloadInvoiceMutation.isPending}
                  aria-label={downloadInvoiceMutation.isPending ? t('states.loading.downloading') : t('subscription.downloadInvoice')}
                >
                  <Download className="h-4 w-4 me-2" />
                  {downloadInvoiceMutation.isPending ? t('states.loading.downloading') : t('subscription.downloadInvoice')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isActive && (
                  <DropdownMenuItem
                    onClick={() => handleCancelSubscription(subscription.id)}
                    variant="destructive"
                    className="cursor-pointer"
                    disabled={cancelSubscriptionMutation.isPending}
                    aria-label={cancelSubscriptionMutation.isPending ? t('states.loading.canceling') : t('subscription.cancel')}
                  >
                    <X className="h-4 w-4 me-2" />
                    {cancelSubscriptionMutation.isPending ? t('states.loading.canceling') : t('subscription.cancel')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      </StaggerItem>
    );
  };

  if (isLoading) {
    return (
      <FadeIn className={className}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('subscription.yourSubscriptions')}</h3>
            <span className="text-sm text-muted-foreground">{t('states.loading.default')}</span>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 2 }, (_, i) => (
              <LoadingCard key={i} title={t('states.loading.subscriptions')} rows={3} variant="status" />
            ))}
          </div>
        </div>
      </FadeIn>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <FadeIn className={className}>
        <EmptyCard
          title={defaultEmptyTitle}
          description={defaultEmptyDescription}
          icon={<Package className="h-8 w-8 text-muted-foreground" />}
        />
      </FadeIn>
    );
  }

  return (
    <FadeIn className={className}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('subscription.yourSubscriptions')}</h3>
          <span className="text-sm text-muted-foreground">
            {subscriptions.length}
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
