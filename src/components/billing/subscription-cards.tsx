'use client';

import { Package } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { memo } from 'react';

import type { SubscriptionWithProduct } from '@/api/routes/subscriptions/schema';
import { EmptyState, ErrorState, LoadingState } from '@/components/dashboard/dashboard-states';
import { Button } from '@/components/ui/button';
import { useCancelSubscriptionMutation } from '@/hooks/mutations/subscriptions';

import type { SubscriptionData } from './unified';
import { BillingDisplayContainer, mapSubscriptionToContent } from './unified';

export type Subscription = SubscriptionWithProduct;

type SubscriptionCardsProps = {
  subscriptions: Subscription[];
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
};

export const SubscriptionCards = memo(({
  subscriptions,
  isLoading = false,
  isError = false,
  error: _error = null,
  onRetry,
  className,
}: SubscriptionCardsProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const cancelSubscription = useCancelSubscriptionMutation();

  const handleManage = (id: string) => {
    router.push(`/dashboard/billing/subscriptions/${id}/manage`);
  };

  const handleCancel = (id: string) => {
    cancelSubscription.mutate({
      param: { id },
      json: { reason: t('subscription.cancellationReason') },
    });
  };

  if (isLoading) {
    return (
      <LoadingState
        variant="card"
        style="dashed"
        size="lg"
        title={t('states.loading.subscriptions')}
        message={t('states.loading.please_wait')}
      />
    );
  }

  if (isError && !isLoading) {
    return (
      <ErrorState
        variant="card"
        title={t('states.error.loadSubscriptions')}
        description={t('states.error.loadSubscriptionsDescription')}
        onRetry={onRetry}
        retryLabel={t('actions.tryAgain')}
      />
    );
  }

  return (
    <>
      {subscriptions.length > 0
        ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  {t('billing.activeSubscriptions')}
                </h3>
                <span className="text-sm text-muted-foreground">
                  {subscriptions.length}
                  {' '}
                  {subscriptions.length === 1 ? t('subscriptions.subscription') : t('subscriptions.subscriptions')}
                </span>
              </div>
              <BillingDisplayContainer
                data={subscriptions}
                isLoading={false}
                dataType="subscription"
                variant="card"
                size="md"
                columns="auto"
                gap="md"
                containerClassName={className}
                mapItem={(subscription: Subscription) =>
                  mapSubscriptionToContent(
                    subscription as SubscriptionData,
                    t,
                    locale,
                    handleManage,
                    handleCancel,
                  )}
              />
            </div>
          )
        : (
            <EmptyState
              variant="subscriptions"
              style="dashed"
              size="lg"
              title={t('states.empty.subscriptions')}
              description={t('states.empty.subscriptionsDescription')}
              icon={<Package className="h-12 w-12 text-primary/60" />}
              action={(
                <Button
                  size="lg"
                  onClick={() => router.push('/dashboard/billing/plans')}
                >
                  <Package className="h-4 w-4 mr-2" />
                  {t('billing.choosePlan')}
                </Button>
              )}
            />
          )}
    </>
  );
});

SubscriptionCards.displayName = 'SubscriptionCards';
