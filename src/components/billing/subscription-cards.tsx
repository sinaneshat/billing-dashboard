'use client';

import { Calendar, Package, Settings, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { memo } from 'react';

import type { SubscriptionWithProduct } from '@/api/routes/subscriptions/schema';
import { EmptyState } from '@/components/dashboard/dashboard-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SubscriptionStatusBadge } from '@/components/ui/status-badge';
import { useManageSubscriptionMutation } from '@/hooks/mutations/subscription-management';
import { useCancelSubscriptionMutation } from '@/hooks/mutations/subscriptions';
import { formatTomanCurrency } from '@/lib/format';
import { cn } from '@/lib/ui/cn';

export type Subscription = SubscriptionWithProduct;

type SubscriptionCardsProps = {
  subscriptions: Subscription[];
  isLoading?: boolean;
  className?: string;
};

// Simple SubscriptionCard component
function SubscriptionCard({ subscription, locale, t }: {
  subscription: Subscription;
  locale: string;
  t: (key: string) => string;
}) {
  const manageSubscription = useManageSubscriptionMutation();
  const cancelSubscription = useCancelSubscriptionMutation();

  const handleManage = () => {
    manageSubscription.mutate({ param: { id: subscription.id } });
  };

  const handleCancel = () => {
    cancelSubscription.mutate({
      param: { id: subscription.id },
      json: { reason: 'User requested cancellation' },
    });
  };

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base">
                {subscription.product?.name || t('subscription.unknownProduct')}
              </CardTitle>
              {subscription.product?.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {subscription.product.description}
                </p>
              )}
            </div>
          </div>
          <SubscriptionStatusBadge status={subscription.status} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('subscription.price')}
            </span>
            <span className="font-medium">
              {subscription.currentPrice && formatTomanCurrency(subscription.currentPrice)}
              {subscription.product?.billingPeriod && (
                <span className="text-xs text-muted-foreground ml-1">
                  /
                  {subscription.product.billingPeriod}
                </span>
              )}
            </span>
          </div>

          {subscription.nextBillingDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {t('subscription.nextBilling')}
                :
                {new Date(subscription.nextBillingDate).toLocaleDateString(locale)}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManage}
              disabled={subscription.status !== 'active'}
              className="gap-1 flex-1"
            >
              <Settings className="h-3 w-3" />
              {t('subscription.manage')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={!['active', 'trial'].includes(subscription.status)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
            >
              <Trash2 className="h-3 w-3" />
              {t('actions.cancel')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const SubscriptionCards = memo(({
  subscriptions,
  isLoading = false,
  className,
}: SubscriptionCardsProps) => {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className={cn('grid gap-4 grid-cols-1 lg:grid-cols-2', className)}>
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i} className="h-32">
            <CardContent className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">{t('states.loading.subscriptions')}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <EmptyState
        title={t('states.empty.subscriptions')}
        description={t('states.empty.subscriptionsDescription')}
        icon={<Package className="h-8 w-8 text-muted-foreground" />}
        action={(
          <Button
            size="lg"
            startIcon={<Package className="h-4 w-4" />}
            onClick={() => router.push('/dashboard/billing/plans')}
          >
            {t('billing.viewPlans')}
          </Button>
        )}
      />
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{t('billing.subscriptionsTitle')}</h3>
        <span className="text-sm text-muted-foreground">
          {subscriptions.length}
          {' '}
          {subscriptions.length === 1 ? t('subscription.subscription') : t('subscription.subscriptions')}
        </span>
      </div>
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        {subscriptions.map(subscription => (
          <SubscriptionCard
            key={subscription.id}
            subscription={subscription}
            locale={locale}
            t={t}
          />
        ))}
      </div>
    </div>
  );
});

SubscriptionCards.displayName = 'SubscriptionCards';
